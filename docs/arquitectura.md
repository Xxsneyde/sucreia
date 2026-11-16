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
