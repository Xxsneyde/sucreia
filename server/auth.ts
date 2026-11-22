// Cuentas y sesiones. Contraseñas con scrypt (node:crypto) y sesiones en cookie httpOnly;
// en la base de datos solo se guarda el hash del token de sesión.
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import type { Db } from './db.ts';
import { HttpError } from './http.ts';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export type Role = 'cliente' | 'emprendedor' | 'admin';
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerifiedAt: string | null;
}
export const SESSION_COOKIE = 'sucreia_sesion';
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createUser(
  db: Db,
  data: { email: string; name: string; passwordHash: string; role: Role },
): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: data.email,
    name: data.name,
    role: data.role,
    emailVerifiedAt: null,
  };
  await db
    .prepare(
      'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(user.id, user.email, user.name, data.passwordHash, user.role, new Date().toISOString());
  return user;
}
export function findUserByEmail(db: Db, email: string) {
  return db
    .prepare(
      'SELECT id, email, name, role, emailVerifiedAt, password_hash FROM users WHERE email = ?',
    )
    .get<User & { password_hash: string }>(email);
}

export async function createSession(
  db: Db,
  userId: string,
): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, expires.toISOString());
  return { token, expires };
}
export async function deleteSession(db: Db, token: string) {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}
function sessionUser(db: Db, token: string): Promise<User | undefined> {
  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.emailVerifiedAt FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get<User>(hashToken(token), new Date().toISOString());
}

/** Lee la cookie de sesión sin dependencias extra. */
export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}
export function setSessionCookie(res: Response, token: string, expires: Date, secure: boolean) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    expires,
    path: '/',
  });
}

/** Middleware: deja el usuario de la sesión (si hay) en res.locals.user. */
export function loadUser(db: Db) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = readCookie(req, SESSION_COOKIE);
      res.locals.user = token ? await sessionUser(db, token) : undefined;
      next();
    } catch (error) {
      next(error);
    }
  };
}
export function currentUser(res: Response): User | undefined {
  return res.locals.user as User | undefined;
}
/** Exige sesión (y opcionalmente uno de los roles). Devuelve el usuario. */
export function requireUser(res: Response, ...roles: Role[]): User {
  const user = currentUser(res);
  if (!user) throw new HttpError(401, 'Inicia sesión para continuar.');
  if (roles.length && !roles.includes(user.role))
    throw new HttpError(403, 'Tu cuenta no tiene permiso para esta acción.');
  return user;
}
