// Compila SucreIA para Hostinger (aplicación Node.js con Passenger), igual que lo publicado:
//   hostinger/server.mjs    la API de Express y todo el backend en un solo archivo (esbuild)
//   hostinger/public/       el sitio de Nuxt generado (.output/public), servido por el mismo Express
//   hostinger/package.json  solo las dependencias con binarios o carga dinámica (sharp, nodemailer)
// Uso: npm run build:hostinger. Luego se sube el contenido de hostinger/ (ver docs/hostinger.md).
// Los secretos NO van aquí: se configuran como variables de entorno en el panel de Hostinger.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve('.');
const out = join(root, 'hostinger');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!process.argv.includes('--sin-sitio')) execSync('npx nuxt generate', { stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, '.output/public'), join(out, 'public'), { recursive: true });

await build({
  entryPoints: [join(root, 'server/index.ts')],
  // server/index.ts reconoce que corre empaquetado por este nombre (modo producción y public/).
  outfile: join(out, 'server.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // sharp tiene binarios nativos y nodemailer se carga con require: se instalan en Hostinger.
  // PGlite solo se usa en pruebas.
  external: ['sharp', 'nodemailer', 'pg-native', '@electric-sql/pglite'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      type: 'module',
      main: 'server.mjs',
      engines: { node: '>=22.5.0' },
      scripts: { start: 'node server.mjs' },
      dependencies: {
        sharp: pkg.dependencies.sharp,
        nodemailer: pkg.dependencies.nodemailer,
      },
    },
    null,
    2,
  ) + '\n',
);
console.log('\nListo: hostinger/ (server.mjs, public/, package.json).');
