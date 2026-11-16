# Arquitectura inicial

## Capas y dependencias

`pages → features → domain`. Los componentes comunes están en `components`; los adaptadores de almacenamiento en `lib`. Los datos ficticios de `data/demo.ts` no deben convertirse en datos de producción.

Las rutas (`src/pages`) importan pantallas de cada módulo (`src/features/<módulo>/*.vue`). Esto permite repartir trabajo evitando editar un único archivo central. El layout y la navegación son compartidos; coordinar esos cambios.

`useDemo()` (`src/lib/demo-store.ts`) adapta el almacenamiento local y expone carrito, pedidos, solicitudes, favoritos y borrador. Tiene versión de clave, carga después del montaje (en `app.vue`) y manejo de errores de almacenamiento. No es una frontera de seguridad. Al añadir backend, reemplazar este adaptador por repositorios de API y validación de respuestas; ningún dato del navegador debe ser confiable para precios, permisos o pagos.

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

La generación estática actual (`nuxt generate`) no ejecuta API. Para el backend en Node.js hay dos caminos: rutas de servidor de Nuxt en `server/api` servidas con `nuxt build` y `node .output/server/index.mjs`, o una API Node independiente (por ejemplo Express o Fastify) y el frontend estático. Es una decisión pendiente del equipo.

## Configurador: siguiente entrega

1. Recolección progresiva de identidad, actividad, modalidades y contactos.
2. Validación y carga de logo y al menos tres ofertas.
3. Reglas que seleccionen una plantilla base según actividad y modalidad.
4. Tokens visuales editables, composición responsive y vista previa.
5. Guardar borrador, revisar y publicar una versión.
6. Permitir actualizar la vitrina conservando pedidos e identificadores.

La IA puede sugerir contenido y estilo después de establecer las reglas. No debe inventar precios, disponibilidad, sellos, reputación ni ofertas. El propietario revisa antes de publicar.
