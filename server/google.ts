// Ingreso con Google (OAuth 2.0 «authorization code»). El estado anti-CSRF se guarda en la base
// (oauth_states) y en una cookie corta; nunca se guarda el token de Google.
import { randomBytes, randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import type { Db } from './db.ts';
import { HttpError } from './http.ts';
import {
  createSession,
  createUser,
  findUserByEmail,
  hashPassword,
  readCookie,
  setSessionCookie,
  type Role,
} from './auth.ts';
import { issueToken } from './account-tokens.ts';
import type { MailTransport } from './mail.ts';
import { internalReturn } from '../src/domain/navigation.ts';
import { roleHome } from '../src/domain/roles.ts';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  origin: string;
}
export function googleConfig(env: NodeJS.ProcessEnv): GoogleConfig | undefined {
  if (!env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_SECRET) return;
  for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'PUBLIC_URL'])
    if (!env[key]) throw new Error(`Falta configurar ${key} para ingresar con Google.`);
  const origin = new URL(env.PUBLIC_URL!).origin;
  return { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, origin };
}

const STATE_COOKIE = 'sucreia_google';
const TEN_MINUTES = 10 * 60_000;

async function saveState(db: Db, kind: string, payload: unknown) {
  const id = randomBytes(24).toString('base64url');
  await db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(new Date().toISOString());
  await db
    .prepare('INSERT INTO oauth_states (id, kind, payload, expires_at) VALUES (?, ?, ?, ?)')
    .run(id, kind, JSON.stringify(payload), new Date(Date.now() + TEN_MINUTES).toISOString());
  return id;
}
/** Lee y borra el estado (se usa una sola vez). null si no existe o venció. */
async function takeState<T>(db: Db, kind: string, id: string | undefined): Promise<T | null> {
  if (!id) return null;
  const row = await db
    .prepare('SELECT payload, expires_at FROM oauth_states WHERE id = ? AND kind = ?')
    .get<{ payload: string; expires_at: string }>(id, kind);
  await db.prepare('DELETE FROM oauth_states WHERE id = ?').run(id);
  if (!row || row.expires_at < new Date().toISOString()) return null;
  return JSON.parse(row.payload) as T;
}
function shortCookie(res: Response, name: string, value: string, secure: boolean) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: TEN_MINUTES,
    path: '/api/auth',
  });
}

interface GoogleState {
  state: string;
  role: Role;
  back: string;
}
interface GoogleProfile {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export function googleRoutes(
  db: Db,
  config: GoogleConfig | undefined,
  secure: boolean,
  fetchImpl: typeof fetch = fetch,
  mailbox?: MailTransport,
) {
  const router = Router();
  const redirectUri = config ? `${config.origin}/api/auth/google/callback` : '';

  router.get('/google/estado', (_req, res) => {
    res.json({ enabled: !!config });
  });

  router.get('/google', async (req, res) => {
    if (!config) throw new HttpError(503, 'El ingreso con Google todavía no está configurado.');
    const state = randomBytes(24).toString('base64url');
    const role: Role = req.query.rol === 'emprendedor' ? 'emprendedor' : 'cliente';
    const id = await saveState(db, 'google-state', {
      state,
      role,
      back: internalReturn(req.query.volver),
    } satisfies GoogleState);
    shortCookie(res, STATE_COOKIE, id, secure);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');
    res.redirect(302, url.href);
  });

  router.get('/google/callback', async (req, res) => {
    if (!config) throw new HttpError(503, 'El ingreso con Google todavía no está configurado.');
    const saved = await takeState<GoogleState>(db, 'google-state', readCookie(req, STATE_COOKIE));
    res.clearCookie(STATE_COOKIE, { path: '/api/auth' });
    if (!saved || typeof req.query.state !== 'string' || req.query.state !== saved.state)
      return res.redirect(302, '/ingresar/?google=error');
    if (typeof req.query.code !== 'string') return res.redirect(302, '/ingresar/?google=cancelado');
    let profile: GoogleProfile;
    try {
      const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: req.query.code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const token = (await tokenRes.json()) as { access_token?: string };
      if (!tokenRes.ok || !token.access_token) throw new Error('token');
      const infoRes = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!infoRes.ok) throw new Error('perfil');
      profile = (await infoRes.json()) as GoogleProfile;
    } catch {
      return res.redirect(302, '/ingresar/?google=error');
    }
    const email = profile.email?.toLowerCase() ?? '';
    if (!email || profile.email_verified !== true)
      return res.redirect(302, '/ingresar/?google=sin-correo');
    const found = await findUserByEmail(db, email);
    if (found) {
      // Google ya confirmó el correo: la cuenta queda confirmada.
      if (!found.emailVerifiedAt)
        await db
          .prepare('UPDATE users SET emailVerifiedAt = ? WHERE id = ?')
          .run(new Date().toISOString(), found.id);
      const session = await createSession(db, found.id);
      setSessionCookie(res, session.token, session.expires, secure);
      return res.redirect(302, saved.back || `${roleHome(found.role)}/`);
    }
    const user = await createUser(db, {
      email,
      name: (profile.name ?? '').trim().slice(0, 80),
      role: saved.role,
      // Contraseña aleatoria que nadie conoce: se entra con Google (o se crea una con «Recuperar»).
      passwordHash: await hashPassword(randomUUID() + randomBytes(16).toString('hex')),
    });
    const session = await createSession(db, user.id);
    setSessionCookie(res, session.token, session.expires, secure);
    if (mailbox) {
      try {
        const { token, expiresAt } = await issueToken(db, user.id, 'verify');
        await mailbox.send(user.email, 'verify', token, expiresAt);
      } catch {
        console.warn('No se pudo entregar un correo de verificación (Google).');
      }
    }
    res.redirect(302, '/verificar-correo/');
  });
  return router;
}
