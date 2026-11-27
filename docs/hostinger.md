# Producción en Hostinger (sucreia.site)

SucreIA corre en Hostinger como **aplicación Node.js** (Node 22): un solo proceso de Express entrega la API (`/api`) y el sitio de Nuxt ya compilado. La base es Postgres (Supabase) y las fotos van dentro de la base. Vercel ya no se usa; [vercel.md](vercel.md) queda solo como referencia histórica.

## Compilar

```bash
npm ci
npm run check            # tipos, pruebas (SQLite y Postgres) y build del sitio
npm run build:hostinger  # genera hostinger/
```

`hostinger/` (no se sube a Git) contiene exactamente lo que va al servidor, con la misma forma que lo publicado hasta hoy:

| Archivo        | Qué es                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------- |
| `server.mjs`   | Todo el backend en un archivo (esbuild). Al correr empaquetado entra en modo producción  |
| `public/`      | El sitio generado por `nuxt generate` (`.output/public`)                                 |
| `package.json` | Solo `sharp` (binarios nativos) y `nodemailer`; `npm install` en el servidor los instala |

`npm run build:hostinger -- --sin-sitio` reutiliza un `.output/public` ya generado.

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

## Antes de reemplazar lo publicado

1. Descarga una copia de lo que está en Hostinger y un respaldo de la base en Supabase.
2. Las migraciones de `server/db.ts` son las mismas que ya corrió producción: la base actual no cambia al arrancar.
3. `nodemailer`: lo publicado usaba la versión 10.6.1 y el repo tiene la 8.0.10. Solo afecta al envío por SMTP (con Resend no se usa). Si se usa SMTP, actualizarla y probar `npm run mail:check` antes de subir.
4. Prueba los recorridos principales (`npm run test:e2e`) y una revisión visual en el celular.
