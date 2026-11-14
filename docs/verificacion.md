# Verificación de la base 0.1.0

Comprobaciones realizadas durante la preparación:

- TypeScript estricto: `node node_modules/typescript/bin/tsc --noEmit`, sin errores.
- Reglas de negocio: cuatro pruebas ejecutadas con `node tests/domain.test.ts`, todas aprobadas.
- Playwright reconoce seis recorridos (tres en escritorio y tres en móvil). Preparados, todavía no ejecutados.

## Limitaciones de este entorno

- Compilación: Next.js intenta lanzar TypeScript en un subproceso y el entorno devuelve `EPERM`. La salida resultante de Next.js es `Could not parse output from TypeScript's --showConfig`. TypeScript ejecutado directamente sí funciona. No se desactivó la comprobación de tipos ni se modificaron dependencias para ocultar el problema.
- Vista previa: abrir un socket local devuelve `PermissionError: Operation not permitted`. No fue posible iniciar servidor ni comprobar visualmente las pantallas en navegador.
- Red: la terminal devuelve `Could not resolve host: api.github.com`. GitHub CLI no puede validar la sesión ni crear o subir el repositorio en esta sesión.
- Publicación: existe un registro privado de Sites, pero no se ha publicado una versión ni hay URL de producción verificada.

## Antes de integrar la primera versión

En una terminal normal con acceso a red, ejecutar `npm ci` y `npm run check`. Después instalar Chromium con `npx playwright install chromium` y ejecutar `npm run test:e2e`. Revisar visualmente escritorio y móvil. El workflow de GitHub automatiza estas comprobaciones al subir el repositorio.
