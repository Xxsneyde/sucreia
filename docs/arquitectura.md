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

## Configurador y diseños por área

1. El emprendedor indica nombre, área, municipio, forma de atención e historia; luego su catálogo.
2. `src/domain/designs.ts` define 7 estilos (minimalista, brutalista, editorial, orgánico, elegante, moderno y retro) y, para cada área, 3 estilos recomendados con su paleta; los otros 4 se ofrecen después con la paleta del área que los recomienda, además de textos sugeridos con el nombre y el municipio.
3. `designOptions()` genera las 7 páginas con los datos reales del negocio (recomendadas primero); el emprendedor ve miniaturas y la vista completa (escritorio y celular) y elige una.
4. La página tiene una estructura fija (portada, catálogo, historia, pasos para comprar, contacto) dibujada por `StorePage.vue`; cada estilo cambia composición y detalles en `plantillas.css`. No hay editor por bloques.
5. «Mi tienda» permite cambiar de propuesta, editar datos, textos y catálogo, publicar y restaurar versiones.
6. Los espacios guardados con el editor anterior (esquema 1) se convierten con `upgradeWorkspace()`.

Para agregar un estilo: añadirlo en `styleIds`/`styles`, escribir su bloque `.sp--<estilo>` en `plantillas.css` y usarlo en las `choices` de alguna área. Las pruebas exigen que cada paleta tenga contraste 4,5 o más y que cada área ofrezca los 7 estilos con sus 3 recomendados primero.

Los textos de confianza son compromisos que el propio negocio puede cumplir. No se generan reseñas, calificaciones ni sellos. La IA podrá sugerir textos más adelante, siempre con revisión del propietario y sin inventar precios, disponibilidad ni reputación.

## Imágenes de tiendas

`server/images.ts` gestiona imágenes inmutables en disco con Sharp y metadatos/propiedad en SQLite. `server/routes/images.ts` comprueba acceso al leer, subir y borrar; las fotos de borradores son privadas y las publicaciones actuales permiten acceso público. Los diseños solo referencian archivos del mismo propietario. Las versiones protegen archivos contra eliminación.

`ImageField.vue` prepara fotos en navegador; con sesión las sube a la API y ofrece `ImageLibrary.vue`. Los borradores antiguos del configurador pueden contener base64 temporalmente; `prepareDesignImages` lo sube por separado al crear la tienda. El backend admite y convierte los datos antiguos como compatibilidad. `migrateImages`, antes de escuchar peticiones, convierte tiendas existentes por transacciones completas sin alterar sus publicaciones. Contratos y persistencia en [api.md](api.md).

## Acceso y salida

`src/layouts/auth.vue` contiene ingreso, recuperación, verificación y bandeja de pruebas como pantallas independientes. La vitrina pública usa `public.vue`; el espacio autenticado usa `default.vue`, que no dibuja menús ni contenido interno antes de comprobar la cuenta. `middleware/access.global.ts` aplica la política de `domain/access.ts` a las rutas de herramientas y lleva al ingreso con `volver` si no hay sesión. `RequireMerchant` mantiene la comprobación de rol; la API sigue siendo la autoridad de permisos.

`LogoutButton.vue`, compartido por cabecera, perfil y cambio de cuenta, espera guardados pendientes, invalida la cookie mediante la API y limpia el estado de tiendas antes de volver al acceso. Si falla, conserva la sesión y muestra el error. No permite salir mientras se suben imágenes. Las respuestas tardías de tiendas se descartan si cambió el usuario. El configurador ahora requiere cuenta; los borradores que se hubieran creado sin cuenta se conservan al ingresar.

`domain/navigation.ts` valida destinos internos de retorno y evita URLs externas, controles, barras invertidas y retornos al propio acceso. La exportación estática genera el estado inicial de carga; las cookies se consultan en el navegador.

## Vitrina pública y plataforma

`PublicDirectory.vue` consulta directamente `GET /api/tiendas`; nunca importa los negocios de ejemplo ni mezcla borradores o tiendas del propietario. Tiene búsqueda, filtros por categoría/municipio y estados de carga, error y vacío. `/` y `/buscar` siempre son páginas públicas con cabecera de marca e ingreso o regreso al espacio de la cuenta.

`/inicio` mantiene el catálogo de demostración dentro del espacio autenticado. Panel, perfil, pedidos, favoritos, puntos, escuela, mapa, administración, páginas de ejemplo y configurador requieren sesión. El layout interno se activa después del montaje para mantener hidratación consistente con el HTML estático, que solo contiene la espera inicial y no menús internos. Las rutas dinámicas de negocios de ejemplo se prerenderizan explícitamente para los recorridos internos.

Las tiendas publicadas (`/tienda?id=…`) siguen siendo públicas, con su diseño y contenido. Sin cuenta no muestran favoritos, saldo de carrito ni herramientas personales; al intentar comprar o reservar llevan al ingreso y conservan el destino de la tienda. Los permisos reales de tiendas siguen en la API.

## Operación completa (reemplaza los módulos de demo)

`domain/platform.ts` define contratos de operaciones, agenda, promociones, puntos y contexto del negocio. `server/platform.ts` concentra transacciones y permisos por participante; `server/routes/platform.ts` adapta HTTP. Las migraciones agregadas son aditivas. Las pantallas activas en `features/commerce` consumen `lib/platform-store.ts`; el carrito está aislado por cuenta y navegador, y las operaciones confirmadas viven en SQLite.

Los componentes anteriores de pedidos, panel, recompensas y comunidad basados en `demo-store` siguen en el repositorio, pero ninguna página los usa (ver `docs/modulos.md`). El configurador espera la carga del estudio y no usa el adaptador de demo. Las páginas de negocios ficticios redirigen al directorio. No migrar pedidos o puntos de demo a actividad real.

El servidor calcula precios desde la publicación, descuenta existencias y consume bonos en una transacción. La clave de idempotencia está ligada al cliente y al hash de la solicitud. Los estados tienen acciones distintas por cliente, dueño y domiciliario asignado. Las reservas guardan inicio/fin para evitar solapamiento incluso al cambiar la duración del negocio. El pago lo registra un participante autorizado; los puntos se generan una sola vez al completar. Devoluciones ajustan puntos, bono y stock en una transacción.

El PIN solo se serializa para el cliente; sus intentos incorrectos persisten y bloquean nuevos intentos temporalmente. Las fotografías de domiciliarios están ligadas a su perfil y al historial de entregas, con acceso de propietario, revisión administrativa o participantes; perfiles aprobados permiten foto pública. Las reseñas requieren evidencia de finalización y no son editables por el negocio.

La API administrativa exige rol admin. La conversión de cliente solo permite emprendedor; el primer administrador se asigna por comando local con bloqueo. La verificación se invalida al publicar cambios de identidad/contacto. Una suspensión administrativa impide volver a publicar sin reactivación.

`catalog-ai.ts` conecta opcionalmente un Ollama local al catálogo y al material de la escuela. Los modelos no reciben datos de pedidos, credenciales ni herramientas de escritura. Sin modelo o al fallar se identifica la guía local. Tiene límite de concurrencia, solicitudes y tiempo. La escuela verifica respuestas en servidor, conserva progreso y emite una constancia idempotente con código público por decisión del usuario.

Las pruebas de API usan el parser HTTP de Node y Express sobre un Duplex en memoria (`tests/http.ts`), con cookies, cuerpos y respuestas reales, sin abrir sockets. Playwright sigue reservado para recorridos con el servidor y navegador reales; no confundir una API comprobada con validación visual.
