# API de SucreIA (Node.js + Express)

Código en `server/`. Base de datos SQLite (`node:sqlite`, incluida en Node) en `server/data/sucreia.db`, que se crea sola y no se sube al repositorio.

```bash
npm run dev:api   # API en http://127.0.0.1:4000/api (se reinicia al guardar)
npm run dev       # Sitio en http://127.0.0.1:3000; reenvía /api a la API
npm run build && npm start   # Producción: API + sitio en el mismo puerto (PORT, por defecto 4000)
```

Variables opcionales: `PORT`, `HOST`, `DATABASE_PATH`. `npm start` usa `--production`: cookies solo por HTTPS y Express entrega también el sitio compilado (`.output/public`).

## Organización

| Archivo              | Qué hace                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| `server/index.ts`    | Arranca el servidor                                                         |
| `server/app.ts`      | Arma Express: seguridad, rutas `/api` y sitio estático                      |
| `server/db.ts`       | Conexión y migraciones numeradas (agrega nuevas al final, no edites viejas) |
| `server/auth.ts`     | Contraseñas (scrypt), sesiones y permisos por rol                           |
| `server/stores.ts`   | Repositorio de tiendas (SQL ↔ tipos de `src/domain`)                        |
| `server/routes/*.ts` | Rutas por módulo                                                            |
| `tests/api.test.ts`  | Pruebas de la API contra un servidor real con base en memoria               |

Las validaciones de negocio vienen de `src/domain` (las mismas del navegador). Para un módulo nuevo (por ejemplo pedidos): migración en `db.ts`, repositorio `server/pedidos.ts`, rutas `server/routes/pedidos.ts`, registrarlas en `app.ts` y pruebas en `tests/`.

## Respuestas y errores

JSON. Los errores responden `{ "error": "mensaje en español" }` con el código HTTP adecuado: 400 datos inválidos, 401 sin sesión, 403 sin permiso u origen ajeno, 404 no existe (o no es tuyo), 409 conflicto, 413 demasiado grande, 422 no se puede publicar, 429 demasiados intentos.

## Cuentas — `/api/auth`

| Método | Ruta        | Cuerpo                                                        | Respuesta                     |
| ------ | ----------- | ------------------------------------------------------------- | ----------------------------- |
| POST   | `/registro` | `{ email, name, password, role: "cliente" \| "emprendedor" }` | 201 `{ user }` y cookie       |
| POST   | `/ingresar` | `{ email, password }`                                         | 200 `{ user }` y cookie       |
| POST   | `/salir`    | —                                                             | 204                           |
| GET    | `/yo`       | —                                                             | `{ user }` o `{ user: null }` |

La sesión viaja en la cookie `sucreia_sesion` (httpOnly, SameSite=Lax, 30 días). Contraseña mínima de 8 caracteres. No se pueden crear administradores desde el registro. Máximo 10 intentos de ingreso cada 15 minutos por IP y correo.

## Tiendas públicas — `/api/tiendas`

| Método | Ruta   | Respuesta                                                            |
| ------ | ------ | -------------------------------------------------------------------- |
| GET    | `/`    | `{ stores: Business[] }` (solo publicadas, formato del catálogo)     |
| GET    | `/:id` | `{ id, publishedAt, design }` (versión publicada; 404 si no lo está) |

## Mis tiendas — `/api/mis-tiendas` (rol emprendedor o admin)

| Método | Ruta               | Cuerpo       | Respuesta                                              |
| ------ | ------------------ | ------------ | ------------------------------------------------------ |
| GET    | `/`                | —            | `{ stores: StoreProject[] }`                           |
| POST   | `/`                | `{ design }` | 201 `{ store }` (máximo 30 por persona)                |
| GET    | `/:id`             | —            | `{ store }`                                            |
| PUT    | `/:id`             | `{ design }` | `{ store }` (guarda el borrador)                       |
| POST   | `/:id/publicar`    | —            | `{ store }` (422 si le falta algo; guarda 8 versiones) |
| DELETE | `/:id/publicacion` | —            | `{ store }` (retira la publicación)                    |
| DELETE | `/:id`             | —            | 204                                                    |

`design` es un `StoreDesign` de `src/domain/studio.ts` y se valida con `isDesign`. Las tiendas de otra persona responden 404.

## Seguridad incluida

Contraseñas con scrypt y sal, comparación en tiempo constante, mismo mensaje si el correo no existe, token de sesión aleatorio guardado como hash, cookies httpOnly/SameSite (y Secure en producción), rechazo de peticiones de otro origen en métodos que modifican datos, cabeceras `nosniff`/`X-Frame-Options`, límite de 13 MB por petición y bloqueo de archivos ocultos al servir el sitio.

Pendiente antes de datos reales: recuperación de contraseña, verificación de correo, almacenamiento de imágenes fuera de la base de datos y copias de seguridad.
