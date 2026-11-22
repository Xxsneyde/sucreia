import { resolve } from 'node:path';
import { openDb } from '../db.ts';
import { acquireDataLock } from '../data-lock.ts';
// Habilita una cuenta existente como administradora.
//   SQLite local (API detenida): npm run admin -- correo
//   Postgres (Supabase):         DATABASE_URL=… npm run admin -- correo
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run admin -- correo-de-una-cuenta-existente. Detén antes la API.');
  process.exitCode = 1;
} else {
  let release: (() => void) | undefined;
  try {
    const url = process.env.DATABASE_URL;
    const path = resolve(process.env.DATABASE_PATH ?? 'server/data/sucreia.db');
    if (!url)
      release = acquireDataLock(path, resolve(process.env.IMAGES_PATH ?? 'server/data/images'));
    const db = await openDb(url ?? path);
    try {
      const user = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
      if (!user) throw new Error('Crea primero la cuenta desde el sitio.');
      await db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
      console.log('Cuenta habilitada como administradora. Cierra y vuelve a iniciar sesión.');
    } finally {
      await db.close();
    }
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  } finally {
    release?.();
  }
}
