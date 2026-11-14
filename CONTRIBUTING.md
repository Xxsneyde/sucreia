# Trabajar en equipo

1. Reclama o crea un issue con objetivo, módulo y criterios de aceptación.
2. Actualiza `main`: `git switch main` y `git pull --ff-only`.
3. Crea una rama: `git switch -c feature/numero-descripcion`.
4. Trabaja en tu módulo. Acuerda cambios en contratos o componentes compartidos antes de modificarlos.
5. Ejecuta `npm run check`. Si cambias un recorrido, ejecuta también `npm run test:e2e`.
6. Revisa `git diff` y confirma solo archivos de la tarea: `git add ruta` y `git commit -m "feat(modulo): descripción"`.
7. Sube la rama: `git push -u origin feature/numero-descripcion`.
8. Abre un pull request a `main`, vincula el issue y pide revisión a otro compañero.
9. Integra con squash después de aprobación y CI correcto; elimina la rama ya integrada.

## Convenciones

- Ramas: `feature/`, `fix/`, `docs/`, `chore/`.
- Commits: `feat(catalogo): ...`, `fix(pedidos): ...`, `docs(equipo): ...`.
- Interfaz y documentación en español. Entidades y símbolos de código coherentes en inglés.
- TypeScript estricto. Evitar `any` y cambios globales innecesarios.
- La lógica de negocio vive en `src/domain`; los componentes en `src/features/<modulo>`.
- Usar etiquetas visibles en formularios y mantener navegación por teclado.
- No subir `.env`, claves, tokens, bases de datos ni información de clientes.
- Ninguna credencial secreta puede tener prefijo `NEXT_PUBLIC_`.
- Datos reales requieren validación y permisos en servidor, aunque la UI oculte un botón.
- Coordinar cambios a `package.json` y al lockfile; usar `npm ci` para instalaciones reproducibles.

## Revisión

Un compañero debe revisar comportamiento, alcance, accesibilidad móvil y consecuencias sobre otros módulos. Adjuntar capturas si hay cambios visuales. El autor resuelve comentarios y conflictos en su rama. No hacer force-push a `main`.

La protección de `main` es una configuración remota de GitHub; el archivo de CI no la activa por sí solo. Sigue `docs/github.md`.
