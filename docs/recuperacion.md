# Recuperación de SucreIA desde Hostinger

El 26 de noviembre de 2026 se perdió el código local más reciente, que nunca se subió a GitHub. Lo único que quedaba era la versión publicada en Hostinger (`sucreia.site`), ya compilada. Este documento registra cómo se reconstruye el código fuente y **en qué orden se cambian los archivos**, para no romper nada.

- Rama de trabajo: `recuperacion-hostinger`.
- Referencia de lo publicado: `recuperado-hostinger/` (backend separado del bundle y copia exacta del build en `publicado/`).
- Regla: cada archivo se compara con lo publicado (el bundle del servidor conserva el código legible; el del navegador está minificado pero conserva textos, lógica y nombres de componentes).

## No desplegar todavía

El frontend del repo ya coincide con lo publicado (fases 0 a 4). Falta el backend (fase 5): `server/` todavía no tiene las rutas nuevas (PQRS, asistente, compras por WhatsApp, documentos del negocio, administración). **No subas este repo a Hostinger** hasta que este documento diga que el build está completo y probado. Lo que está publicado hoy sigue funcionando.

## Fases

| Fase | Qué                                                        | Estado    |
| ---- | ---------------------------------------------------------- | --------- |
| 0    | Imágenes publicadas (`public/`)                            | Hecha     |
| 1    | Lógica compartida (`src/domain`, `src/lib`, middleware)    | Hecha     |
| 2    | Estructura general: layout, menú, buscador, pie, asistente | Hecha     |
| 3    | Componentes nuevos y modificados                           | Hecha     |
| 4    | Páginas (incluidas las 6 nuevas)                           | Hecha     |
| 5    | Backend en TypeScript (`server/`)                          | Pendiente |

## Orden de los archivos

Cada fase depende de la anterior. Dentro de una fase, los archivos van en el orden en que se deben aplicar: primero los que no dependen de nadie.

### Fase 0 — imágenes

1. `public/marca/` (logo e ícono)
2. `public/art/sectores/` (19 ilustraciones de sector)
3. `public/sucre/fondo-iguana.webp`, `public/sucre/acceso-panel.webp`
4. `public/favicon.png`, `public/apple-touch-icon.png`

### Fase 1 — lógica compartida

1. `src/domain/subcategories.ts` (nuevo; no depende de nada)
2. `src/domain/sectors.ts` (usa 1): 20 sectores con mayúscula inicial, subcategorías, ilustración por sector; Sincelejo pasa a Montes de María
3. `src/domain/types.ts`: `subcategory`, `address`, `hours`, `minPrice` en `Business`
4. `src/domain/rules.ts`: WhatsApp completa el 57 en celulares colombianos
5. `src/domain/documents.ts` (nuevo): documentos del registro del negocio
6. `src/domain/whatsapp-order.ts` (nuevo; usa 4): mensaje del pedido por WhatsApp
7. `src/domain/platform.ts`: tipos y radicado de PQRS
8. `src/domain/studio.ts` (usa 2): subcategoría, redes sociales, galería y ficha técnica de productos, `registrationErrors`
9. `src/domain/access.ts`: buscar, mapa, sectores y registro-negocio piden cuenta; `profileGate` (verificar correo y completar perfil)
10. `src/domain/roles.ts`: una vista por rol, menús nuevos (Mis negocios, PQRS, Aprobación…), páginas retiradas, todos empiezan en `/buscar`
11. `src/domain/brain/` (nuevo; usa 2, 4 y 8): el Asistente SucreIA — `types`, `text`, `schedule`, `knowledge`, `understand`, `help`, `respond`
12. `src/lib/session.ts`: `profileComplete`, `verifyChannel`, `phone`, registro con SMS, `setUser`
13. `src/lib/directory.ts`: la búsqueda incluye la subcategoría
14. `src/lib/studio-store.ts`: aceptación de términos (`TERMS_VERSION = '2026-11-23'`) al crear un negocio
15. `src/middleware/access.global.ts` (usa 9, 10 y 12)
16. Pruebas: `tests/roles.test.ts` (reescrita), `tests/brain.test.ts` (nueva), `tests/public.test.ts`, `tests/studio.test.ts`

Comprobado igual a lo publicado, sin cambios: `src/lib/api.ts`, `src/lib/images.ts`, `src/lib/platform-store.ts`, `src/domain/geo.ts`, `src/domain/designs.ts`, `src/domain/navigation.ts`, `src/domain/rewards.ts`, `src/features/community/lessons.ts`.

Validación de la fase 1: TypeScript de `src/domain`, `src/lib`, pruebas y servidor sin errores (solo queda `src/layouts/default.vue`, que es de la fase 2). Pruebas de dominio: 49 de 49 correctas.

### Fase 2 — estructura general

1. `src/assets/css/sucre.css`: reconstruido desde el CSS publicado (campos de formulario, botones, menú lateral, fondo de la iguana). Es la salida del compilador, sin los comentarios originales.
2. `src/domain/studio.ts`: `socialUrl` (enlaces seguros a Instagram, Facebook y TikTok) y `thumbnail` (fotos de 480 px)
3. `src/domain/platform.ts`: estados y tipos de PQRS, `weekSummary`/`hourLabel` (horario legible), `rankByRating`
4. `src/domain/types.ts`: `image` en los productos
5. `src/domain/roles.ts`: `newTab` en los enlaces y `modeHome`
6. `src/domain/brain/help.ts`: `assistantIntro` (saludo y sugerencias por rol)
7. `src/lib/location.ts` (nuevo): ubicación del celular con mensajes claros
8. `src/components/sucre/SucreLogo.vue`: usa el ícono de `public/marca`
9. `src/components/sucre/ChatCard.vue` (usa 2): respuestas con enlaces, botón y sugerencias
10. `src/components/sucre/AssistantFab.vue` (usa 6, 7 y 9): pregunta a `POST /api/asistente`
11. `src/components/sucre/FloatingCart.vue` (nuevo; usa 2): carrito flotante que envía el pedido por WhatsApp (`POST /api/plataforma/compras-whatsapp`)
12. `src/components/sucre/PqrsThread.vue` (nuevo; usa 3): conversación de un caso de PQRS
13. `src/pages/quienes-somos.vue`, `src/pages/terminos.vue`, `src/pages/pqrs.vue` (nuevas; el pie de página las enlaza)
14. `src/layouts/default.vue` (usa todo lo anterior): menú por rol, buscador solo en la vista de cliente, pie con enlaces, carrito flotante y asistente (que no aparece en el mapa)
15. Se borra `src/lib/assistant.ts` (lo reemplaza `src/domain/brain`)

Comprobado igual a lo publicado, sin cambios: `src/layouts/auth.vue`, `src/components/sucre/SearchBox.vue`, `src/components/LogoutButton.vue`, `src/assets/css/motion.css`.

Validación de la fase 2: TypeScript del frontend, las pruebas y el servidor sin errores; `npm run build` correcto. El CSS global compilado coincide con el publicado (solo difieren prefijos de navegador que agrega el compilador). El HTML generado del marco (menú, barra superior, pie) es idéntico al publicado en todas las páginas existentes, y `quienes-somos`, `terminos` y `pqrs` coinciden completas. Las páginas que piden cuenta solo generan el marco antes de ingresar; su contenido se compara con el JavaScript publicado en las fases 3 y 4.

### Fases 3 y 4 — componentes y páginas

Se hicieron juntas: cada página se reconstruyó con sus componentes y se comparó completa. Orden de aplicación:

**Lógica nueva o ampliada (no depende de componentes)**

1. `src/domain/types.ts`: `lat`, `lng` y `discount` en `Business`
2. `src/domain/product-details.ts` (nuevo): ficha técnica por subcategoría (`detailFieldsFor`, `detailExample`, `cleanDetails`)
3. `src/domain/studio.ts`, `src/domain/whatsapp-order.ts`, `src/domain/platform.ts` (`productRatings` en el negocio)
4. `src/lib/studio-store.ts` (`publish` devuelve el negocio), `src/lib/registration-tab.ts` (nuevo), `src/lib/xlsx.ts` (nuevo: exportar a Excel sin librerías)
5. `src/composables/carousel.ts` (nuevo): carrusel con pausa al pasar el mouse
6. `src/features/admin/admin-data.ts` (nuevo): tipos de la administración

**Componentes base**

7. `src/components/sucre/VerifiedBadge.vue`, `ShareMenu.vue`, `ReviewList.vue` (nuevos)
8. `src/components/sucre/SectorIcon.vue`: 10 íconos que faltaban (tienda, transporte, cámara, regalo, mascotas, vinos, muebles, fiestas, educación, limpieza); sin ellos esos sectores salían sin ícono
9. `src/components/sucre/BusinessCard.vue` (usa 7), `SectorStrip.vue`, `SubsectorStrip.vue` (nuevo)
10. `src/components/images/files.ts` (calidad 0,9), `ImageCropper.vue` (nuevo), `ImageField.vue`, `ImageLibrary.vue`
11. `src/components/maps/SxMap.vue`, `ExploreMap.vue` (nuevo)
12. `src/components/business/WhatsappOrders.vue`, `WeekHoursPicker.vue`, `ProductSheet.vue`, `BookingPicker.vue` (nuevos)
13. `src/components/RequireMerchant.vue`

**Funciones (usan lo anterior)**

14. Cuenta: `src/features/account/SignIn.vue`, `VerifyEmail.vue`, `CompleteProfile.vue` (nuevo)
15. Negocio: `src/features/commerce/Account.vue`, `BusinessEditor.vue`, `ProductsEditor.vue`, `OperationList.vue`, `Requests.vue`, `Merchant.vue`, `Community.vue`, `BusinessDocuments.vue`, `MerchantOverview.vue`, `MyBusinesses.vue`, `BusinessWizard.vue` (siete pasos), `EntrepreneurRequest.vue`; nuevos: `BusinessDocuments`, `MerchantOverview`, `MyBusinesses` y `EntrepreneurRequest`
16. Comunidad: `src/features/community/CourierPage.vue`, `PointsPage.vue`
17. Explorar: `src/features/explore/SearchPage.vue`, `SectorsPage.vue`, `MapPage.vue`, `BusinessPage.vue` (página del negocio)
18. Administración: `src/features/admin/AdminReview.vue`, `AdminStores.vue`, `AdminPqrs.vue` (nuevos)
19. Se borran `src/features/commerce/Checkout.vue` y `MerchantHome.vue` (los reemplazan el carrito flotante y el panel nuevo)

**Páginas y layouts**

20. `src/layouts/registro.vue` (nuevo)
21. Páginas nuevas: `completar-perfil`, `emprender`, `registro-negocio`, `panel/negocios`, `admin/negocios`, `admin/pqrs`; `admin.vue` pasa a `admin/index.vue`
22. Páginas cambiadas: `index` (enlace «Ingresar a SucreIA» y redirección a `/buscar` o `/ingresar`), `carrito`, `solicitudes`, `panel/index`, `panel/configurar`, `pqrs` (sin título propio, como lo publicado)

Validación de las fases 3 y 4: TypeScript y `npm run build` sin errores; 86 de 86 pruebas correctas. Cada chunk del navegador se comparó con el publicado (textos, números, ayudas que importa e íconos): todos coinciden salvo el código muerto que se dejó fuera a propósito (ver abajo). Las 1270 reglas de CSS publicadas están todas en el build nuevo.

## Diferencias que no se pudieron confirmar

- `canOpen` en `roles.ts` se conservó del código anterior (lo usan las pruebas); en lo publicado no aparece.
- Código muerto de lo publicado que no se reconstruyó (el compilador lo dejó pero nada lo usa): el seguimiento de pedido de la página del negocio («Pedido confirmado», «Preparando pedido», «En camino», «Entregado»), el total del carrito y el costo de domicilio que calculaba esa página, y tres variables sin uso de `BusinessEditor`. Por eso el build nuevo tiene un chunk menos (el ícono `package-check`).
