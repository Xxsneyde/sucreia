# SucreIA

Base web del ecosistema de emprendimientos de Sucre. Versión **0.1.0**, esqueleto navegable para desarrollo colaborativo.

## Iniciar

Necesitas Node.js 24 LTS y npm.

```bash
npm ci
npm run dev
```

Abre http://127.0.0.1:3000. No necesitas claves ni servicios externos para esta demo.

```bash
npm run check     # TypeScript + pruebas de dominio + compilación
npm run test:e2e  # Con out/ generado y Chromium de Playwright instalado
```

Para instalar Chromium: `npx playwright install chromium`. Las pruebas de navegador sirven `out/` mediante Python 3. `npm run build` genera una exportación estática en `out/`.

## Alcance

- Clientes: inicio, filtros de búsqueda, perfiles de negocios, favoritos, carrito, pedidos, solicitudes de cita/cotización y perfil.
- Negocios: resumen de indicadores, avance de pedidos de demo, listado de productos, perfil, promociones y configuración.
- Configurador: recorrido de cinco pasos con borrador local. **Todavía no genera ni publica plantillas.**
- SucrePuntos, escuela, directorio territorial, entregas y administración: pantallas base con pendientes explícitos.
- Diseño adaptable a celular; navegación inferior, acciones contextuales y estados de carga/error.

Los perfiles, reseñas, sellos y métricas son ficticios. El carrito, favoritos, solicitudes y borrador se guardan únicamente en este navegador bajo `sucreia:demo:v1`. La demo no autentica usuarios, cobra dinero, envía mensajes ni asigna entregas. Las rutas de panel y administración son públicas dentro de la demo y no contienen datos privados. No usar como producción con información real.

## Organización

```text
src/
  app/         Rutas y layout de Next.js; mantener las páginas delgadas
  components/  Navegación y piezas visuales compartidas
  features/    Funciones agrupadas por módulo y equipo responsable
  domain/      Entidades y reglas de negocio independientes de React
  data/        Datos ficticios
  lib/         Adaptadores y estado local de la demo
public/art/    Ilustraciones SVG propias, sin descargas externas
tests/         Pruebas de reglas y recorridos de navegador
docs/          Arquitectura, tareas y contratos para el equipo
.github/       CI y plantillas de issues/pull requests
```

Empieza por [CONTRIBUTING.md](CONTRIBUTING.md), [arquitectura](docs/arquitectura.md), [reparto de módulos](docs/modulos.md) y [backlog](docs/backlog.md).

## Control de versiones

Repositorio previsto: **Xxsneyde/sucreia**, público por indicación del propietario. Consulta [configuración de GitHub](docs/github.md). Una rama por tarea, pull request con revisión y `main` como versión estable. El repositorio local no equivale a un repositorio subido a GitHub: verificar el remoto con `git remote -v`.

## Decisiones de esta base

React + TypeScript + Next.js App Router, CSS compartido y módulos por función. Se utiliza exportación estática para revisar el esqueleto sin backend. La instalación se resolvió desde la caché local porque la terminal no dispone de DNS externo. El starter Vinext no estaba disponible en esa caché; se adoptó Next.js con los paquetes disponibles. El lockfile fija las versiones reproducibles.

Antes de incorporar backend, decidir proveedor, despliegue, autenticación, almacenamiento y permisos. No hay infraestructura de pago provisionada. Sites conserva un registro de vista previa en `.openai/hosting.json`; su existencia no significa que esté publicado.
