# SucreIA

Base web del ecosistema de emprendimientos de Sucre. Versión **0.3.0**, plataforma local con recorridos persistentes para clientes, emprendedores, domiciliarios y administración. Frontend con **Vue 3 + Nuxt 4** y backend con **Node.js + Express**, todo en TypeScript.

## Iniciar

Necesitas Node.js 24 LTS y npm.

```bash
npm ci
npm run dev:api   # Terminal 1: API de Node.js + Express en http://127.0.0.1:4000/api
npm run dev       # Terminal 2: sitio de Vue en http://127.0.0.1:3000 (reenvía /api a la API)
```

Abre http://127.0.0.1:3000. Para desarrollo no necesitas claves ni servicios externos: la base de datos es SQLite incluida en Node (`server/data/`). Producción: `npm run build && npm start` (API y sitio en el mismo servidor). Detalle de rutas en [docs/api.md](docs/api.md).

```bash
npm run check     # TypeScript + pruebas (dominio y API, SQLite y Postgres) + compilación
npm run test:e2e  # Después de npm run build; usa Express con base de datos en memoria
```

Las pruebas de navegador arrancan Express con el sitio compilado, una base de datos en memoria y una bandeja de correo efímera (`tests/browser-server.ts`), así que primero hay que ejecutar `npm run build`. Usan el Chromium de Playwright (`npx playwright install chromium`); con `PW_CHANNEL=chrome npm run test:e2e` usan el Chrome instalado en el equipo. `E2E_PORT` cambia el puerto (4173 por defecto). Si el equipo entra en suspensión durante la corrida, las pruebas fallan por tiempo: déjalo activo.

## Recorridos disponibles

Son los de la versión publicada en https://sucreia.site (ver [vistas por rol](docs/roles.md)).

- **Cuentas:** registro con correo y contraseña, confirmación por correo (o SMS si está configurado), perfil con nombre, cédula y dirección, recuperación de contraseña e ingreso con Google si está configurado.
- **Buscar:** negocios publicados por sector, subcategoría y municipio, mapa de emprendimientos y el Asistente SucreIA para encontrar productos y servicios.
- **Negocios:** registro en siete pasos (datos, cómo atiende, logo y portada, catálogo, ubicación y cupos, documentos), revisión y aprobación de la administración, edición de datos y catálogo, varios negocios por cuenta, promociones y reseñas.
- **Compras:** carrito que envía el pedido al WhatsApp del negocio; el pago y la entrega se acuerdan con el negocio. Quedan en «Mis compras» y en el panel del negocio.
- **Servicios:** reservas con día, hora y cupos por hora; cotizaciones que el cliente acepta; reseñas al completar.
- **Administración:** aprobación de registros con sus documentos, negocios aprobados, sello de verificado y PQRS.

El código de Escuela, SucrePuntos, Domiciliario y la vista de inicio sigue en el repositorio y su API funciona, pero lo publicado retiró esas páginas del menú y las redirige a `/buscar`.

SQLite guarda operaciones y permisos; los archivos de imágenes están en disco. El carrito es local al navegador y a la cuenta. No se crean compras, reputación o saldos ficticios al iniciar. El código anterior de demostración se conserva como referencia, pero sus pantallas no son las rutas del producto.

Los pagos y devoluciones se registran después de efectuarlos directamente con el negocio: SucreIA no mueve dinero ni verifica bancos automáticamente. No hay GPS en vivo ni aprovisionamiento automático de SMTP, modelos de IA o hosting. La validación de navegador real y la configuración operativa son necesarias antes del uso con clientes reales.

## Producción en Hostinger

El sitio está en **https://sucreia.site**: una aplicación Node.js en Hostinger que entrega la API y las páginas generadas, con Postgres en Supabase (las fotos van dentro de la base). `npm run build:hostinger` arma el paquete en `hostinger/`, lo prueba arrancándolo con una base temporal y genera `hostinger.zip`, que es lo que se sube. En este equipo se sigue trabajando con SQLite. Guía completa en [docs/hostinger.md](docs/hostinger.md). Vercel ya no se usa ([docs/vercel.md](docs/vercel.md) queda como referencia).

## Datos de demostración

`npm run demo -- --confirmar` carga en una API local los negocios de la presentación con fotos, descuentos y reseñas de compras reales de prueba. Ver [docs/presentacion.md](docs/presentacion.md); nunca usarlo en producción.

## Correo, copias y Docker

- `.env.example` documenta las variables; los comandos del servidor leen `.env` si existe.
- `npm run mail:check`: comprueba el SMTP configurado sin enviar correos.
- `npm run backup`: API detenida; copia SQLite e imágenes en una carpeta nueva.
- `npm run restore -- <copia> <destino nuevo>`: verifica y restaura sin sobrescribir el original.
- `docker compose up --build -d`: aplicación con volúmenes de datos y copias. Para HTTP local, configura `COOKIE_SECURE=false`; para HTTPS, `true`.

Pasos, configuración, recuperación de bloqueos y límites en [docs/operacion.md](docs/operacion.md). El despliegue externo y la entrega real de correo requieren configuración y validación del equipo.

## Organización

```text
src/
  pages/       Rutas de Nuxt (un archivo .vue por ruta); mantener las páginas delgadas
  layouts/     Layout principal (barra lateral y navegación)
  app.vue      Raíz de la app; carga los datos locales al montar
  error.vue    Página 404 y de error
  assets/css/  Sistema visual de la presentación (sucre.css) y tipografía Poppins
  components/  Navegación y piezas visuales compartidas
  features/    Funciones agrupadas por módulo y equipo responsable
  domain/      Entidades y reglas de negocio en TypeScript puro (sin Vue)
  lib/         Stores (estado compartido) y adaptadores de almacenamiento local
public/art/    Ilustraciones SVG propias, sin descargas externas
public/sucre/  Fotos recortadas de la presentación (las demo-* solo para `npm run demo`)
server/        API de Node.js + Express (rutas, cuentas, base de datos SQLite)
tests/         Pruebas de reglas, de la API y recorridos de navegador
docs/          Arquitectura, tareas y contratos para el equipo
.github/       CI y plantillas de issues/pull requests
```

Empieza por [CONTRIBUTING.md](CONTRIBUTING.md), [arquitectura](docs/arquitectura.md), [reparto de módulos](docs/modulos.md), [vistas por rol](docs/roles.md) y [backlog](docs/backlog.md).

## Control de versiones

Repositorio previsto: **Xxsneyde/sucreia**, público por indicación del propietario. Consulta [configuración de GitHub](docs/github.md). Una rama por tarea, pull request con revisión y `main` como versión estable. El repositorio local no equivale a un repositorio subido a GitHub: verificar el remoto con `git remote -v`.

## Decisiones de esta base

Vue 3 + Nuxt 4 + TypeScript, CSS compartido y módulos por función. El equipo eligió Vue.js y Node.js; Nuxt corre sobre Node y agrega rutas por archivos y generación estática. Se usa `nuxt generate` para revisar el esqueleto sin backend; el mismo proyecto puede servirse con Node (`nuxt build`) cuando haya API. Iconos con `@lucide/vue`. El lockfile fija las versiones reproducibles.

Migrado desde React/Next.js en la versión 0.3.0 conservando diseño, reglas de dominio y pruebas. Notas para el equipo:

- Componentes con `<script setup lang="ts">`; estado compartido con `useStudio()` (tiendas del emprendedor), `useDirectory()` (negocios publicados) y `usePlatform()` de `src/lib`.
- Los diseños de tienda se guardan como objetos planos (`shallowRef`); no pasar objetos reactivos a `structuredClone` ni a IndexedDB.
- Los datos del navegador se leen en `onMounted` de `app.vue` para que el HTML generado coincida con el primer render.

La operación incluye SMTP opcional, copias/restauración y Docker con volúmenes persistentes. Consulta [la guía de operación](docs/operacion.md) para configurar y comprobar correo, copias y hosting; los recorridos reales y la revisión visual deben comprobarse antes de desplegar. No hay infraestructura de pago provisionada. Sites conserva un registro de vista previa en `.openai/hosting.json`; su existencia no significa que esté publicado.
