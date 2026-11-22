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
npm run check     # TypeScript + pruebas (dominio y API) + compilación
npm run test:e2e  # Después de npm run build; usa Express con base de datos en memoria
```

Para instalar Chromium: `npx playwright install chromium`. Las pruebas de navegador arrancan Express con el sitio compilado, una base de datos en memoria y una bandeja de correo efímera (`tests/browser-server.ts`), así que primero hay que ejecutar `npm run build`.

## Recorridos disponibles

La [guía del recorrido completo](docs/recorrido-completo.md) explica cómo probarlo con cuentas diferentes.

- **Visitantes:** vitrina de negocios realmente publicados, filtros, catálogos y contacto por WhatsApp, sin menús de la plataforma ni negocios ficticios.
- **Cuentas:** acceso independiente, recuperación/verificación, nombre editable, salida visible y activación del espacio de emprendedor sin crear otra cuenta.
- **Emprendedores:** «Datos del negocio» (sector, municipio, historia, destacados, contacto, logo y portada) y «Productos y servicios» (grupos, precios, fotos y existencias); la página pública usa el diseño fijo de la presentación ([docs/presentacion.md](docs/presentacion.md)).
- **Compras:** carrito por cuenta/navegador, cálculo del servidor, stock, reintentos idempotentes, recogida/domicilio y seguimiento persistente. No permite comprar al propio negocio.
- **Servicios:** agenda sin solapamientos, citas con confirmación, solicitudes de cotización, propuesta del negocio y aceptación del cliente.
- **Negocios:** pagos confirmados hoy, operaciones nuevas, pendientes por despachar/entregar, productos consultados, inventario, agenda, instrucciones de transferencia y promociones.
- **Entregas:** solicitud y revisión de domiciliarios, foto, asignación, contacto, minutos estimados, efectivo recibido y confirmación con PIN privado del cliente.
- **SucrePuntos:** saldo inicial cero, libro de movimientos, puntos por operaciones pagadas/completadas, canjes ligados al negocio, bonos de un uso y ajustes por devoluciones.
- **Confianza:** reseñas por operaciones completadas, valoración del domiciliario y sello de verificación manual con operaciones de los últimos 365 días.
- **Escuela:** siete lecciones en seis cursos, ejercicios y evaluación comprobada en servidor, progreso por cuenta, orden sugerido por actividad, tutor y constancia verificable para imprimir.
- **Territorio y asistencia:** ubicaciones reales indicadas por los negocios; consulta de catálogo y tutor con guía local o IA de Ollama opcional, sin acciones automáticas ni afirmaciones de disponibilidad.
- **Administración:** permisos de administrador, revisión y moderación, suspensión/reactivación de publicaciones y auditoría de decisiones. El primer administrador se habilita por terminal, con la API detenida.
- **Avisos:** notificaciones persistentes por cuenta y consultas periódicas de estado cada 15 segundos. WhatsApp se abre por decisión del usuario; no hay mensajes automáticos.

SQLite guarda operaciones y permisos; los archivos de imágenes están en disco. El carrito es local al navegador y a la cuenta. No se crean compras, reputación o saldos ficticios al iniciar. El código anterior de demostración se conserva como referencia, pero sus pantallas no son las rutas del producto.

Los pagos y devoluciones se registran después de efectuarlos directamente con el negocio: SucreIA no mueve dinero ni verifica bancos automáticamente. No hay GPS en vivo ni aprovisionamiento automático de SMTP, modelos de IA o hosting. La validación de navegador real y la configuración operativa son necesarias antes del uso con clientes reales.

## Producción en Vercel

El sitio está en **https://sucreia.vercel.app**: páginas estáticas, la API como función de Vercel y Postgres en Supabase (las fotos van dentro de la base). En este equipo se sigue trabajando con SQLite. Guía completa en [docs/vercel.md](docs/vercel.md).

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
