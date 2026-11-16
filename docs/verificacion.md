# Verificación de la base 0.2.0

Última revisión: 16 de noviembre de 2026, Node 26 y Chromium de Playwright.

| Comprobación                          | Resultado                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `npm run typecheck`                   | Sin errores                                                                |
| `npm test` (dominio + estudio)        | 14/14                                                                      |
| `npm run build` (exportación en out/) | 30 rutas generadas                                                         |
| `npm run test:e2e` × 3 repeticiones   | 36/36 (escritorio y móvil)                                                 |
| `npm run dev`                         | Arranca; sin errores de consola ni de hidratación en las rutas principales |
| Recorrido de rutas                    | Sin desbordamiento horizontal en 1280 px ni en iPhone 13                   |

## Notas para quien escribe pruebas

- Next.js inserta durante la carga una copia oculta de la página (`<div hidden id="S:0">`) mientras reemplaza `loading.tsx`. `getByLabel(...)` y `locator('h1')` también cuentan elementos ocultos y fallan en modo estricto de forma intermitente. Usa localizadores por rol: `getByRole('textbox', { name })`, `getByRole('heading', { level: 1 })`.
- En pantallas de 980 px o menos, el panel de propiedades del editor flota sobre el lienzo. Al tocar un bloque ya no se abre solo; se abre con el botón «Editar bloque».

## Pendiente

- Publicación real: no hay backend, autenticación ni dominio. Todo vive en el navegador.
- Protección de `main` y CI en GitHub: activar después del primer push (ver `docs/github.md`).
