// Servidor de SucreIA (Node.js + Express).
//   Desarrollo: npm run dev:api   (la API en http://127.0.0.1:4000; Nuxt le reenvía /api)
//   Producción: npm run build && npm start   (API + sitio de Vue en el mismo puerto)
//   Hostinger:  npm run build:hostinger → hostinger/server.mjs + hostinger/public (ver docs/hostinger.md)
// Variables: PORT, HOST, DATABASE_PATH (':memory:' para pruebas) o DATABASE_URL (Postgres),
// IMAGES_PATH ('db' = fotos dentro de la base), COOKIE_SECURE, TRUST_PROXY, STATIC_DIR.
// Con --production (o NODE_ENV=production, o empaquetado): cookies solo por HTTPS y Express
// sirve también el sitio compilado.
import { localCatalogAI } from './catalog-ai.ts';
import { acquireDataLock } from './data-lock.ts';
import { mailFromEnv } from './mail.ts';
import { smsFromEnv } from './sms.ts';
import { googleConfig } from './google.ts';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ImageStorage, migrateImages } from './images.ts';
import { openDb, type Db } from './db.ts';
import { createApp } from './app.ts';

/** Empaquetado en un solo archivo (server.mjs de Hostinger): siempre en modo producción. */
const bundled = import.meta.url.endsWith('/server.mjs');

/** TRUST_PROXY: cuántos proxies hay delante (1 a 5). Ver GET /api/salud/red y docs/seguridad.md. */
function trustProxyFrom(value: string | undefined): number | false {
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true') {
    console.warn(
      'TRUST_PROXY=true se toma como 1 proxy. Indica el número exacto (ver docs/seguridad.md).',
    );
    return 1;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5)
    throw new Error('TRUST_PROXY debe ser un número de 1 a 5.');
  return n;
}

const production =
  bundled || process.argv.includes('--production') || process.env.NODE_ENV === 'production';
// Empaquetado, el sitio compilado va junto al servidor (public/); si no, en .output/public.
const staticDir = process.env.STATIC_DIR
  ? resolve(process.env.STATIC_DIR)
  : bundled
    ? fileURLToPath(new URL('./public/', import.meta.url))
    : resolve('.output/public');
const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT debe ser un puerto entre 1 y 65535.');
const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
const dbEnv = process.env.DATABASE_PATH ?? 'server/data/sucreia.db';
// ':memory:' crea una base temporal (pruebas e2e): se borra al apagar el servidor.
const dbPath = dbEnv === ':memory:' ? dbEnv : resolve(dbEnv);

// Correo: Resend (RESEND_API_KEY) o SMTP; sin configurar, no se envían correos.
const mail = mailFromEnv(process.env);
const assistant = localCatalogAI(process.env);
const databaseUrl = process.env.DATABASE_URL;
// Con Postgres las fotos van a la base salvo que se indique una carpeta.
const imagesDir =
  process.env.IMAGES_PATH === 'db' || (databaseUrl && !process.env.IMAGES_PATH)
    ? null
    : resolve(process.env.IMAGES_PATH ?? 'server/data/images');
// El bloqueo de archivos solo aplica a SQLite + carpeta de fotos en este equipo.
const release = databaseUrl
  ? () => {}
  : acquireDataLock(dbPath, imagesDir ?? resolve('server/data/images'));
let db: Db;
try {
  db = await openDb(databaseUrl ?? dbPath);
} catch (error) {
  release();
  throw error;
}
let migration;
try {
  migration = await migrateImages(new ImageStorage(db, imagesDir));
} catch (error) {
  await db.close();
  release();
  throw error;
}
if (migration.migrated || migration.skipped)
  console.log(
    `Imágenes: ${migration.migrated} tiendas migradas; ${migration.skipped} conservadas sin cambios por errores de imagen.`,
  );
let server: Server;
try {
  const app = createApp({
    assistant,
    imagesDir,
    db,
    mail,
    sms: smsFromEnv(process.env),
    google: googleConfig(process.env),
    localMail: !mail && !production && (host === '127.0.0.1' || host === '::1'),
    // COOKIE_SECURE=false solo para probar el modo producción por http (pruebas e2e locales).
    secureCookies: production && process.env.COOKIE_SECURE !== 'false',
    // Detrás de un proxy (Hostinger, Nginx…) para leer la IP real en los límites de intentos.
    trustProxy: trustProxyFrom(process.env.TRUST_PROXY),
    staticDir: production ? staticDir : undefined,
  });
  server = app.listen(port, host, () => {
    console.log(
      `SucreIA API en http://${host}:${port}/api  ·  base de datos: ${databaseUrl ? 'Postgres' : dbPath}`,
    );
  });
} catch (error) {
  await db.close();
  release();
  throw error;
}

server.once('error', () => {
  void db.close();
  release();
  console.error('No se pudo abrir el puerto del servidor. Revisa HOST, PORT y los permisos.');
  process.exitCode = 1;
});
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  server.close(() => {
    void db.close().finally(() => {
      release();
      process.exit(0);
    });
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
