# Verificación de la base 0.3.0 (Vue 3 + Nuxt 4)

Última revisión: 16 de noviembre de 2026, Node 26 y Chromium de Playwright.

| Comprobación                            | Resultado                                                      |
| --------------------------------------- | -------------------------------------------------------------- |
| `npm run typecheck` (vue-tsc + pruebas) | Sin errores                                                    |
| `npm test` (dominio, diseños y API)     | 28/28: contraste de las 24 paletas y 8 pruebas de la API       |
| `npm run build` (`nuxt generate`)       | Todas las rutas generadas en `.output/public`, incluida la 404 |
| `npm run test:e2e` × 3 repeticiones     | 36/36 (escritorio y móvil)                                     |
| `npm run dev`                           | Sin errores de consola ni de hidratación en las rutas          |
| Recorrido de rutas                      | Sin desbordamiento horizontal en 1280 px ni en iPhone 13       |

## Notas para quien escribe pruebas

- Prefiere localizadores por rol: `getByRole('textbox', { name })`, `getByRole('heading', { level: 1 })`. Son más estables que `getByLabel` o `locator('h1')`.
- Cada propuesta de diseño tiene `data-style` (en `.dp-card` y en `.sp`); úsalo para comprobar qué estilo se eligió.
- El servidor de Python de las pruebas no usa `404.html`; un hosting real sí.

## Pendiente

- Publicación real: no hay backend, autenticación ni dominio. Todo vive en el navegador.
- Protección de `main` en GitHub (ver `docs/github.md`).
