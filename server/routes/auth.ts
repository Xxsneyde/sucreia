import { registerReferral } from '../rewards.ts';
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
  requireUser,
} from '../auth.ts';

import type { MailTransport } from '../mail.ts';
import { issueToken, consumeToken } from '../account-tokens.ts';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
// Hash de referencia para comparar aunque el correo no exista (mismo tiempo de respuesta).
const DUMMY_HASH = await hashPassword('contraseña-de-referencia');

/** Límite simple de intentos de ingreso por IP y correo (10 cada 15 minutos). */
function attemptLimiter(max = 10) {
  const attempts = new Map<string, { count: number; until: number }>();
  return (key: string) => {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || entry.until < now) {
      attempts.set(key, { count: 1, until: now + 15 * 60_000 });
      return;
    }
    entry.count++;
    if (entry.count > max)
      throw new HttpError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
  };
}

export function authRoutes(
  db: Db,
  secureCookies: boolean,
  mailbox?: MailTransport,
  registrationLimit = 60,
  linkLimit = 10,
) {
  const router = Router();
  const limit = attemptLimiter();
  const limitRegistration = attemptLimiter(registrationLimit);

  const limitMail = attemptLimiter(linkLimit);
  const limitConfirm = attemptLimiter(linkLimit);
  async function send(user: { id: string; email: string }, purpose: 'reset' | 'verify') {
    if (!mailbox) throw new HttpError(503, 'El envío de correos todavía no está configurado.');
    const { token, expiresAt } = await issueToken(db, user.id, purpose);
    await mailbox.send(user.email, purpose, token, expiresAt);
  }

  router.post('/recuperar', async (req, res) => {
    const email = text(req.body, 'email', 254, 'el correo').toLowerCase();
    if (!EMAIL.test(email)) throw new HttpError(400, 'Escribe un correo válido.');
    limitMail(`reset|${req.ip}`);
    if (!mailbox) throw new HttpError(503, 'El envío de correos todavía no está configurado.');
    const found = await findUserByEmail(db, email);
    if (found) {
      try {
        await send(found, 'reset');
      } catch {
        console.warn('No se pudo entregar un correo de recuperación.');
      }
    }
    res.json({
      message:
        'Si existe una cuenta con ese correo, recibirás un enlace para recuperar tu contraseña.',
    });
  });

  router.post('/restablecer', async (req, res) => {
    limitConfirm(`reset|${req.ip}`);
    const token = text(req.body, 'token', 128, 'el enlace');
    const password = text(req.body, 'password', 200, 'la contraseña');
    if (password.length < 8)
      throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const userId = await consumeToken(tx, token, 'reset');
      await tx.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
      await tx.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    });
    res.json({ message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' });
  });

  router.post('/solicitar-verificacion', async (req, res) => {
    const user = requireUser(res);
    limitMail(`verify|${user.id}`);
    if (!user.emailVerifiedAt) await send(user, 'verify');
    res.json({
      message: user.emailVerifiedAt
        ? 'Tu correo ya está verificado.'
        : 'Te enviamos un enlace para verificar tu correo.',
    });
  });

  router.post('/verificar-correo', async (req, res) => {
    limitConfirm(`verify|${req.ip}`);
    const token = text(req.body, 'token', 128, 'el enlace');
    await db.transaction(async (tx) => {
      const userId = await consumeToken(tx, token, 'verify');
      await tx
        .prepare('UPDATE users SET emailVerifiedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), userId);
    });
    res.json({ message: 'Tu correo quedó verificado.' });
  });

  router.post('/registro', async (req, res) => {
    limitRegistration(req.ip ?? 'unknown');
    const email = text(req.body, 'email', 254, 'el correo').toLowerCase();
    const name = text(req.body, 'name', 80, 'tu nombre');
    const password = text(req.body, 'password', 200, 'la contraseña');
    const role = req.body?.role === 'emprendedor' ? 'emprendedor' : ('cliente' as Role);
    if (!EMAIL.test(email)) throw new HttpError(400, 'Escribe un correo válido.');
    if (password.length < 8)
      throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');
    if (await findUserByEmail(db, email))
      throw new HttpError(409, 'Ya existe una cuenta con ese correo.');
    const user = await createUser(db, {
      email,
      name,
      role,
      passwordHash: await hashPassword(password),
    });
    // Código de quien invitó (opcional): premia al que invita cuando esta cuenta compre.
    await registerReferral(db, user.id, req.body?.referido);
    let verificationSent = false;
    if (mailbox) {
      try {
        await send(user, 'verify');
        verificationSent = true;
      } catch {
        console.warn('No se pudo entregar un correo de verificación.');
      }
    }
    const session = await createSession(db, user.id);
    setSessionCookie(res, session.token, session.expires, secureCookies);
    res.status(201).json({ user, verificationSent });
  });

  router.post('/ingresar', async (req, res) => {
    const email = text(req.body, 'email', 254, 'el correo').toLowerCase();
    const password = text(req.body, 'password', 200, 'la contraseña');
    limit(`${req.ip}|${email}`);
    const found = await findUserByEmail(db, email);
    const ok = await verifyPassword(password, found?.password_hash ?? DUMMY_HASH);
    if (!found || !ok) throw new HttpError(401, 'Correo o contraseña incorrectos.');
    const session = await createSession(db, found.id);
    setSessionCookie(res, session.token, session.expires, secureCookies);
    const { password_hash: _hash, ...user } = found;
    res.json({ user });
  });

  router.post('/emprender', async (_req, res) => {
    const user = requireUser(res);
    await db
      .prepare("UPDATE users SET role='emprendedor' WHERE id=? AND role='cliente'")
      .run(user.id);
    res.status(204).end();
  });
  router.put('/perfil', async (req, res) => {
    const user = requireUser(res);
    const name = text(req.body, 'name', 80, 'tu nombre');
    await db.prepare('UPDATE users SET name=? WHERE id=?').run(name, user.id);
    res.status(204).end();
  });

  router.post('/salir', async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await deleteSession(db, token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  });

  router.get('/yo', (_req, res) => {
    res.json({ user: currentUser(res) ?? null });
  });

  return router;
}
