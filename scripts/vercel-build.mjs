// Compila SucreIA para Vercel con la Build Output API (.vercel/output):
//   - static/            el sitio de Nuxt generado (.output/public)
//   - functions/api.func la API de Express empaquetada con esbuild (server/vercel.ts)
// Uso: npm run build:vercel (Vercel lo ejecuta como comando de compilación).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve('.');
const out = join(root, '.vercel/output');
const fn = join(out, 'functions/api.func');
// Región de la función: São Paulo, junto a la base de Supabase (sa-east-1).
const region = process.env.SUCREIA_REGION ?? 'gru1';

execSync('npx nuxt generate', { stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });
cpSync(join(root, '.output/public'), join(out, 'static'), { recursive: true });

await build({
  entryPoints: [join(root, 'server/vercel.ts')],
  outfile: join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // sharp tiene binarios nativos: se copia aparte. PGlite solo se usa en pruebas.
  external: ['sharp', 'pg-native', '@electric-sql/pglite'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

/** Copia un paquete de node_modules y sus dependencias (las que existan instaladas). */
const copied = new Set();
function copyPackage(name) {
  if (copied.has(name)) return;
  const from = join(root, 'node_modules', name);
  if (!existsSync(from)) return;
  copied.add(name);
  const to = join(fn, 'node_modules', name);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, dereference: true });
  const pkg = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8'));
  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies }))
    copyPackage(dep);
}
copyPackage('sharp');

writeFileSync(
  join(fn, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      // Express lee el cuerpo él mismo: Vercel no debe consumirlo antes.
      shouldAddHelpers: false,
      maxDuration: 30,
      memory: 1024,
      regions: [region],
    },
    null,
    2,
  ),
);

writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/api(/.*)?$', dest: '/api' },
        // Archivos generados con caché larga (llevan hash en el nombre).
        {
          src: '^/_nuxt/(.*)$',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        {
          src: '^/(.*)$',
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'X-Frame-Options': 'SAMEORIGIN',
          },
          continue: true,
        },
        { handle: 'filesystem' },
        // /buscar → /buscar/index.html (páginas generadas como carpetas).
        { src: '^/(.+?)/?$', dest: '/$1/index.html', check: true },
        { handle: 'error' },
        { status: 404, src: '^/(.*)$', dest: '/404.html' },
      ],
    },
    null,
    2,
  ),
);
console.log(
  `Listo: .vercel/output (función en ${region}, ${copied.size} paquetes nativos copiados).`,
);
