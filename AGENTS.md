# Instrucciones para cambios en SucreIA

- Leer README.md y docs/arquitectura.md antes de cambiar arquitectura.
- Mantener rutas delgadas en src/app y lógica de función en src/features.
- Usar TypeScript estricto; evitar any.
- Interfaz y documentación en español; preservar accesibilidad y diseño móvil.
- No convertir datos de demo en producción ni simular integraciones como completadas.
- Validar cambios con npm run check. Los recorridos principales tienen pruebas en tests/e2e.
- No modificar contratos de src/domain sin actualizar consumidores y documentación.
- No subir secretos, datos de clientes ni salidas de compilación.
- Trabajar con rama por tarea y pull request; no hacer force-push a main.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
