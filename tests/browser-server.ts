// Servidor exclusivo de pruebas: base efímera, bandeja en memoria y acceso solo por loopback.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { openDb } from '../server/db.ts';
import { createApp } from '../server/app.ts';
import { createUser, hashPassword } from '../server/auth.ts';
const db = await openDb(':memory:');
// Administración de la base efímera: aprueba domiciliarios en las pruebas de logística.
await createUser(db, {
  email: 'admin@pruebas.co',
  name: 'Administración de pruebas',
  passwordHash: await hashPassword('clave-segura-1'),
  role: 'admin',
});
const imagesDir = mkdtempSync(join(tmpdir(), 'sucreia-browser-'));
const server = createApp({
  db,
  imagesDir,
  localMail: true,
  staticDir: resolve('.output/public'),
  // Las pruebas crean muchas cuentas desde 127.0.0.1; el servidor real mantiene 60.
  registrationLimit: 10_000,
  linkLimit: 10_000,
}).listen(4173, '127.0.0.1');
function stop() {
  server.close(() => {
    void db.close();
    rmSync(imagesDir, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
