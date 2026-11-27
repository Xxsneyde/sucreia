// Prueba de humo del paquete de Hostinger: arranca hostinger/server.mjs tal como corre en el
// servidor (modo empaquetado), con una base SQLite y una carpeta de fotos temporales, y revisa que
// respondan la salud, las páginas, la API y que los archivos ocultos sigan bloqueados.
// No usa la base de producción ni envía correos. Uso: node scripts/hostinger-smoke.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const freePort = () =>
  new Promise((ok, fail) => {
    const s = createServer();
    s.once('error', fail);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

export async function smokeTest(dir = resolve('hostinger')) {
  const data = mkdtempSync(join(tmpdir(), 'sucreia-humo-'));
  const port = await freePort();
  const env = { ...process.env, PORT: String(port), HOST: '127.0.0.1' };
  // Nada de la configuración real del equipo: base y fotos temporales, sin correo ni SMS.
  for (const key of Object.keys(env))
    if (/^(DATABASE_|SMTP_|RESEND_|MAIL_|GOOGLE_|ONURIX_|IMAGES_PATH|STATIC_DIR)/.test(key))
      delete env[key];
  env.DATABASE_PATH = join(data, 'sucreia.db');
  env.IMAGES_PATH = join(data, 'imagenes');
  const child = spawn(process.execPath, ['server.mjs'], { cwd: dir, env, stdio: 'pipe' });
  let log = '';
  child.stdout.on('data', (b) => (log += b));
  child.stderr.on('data', (b) => (log += b));
  const base = `http://127.0.0.1:${port}`;
  const problems = [];
  try {
    // Espera a que arranque (hasta 20 s).
    for (let i = 0; ; i++) {
      if (child.exitCode !== null) throw new Error(`El servidor se cerró al arrancar:\n${log}`);
      try {
        if ((await fetch(`${base}/api/salud`)).ok) break;
      } catch {
        // Aún no escucha.
      }
      if (i > 80) throw new Error(`El servidor no respondió en 20 s:\n${log}`);
      await new Promise((r) => setTimeout(r, 250));
    }
    const check = async (path, expect, test) => {
      const res = await fetch(base + path, { redirect: 'manual' });
      const body = await res.text();
      const ok = res.status === expect && (!test || test(body, res));
      console.log(`  ${ok ? 'ok ' : 'MAL'} ${res.status} ${path}`);
      if (!ok) problems.push(`${path}: ${res.status} (se esperaba ${expect})`);
    };
    await check('/api/salud', 200, (b) => JSON.parse(b).ok === true);
    // Páginas públicas.
    for (const page of ['/ingresar/', '/recuperar/', '/tienda/', '/terminos/', '/quienes-somos/'])
      await check(page, 200, (b) => b.includes('<div id="__nuxt">'));
    // Sin sesión, la portada y las páginas con cuenta llevan al ingreso (igual que lo publicado).
    await check('/', 302, (_, r) => r.headers.get('location') === '/ingresar/');
    for (const page of ['buscar', 'panel', 'registro-negocio', 'admin'])
      await check(
        `/${page}/`,
        302,
        (_, r) => r.headers.get('location') === `/ingresar/?volver=%2F${page}`,
      );
    await check('/favicon.png', 200);
    await check('/api/tiendas', 200, (b) => Array.isArray(JSON.parse(b).stores));
    await check('/api/auth/yo', 200, (b) => JSON.parse(b).user === null);
    await check('/api/auth/google/estado', 200);
    await check('/api/no-existe', 404);
    await check('/.env', 404);
    await check('/pagina-que-no-existe', 404);
  } finally {
    child.kill();
    await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));
    rmSync(data, { recursive: true, force: true });
  }
  if (problems.length) throw new Error(`La prueba del paquete falló:\n- ${problems.join('\n- ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await smokeTest();
