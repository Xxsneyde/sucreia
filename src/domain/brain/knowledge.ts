import { plain, stopwords, words, synonymsOf, similarity } from './text.ts';
import type { BrainDoc, BrainStore, Knowledge, Posting, StoreHit } from './types.ts';

/** «Torta para 20 porciones» → 20. */
export function servesFrom(texts: string[]): number | null {
  for (const t of texts) {
    const m =
      /(\d{1,3})\s*(porcion|porciones|personas?|pax|invitados|und|unidades|piezas|puestos)/.exec(
        plain(t),
      );
    if (m) return Number(m[1]);
  }
  return null;
}
export const FIELD = {
  productName: 6,
  productGroup: 3,
  productDetail: 3,
  productDescription: 2,
  storeName: 5,
  subcategory: 4,
  category: 3,
  storeDescription: 1.5,
};
/** Índice invertido con pesos por campo, para buscar productos y negocios. */
export function buildKnowledge(stores: BrainStore[]): Knowledge {
  const docs: BrainDoc[] = [];
  const index = new Map<string, Posting[]>();
  const add = (doc: number, text: string, weight: number) => {
    const seen = new Set<string>();
    for (const w of words(text)) {
      if (seen.has(w)) continue;
      seen.add(w);
      const list = index.get(w) ?? [];
      const last = list[list.length - 1];
      if (last?.doc === doc) last.weight = Math.max(last.weight, weight);
      else list.push({ doc, weight });
      index.set(w, list);
    }
  };
  stores.forEach((s, si) => {
    const sd = docs.push({ store: si, product: -1 }) - 1;
    add(sd, s.name, FIELD.storeName);
    add(sd, s.subcategory, FIELD.subcategory);
    add(sd, s.category, FIELD.category);
    add(sd, s.description, FIELD.storeDescription);
    s.products.forEach((p, pi) => {
      const pd = docs.push({ store: si, product: pi }) - 1;
      add(pd, p.name, FIELD.productName);
      add(pd, p.group, FIELD.productGroup);
      add(pd, p.details.map((d) => d.value).join(' '), FIELD.productDetail);
      add(pd, p.description, FIELD.productDescription);
      add(pd, `${s.subcategory} ${s.category}`, 1);
    });
  });
  return {
    stores,
    docs,
    index,
    vocab: [...index.keys()],
    names: stores.map((s, si) => ({
      store: si,
      text: plain(s.name)
        .replace(/[^a-z0-9ñ ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      roots: words(s.name),
    })),
  };
}
/** Palabras del índice que cuentan como el término: exacta, sinónimos, prefijos y parecidas. */
export function expandTerm(k: Knowledge, term: string): [string, number][] {
  const out = new Map<string, number>();
  const put = (w: string, weight: number) => out.set(w, Math.max(out.get(w) ?? 0, weight));
  if (k.index.has(term)) put(term, 1);
  for (const syn of synonymsOf(term))
    for (const part of syn.split(' ')) if (k.index.has(part)) put(part, 0.75);
  if (term.length >= 4)
    for (const w of k.vocab) {
      if (out.has(w)) continue;
      if (w.length >= 4 && (w.startsWith(term) || term.startsWith(w))) put(w, 0.8);
      else if (
        term.length >= 5 &&
        Math.abs(w.length - term.length) <= 2 &&
        similarity(w, term) >= 0.62
      )
        put(w, 0.6);
    }
  return [...out];
}
export function search(k: Knowledge, terms: string[]): Map<number, StoreHit> {
  const total = k.docs.length || 1;
  const perDoc = new Map<number, { score: number; matched: number }>();
  for (const term of terms) {
    const top = new Map<number, number>();
    const expansions = expandTerm(k, term);
    const own = k.index.get(term)?.length;
    const termIdf = own
      ? Math.log(1 + total / own)
      : Math.max(0, ...expansions.map(([w]) => Math.log(1 + total / k.index.get(w)!.length)));
    for (const [w, mw] of expansions) {
      const postings = k.index.get(w)!;
      const idf = termIdf;
      for (const p of postings) {
        const v = p.weight * mw * idf;
        if (v > (top.get(p.doc) ?? 0)) top.set(p.doc, v);
      }
    }
    for (const [doc, v] of top) {
      const cur = perDoc.get(doc) ?? { score: 0, matched: 0 };
      cur.score += v;
      cur.matched++;
      perDoc.set(doc, cur);
    }
  }
  const hits = new Map<number, StoreHit>();
  for (const [doc, { score, matched }] of perDoc) {
    const d = k.docs[doc];
    const value = score * (terms.length > 1 ? 0.55 + (0.45 * matched) / terms.length : 1);
    const cur = hits.get(d.store);
    if (!cur) {
      const products = new Map<number, number>();
      if (d.product >= 0) products.set(d.product, value);
      hits.set(d.store, { store: d.store, score: value, product: d.product, matched, products });
    } else {
      if (d.product >= 0) cur.products.set(d.product, value);
      if (value > cur.score && (d.product !== -1 || cur.product === -1)) {
        cur.product = d.product;
      }
      if (d.product !== -1 && cur.product === -1) cur.product = d.product;
      cur.score = Math.max(cur.score, value) + Math.min(cur.score, value) * 0.15;
      cur.matched = Math.max(cur.matched, matched);
    }
  }
  return hits;
}
/** Índice del negocio que la pregunta nombra (null si no nombra ninguno). */
export function storeNamed(k: Knowledge, question: string): number | null {
  const q = ` ${plain(question)
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')} `;
  let top: { store: number; score: number } | null = null;
  for (const n of k.names) {
    if (n.text.length >= 4 && q.includes(` ${n.text} `)) {
      const score = 10 + n.text.length;
      if (!top || score > top.score) top = { store: n.store, score };
      continue;
    }
    const distinct = n.roots.filter((r) => r.length >= 4 && !stopwords.has(r));
    if (distinct.length < 1) continue;
    const qWords = words(question);
    const found = distinct.filter((r) =>
      qWords.some((w) => w === r || (w.length >= 5 && similarity(w, r) >= 0.75)),
    );
    if (found.length === distinct.length && (distinct.length >= 2 || distinct[0].length >= 6)) {
      const score = found.length * 3;
      if (!top || score > top.score) top = { store: n.store, score };
    }
  }
  return top?.store ?? null;
}
