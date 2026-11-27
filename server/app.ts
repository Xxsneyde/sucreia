import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Db } from './db.ts';
import { ImageStorage } from './images.ts';
import { imageRoutes } from './routes/images.ts';
import type { MailTransport } from './mail.ts';
import { localMailbox } from './account-tokens.ts';
import { currentUser, loadUser } from './auth.ts';
import { requiresSession } from '../src/domain/access.ts';
import { returnTarget } from '../src/domain/navigation.ts';
import { requiredRole, roleHome } from '../src/domain/roles.ts';
import { HttpError, errorHandler } from './http.ts';
import type { CatalogAI } from './catalog-ai.ts';
import { platformRoutes } from './routes/platform.ts';
import { authRoutes } from './routes/auth.ts';
import { ownerStoreRoutes, publicStoreRoutes } from './routes/tiendas.ts';
import { assistantRoutes } from './routes/asistente.ts';
import { googleRoutes, type GoogleConfig } from './google.ts';
import { localSmsbox, type SmsTransport } from './sms.ts';
import { brainSource } from './brain.ts';
import { securityHeaders, strictTransportSecurity } from './security-headers.ts';

export interface AppOptions {
  db: Db;
  /** Carpeta de fotos; `null` las guarda dentro de la base (sin disco). */
  imagesDir?: string | null;
  /**
   * Detrás de un proxy: usar la IP real del visitante en los límites de intentos. Un número
   * indica cuántos proxies hay delante (Hostinger: TRUST_PROXY; ver GET /api/salud/red).
   */
  trustProxy?: boolean | number;
  assistant?: CatalogAI;
  mail?: MailTransport;
  /** Mensajes de texto para confirmar la cuenta (Onurix). */
  sms?: SmsTransport;
  /** Solo para desarrollo local; desactivada por defecto. */
  localMail?: boolean;
  /** Cookies solo por HTTPS (activar en producción). */
  secureCookies?: boolean;
  /** Carpeta del sitio de Vue compilado (.output/public) para servirlo junto a la API. */
  staticDir?: string;
  /** Registros permitidos por IP cada 15 minutos (60 por defecto; las pruebas usan más). */
  registrationLimit?: number;
  /** Envíos de correo y confirmaciones de enlaces cada 15 minutos (10 por defecto). */
  linkLimit?: number;
  /** Intentos de ingreso por IP cada 15 minutos. */
  loginLimit?: number;
  /** Ingreso con Google (sin configurar, el botón no aparece). */
  google?: GoogleConfig;
  /** Solo para pruebas: reemplaza las llamadas a Google. */
  googleFetch?: typeof fetch;
}

/** Rechaza peticiones que modifican datos si vienen de otro sitio (protección CSRF). */
function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host)
    return next(new HttpError(403, 'Origen no permitido.'));
  next();
}

export function createApp({
  db,
  secureCookies = false,
  staticDir,
  localMail = false,
  mail,
  sms,
  assistant,
  imagesDir = resolve('server/data/images'),
  registrationLimit,
  linkLimit,
  loginLimit,
  trustProxy = false,
  google,
  googleFetch,
}: AppOptions) {
  if (localMail && mail) throw new Error('Elige correo local o SMTP, no ambos.');
  const app = express();
  app.disable('x-powered-by');
  app.set(
    'trust proxy',
    typeof trustProxy === 'number' && trustProxy > 0
      ? trustProxy
      : trustProxy === true
        ? true
        : 'loopback',
  );
  app.use((_req, res, next) => {
    for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
    if (secureCookies) res.setHeader('Strict-Transport-Security', strictTransportSecurity);
    next();
  });

  const api = express.Router();
  // Los diseños incluyen imágenes (máx. 1,5 MB cada una), de ahí el límite amplio.
  api.use(express.json({ limit: '13mb' }));
  api.use(sameOrigin);
  api.use(loadUser(db));
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.get('/salud', async (_req, res) => {
    // Comprueba también la base de datos (útil para saber si Supabase responde).
    await db.prepare('SELECT 1 AS ok').get();
    res.json({ ok: true, db: db.dialect });
  });
  // Diagnóstico de proxies: cuántos saltos hay delante y qué IP vería la app con cada
  // TRUST_PROXY. Las IP salen enmascaradas (sin el último bloque).
  api.get('/salud/red', (req, res) => {
    const forwarded = String(req.headers['x-forwarded-for'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const chain = [...forwarded, req.socket.remoteAddress ?? ''];
    const mask = (ip: string) =>
      /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|::ffff:(10|127|192\.168)\.)/i.test(
        ip,
      )
        ? 'interna'
        : ip.replace(/[.:][0-9a-f]+$/i, (end) => `${end[0]}x`);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      saltos: forwarded.length,
      cloudflare: !!req.headers['cf-ray'],
      ipActual: mask(req.ip ?? ''),
      // proxies: n → IP que usaría la app con TRUST_PROXY=n.
      candidatos: [1, 2, 3, 4].map((n) => ({
        proxies: n,
        ip: mask(chain[chain.length - 1 - n] ?? ''),
      })),
      // Otros encabezados donde los proxies suelen poner la IP del visitante (valores enmascarados).
      encabezados: Object.fromEntries(
        Object.entries(req.headers)
          .filter(([name]) =>
            /(^|-)(ip|client|forwarded|real|connecting)(-|$)|^x-forwarded-for$/i.test(name),
          )
          .map(([name, value]) => [
            name,
            String(value)
              .split(',')
              .map((v) => mask(v.trim().replace(/^for=/i, '').replace(/"/g, '')))
              .join(', '),
          ]),
      ),
    });
  });
  // IP de salida del servidor (Onurix exige registrarla). Solo la administración la ve.
  api.get('/salud/ip-salida', async (_req, res) => {
    if (currentUser(res)?.role !== 'admin')
      throw new HttpError(404, 'Ruta de la API no encontrada.');
    const r = await fetch('https://www.onurix.com/api/v1/my-ip', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await r.json().catch(() => ({}))) as { ip?: string };
    res.json({ ip: data.ip ?? null, sms: !!sms });
  });
  const mailbox = localMail ? localMailbox() : undefined;
  if (mailbox)
    api.get('/desarrollo/correos', (_req, res) => res.json({ messages: mailbox.list() }));
  const smsbox = localMail && !sms ? localSmsbox() : undefined;
  if (smsbox) api.get('/desarrollo/sms', (_req, res) => res.json({ messages: smsbox.list() }));
  const images = new ImageStorage(db, imagesDir);
  const brain = brainSource(db);
  // Tras un cambio que funcionó, olvidar lo que se guarda en memoria: la lista de fotos públicas
  // y la base del asistente (las visitas no cambian nada de eso).
  api.use((req, res, next) => {
    if (
      req.method !== 'GET' &&
      /^\/(mis-tiendas|plataforma\/admin|plataforma\/domiciliario)/.test(req.path)
    )
      res.on('finish', () => {
        if (res.statusCode < 400) images.invalidate();
      });
    if (
      req.method !== 'GET' &&
      /^\/(mis-tiendas|plataforma)/.test(req.path) &&
      !/\/visita$/.test(req.path)
    )
      res.on('finish', () => {
        if (res.statusCode < 400) brain.invalidate();
      });
    next();
  });
  api.use('/plataforma', platformRoutes(db, images, assistant));
  api.use(
    '/auth',
    authRoutes(
      db,
      secureCookies,
      mail ?? mailbox,
      registrationLimit,
      linkLimit,
      sms ?? smsbox,
      loginLimit,
    ),
  );
  api.use('/auth', googleRoutes(db, google, secureCookies, googleFetch, mail ?? mailbox));
  api.use('/tiendas', publicStoreRoutes(db));
  api.use('/imagenes', imageRoutes(images));
  api.use('/asistente', assistantRoutes(db, brain));
  api.use('/mis-tiendas', ownerStoreRoutes(db, images));
  api.use((_req, _res, next) => next(new HttpError(404, 'Ruta de la API no encontrada.')));
  api.use(errorHandler);
  app.use('/api', api);

  // En producción, Express también entrega el sitio de Vue: un solo servidor, sin CORS.
  if (staticDir && existsSync(staticDir)) {
    // La carpeta compilada se llama .output: `dotfiles: 'allow'` la permite como raíz, y este
    // filtro sigue bloqueando cualquier petición a archivos ocultos (/.env, /.git…).
    app.use((req, res, next) => {
      if (req.path.split('/').some((part) => part.startsWith('.'))) res.status(404).end();
      else next();
    });
    // Páginas de la plataforma sin sesión: redirigir antes de enviar su HTML. Así el visitante
    // no ve ni un instante de la página y no hay diferencias de hidratación en el navegador.
    // Misma lista que el middleware del frontend (src/domain/access.ts).
    app.use(loadUser(db), async (req, res, next) => {
      // Sin portada: la raíz lleva a ingresar (sin sesión), al formulario del emprendimiento (el
      // emprendedor que aún no tiene negocios, como src/lib/start.ts) o a buscar.
      if (['GET', 'HEAD'].includes(req.method) && req.path === '/') {
        const user = currentUser(res);
        if (!user) return res.redirect(302, '/ingresar/');
        const firstBusiness =
          user.role === 'emprendedor' &&
          !(await db.prepare('SELECT 1 AS ok FROM stores WHERE owner_id=? LIMIT 1').get(user.id));
        return res.redirect(302, firstBusiness ? '/panel/configurar/' : '/buscar/');
      }
      // Solo páginas: los archivos generados (`_payload.json`, imágenes…) no tienen datos
      // personales y Nuxt los descarga por adelantado al mostrar enlaces.
      const isFile = /\.[a-z0-9]+$/i.test(req.path);
      if (!['GET', 'HEAD'].includes(req.method) || isFile || !requiresSession(req.path))
        return next();
      const user = currentUser(res);
      // Administración: los demás roles van a su propia vista (misma regla que el frontend).
      if (user && requiredRole(req.path) === 'admin' && user.role !== 'admin')
        return res.redirect(302, `${roleHome(user.role)}/`);
      if (user) return next();
      const url = new URL(req.originalUrl, 'http://sucreia.local');
      const volver = returnTarget(url.pathname, url.pathname + url.search);
      res.redirect(302, `/ingresar/?volver=${encodeURIComponent(volver)}`);
    });
    app.use(express.static(staticDir, { extensions: ['html'], dotfiles: 'allow' }));
    app.use((_req, res) => {
      res.status(404).sendFile(join(staticDir, '404.html'), { dotfiles: 'allow' });
    });
  }
  return app;
}
