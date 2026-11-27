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
  findUserById,
  hashPassword,
  readCookie,
  setSessionCookie,
  verifyPassword,
  type Role,
  type User,
  requireUser,
} from '../auth.ts';

import type { MailTransport } from '../mail.ts';
import { issueToken, consumeToken } from '../account-tokens.ts';
import { hashCode, maskPhone, newCode, smsPhone, type SmsTransport } from '../sms.ts';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
// Hash de referencia para comparar aunque el correo no exista (mismo tiempo de respuesta).
const DUMMY_HASH = await hashPassword('contraseña-de-referencia');

/**
 * Límite simple de intentos por clave (10 cada 15 minutos por defecto). Las entradas vencidas se
 * limpian de vez en cuando para que la memoria no crezca sin fin.
 */
export function attemptLimiter(max = 10) {
  const attempts = new Map<string, { count: number; until: number }>();
  let sweep = 0;
  return (key: string) => {
    const now = Date.now();
    if (attempts.size > 5000 && now - sweep > 60_000) {
      sweep = now;
      for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    }
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
  sms?: SmsTransport,
  loginIpLimit = 50,
) {
  const router = Router();
  const limit = attemptLimiter();
  // Además del límite por IP y correo: por cuenta (desde muchas IP) y por IP (muchas cuentas).
  const limitAccount = attemptLimiter(20);
  const limitLoginIp = attemptLimiter(loginIpLimit);
  const limitRegistration = attemptLimiter(registrationLimit);

  const limitMail = attemptLimiter(linkLimit);
  const limitConfirm = attemptLimiter(linkLimit);
  const CODE_MINUTES = 10;
  const limitSms = attemptLimiter(5);

  /** Envía un código de 6 dígitos por SMS (uno por minuto; se guarda solo su hash). */
  async function sendCode(user: User, phone: string) {
    if (!sms)
      throw new HttpError(
        503,
        'La confirmación por mensaje de texto todavía no está activa. Elige confirmar por correo.',
      );
    const last = await db
      .prepare('SELECT sent_at FROM sms_codes WHERE user_id=?')
      .get<{ sent_at: string }>(user.id);
    if (last && Date.now() - Date.parse(last.sent_at) < 60_000)
      throw new HttpError(429, 'Espera un minuto antes de pedir otro código.');
    limitSms(`sms|${user.id}`);
    const code = newCode();
    const now = new Date();
    await db.prepare('DELETE FROM sms_codes WHERE user_id=?').run(user.id);
    await db
      .prepare(
        'INSERT INTO sms_codes (user_id, phone, code_hash, expires_at, attempts, sent_at) VALUES (?,?,?,?,0,?)',
      )
      .run(
        user.id,
        phone,
        hashCode(user.id, code),
        new Date(now.getTime() + CODE_MINUTES * 60_000).toISOString(),
        now.toISOString(),
      );
    try {
      // Sin tildes: algunos operadores cobran doble o cortan los mensajes con caracteres especiales.
      await sms.send(
        phone,
        `SucreIA: tu codigo para confirmar la cuenta es ${code}. Vence en ${CODE_MINUTES} minutos. No lo compartas.`,
      );
    } catch {
      await db.prepare('DELETE FROM sms_codes WHERE user_id=?').run(user.id);
      throw new HttpError(
        502,
        'No pudimos enviar el mensaje de texto. Revisa el número o confirma por correo.',
      );
    }
  }
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
    const userId = await db.transaction(async (tx) => {
      const id = await consumeToken(tx, token, 'verify');
      await tx
        .prepare('UPDATE users SET emailVerifiedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), id);
      return id;
    });
    // El correo se devuelve para completar el formulario de ingreso si el enlace se abrió en
    // otro navegador.
    const user = await findUserById(db, userId);
    res.json({ message: 'Tu correo quedó confirmado.', email: user?.email ?? '' });
  });

  router.get('/sms/estado', (_req, res) => res.json({ enabled: !!sms }));

  router.post('/verificar-sms', async (req, res) => {
    const user = requireUser(res);
    limitConfirm(`sms-check|${user.id}`);
    const code = text(req.body, 'code', 12, 'el código').replace(/\D/g, '');
    const row = await db
      .prepare('SELECT code_hash, expires_at, attempts FROM sms_codes WHERE user_id=?')
      .get<{ code_hash: string; expires_at: string; attempts: number }>(user.id);
    if (!row || Date.parse(row.expires_at) < Date.now())
      throw new HttpError(410, 'El código venció. Pide uno nuevo.');
    if (row.attempts >= 5) throw new HttpError(429, 'Demasiados intentos. Pide un código nuevo.');
    if (row.code_hash !== hashCode(user.id, code)) {
      await db.prepare('UPDATE sms_codes SET attempts = attempts + 1 WHERE user_id=?').run(user.id);
      throw new HttpError(400, 'El código no es correcto.');
    }
    await db.transaction(async (tx) => {
      await tx
        .prepare('UPDATE users SET emailVerifiedAt = COALESCE(emailVerifiedAt, ?) WHERE id = ?')
        .run(new Date().toISOString(), user.id);
      await tx.prepare('DELETE FROM sms_codes WHERE user_id=?').run(user.id);
    });
    res.json({ message: 'Tu cuenta quedó confirmada.', email: user.email });
  });

  /** Elegir (o cambiar) cómo confirmar la cuenta y enviar el enlace o el código. */
  router.post('/verificacion', async (req, res) => {
    const user = requireUser(res);
    if (user.emailVerifiedAt) {
      res.json({ message: 'Tu cuenta ya está confirmada.' });
      return;
    }
    const channel = req.body?.channel === 'sms' ? 'sms' : 'email';
    if (channel === 'sms') {
      const phone = smsPhone(req.body?.phone) ?? user.phone;
      if (!phone)
        throw new HttpError(400, 'Escribe un celular válido con el indicativo de su país.');
      await sendCode(user, phone);
      await db
        .prepare("UPDATE users SET verify_channel='sms', phone=? WHERE id=?")
        .run(phone, user.id);
      res.json({ message: `Te enviamos un código al ${maskPhone(phone)}.` });
      return;
    }
    limitMail(`verify|${user.id}`);
    await db.prepare("UPDATE users SET verify_channel='email' WHERE id=?").run(user.id);
    await send(user, 'verify');
    res.json({ message: 'Te enviamos un enlace para confirmar tu correo.' });
  });

  router.post('/registro', async (req, res) => {
    limitRegistration(req.ip ?? 'unknown');
    const email = text(req.body, 'email', 254, 'el correo').toLowerCase();
    const password = text(req.body, 'password', 200, 'la contraseña');
    const role = req.body?.role === 'emprendedor' ? 'emprendedor' : ('cliente' as Role);
    if (!EMAIL.test(email)) throw new HttpError(400, 'Escribe un correo válido.');
    if (password.length < 8)
      throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');
    // Los datos personales se piden después de confirmar la cuenta (completar perfil); si vienen
    // aquí, se guardan.
    const optional = (key: string, max: number) =>
      typeof req.body?.[key] === 'string' ? (req.body[key] as string).trim().slice(0, max) : '';
    const name = optional('name', 80);
    const documentNumber = optional('documentNumber', 12);
    const address = optional('address', 180);
    if (documentNumber && !/^\d{5,12}$/.test(documentNumber))
      throw new HttpError(400, 'Escribe la cédula sin puntos ni espacios.');
    const viaSms = req.body?.verifyBy === 'sms';
    const phone = viaSms ? smsPhone(req.body?.phone) : null;
    if (viaSms && !phone)
      throw new HttpError(400, 'Escribe un celular válido con el indicativo de su país.');
    if (viaSms && !sms)
      throw new HttpError(
        503,
        'La confirmación por mensaje de texto todavía no está activa. Elige confirmar por correo.',
      );
    if (await findUserByEmail(db, email))
      throw new HttpError(409, 'Ya existe una cuenta con ese correo.');
    const user = await createUser(db, {
      verifyChannel: viaSms ? 'sms' : 'email',
      phone,
      email,
      name,
      role,
      documentNumber: documentNumber || undefined,
      address: address || undefined,
      passwordHash: await hashPassword(password),
    });
    // Código de quien invitó (opcional): premia al que invita cuando esta cuenta compre.
    await registerReferral(db, user.id, req.body?.referido);
    let verificationSent = false;
    if (phone) {
      try {
        await sendCode(user, phone);
        verificationSent = true;
      } catch {
        console.warn('No se pudo enviar el código por SMS.');
      }
    } else if (mailbox) {
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
    limitAccount(`cuenta|${email}`);
    limitLoginIp(`ip|${req.ip}`);
    limit(`${req.ip}|${email}`);
    const found = await findUserByEmail(db, email);
    const ok = await verifyPassword(password, found?.password_hash ?? DUMMY_HASH);
    if (!found || !ok) throw new HttpError(401, 'Correo o contraseña incorrectos.');
    const session = await createSession(db, found.id);
    setSessionCookie(res, session.token, session.expires, secureCookies);
    const { password_hash: _hash, ...user } = found;
    res.json({ user });
  });

  router.post('/emprender', async (req, res) => {
    const user = requireUser(res);
    // Pasar a emprendedor no tiene vuelta atrás: el cliente debe aceptarlo expresamente.
    if (user.role === 'cliente' && req.body?.aceptoDejarDeSerCliente !== true)
      throw new HttpError(
        400,
        'Acepta que al pasar a emprendedor tu cuenta deja de ser de cliente y no podrás volver.',
      );
    await db
      .prepare("UPDATE users SET role='emprendedor' WHERE id=? AND role='cliente'")
      .run(user.id);
    res.status(204).end();
  });
  /** Completar el perfil (nombre, cédula y dirección) después de confirmar la cuenta. */
  router.put('/perfil/datos', async (req, res) => {
    const user = requireUser(res);
    if (!user.emailVerifiedAt) throw new HttpError(403, 'Primero confirma tu correo.');
    const name = text(req.body, 'name', 80, 'tu nombre completo');
    const documentNumber = text(req.body, 'documentNumber', 12, 'el número de cédula');
    if (!/^\d{5,12}$/.test(documentNumber))
      throw new HttpError(400, 'Escribe la cédula sin puntos ni espacios.');
    const address = text(req.body, 'address', 180, 'la dirección');
    await db
      .prepare(
        'UPDATE users SET name=?, document_number=?, home_address=?, profile_completed_at=COALESCE(profile_completed_at, ?) WHERE id=?',
      )
      .run(name, documentNumber, address, new Date().toISOString(), user.id);
    res.json({ user: await findUserById(db, user.id) });
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
