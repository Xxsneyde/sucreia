# Producción en Hostinger (sucreia.site)

SucreIA corre en Hostinger como **aplicación Node.js** (Node 22): un solo proceso de Express entrega la API (`/api`) y el sitio de Nuxt ya compilado. La base es Postgres (Supabase) y las fotos van dentro de la base. Vercel ya no se usa; [vercel.md](vercel.md) queda solo como referencia histórica.

## Sitio de pruebas (despliegue automático desde GitHub)

Cada push a `main` corre la CI (tipos, pruebas de la API, build y pruebas de navegador). Si todo pasa, el trabajo `paquete` arma el paquete de Hostinger (`npm run build:hostinger`, en Node 22) y lo publica en la rama **`hostinger-pruebas`**: `server.mjs`, `package.json` y `public/`, lo mismo que va en `hostinger.zip`. Si una prueba falla, la rama no cambia y el sitio de pruebas sigue como estaba.

Configuración del sitio de pruebas en Hostinger (Node.js web app conectada a GitHub):

| Campo                | Valor                                                    |
| -------------------- | -------------------------------------------------------- |
| Repositorio / Branch | `Xxsneyde/sucreia` / **`hostinger-pruebas`** (no `main`) |
| Framework preset     | Express (u «Other»)                                      |
| Root directory       | La raíz (vacío o `/`)                                    |
| Node.js version      | 22                                                       |
| Build command        | Ninguno (el paquete ya viene compilado)                  |
| Output directory     | Vacío                                                    |
| Entry file           | `server.mjs`                                             |
| Package manager      | npm                                                      |

Variables de entorno del sitio de pruebas (mismos nombres que producción, **otros valores**):

- `DATABASE_URL`: una base **distinta** de la de producción (otro proyecto de Supabase). Con la de producción, las pruebas crearían cuentas y negocios reales. Para comparar con datos reales, restaura ahí un respaldo de producción.
- `PUBLIC_URL`: el dominio del sitio de pruebas, para que los enlaces de los correos apunten a él.
- `RESEND_API_KEY` y `MAIL_FROM`: sin correo no se pueden confirmar las cuentas nuevas.
- `TRUST_PROXY`: el mismo número que producción (compruébalo con `/api/salud/red`).
- Google y SMS: déjalos sin configurar, salvo que registres el dominio de pruebas en Google y en Onurix.

Hostinger despliega solo en cada push a `hostinger-pruebas`; «Redeploy» lo repite a mano. Producción sigue con su zip y no cambia por esto.

## Subir un cambio, paso a paso

```bash
npm ci
npm run check            # tipos, pruebas de la API (SQLite y Postgres) y build del sitio
npm run test:e2e         # recorridos en el navegador (PW_CHANNEL=chrome usa el Chrome instalado)
npm run build:hostinger  # genera hostinger/, lo prueba y arma hostinger.zip
```

1. Respaldo: descarga la base desde Supabase (o confirma que hay un respaldo reciente) y guarda el `hostinger.zip` que está publicado hoy, para poder volver atrás.
2. Corre los cuatro comandos de arriba. Si uno falla, no subas nada.
3. Sube `hostinger.zip` en el panel de la aplicación Node.js de Hostinger. Las variables de entorno ya están en el panel: no van en el zip.
4. Revisa las [comprobaciones después de subir](#comprobaciones-después-de-subir) y abre el sitio en el celular.
5. Si algo sale mal, vuelve a subir el zip anterior. Si el cambio traía una migración nueva, la base ya la aplicó: el zip anterior sigue funcionando porque las migraciones solo agregan (ver [la base de datos](#la-base-de-datos)).

`npm run build:hostinger` hace tres cosas:

- Arma `hostinger/` con la misma forma que lo publicado. `hostinger/` y `hostinger.zip` no se suben a Git.
- Arranca el `server.mjs` empaquetado con una base temporal (`scripts/hostinger-smoke.mjs`) y revisa la salud, las páginas públicas, las redirecciones al ingreso, la API y que `/.env` siga bloqueado. Si algo no responde como en producción, se detiene y no arma el zip.
- Empaca `hostinger.zip` (`scripts/zip.mjs`, sin dependencias) con `server.mjs`, `package.json` y `public/` en la raíz.

| Archivo        | Qué es                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------- |
| `server.mjs`   | Todo el backend en un archivo (esbuild). Al correr empaquetado entra en modo producción  |
| `public/`      | El sitio generado por `nuxt generate` (`.output/public`)                                 |
| `package.json` | Solo `sharp` (binarios nativos) y `nodemailer`; `npm install` en el servidor los instala |

`npm run build:hostinger -- --sin-sitio` reutiliza un `.output/public` ya generado.

## Reglas para no romper producción

- **La base de datos.** Ver [la base de datos](#la-base-de-datos): las migraciones nuevas se agregan al final y nunca se edita una publicada. `tests/migrations.test.ts` lo vigila.
- **Las versiones de `sharp` y `nodemailer`** del `package.json` raíz son las que se instalan en Hostinger. Si cambias una, prueba en local con el paquete armado (`npm run build:hostinger`).
- **Node 22.** Hostinger corre Node 22; el paquete se compila para esa versión (`target: 'node22'`). No uses funciones de Node más nuevas en `server/`.
- **Las variables de entorno** son las de la tabla de abajo. Si el código pide una nueva, agrégala en el panel antes de subir; si falta, el servidor puede no arrancar.
- **Las rutas públicas.** `/api/...`, las páginas y las redirecciones al ingreso las revisa la prueba del paquete; los recorridos completos, `npm run test:e2e`.

## La base de datos

`server/db.ts` tiene la lista de migraciones. Al arrancar, el servidor aplica en orden las que la base aún no tiene (la tabla `schema_version` guarda cuántas van). Producción ya corrió las 23 que hay hoy.

- Para cambiar el esquema, **agrega una migración nueva al final** de la lista.
- **Nunca edites ni borres una migración publicada**: producción no la volvería a correr y su base quedaría distinta a la de las pruebas.
- Prefiere cambios que solo agregan (tablas, columnas con valor por defecto, índices). Así el zip anterior sigue funcionando con la base ya migrada, por si hay que volver atrás.
- Las migraciones corren en SQLite y en Postgres: `npm run check` prueba las dos (`npm test` y `npm run test:postgres`).

## Variables de entorno (panel de Hostinger)

Los valores reales **no** están en el repositorio ni deben subirse. Se configuran en el panel de la aplicación Node.js. Nombres (ver también `.env.example`):

| Variable                                   | Para qué                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | Postgres (Supabase). La conexión va cifrada y verificada con el certificado de Supabase |
| `DATABASE_POOL`                            | Conexiones simultáneas (3 por defecto; Supabase admite pocas)                           |
| `DATABASE_SSL=no-verify` / `DATABASE_CA`   | Solo si hiciera falta: cifrar sin verificar, o un certificado propio                    |
| `PUBLIC_URL`                               | `https://sucreia.site` (enlaces de los correos e ingreso con Google)                    |
| `TRUST_PROXY`                              | Cuántos proxies hay delante (1 a 5) para leer la IP real en los límites de intentos     |
| `RESEND_API_KEY`, `MAIL_FROM`              | Correo por Resend (si no, `SMTP_*`; sin ninguno no se envían correos)                   |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Ingreso con Google (sin ellas el botón no aparece)                                      |
| `ONURIX_CLIENT`, `ONURIX_KEY`              | Confirmación de la cuenta por mensaje de texto (sin ellas solo se confirma por correo)  |
| `PORT`, `HOST`                             | Normalmente los pone Hostinger                                                          |

## Comprobaciones después de subir

- `GET /api/salud` → `{ ok: true, db: "postgres" }` confirma que responde la base.
- `GET /api/salud/red` muestra cuántos saltos de proxy hay y qué IP vería la app con cada `TRUST_PROXY` (IP enmascaradas). Elige el número cuya IP es la del visitante.
- `GET /api/salud/ip-salida` (solo con sesión de administración) dice la IP de salida del servidor, que Onurix exige registrar para enviar SMS, y si el SMS está activo.
- `GET /api/auth/google/estado` y `GET /api/auth/sms/estado` dicen si esas opciones están configuradas.

## La primera subida después de la recuperación

El repositorio ya arma el mismo paquete que está publicado (ver [recuperacion.md](recuperacion.md#comprobación-contra-lo-publicado)): mismo `package.json`, mismo backend y el mismo sitio. Las migraciones son las mismas que ya corrió producción, así que la base no cambia al arrancar.

Antes de la primera subida, haz el respaldo del paso 1 (la copia descargada en `recuperado-hostinger/publicado/` sirve como zip anterior) y la revisión visual en el celular.
