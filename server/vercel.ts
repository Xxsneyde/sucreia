// Entrada de la API en Vercel (función de Node). La base es Postgres (DATABASE_URL, Supabase) y
// las fotos se guardan dentro de ella: Vercel no conserva archivos entre ejecuciones.
// scripts/vercel-build.mjs empaqueta este archivo en .vercel/output/functions/api.func.
import { openDb } from './db.ts';
import { createApp } from './app.ts';
import { smtpConfig, smtpTransport } from './mail.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta DATABASE_URL (conexión de Postgres) en las variables de Vercel.');
const db = await openDb(url);
const mail = smtpConfig(process.env);

export default createApp({
  db,
  imagesDir: null,
  secureCookies: true,
  trustProxy: true,
  mail: mail ? smtpTransport(mail) : undefined,
});
