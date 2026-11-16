// Servidor de SucreIA (Node.js + Express).
//   Desarrollo: npm run dev:api   (la API en http://127.0.0.1:4000; Nuxt le reenvía /api)
//   Producción: npm run build && npm start   (API + sitio de Vue en el mismo puerto)
// Variables: PORT, HOST, DATABASE_PATH (':memory:' para pruebas), COOKIE_SECURE. Con --production (o NODE_ENV=production): cookies solo
// por HTTPS y Express sirve también el sitio compilado.
import { resolve } from 'node:path';
import { openDb } from './db.ts';
import { createApp } from './app.ts';

const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
const dbEnv = process.env.DATABASE_PATH ?? 'server/data/sucreia.db';
// ':memory:' crea una base temporal (pruebas e2e): se borra al apagar el servidor.
const dbPath = dbEnv === ':memory:' ? dbEnv : resolve(dbEnv);

const db = openDb(dbPath);
const app = createApp({
  db,
  // COOKIE_SECURE=false solo para probar el modo producción por http (pruebas e2e locales).
  secureCookies: production && process.env.COOKIE_SECURE !== 'false',
  staticDir: production ? resolve('.output/public') : undefined,
});
const server = app.listen(port, host, () => {
  console.log(`SucreIA API en http://${host}:${port}/api  ·  base de datos: ${dbPath}`);
});

function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
