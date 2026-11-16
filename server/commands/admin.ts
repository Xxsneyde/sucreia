import { resolve } from 'node:path';
import { openDb } from '../db.ts';
import { acquireDataLock } from '../data-lock.ts';
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run admin -- correo-de-una-cuenta-existente. Detén antes la API.');
  process.exitCode = 1;
} else {
  let release: (() => void) | undefined;
  try {
    const path = resolve(process.env.DATABASE_PATH ?? 'server/data/sucreia.db');
    release = acquireDataLock(path, resolve(process.env.IMAGES_PATH ?? 'server/data/images'));
    const db = openDb(path);
    try {
      const user = db.prepare('SELECT id FROM users WHERE email=?').get(email);
      if (!user) throw new Error('Crea primero la cuenta desde el sitio.');
      db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
      console.log('Cuenta habilitada como administradora. Cierra y vuelve a iniciar sesión.');
    } finally {
      db.close();
    }
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  } finally {
    release?.();
  }
}
