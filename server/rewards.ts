// SucrePuntos más allá de las compras: reseñas, referidos, retos y ferias o eventos.
// El libro de puntos usa identificadores únicos («review:…», «referral:…»…), así que repetir
// una acción nunca paga dos veces.
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Db } from './db.ts';
import type { User } from './auth.ts';
import { HttpError } from './http.ts';
import {
  challenges,
  EVENT_CLAIM_DAYS,
  REFERRAL_CODE,
  REWARDS,
  type ChallengeProgress,
  type SucreEvent,
} from '../src/domain/rewards.ts';
import { municipalities } from '../src/domain/sectors.ts';
import { lessons } from '../src/features/community/lessons.ts';

const now = () => new Date().toISOString();
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

/** Suma puntos una sola vez por identificador; avisa a la persona si se acreditaron. */
export function award(db: Db, userId: string, id: string, amount: number, note: string) {
  const result = db
    .prepare('INSERT OR IGNORE INTO points_ledger VALUES (?,?,?,?,?)')
    .run(id, userId, amount, note, now());
  if (Number(result.changes) > 0)
    db.prepare(
      'INSERT INTO notifications (id,user_id,title,link,created_at) VALUES (?,?,?,?,?)',
    ).run(randomUUID(), userId, `+${amount} SucrePuntos: ${note}`, '/puntos', now());
  return Number(result.changes) > 0;
}

// --- Referidos ---------------------------------------------------------------------------
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function referralCode(db: Db, userId: string): string {
  const row = db.prepare('SELECT code FROM referral_codes WHERE user_id=?').get(userId);
  if (row) return row.code as string;
  for (;;) {
    const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    const r = db
      .prepare('INSERT OR IGNORE INTO referral_codes (user_id, code) VALUES (?,?)')
      .run(userId, code);
    if (Number(r.changes) > 0) return code;
  }
}
/** Registra quién invitó a una cuenta nueva. Un código inválido se ignora (no bloquea el registro). */
export function registerReferral(db: Db, userId: string, code: unknown) {
  if (typeof code !== 'string' || !REFERRAL_CODE.test(code.trim().toUpperCase())) return false;
  const inviter = db
    .prepare('SELECT user_id FROM referral_codes WHERE code=?')
    .get(code.trim().toUpperCase());
  if (!inviter || inviter.user_id === userId) return false;
  db.prepare(
    'INSERT OR IGNORE INTO referrals (user_id, inviter_id, created_at) VALUES (?,?,?)',
  ).run(userId, inviter.user_id as string, now());
  return true;
}
export function referralStats(db: Db, userId: string) {
  const invited = db
    .prepare('SELECT COUNT(*) AS n FROM referrals WHERE inviter_id=?')
    .get(userId) as {
    n: number;
  };
  const rewarded = db
    .prepare("SELECT COUNT(*) AS n FROM points_ledger WHERE user_id=? AND id LIKE 'referral:%'")
    .get(userId) as { n: number };
  return { invited: invited.n, rewarded: rewarded.n };
}

// --- Retos -------------------------------------------------------------------------------
function sectorOf(db: Db, storeId: string) {
  const row = db
    .prepare(
      'SELECT COALESCE(v.design, s.draft) AS design FROM stores s LEFT JOIN store_versions v ON v.id = s.published_version_id WHERE s.id=?',
    )
    .get(storeId);
  if (!row) return '';
  try {
    return String((JSON.parse(row.design as string) as { category?: string }).category ?? '');
  } catch {
    return '';
  }
}
export function challengeProgress(db: Db, userId: string): ChallengeProgress[] {
  const stores = db
    .prepare("SELECT DISTINCT store_id FROM operations WHERE client_id=? AND status='completed'")
    .all(userId)
    .map((r) => r.store_id as string);
  const sectors = new Set(stores.map((id) => sectorOf(db, id)).filter(Boolean));
  const reviews = (
    db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id=?').get(userId) as { n: number }
  ).n;
  const learned = db
    .prepare('SELECT lesson_id FROM learning WHERE user_id=?')
    .all(userId)
    .filter((r) => lessons.some((l) => l.id === r.lesson_id)).length;
  const value = { 'tres-sectores': sectors.size, 'tres-resenas': reviews, aprendiz: learned };
  return challenges.map((c) => ({
    ...c,
    progress: Math.min(c.goal, value[c.id]),
    done: value[c.id] >= c.goal,
  }));
}
export function checkChallenges(db: Db, userId: string) {
  for (const c of challengeProgress(db, userId))
    if (c.done)
      award(db, userId, `challenge:${c.id}`, REWARDS.challenge, `Reto cumplido: ${c.title}`);
}

/** Después de completar una compra o servicio: premio al que invitó (primera compra) y retos. */
export function afterCompleted(db: Db, clientId: string) {
  const ref = db.prepare('SELECT inviter_id FROM referrals WHERE user_id=?').get(clientId);
  if (ref) {
    const name = (
      db.prepare('SELECT name FROM users WHERE id=?').get(clientId) as { name: string } | undefined
    )?.name;
    award(
      db,
      ref.inviter_id as string,
      `referral:${clientId}`,
      REWARDS.referral,
      `${name ?? 'Tu invitado'} hizo su primera compra en SucreIA`,
    );
  }
  checkChallenges(db, clientId);
}
export function afterReview(db: Db, userId: string, operationId: string, storeName: string) {
  award(db, userId, `review:${operationId}`, REWARDS.review, `Reseña publicada en ${storeName}`);
  checkChallenges(db, userId);
}

// --- Ferias y eventos ----------------------------------------------------------------------
const hash = (code: string) => createHash('sha256').update(code.trim().toUpperCase()).digest();
const attempts = new Map<string, { n: number; at: number }>();
function str(v: unknown, max: number, label: string) {
  if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw new HttpError(400, `Revisa ${label}.`);
  return v.trim();
}
export function createEvent(db: Db, admin: User, body: Record<string, unknown> | undefined) {
  const b = body ?? {};
  const title = str(b.title, 120, 'el nombre del evento'),
    place = str(b.place, 120, 'el lugar'),
    municipality = str(b.municipality, 60, 'el municipio'),
    date = str(b.date, 10, 'la fecha'),
    code = str(b.code, 20, 'el código');
  if (!municipalities.includes(municipality))
    throw new HttpError(400, 'Elige un municipio de Sucre.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    throw new HttpError(400, 'Revisa la fecha.');
  if (code.length < 4) throw new HttpError(400, 'El código debe tener al menos 4 caracteres.');
  const points = Number(b.points);
  if (!Number.isInteger(points) || points < 1 || points > REWARDS.eventMax)
    throw new HttpError(400, `Los puntos deben estar entre 1 y ${REWARDS.eventMax}.`);
  const id = randomUUID();
  db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?)').run(
    id,
    title,
    place,
    municipality,
    date,
    points,
    hash(code).toString('hex'),
    admin.id,
    now(),
  );
  return id;
}
export function deleteEvent(db: Db, id: string) {
  if (!Number(db.prepare('DELETE FROM events WHERE id=?').run(id).changes))
    throw new HttpError(404, 'Evento no encontrado.');
}
/** Eventos de los últimos 30 días y próximos, con la asistencia de la cuenta (si hay sesión). */
export function listEvents(db: Db, userId?: string): SucreEvent[] {
  const from = new Date(Date.parse(today()) - 30 * 86_400_000).toISOString().slice(0, 10);
  return db
    .prepare(
      'SELECT e.id,e.title,e.place,e.municipality,e.date,e.points,a.user_id AS attended FROM events e LEFT JOIN event_attendance a ON a.event_id=e.id AND a.user_id=? WHERE e.date>=? ORDER BY e.date',
    )
    .all(userId ?? '', from)
    .map((r) => ({ ...(r as unknown as SucreEvent), attended: !!r.attended }));
}
export function attendEvent(db: Db, user: User, id: string, code: unknown) {
  const key = `${user.id}|${id}`;
  const tries = attempts.get(key);
  if (tries && tries.n >= 8 && Date.now() - tries.at < 15 * 60_000)
    throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  const row = db.prepare('SELECT * FROM events WHERE id=?').get(id);
  if (!row) throw new HttpError(404, 'Evento no encontrado.');
  const day = today();
  const last = new Date(Date.parse(row.date as string) + EVENT_CLAIM_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (day < (row.date as string)) throw new HttpError(409, 'El evento todavía no ha empezado.');
  if (day > last) throw new HttpError(409, 'Ya pasó el plazo para registrar la asistencia.');
  const given = typeof code === 'string' ? hash(code) : Buffer.alloc(32);
  if (!timingSafeEqual(given, Buffer.from(row.code_hash as string, 'hex'))) {
    attempts.set(key, { n: (tries?.n ?? 0) + 1, at: Date.now() });
    throw new HttpError(
      400,
      'El código no coincide. Pídelo en el punto de información del evento.',
    );
  }
  attempts.delete(key);
  db.prepare('INSERT OR IGNORE INTO event_attendance VALUES (?,?,?)').run(id, user.id, now());
  award(db, user.id, `event:${id}`, Number(row.points), `Participaste en ${row.title as string}`);
}
