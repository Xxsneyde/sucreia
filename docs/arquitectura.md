# Arquitectura inicial

## Capas y dependencias

`pages → features → domain`. Los componentes comunes están en `components`; el estado y los clientes de la API en `lib`. No hay negocios ni actividad de ejemplo: todo viene del servidor.

Las rutas (`src/pages`) importan pantallas de cada módulo (`src/features/<módulo>/*.vue`). Esto permite repartir trabajo evitando editar un único archivo central. El layout y la navegación son compartidos; coordinar esos cambios.

Las tiendas y la cuenta van al servidor (`src/lib/studio-store.ts`, `src/lib/session.ts`). Operaciones, favoritos, puntos y avisos vienen de `/api/plataforma` (`src/lib/platform-store.ts`); solo el carrito vive en el navegador, por cuenta. Ningún dato del navegador es confiable para precios, permisos o pagos: el servidor los recalcula.

## Modos comerciales

- `products`: catálogo, carrito y pedido.
- `booking`: solicitud de cita o reserva, sujeta a disponibilidad.
- `quote`: descripción de una necesidad y propuesta del negocio.

La demo soporta una modalidad principal por negocio. El modelo definitivo debe admitir múltiples modalidades por negocio y por oferta; por ejemplo, artesanías disponibles y encargos personalizados.

El carrito se limita a un negocio por pedido. El total de la demo incluye solo productos y supone recogida. Antes de pagos reales, calcular precios, descuentos, impuestos si aplican y domicilio en servidor con cantidades e inventario validados.

## Preparación para backend

Entidades propuestas: User, Business, BusinessMember, Offer, Order, OrderItem, Booking, QuoteRequest, Quote, Delivery, Verification, RewardLedger, Promotion, BusinessDraft y ThemeConfiguration. Separar roles globales de membresías por negocio.

Los pedidos deberían guardar una copia del precio y nombre al comprar. Las métricas de ventas deben distinguir pedidos, pagos confirmados y reembolsos. La actividad de 365 días debe derivarse de operaciones válidas, no de valores editables por el negocio.

Autenticación y autorización se implementarán en servidor. No publicar endpoints administrativos sin comprobación de rol. Solicitudes, productos y pedidos deben filtrarse por la membresía autenticada en cada operación.

El backend es una API de **Node.js + Express** en `server/` (decisión del equipo). El frontend se compila estático con `nuxt generate` y, en producción, el mismo Express lo sirve junto con `/api`: un solo servidor y sin CORS. En desarrollo, Nuxt reenvía `/api` a Express (`devProxy`). La base de datos es SQLite (`node:sqlite`) detrás de repositorios en `server/`, para poder pasar a PostgreSQL sin cambiar las rutas. Las reglas de negocio se reutilizan desde `src/domain`. Ver [api.md](api.md).

Nota: Nuxt usa `src/nuxt-server` como su carpeta de servidor (vacía) para no confundirse con `server/` de Express.

## Datos del negocio y página pública

El Configurador y el Estudio visual se retiraron (ver [presentacion.md](presentacion.md)). El emprendedor llena «Datos del negocio» (`features/commerce/BusinessEditor.vue`) y «Productos y servicios» (`ProductsEditor.vue`); ambos editan el borrador con `useStudio()` y lo publican por la API. La página pública (`features/explore/BusinessPage.vue`) tiene el diseño fijo de la presentación.

El contrato `StoreDesign` se conserva para no romper tiendas ni la API: `category` guarda el sector (`domain/sectors.ts`), `content.heroImage` es la portada, `content.storyText`/`storyImage` la historia, `content.promises` los destacados, y se añadieron `phone`, `email` y `products[].category` opcionales. `style` y `colors` siguen en el contrato (los exige `isDesign`) pero ya no se muestran; `domain/designs.ts` solo aporta los textos y productos iniciales por área.

## Imágenes de tiendas

`server/images.ts` gestiona imágenes inmutables en disco con Sharp y metadatos/propiedad en SQLite. `server/routes/images.ts` comprueba acceso al leer, subir y borrar; las fotos de borradores son privadas y las publicaciones actuales permiten acceso público. Los diseños solo referencian archivos del mismo propietario. Las versiones protegen archivos contra eliminación.

`components/images/ImageField.vue` prepara fotos en navegador; con sesión las sube a la API y ofrece `ImageLibrary.vue`. Los borradores antiguos del configurador pueden contener base64 temporalmente; `prepareDesignImages` lo sube por separado al crear la tienda. El backend admite y convierte los datos antiguos como compatibilidad. `migrateImages`, antes de escuchar peticiones, convierte tiendas existentes por transacciones completas sin alterar sus publicaciones. Contratos y persistencia en [api.md](api.md).

## Acceso y salida

`src/layouts/auth.vue` contiene ingreso, recuperación, verificación y bandeja de pruebas como pantallas independientes (diapositiva 2). Todas las demás páginas usan `default.vue` (menú lateral y barra de la presentación); las que requieren cuenta solo se dibujan después de montar, para que el HTML generado no muestre contenido personal. `middleware/access.global.ts` aplica la política de `domain/access.ts` a las rutas de herramientas y lleva al ingreso con `volver` si no hay sesión. `RequireMerchant` mantiene la comprobación de rol; la API sigue siendo la autoridad de permisos.

`LogoutButton.vue`, compartido por cabecera, perfil y cambio de cuenta, espera guardados pendientes, invalida la cookie mediante la API y limpia el estado de tiendas antes de volver al acceso. Si falla, conserva la sesión y muestra el error. No permite salir mientras se suben imágenes. Las respuestas tardías de tiendas se descartan si cambió el usuario. El configurador ahora requiere cuenta; los borradores que se hubieran creado sin cuenta se conservan al ingresar.

`domain/navigation.ts` valida destinos internos de retorno y evita URLs externas, controles, barras invertidas y retornos al propio acceso. La exportación estática genera el estado inicial de carga; las cookies se consultan en el navegador.

## Vitrina pública y plataforma

`lib/directory.ts` consulta `GET /api/tiendas` (solo publicadas) y lo comparten Inicio, Buscar, Sectores, Mapa y Recomendaciones; nunca mezcla borradores ni datos de ejemplo. `/`, `/buscar`, `/sectores`, `/mapa` y `/tienda?id=…` son públicas; sin cuenta, comprar, reservar o guardar favoritos lleva al ingreso conservando el destino. Las páginas generadas no tienen la parte `?…` de la dirección y, al arrancar, Nuxt la quita un instante: los componentes leen primero `route.query` y después `window.location`.

## Operación completa (reemplaza los módulos de demo)

`domain/platform.ts` define contratos de operaciones, agenda, promociones, puntos y contexto del negocio. `server/platform.ts` concentra transacciones y permisos por participante; `server/routes/platform.ts` adapta HTTP. Las migraciones agregadas son aditivas. Las pantallas activas en `features/commerce` consumen `lib/platform-store.ts`; el carrito está aislado por cuenta y navegador, y las operaciones confirmadas viven en SQLite.

Los componentes de demostración anteriores (`demo-store`, catálogo ficticio) se eliminaron. Los datos de demostración actuales se crean por la API con `npm run demo` solo en local.

El servidor calcula precios desde la publicación, descuenta existencias y consume bonos en una transacción. La clave de idempotencia está ligada al cliente y al hash de la solicitud. Los estados tienen acciones distintas por cliente, dueño y domiciliario asignado. Las reservas guardan inicio/fin para evitar solapamiento incluso al cambiar la duración del negocio. El pago lo registra un participante autorizado; los puntos se generan una sola vez al completar. Devoluciones ajustan puntos, bono y stock en una transacción.

El PIN solo se serializa para el cliente; sus intentos incorrectos persisten y bloquean nuevos intentos temporalmente. Las fotografías de domiciliarios están ligadas a su perfil y al historial de entregas, con acceso de propietario, revisión administrativa o participantes; perfiles aprobados permiten foto pública. Las reseñas requieren evidencia de finalización y no son editables por el negocio.

La API administrativa exige rol admin. La conversión de cliente solo permite emprendedor; el primer administrador se asigna por comando local con bloqueo. La verificación se invalida al publicar cambios de identidad/contacto. Una suspensión administrativa impide volver a publicar sin reactivación.

`catalog-ai.ts` conecta opcionalmente un Ollama local al catálogo y al material de la escuela. Los modelos no reciben datos de pedidos, credenciales ni herramientas de escritura. Sin modelo o al fallar se identifica la guía local. Tiene límite de concurrencia, solicitudes y tiempo. La escuela verifica respuestas en servidor, conserva progreso y emite una constancia idempotente con código público por decisión del usuario.

Las pruebas de API usan el parser HTTP de Node y Express sobre un Duplex en memoria (`tests/http.ts`), con cookies, cuerpos y respuestas reales, sin abrir sockets. Playwright sigue reservado para recorridos con el servidor y navegador reales; no confundir una API comprobada con validación visual.
