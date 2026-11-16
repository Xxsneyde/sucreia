// Servidor de SucreIA (Node.js + Express).
//   Desarrollo: npm run dev:api   (la API en http://127.0.0.1:4000; Nuxt le reenvía /api)
//   Producción: npm run build && npm start   (API + sitio de Vue en el mismo puerto)
// Variables: PORT, HOST, DATABASE_PATH (':memory:' para pruebas), COOKIE_SECURE. Con --production (o NODE_ENV=production): cookies solo
// por HTTPS y Express sirve también el sitio compilado.
import { localCatalogAI } from './catalog-ai.ts';
import { acquireDataLock } from './data-lock.ts';
import { smtpConfig, smtpTransport } from './mail.ts';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { ImageStorage, migrateImages } from './images.ts';
import { openDb } from './db.ts';
import { createApp } from './app.ts';

const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT debe ser un puerto entre 1 y 65535.');
const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
const dbEnv = process.env.DATABASE_PATH ?? 'server/data/sucreia.db';
// ':memory:' crea una base temporal (pruebas e2e): se borra al apagar el servidor.
const dbPath = dbEnv === ':memory:' ? dbEnv : resolve(dbEnv);

const config = smtpConfig(process.env);
const assistant = localCatalogAI(process.env);
const imagesDir = resolve(process.env.IMAGES_PATH ?? 'server/data/images');
const release = acquireDataLock(dbPath, imagesDir);
let db: ReturnType<typeof openDb>;
try {
  db = openDb(dbPath);
} catch (error) {
  release();
  throw error;
}
let migration;
try {
  migration = await migrateImages(new ImageStorage(db, imagesDir));
} catch (error) {
  db.close();
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
    mail: config ? smtpTransport(config) : undefined,
    localMail: !config && !production && (host === '127.0.0.1' || host === '::1'),
    // COOKIE_SECURE=false solo para probar el modo producción por http (pruebas e2e locales).
    secureCookies: production && process.env.COOKIE_SECURE !== 'false',
    staticDir: production ? resolve('.output/public') : undefined,
  });
  server = app.listen(port, host, () => {
    console.log(`SucreIA API en http://${host}:${port}/api  ·  base de datos: ${dbPath}`);
  });
} catch (error) {
  db.close();
  release();
  throw error;
}

server.once('error', () => {
  db.close();
  release();
  console.error('No se pudo abrir el puerto del servidor. Revisa HOST, PORT y los permisos.');
  process.exitCode = 1;
});
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  server.close(() => {
    db.close();
    release();
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
