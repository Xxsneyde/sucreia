# SucreIA

Base web del ecosistema de emprendimientos de Sucre. Versión **0.3.0**, esqueleto navegable con estudio visual local para desarrollo colaborativo. Frontend con **Vue 3 + Nuxt 4** y backend con **Node.js + Express**, todo en TypeScript.

## Iniciar

Necesitas Node.js 24 LTS y npm.

```bash
npm ci
npm run dev:api   # Terminal 1: API de Node.js + Express en http://127.0.0.1:4000/api
npm run dev       # Terminal 2: sitio de Vue en http://127.0.0.1:3000 (reenvía /api a la API)
```

Abre http://127.0.0.1:3000. No necesitas claves ni servicios externos: la base de datos es SQLite incluida en Node (`server/data/`). Producción: `npm run build && npm start` (API y sitio en el mismo servidor). Detalle de rutas en [docs/api.md](docs/api.md).

```bash
npm run check     # TypeScript + pruebas (dominio y API) + compilación
npm run test:e2e  # Después de npm run build; usa Express con base de datos en memoria
```

Para instalar Chromium: `npx playwright install chromium`. Las pruebas de navegador arrancan el servidor real de Express (`npm start`) con una base de datos en memoria, así que primero hay que ejecutar `npm run build`.

## Alcance

- Cuentas: crear cuenta, ingresar y salir (`/ingresar`). El estudio y «Mi tienda» piden una cuenta de emprendedor; el configurador se puede llenar sin cuenta y la pide al final, sin perder lo escrito.
- Las tiendas se guardan en el servidor: al publicarlas, **cualquier persona** las ve en el catálogo y en `/tienda?id=…`. Las tiendas guardadas solo en el navegador con versiones anteriores se pueden subir a la cuenta desde el estudio.
- Clientes: inicio, filtros de búsqueda, perfiles de negocios, favoritos, carrito, pedidos, solicitudes de cita/cotización y perfil.
- Negocios: resumen de indicadores, avance de pedidos de demo, listado de productos, perfil, promociones y configuración.
- Configurador (`/registro/negocio`): datos del negocio → catálogo → **su página en los 7 estilos, con los 3 recomendados para su área primero** (artesanías, gastronomía, belleza, servicios, moda, turismo, salud u otro), cada una con su estilo y su tipografía → crear la tienda.
- Mi tienda (`/estudio/gestionar`): vista previa en escritorio y celular, cambiar de estilo, datos, textos, catálogo, versiones y publicación. Publica en `/tienda` a través de la API.
- Estilos disponibles: minimalista, brutalista, editorial, orgánico, elegante, moderno y retro (`src/domain/designs.ts`, CSS en `src/assets/css/plantillas.css`). Las tipografías se sirven desde el propio sitio con `@fontsource`.
- SucrePuntos, escuela, directorio territorial, entregas y administración: pantallas base con pendientes explícitos.
- Diseño adaptable a celular; navegación inferior, acciones contextuales y estados de carga/error.

Los perfiles, reseñas, sellos y métricas son ficticios. El carrito, favoritos, solicitudes y borrador se guardan únicamente en este navegador bajo `sucreia:demo:v1`; las tiendas del estudio, en IndexedDB (`sucreia-studio`). La demo no autentica usuarios, cobra dinero, envía mensajes ni asigna entregas. Las rutas de panel y administración son públicas dentro de la demo y no contienen datos privados. No usar como producción con información real.

## Organización

```text
src/
  pages/       Rutas de Nuxt (un archivo .vue por ruta); mantener las páginas delgadas
  layouts/     Layout principal (barra lateral y navegación)
  app.vue      Raíz de la app; carga los datos locales al montar
  error.vue    Página 404 y de error
  assets/css/  Estilos globales, del estudio, de las plantillas y tipografías
  components/  Navegación y piezas visuales compartidas
  features/    Funciones agrupadas por módulo y equipo responsable
  domain/      Entidades y reglas de negocio en TypeScript puro (sin Vue)
  data/        Datos ficticios
  lib/         Stores (estado compartido) y adaptadores de almacenamiento local
public/art/    Ilustraciones SVG propias, sin descargas externas
server/        API de Node.js + Express (rutas, cuentas, base de datos SQLite)
tests/         Pruebas de reglas, de la API y recorridos de navegador
docs/          Arquitectura, tareas y contratos para el equipo
.github/       CI y plantillas de issues/pull requests
```

Empieza por [CONTRIBUTING.md](CONTRIBUTING.md), [arquitectura](docs/arquitectura.md), [reparto de módulos](docs/modulos.md) y [backlog](docs/backlog.md).

## Control de versiones

Repositorio previsto: **Xxsneyde/sucreia**, público por indicación del propietario. Consulta [configuración de GitHub](docs/github.md). Una rama por tarea, pull request con revisión y `main` como versión estable. El repositorio local no equivale a un repositorio subido a GitHub: verificar el remoto con `git remote -v`.

## Decisiones de esta base

Vue 3 + Nuxt 4 + TypeScript, CSS compartido y módulos por función. El equipo eligió Vue.js y Node.js; Nuxt corre sobre Node y agrega rutas por archivos y generación estática. Se usa `nuxt generate` para revisar el esqueleto sin backend; el mismo proyecto puede servirse con Node (`nuxt build`) cuando haya API. Iconos con `@lucide/vue`. El lockfile fija las versiones reproducibles.

Migrado desde React/Next.js en la versión 0.3.0 conservando diseño, reglas de dominio y pruebas. Notas para el equipo:

- Componentes con `<script setup lang="ts">`; estado compartido con `useDemo()` y `useStudio()` de `src/lib`.
- Los diseños del estudio se guardan como objetos planos (`shallowRef`); no pasar objetos reactivos a `structuredClone` ni a IndexedDB.
- Los datos del navegador se leen en `onMounted` de `app.vue` para que el HTML generado coincida con el primer render.

Antes de incorporar backend, decidir proveedor, despliegue, autenticación, almacenamiento y permisos. No hay infraestructura de pago provisionada. Sites conserva un registro de vista previa en `.openai/hosting.json`; su existencia no significa que esté publicado.
