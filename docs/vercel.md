# Despliegue en Vercel + Supabase

Producción: **https://sucreia.vercel.app** (proyecto `sucreia` del equipo `ssneyy` en Vercel).

## Cómo funciona

- **Sitio:** las páginas de Nuxt generadas (`.output/public`) se sirven como archivos estáticos.
- **API:** Express empaquetado con esbuild como una función de Node (`server/vercel.ts`) en la
  región `gru1` (São Paulo), junto a la base de datos.
- **Base de datos:** Postgres de Supabase (proyecto `sucreia`, región `sa-east-1`). La aplicación
  entra con su propio usuario `sucreia_app` y sus tablas viven en el esquema `sucreia`, que la API
  automática de Supabase no publica. Las fotos se guardan dentro de la base (tabla `image_data`):
  Vercel no conserva archivos.
- **Mismo código en todas partes:** `server/db.ts` ofrece una interfaz asíncrona con SQLite
  (desarrollo y pruebas) y Postgres (`DATABASE_URL`). El SQL se escribe una vez; `toPostgres`
  traduce las diferencias. `npm run test:postgres` corre todas las pruebas en Postgres embebido
  (PGlite) para comprobarlo.

`scripts/vercel-build.mjs` arma `.vercel/output` con la Build Output API: sitio estático, función
de la API (con los binarios de `sharp` para las fotos) y las rutas (`/api/*` a la función, páginas
como carpetas y 404).

## Variables de Vercel

| Variable       | Uso                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Conexión al pooler de Supabase (puerto 6543, usuario `sucreia_app.<proyecto>`). Secreta.        |
| `SMTP_*`       | Opcional, ver `.env.example`. Sin SMTP no se envían correos de verificación ni de recuperación. |

Nunca escribas estos valores en el repositorio ni en archivos de texto.

## Publicar una versión

```bash
npm run check                         # pruebas en SQLite y Postgres + compilación
npm run build:vercel                  # genera .vercel/output
vercel deploy --prebuilt --prod --scope ssneyy
```

Si `vercel link` crea un `.env.local`, bórralo: trae credenciales y no debe quedar en el equipo.

Las migraciones se aplican solas al arrancar la API. Para una migración nueva, conviene
aplicarla antes de desplegar, desde este equipo, con
`DATABASE_URL=… node -e "await (await import('./server/db.ts')).openDb(process.env.DATABASE_URL)"`.

## Administración

Para habilitar una cuenta como administradora en producción (la cuenta debe existir):

```bash
DATABASE_URL=… npm run admin -- correo@ejemplo.co
```

## Pendientes conocidos

- **Correo:** configurar un servicio SMTP (por ejemplo Resend) para la verificación y la
  recuperación de contraseñas.
- **Copias de seguridad:** `npm run backup` solo copia la base SQLite local. Para Supabase,
  revisar las copias que ofrece el plan contratado.
- **Límites de intentos:** se guardan en la memoria de cada función. Con mucho tráfico conviene
  moverlos a la base o a un servicio externo.
