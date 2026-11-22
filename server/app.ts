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

export interface AppOptions {
  db: Db;
  /** Carpeta de fotos; `null` las guarda dentro de la base (Vercel, sin disco). */
  imagesDir?: string | null;
  /** Detrás de un proxy (Vercel): usar la IP real del visitante en los límites de intentos. */
  trustProxy?: boolean;
  assistant?: CatalogAI;
  mail?: MailTransport;
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
  assistant,
  imagesDir = resolve('server/data/images'),
  registrationLimit,
  linkLimit,
  trustProxy = false,
}: AppOptions) {
  if (localMail && mail) throw new Error('Elige correo local o SMTP, no ambos.');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy ? true : 'loopback');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
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
  const mailbox = localMail ? localMailbox() : undefined;
  if (mailbox)
    api.get('/desarrollo/correos', (_req, res) => res.json({ messages: mailbox.list() }));
  const images = new ImageStorage(db, imagesDir);
  api.use('/plataforma', platformRoutes(db, images, assistant));
  api.use('/auth', authRoutes(db, secureCookies, mail ?? mailbox, registrationLimit, linkLimit));
  api.use('/tiendas', publicStoreRoutes(db));
  api.use('/imagenes', imageRoutes(images));
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
    app.use(loadUser(db), (req, res, next) => {
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
