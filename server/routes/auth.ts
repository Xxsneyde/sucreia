import { Router } from 'express';
import type { Db } from '../db.ts';
import { HttpError, text } from '../http.ts';
import {
  SESSION_COOKIE,
  createSession,
  createUser,
  currentUser,
  deleteSession,
  findUserByEmail,
  hashPassword,
  readCookie,
  setSessionCookie,
  verifyPassword,
  type Role,
} from '../auth.ts';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
// Hash de referencia para comparar aunque el correo no exista (mismo tiempo de respuesta).
const DUMMY_HASH = await hashPassword('contraseña-de-referencia');

/** Límite simple de intentos de ingreso por IP y correo (10 cada 15 minutos). */
function attemptLimiter() {
  const attempts = new Map<string, { count: number; until: number }>();
  return (key: string) => {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || entry.until < now) {
      attempts.set(key, { count: 1, until: now + 15 * 60_000 });
      return;
    }
    entry.count++;
    if (entry.count > 10)
      throw new HttpError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
  };
}

export function authRoutes(db: Db, secureCookies: boolean) {
  const router = Router();
  const limit = attemptLimiter();

  router.post('/registro', async (req, res) => {
    const email = text(req.body, 'email', 254, 'el correo').toLowerCase();
    const name = text(req.body, 'name', 80, 'tu nombre');
    const password = text(req.body, 'password', 200, 'la contraseña');
    const role = req.body?.role === 'emprendedor' ? 'emprendedor' : ('cliente' as Role);
    if (!EMAIL.test(email)) throw new HttpError(400, 'Escribe un correo válido.');
    if (password.length < 8)
      throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');
    if (findUserByEmail(db, email))
      throw new HttpError(409, 'Ya existe una cuenta con ese correo.');
    const user = createUser(db, { email, name, role, passwordHash: await hashPassword(password) });
    const session = createSession(db, user.id);
    setSessionCookie(res, session.token, session.expires, secureCookies);
    res.status(201).json({ user });
  });

  router.post('/ingresar', async (req, res) => {
    const email = text(req.body, 'email', 254, 'el correo').toLowerCase();
    const password = text(req.body, 'password', 200, 'la contraseña');
    limit(`${req.ip}|${email}`);
    const found = findUserByEmail(db, email);
    const ok = await verifyPassword(password, found?.password_hash ?? DUMMY_HASH);
    if (!found || !ok) throw new HttpError(401, 'Correo o contraseña incorrectos.');
    const session = createSession(db, found.id);
    setSessionCookie(res, session.token, session.expires, secureCookies);
    const { password_hash: _hash, ...user } = found;
    res.json({ user });
  });

  router.post('/salir', (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) deleteSession(db, token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  });

  router.get('/yo', (_req, res) => {
    res.json({ user: currentUser(res) ?? null });
  });

  return router;
}
