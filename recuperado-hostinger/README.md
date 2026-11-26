# Recuperación desde Hostinger (2026-11-26)

El código local más reciente se perdió y nunca se subió a GitHub. Esta carpeta se reconstruyó desde la copia descargada del despliegue en Hostinger (`sucreia.site/hbuilds/last-source`, deploy del 2026-11-25).

- `server/`, `src/`: el backend separado del bundle `server.mjs` usando los comentarios de ruta que deja esbuild. Es JavaScript **sin tipos** (esbuild elimina TypeScript); la lógica está completa. Los archivos que aparecían en varios trozos del bundle están unidos con el marcador `// --- (continuación en el bundle) ---`.
- `publicado/`: copia tal cual de lo que corre en producción (`server.mjs`, `package.json`, `public/`). El frontend está minificado y sin source maps: sirve de referencia para reconstruir las páginas Vue, no como código fuente.

Nuevos respecto al repo (no existen en ningún branch): `server/brain`, `db-ssl`, `google`, `security-headers`, `sms`, `routes/asistente`, `routes/pqrs`, `src/domain/brain/*`, `documents`, `subcategories`, `whatsapp-order`.

Páginas publicadas que faltan en `src/pages`: `completar-perfil`, `emprender`, `marca`, `pqrs`, `quienes-somos`, `registro-negocio`, `sucre`, `terminos`, `art`.

No se copió `hbuilds/config/.env` (secretos). Sus nombres de variables están en `.env.example`.

No desplegar desde la rama principal hasta integrar esto: se perderían esas páginas y rutas.
