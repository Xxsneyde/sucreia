import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db.ts';
import { loadUser } from './auth.ts';
import { HttpError, errorHandler } from './http.ts';
import { authRoutes } from './routes/auth.ts';
import { ownerStoreRoutes, publicStoreRoutes } from './routes/tiendas.ts';

export interface AppOptions {
  db: Db;
  /** Cookies solo por HTTPS (activar en producción). */
  secureCookies?: boolean;
  /** Carpeta del sitio de Vue compilado (.output/public) para servirlo junto a la API. */
  staticDir?: string;
}

/** Rechaza peticiones que modifican datos si vienen de otro sitio (protección CSRF). */
function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host)
    return next(new HttpError(403, 'Origen no permitido.'));
  next();
}

export function createApp({ db, secureCookies = false, staticDir }: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
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
  api.get('/salud', (_req, res) => {
    res.json({ ok: true });
  });
  api.use('/auth', authRoutes(db, secureCookies));
  api.use('/tiendas', publicStoreRoutes(db));
  api.use('/mis-tiendas', ownerStoreRoutes(db));
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
    app.use(express.static(staticDir, { extensions: ['html'], dotfiles: 'allow' }));
    app.use((_req, res) => {
      res.status(404).sendFile(join(staticDir, '404.html'), { dotfiles: 'allow' });
    });
  }
  return app;
}
