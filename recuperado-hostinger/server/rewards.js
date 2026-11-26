// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { createHash as createHash5, randomInt as randomInt2, randomUUID as randomUUID6, timingSafeEqual as timingSafeEqual2 } from "node:crypto";


// --- (continuación en el bundle) ---
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(/* @__PURE__ */ new Date());
async function award(db2, userId, id, amount, note) {
  const result = await db2.prepare("INSERT OR IGNORE INTO points_ledger VALUES (?,?,?,?,?)").run(id, userId, amount, note, now());
  if (result.changes > 0)
    await db2.prepare("INSERT INTO notifications (id,user_id,title,link,created_at) VALUES (?,?,?,?,?)").run(randomUUID6(), userId, `+${amount} SucrePuntos: ${note}`, "/puntos", now());
  return result.changes > 0;
}
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
async function referralCode(db2, userId) {
  const row = await db2.prepare("SELECT code FROM referral_codes WHERE user_id=?").get(userId);
  if (row) return row.code;
  for (; ; ) {
    const code = Array.from({ length: 6 }, () => ALPHABET[randomInt2(ALPHABET.length)]).join("");
    const r = await db2.prepare("INSERT OR IGNORE INTO referral_codes (user_id, code) VALUES (?,?)").run(userId, code);
    if (r.changes > 0) return code;
    const again = await db2.prepare("SELECT code FROM referral_codes WHERE user_id=?").get(userId);
    if (again) return again.code;
  }
}
async function registerReferral(db2, userId, code) {
  if (typeof code !== "string" || !REFERRAL_CODE.test(code.trim().toUpperCase())) return false;
  const inviter = await db2.prepare("SELECT user_id FROM referral_codes WHERE code=?").get(code.trim().toUpperCase());
  if (!inviter || inviter.user_id === userId) return false;
  await db2.prepare("INSERT OR IGNORE INTO referrals (user_id, inviter_id, created_at) VALUES (?,?,?)").run(userId, inviter.user_id, now());
  return true;
}
async function referralStats(db2, userId) {
  const [invited, rewarded] = await Promise.all([
    db2.prepare("SELECT COUNT(*) AS n FROM referrals WHERE inviter_id=?").get(userId),
    db2.prepare("SELECT COUNT(*) AS n FROM points_ledger WHERE user_id=? AND id LIKE 'referral:%'").get(userId)
  ]);
  return { invited: invited?.n ?? 0, rewarded: rewarded?.n ?? 0 };
}
async function challengeProgress(db2, userId) {
  const [designs, reviews, learned] = await Promise.all([
    db2.prepare(
      "SELECT COALESCE(v.design, s.draft) AS design FROM stores s LEFT JOIN store_versions v ON v.id = s.published_version_id WHERE s.id IN (SELECT DISTINCT store_id FROM operations WHERE client_id=? AND status='completed')"
    ).all(userId),
    db2.prepare("SELECT COUNT(*) AS n FROM reviews WHERE user_id=?").get(userId),
    db2.prepare("SELECT lesson_id FROM learning WHERE user_id=?").all(userId)
  ]);
  const sectors2 = new Set(
    designs.map((r) => {
      try {
        return String(JSON.parse(r.design).category ?? "");
      } catch {
        return "";
      }
    }).filter(Boolean)
  );
  const value = {
    "tres-sectores": sectors2.size,
    "tres-resenas": reviews?.n ?? 0,
    aprendiz: learned.filter((r) => lessons.some((l) => l.id === r.lesson_id)).length
  };
  return challenges.map((c) => ({
    ...c,
    progress: Math.min(c.goal, value[c.id]),
    done: value[c.id] >= c.goal
  }));
}
async function checkChallenges(db2, userId) {
  for (const c of await challengeProgress(db2, userId))
    if (c.done)
      await award(db2, userId, `challenge:${c.id}`, REWARDS.challenge, `Reto cumplido: ${c.title}`);
}
async function afterCompleted(db2, clientId) {
  const ref = await db2.prepare("SELECT inviter_id FROM referrals WHERE user_id=?").get(clientId);
  if (ref) {
    const name = (await db2.prepare("SELECT name FROM users WHERE id=?").get(clientId))?.name;
    await award(
      db2,
      ref.inviter_id,
      `referral:${clientId}`,
      REWARDS.referral,
      `${name ?? "Tu invitado"} hizo su primera compra en SucreIA`
    );
  }
  await checkChallenges(db2, clientId);
}
async function afterReview(db2, userId, operationId, storeName) {
  await award(
    db2,
    userId,
    `review:${operationId}`,
    REWARDS.review,
    `Rese\xF1a publicada en ${storeName}`
  );
  await checkChallenges(db2, userId);
}
var hash2 = (code) => createHash5("sha256").update(code.trim().toUpperCase()).digest();
var attempts = /* @__PURE__ */ new Map();
function str(v, max, label) {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw new HttpError(400, `Revisa ${label}.`);
  return v.trim();
}
async function createEvent(db2, admin, body) {
  const b = body ?? {};
  const title = str(b.title, 120, "el nombre del evento"), place = str(b.place, 120, "el lugar"), municipality = str(b.municipality, 60, "el municipio"), date = str(b.date, 10, "la fecha"), code = str(b.code, 20, "el c\xF3digo");
  if (!municipalities.includes(municipality))
    throw new HttpError(400, "Elige un municipio de Sucre.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    throw new HttpError(400, "Revisa la fecha.");
  if (code.length < 4) throw new HttpError(400, "El c\xF3digo debe tener al menos 4 caracteres.");
  const points2 = Number(b.points);
  if (!Number.isInteger(points2) || points2 < 1 || points2 > REWARDS.eventMax)
    throw new HttpError(400, `Los puntos deben estar entre 1 y ${REWARDS.eventMax}.`);
  const id = randomUUID6();
  await db2.prepare("INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?)").run(id, title, place, municipality, date, points2, hash2(code).toString("hex"), admin.id, now());
  return id;
}
async function deleteEvent(db2, id) {
  if (!(await db2.prepare("DELETE FROM events WHERE id=?").run(id)).changes)
    throw new HttpError(404, "Evento no encontrado.");
}
async function listEvents(db2, userId) {
  const from = new Date(Date.parse(today()) - 30 * 864e5).toISOString().slice(0, 10);
  const rows = await db2.prepare(
    "SELECT e.id,e.title,e.place,e.municipality,e.date,e.points,a.user_id AS attended FROM events e LEFT JOIN event_attendance a ON a.event_id=e.id AND a.user_id=? WHERE e.date>=? ORDER BY e.date"
  ).all(userId ?? "", from);
  return rows.map((r) => ({ ...r, attended: !!r.attended }));
}
async function attendEvent(db2, user, id, code) {
  const key = `${user.id}|${id}`;
  const tries = attempts.get(key);
  if (tries && tries.n >= 8 && Date.now() - tries.at < 15 * 6e4)
    throw new HttpError(429, "Demasiados intentos. Espera unos minutos.");
  const row = await db2.prepare("SELECT * FROM events WHERE id=?").get(id);
  if (!row) throw new HttpError(404, "Evento no encontrado.");
  const day = today();
  const last = new Date(Date.parse(row.date) + EVENT_CLAIM_DAYS * 864e5).toISOString().slice(0, 10);
  if (day < row.date) throw new HttpError(409, "El evento todav\xEDa no ha empezado.");
  if (day > last) throw new HttpError(409, "Ya pas\xF3 el plazo para registrar la asistencia.");
  const given = typeof code === "string" ? hash2(code) : Buffer.alloc(32);
  if (!timingSafeEqual2(given, Buffer.from(row.code_hash, "hex"))) {
    attempts.set(key, { n: (tries?.n ?? 0) + 1, at: Date.now() });
    throw new HttpError(
      400,
      "El c\xF3digo no coincide. P\xEDdelo en el punto de informaci\xF3n del evento."
    );
  }
  attempts.delete(key);
  await db2.prepare("INSERT OR IGNORE INTO event_attendance VALUES (?,?,?)").run(id, user.id, now());
  await award(
    db2,
    user.id,
    `event:${id}`,
    Number(row.points),
    `Participaste en ${row.title}`
  );
}
