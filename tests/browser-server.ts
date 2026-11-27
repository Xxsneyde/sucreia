// Servidor exclusivo de pruebas: base efímera, bandeja en memoria y acceso solo por loopback.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { openDb } from '../server/db.ts';
import { createApp } from '../server/app.ts';
import { createUser, hashPassword } from '../server/auth.ts';
const db = await openDb(':memory:');
// Administración de la base efímera: aprueba los registros de negocios en las pruebas. Una cuenta
// por proceso de Playwright (admin-0@…, admin-1@…): el ingreso admite 10 intentos por correo cada
// 15 minutos y cada proceso inicia sesión una sola vez (tests/e2e/helpers.ts).
const passwordHash = await hashPassword('clave-segura-1');
for (let i = 0; i < 16; i++)
  await createUser(db, {
    email: `admin-${i}@pruebas.co`,
    name: 'Administración de pruebas',
    passwordHash,
    role: 'admin',
  });
const imagesDir = mkdtempSync(join(tmpdir(), 'sucreia-browser-'));
const server = createApp({
  db,
  imagesDir,
  localMail: true,
  staticDir: resolve('.output/public'),
  // Las pruebas crean muchas cuentas e ingresan muchas veces desde 127.0.0.1; el servidor real
  // mantiene sus límites (60 registros y 50 ingresos por IP cada 15 minutos).
  registrationLimit: 10_000,
  linkLimit: 10_000,
  loginLimit: 10_000,
}).listen(Number(process.env.E2E_PORT ?? 4173), '127.0.0.1');
function stop() {
  server.close(() => {
    void db.close();
    rmSync(imagesDir, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
