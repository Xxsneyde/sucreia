// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { createHash as createHash2, randomBytes, randomUUID as randomUUID2, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
var scryptAsync = promisify(scrypt);
var SESSION_COOKIE = "sucreia_sesion";
var SESSION_DAYS = 30;
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}
async function verifyPassword(password, stored) {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}
var hashToken = (token) => createHash2("sha256").update(token).digest("hex");
async function createUser(db2, data) {
  const now3 = (/* @__PURE__ */ new Date()).toISOString();
  const complete = !!(data.name && data.documentNumber && data.address);
  const user = {
    id: randomUUID2(),
    email: data.email,
    name: data.name,
    role: data.role,
    emailVerifiedAt: data.emailVerified ? now3 : null,
    profileComplete: complete,
    verifyChannel: data.verifyChannel ?? "email",
    phone: data.phone ?? null
  };
  await db2.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, created_at, document_number, home_address, emailVerifiedAt, profile_completed_at, verify_channel, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    user.id,
    user.email,
    user.name,
    data.passwordHash,
    user.role,
    now3,
    data.documentNumber ?? null,
    data.address ?? null,
    user.emailVerifiedAt,
    complete ? now3 : null,
    user.verifyChannel,
    user.phone
  );
  return user;
}
var toUser = ({ profile_completed_at, ...row }) => ({
  ...row,
  profileComplete: !!profile_completed_at
});
async function findUserByEmail(db2, email) {
  const row = await db2.prepare(
    "SELECT id, email, name, role, emailVerifiedAt, profile_completed_at, verify_channel AS verifyChannel, phone, password_hash FROM users WHERE email = ?"
  ).get(email);
  if (!row) return void 0;
  const { password_hash, ...rest } = row;
  return { ...toUser(rest), password_hash };
}
async function findUserById(db2, id) {
  const row = await db2.prepare(
    "SELECT id, email, name, role, emailVerifiedAt, profile_completed_at, verify_channel AS verifyChannel, phone FROM users WHERE id = ?"
  ).get(id);
  return row ? toUser(row) : void 0;
}
async function createSession(db2, userId) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db2.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(hashToken(token), userId, expires.toISOString());
  return { token, expires };
}
async function deleteSession(db2, token) {
  await db2.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
async function sessionUser(db2, token) {
  const row = await db2.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.emailVerifiedAt, u.profile_completed_at, u.verify_channel AS verifyChannel, u.phone FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
  ).get(hashToken(token), (/* @__PURE__ */ new Date()).toISOString());
  return row ? toUser(row) : void 0;
}
function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return void 0;
}
function setSessionCookie(res, token, expires, secure) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires,
    path: "/"
  });
}
function loadUser(db2) {
  return async (req, res, next) => {
    try {
      const token = readCookie(req, SESSION_COOKIE);
      res.locals.user = token ? await sessionUser(db2, token) : void 0;
      next();
    } catch (error) {
      next(error);
    }
  };
}
function currentUser(res) {
  return res.locals.user;
}
function requireUser(res, ...roles) {
  const user = currentUser(res);
  if (!user) throw new HttpError(401, "Inicia sesi\xF3n para continuar.");
  if (roles.length && !roles.includes(user.role))
    throw new HttpError(403, "Tu cuenta no tiene permiso para esta acci\xF3n.");
  return user;
}
