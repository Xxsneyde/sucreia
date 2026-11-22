# Responsabilidad y módulos actuales

Esneyder asumió el desarrollo completo por indicación del 2026-11-16. El reparto anterior se conserva abajo como referencia; ya no deja pedidos, puntos ni entregas esperando a otros compañeros.

| Área activa                                                         | Código principal                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Diseño de la presentación                                           | `assets/css/sucre.css`, `components/sucre/`, `layouts/` ([presentacion.md](presentacion.md)) |
| Explorar (inicio, buscar, sectores, mapa, negocio, recomendaciones) | `features/explore/`, `lib/directory.ts`, `domain/sectors.ts`                                 |
| SucrePuntos, Escuela y Logística                                    | `features/community/` (`PointsPage`, `SchoolPage`, `LogisticsPage`, `lessons.ts`)            |
| Datos del negocio y productos                                       | `features/commerce/BusinessEditor.vue`, `ProductsEditor.vue`, `domain/studio.ts`             |
| Operaciones y permisos                                              | `server/platform.ts`, `server/routes/platform.ts`, `domain/platform.ts`                      |
| Compra, seguimiento y panel                                         | `features/commerce/Checkout.vue`, `Requests.vue`, `OperationList.vue`, `Merchant.vue`        |
| Notificaciones, domiciliario y administración                       | `features/commerce/Community.vue`                                                            |
| Cuentas, tiendas, imágenes y operación                              | `server/auth.ts`, `stores.ts`, `images.ts`, `backups.ts`, `mail.ts`                          |
| Estado del producto                                                 | `lib/platform-store.ts`, `lib/studio-store.ts`, `lib/session.ts`                             |
| Vistas por rol                                                      | `domain/roles.ts`, `layouts/default.vue` ([roles.md](roles.md))                              |
| Datos de demostración (solo local)                                  | `server/commands/demo.ts`                                                                    |
| IA local opcional                                                   | `server/catalog-ai.ts`; catálogo y tutor sin escrituras                                      |

El Configurador, el Estudio visual y los componentes de demostración que ninguna página usaba se eliminaron el 2026-11-21. Guía funcional en [recorrido-completo.md](recorrido-completo.md).

---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Configurador y diseños | `features/onboarding`, `features/studio`, `domain/studio.ts`, `domain/designs.ts` |
| Operaciones y permisos | `server/platform.ts`, `server/routes/platform.ts`, `domain/platform.ts` |
| Compra, seguimiento y panel | `features/commerce/Checkout.vue`, `Requests.vue`, `OperationList.vue`, `Merchant.vue` |
| Comunidad, escuela, logística y administración | `features/commerce/Community.vue` |
| Cuentas, tiendas, imágenes y operación | `server/auth.ts`, `stores.ts`, `images.ts`, `backups.ts`, `mail.ts` |
| Estado del producto | `lib/platform-store.ts`, `lib/studio-store.ts`, `lib/session.ts` |
| Vistas por rol | `domain/roles.ts`, `layouts/default.vue` ([roles.md](roles.md)) |
| Vitrina pública | `features/directory/PublicDirectory.vue`, `layouts/public.vue` |
| IA local opcional | `server/catalog-ai.ts`; catálogo y tutor sin escrituras |

**Ojo:** siguen en el repositorio componentes antiguos de demostración que **ninguna página usa**: `features/marketplace`, `features/orders`, `features/business`, `features/rewards`, `features/community/{School,Deliveries,MapDirectory}.vue`, `features/account/Account.vue`, `features/admin/Admin.vue`, `lib/demo-store.ts` y `data/demo.ts`. No los edites: los cambios no aparecerán en la app. Se pueden borrar cuando el equipo lo decida. Guía funcional en [recorrido-completo.md](recorrido-completo.md).

---

# Reparto anterior (histórico)

Este reparto apunta a carpetas que ya no usan las páginas activas; se conserva solo como referencia.

| Área                              | Carpeta                                                                                   | Responsabilidad                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Catálogo cliente                  | src/features/marketplace                                                                  | Inicio, búsqueda, negocio, favoritos                    |
| Pedidos                           | src/features/orders                                                                       | Carrito, checkout, seguimiento                          |
| Panel empresa                     | src/features/business                                                                     | Indicadores, catálogo, gestión                          |
| Configurador (área de Esneyder)   | src/features/onboarding                                                                   | Registro y elección entre 7 estilos (3 recomendados)    |
| Estudio visual (área de Esneyder) | src/features/studio, src/domain/studio.ts, src/domain/designs.ts, src/lib/studio-store.ts | Diseños por área, «Mi tienda», versiones y tienda local |
| Cuenta                            | src/features/account                                                                      | Registro, acceso y perfil                               |
| SucrePuntos                       | src/features/rewards                                                                      | Saldo, bonos y canje                                    |
| Comunidad                         | src/features/community                                                                    | Escuela, directorio y entregas                          |
| Administración                    | src/features/admin                                                                        | Verificación y moderación                               |
| API (backend)                     | server/                                                                                   | Express, cuentas, base de datos y rutas por módulo      |
