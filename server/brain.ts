// Fuente de datos del Asistente SucreIA: arma la base de conocimiento con los negocios publicados
// (diseño, horario, valoraciones, promociones) y la guarda dos minutos.
import type { Db } from './db.ts';
import { listPublishedStores } from './stores.ts';
import { settingsMany, storeSummaries } from './platform.ts';
import { buildKnowledge, servesFrom } from '../src/domain/brain/knowledge.ts';
import { parseHours } from '../src/domain/brain/schedule.ts';
import type { BrainStore, Knowledge, Week } from '../src/domain/brain/types.ts';
import type { Promotion } from '../src/domain/platform.ts';
import { subregionFor } from '../src/domain/sectors.ts';

const TTL_MS = 120_000;

export function brainSource(db: Db) {
  let cache: { at: number; knowledge: Knowledge } | null = null;
  let building: Promise<Knowledge> | null = null;

  async function build(): Promise<Knowledge> {
    const published = await listPublishedStores(db);
    const ids = published.map((s) => s.id);
    if (!ids.length) return buildKnowledge([]);
    const marks = ids.map(() => '?').join(',');
    const [summaries, cfgs, productStats, reviews, promos] = await Promise.all([
      storeSummaries(db, ids),
      settingsMany(db, ids),
      db
        .prepare(
          `SELECT store_id, product_id, COUNT(*) AS n, AVG(rating) AS rating FROM product_reviews WHERE store_id IN (${marks}) GROUP BY store_id, product_id`,
        )
        .all(...ids),
      db
        .prepare(
          `SELECT r.store_id, u.name, r.rating, r.comment FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id IN (${marks}) AND r.comment <> '' ORDER BY r.created_at DESC LIMIT 600`,
        )
        .all(...ids),
      db
        .prepare(`SELECT store_id, payload FROM promotions WHERE store_id IN (${marks})`)
        .all(...ids),
    ]);
    const now = Date.now();
    const stores = published.map((s): BrainStore => {
      const d = s.published!.design;
      const cfg = cfgs.get(s.id);
      const sum = summaries.get(s.id);
      // El horario configurado en el panel manda; si no hay, se lee el texto del diseño.
      const week: Week | null = cfg?.week?.length === 7 ? cfg.week : parseHours(d.hours);
      const ratingOf = (productId: string) =>
        productStats.find((r) => r.store_id === s.id && r.product_id === productId);
      return {
        id: s.id,
        name: d.name,
        category: d.category,
        subcategory: d.subcategory ?? '',
        municipality: d.municipality,
        region: subregionFor(d.municipality)?.id ?? '',
        mode: d.mode,
        description: [d.description, d.content?.storyText].filter(Boolean).join(' '),
        address: d.address,
        whatsapp: d.whatsapp,
        phone: d.phone ?? '',
        email: d.email ?? '',
        hours: d.hours,
        week,
        delivery: !!cfg?.delivery,
        deliveryFee: cfg?.deliveryFee ?? 0,
        rating: sum?.reviewCount ? sum.rating : null,
        reviewCount: sum?.reviewCount ?? 0,
        verified: !!sum?.verified,
        discount: sum?.discount ?? 0,
        promotions: promos
          .filter((r) => r.store_id === s.id)
          .map((r) => JSON.parse(String(r.payload)) as Promotion)
          .filter((p) => p.active && Date.parse(p.expires) > now)
          .map((p) => ({ title: p.title, percent: p.percent, expires: p.expires })),
        lat: sum?.lat ?? null,
        lng: sum?.lng ?? null,
        logo: d.logo,
        cover: d.content?.heroImage ?? '',
        social: { instagram: d.instagram, facebook: d.facebook, tiktok: d.tiktok },
        reviews: reviews
          .filter((r) => r.store_id === s.id)
          .slice(0, 3)
          .map((r) => ({
            name: String(r.name),
            rating: Number(r.rating),
            comment: String(r.comment),
          })),
        products: d.products.map((p) => {
          const st = ratingOf(p.id);
          const details = p.details ?? [];
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            group: p.category ?? '',
            details,
            image: p.image,
            rating: st ? Math.round(Number(st.rating) * 10) / 10 : null,
            ratingCount: st ? Number(st.n) : 0,
            serves: servesFrom([
              p.name,
              ...details.map((x) => `${x.value} ${x.label}`),
              p.description,
            ]),
          };
        }),
      };
    });
    return buildKnowledge(stores);
  }

  return {
    /** Base de conocimiento actual (se arma una sola vez aunque lleguen varias preguntas a la vez). */
    async knowledge(): Promise<Knowledge> {
      if (cache && Date.now() - cache.at < TTL_MS) return cache.knowledge;
      building ??= build()
        .then((knowledge) => {
          cache = { at: Date.now(), knowledge };
          return knowledge;
        })
        .finally(() => {
          building = null;
        });
      return building;
    },
    /** Olvida lo armado (al publicar, retirar o aprobar un negocio). */
    invalidate() {
      cache = null;
    },
  };
}
export type BrainSource = ReturnType<typeof brainSource>;
