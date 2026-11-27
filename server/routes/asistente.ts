// POST /api/asistente: el Asistente SucreIA responde con los negocios publicados. No usa IA
// externa: entiende la pregunta y busca en la base de conocimiento (src/domain/brain).
import { Router } from 'express';
import type { Db } from '../db.ts';
import { HttpError } from '../http.ts';
import { currentUser } from '../auth.ts';
import { string } from '../platform.ts';
import { listStoresByOwner } from '../stores.ts';
import type { BrainSource } from '../brain.ts';
import { attemptLimiter } from './auth.ts';
import { answer } from '../../src/domain/brain/respond.ts';
import type { AnswerOptions, BrainContext, Query } from '../../src/domain/brain/types.ts';
import type { StoreProject } from '../../src/domain/studio.ts';

/** Campos de la búsqueda anterior que el navegador puede devolver, con su tipo. */
const queryKeys: Record<keyof Query, 'terms' | 'string' | 'number' | 'boolean'> = {
  terms: 'terms',
  town: 'string',
  region: 'string',
  sector: 'string',
  subcategory: 'string',
  mode: 'string',
  delivery: 'boolean',
  maxPrice: 'number',
  minPrice: 'number',
  people: 'number',
  openNow: 'boolean',
  day: 'number',
  sort: 'string',
  promo: 'boolean',
  verified: 'boolean',
  near: 'boolean',
};

/** El contexto viene del navegador: se acepta solo lo esperado y con tamaños acotados. */
function cleanContext(raw: unknown): BrainContext {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const id = (v: unknown) => (typeof v === 'string' && v.length <= 100 ? v : undefined);
  const ctx: BrainContext = {};
  if (Array.isArray(r.results))
    ctx.results = r.results
      .map(id)
      .filter((x): x is string => !!x)
      .slice(0, 20);
  if (id(r.focus)) ctx.focus = id(r.focus);
  if (typeof r.shown === 'number' && Number.isInteger(r.shown) && r.shown >= 0 && r.shown <= 200)
    ctx.shown = r.shown;
  if (r.products && typeof r.products === 'object')
    ctx.products = Object.fromEntries(
      Object.entries(r.products as Record<string, unknown>)
        .slice(0, 20)
        .filter(([k, v]) => id(k) && id(v))
        .map(([k, v]) => [k, v as string]),
    );
  if (r.query && typeof r.query === 'object') {
    const q = r.query as Record<string, unknown>;
    const query: Record<string, unknown> = {};
    for (const [key, type] of Object.entries(queryKeys)) {
      const v = q[key];
      if (type === 'terms')
        query[key] = Array.isArray(v)
          ? v.filter((t) => typeof t === 'string' && t.length <= 40).slice(0, 12)
          : [];
      else if (type === 'string') query[key] = typeof v === 'string' && v.length <= 80 ? v : '';
      else if (type === 'number')
        query[key] = typeof v === 'number' && Number.isFinite(v) ? v : key === 'day' ? -1 : 0;
      else query[key] = v === true;
    }
    if (!['relevance', 'cheap', 'best', 'expensive', 'near'].includes(query.sort as string))
      query.sort = 'relevance';
    if (!['', 'products', 'booking', 'quote'].includes(query.mode as string)) query.mode = '';
    ctx.query = query as unknown as Query;
  }
  return ctx;
}

/** Estado del negocio en palabras, para «¿cómo va mi negocio?». */
const statusLabel = (s: StoreProject) =>
  s.registration === 'rejected'
    ? 'Registro rechazado'
    : s.registration !== 'approved'
      ? s.publicationRequested
        ? 'En revisión'
        : 'Registro incompleto'
      : s.published
        ? 'Publicado'
        : 'Inactivo';

export function assistantRoutes(db: Db, brain: BrainSource) {
  const r = Router();
  // 40 preguntas por minuto y por IP: suficiente para conversar, no para extraer la base.
  const limiter = attemptLimiter(40);
  r.post('/', async (req, res) => {
    try {
      limiter(`asistente|${req.ip}|${Math.floor(Date.now() / 60_000)}`);
    } catch {
      throw new HttpError(429, 'Vas muy rápido. Espera un momento y vuelve a preguntar.');
    }
    const question = string(req.body?.question, 400, 'tu pregunta');
    const user = currentUser(res);
    const loc = req.body?.location;
    const location =
      loc &&
      typeof loc.lat === 'number' &&
      typeof loc.lng === 'number' &&
      Math.abs(loc.lat) <= 90 &&
      Math.abs(loc.lng) <= 180
        ? { lat: loc.lat as number, lng: loc.lng as number }
        : null;
    const store =
      typeof req.body?.store === 'string' && req.body.store.length <= 100
        ? (req.body.store as string)
        : undefined;
    const knowledge = await brain.knowledge();
    let myStores: AnswerOptions['myStores'];
    let admin: AnswerOptions['admin'];
    if (user && user.role !== 'cliente')
      myStores = (await listStoresByOwner(db, user.id)).map((s) => ({
        id: s.id,
        name: s.draft.name || 'Sin nombre',
        status: statusLabel(s),
      }));
    if (user?.role === 'admin') {
      const count = async (sql: string) =>
        Number((await db.prepare(sql).get<{ n: number }>())?.n ?? 0);
      admin = {
        pending: await count(
          "SELECT COUNT(*) AS n FROM stores WHERE registration <> 'approved' AND review_design IS NOT NULL",
        ),
        approved: await count("SELECT COUNT(*) AS n FROM stores WHERE registration = 'approved'"),
        pqrsPending: await count("SELECT COUNT(*) AS n FROM pqrs WHERE status = 'pending'"),
      };
    }
    const result = answer(question, cleanContext(req.body?.context), knowledge, {
      role: user?.role ?? 'visitante',
      location,
      myStores,
      admin,
      store,
    });
    res.json(result);
  });
  return r;
}
