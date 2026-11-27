# Vistas por rol

Fuente única: `src/domain/roles.ts` (menú, inicio de cada rol y páginas exclusivas) y `src/domain/access.ts` (qué páginas piden cuenta y los pasos de confirmar la cuenta y completar el perfil). El layout interno (`src/layouts/default.vue`), el middleware (`src/middleware/access.global.ts`) y Express (`server/app.ts`) usan esas mismas funciones. Pruebas: `tests/roles.test.ts` y `tests/e2e/roles.spec.ts`.

El servidor comprueba permisos en cada operación de la API; estas reglas deciden **qué se muestra**, no reemplazan esa comprobación.

## Roles

| Rol               | Cómo se obtiene                                                                           | Empieza en  |
| ----------------- | ----------------------------------------------------------------------------------------- | ----------- |
| **Visitante**     | Sin cuenta: la portada lleva a `/ingresar`                                                | `/ingresar` |
| **Cliente**       | Crear cuenta con «Quiero comprar»                                                         | `/buscar`   |
| **Emprendedor**   | Crear cuenta con «Tengo un negocio», o pasarse desde `/emprender` (no tiene vuelta atrás) | `/buscar`   |
| **Administrador** | Solo desde la terminal (ver `docs/operacion.md`)                                          | `/buscar`   |

Antes de usar la plataforma, el cliente y el emprendedor **confirman la cuenta** (`/verificar-correo`, por correo o SMS) y **completan el perfil** (`/completar-perfil`: nombre, cédula y dirección). El middleware lleva ahí a quien le falte un paso.

**Emprendedor nuevo:** al pulsar «Crear mi cuenta» (confirmando por correo) no queda con la sesión abierta: va a `/ingresar` con el aviso de que confirme su correo. Después de confirmar, ingresar y completar el perfil, entra directo al formulario `/panel/configurar`, en la misma pestaña. Mientras no tenga negocios, ese es su inicio (`src/lib/start.ts` y la raíz `/` en `server/app.ts`) y la pestaña del menú y el título se llaman «Registra tu emprendimiento»; con un negocio pasan a «Registrar emprendimiento» y su inicio es `/buscar`.

## Menús

**Cliente** (y visitante, que al abrir una página con cuenta va al ingreso): Buscar negocios, Mapa de emprendimientos, Mis compras, Mis reservas, Favoritos, Notificaciones y, con sesión, «¿Quieres montar tu propio emprendimiento?» (`/emprender`).

**Emprendedor**: «Mi negocio» primero y luego «Explorar y comprar» (Buscar negocios, Mapa, Mis compras, Mis reservas, Favoritos). «Mi negocio» cambia según el negocio activo:

| Negocio               | Mi negocio                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Sin negocio           | Registra tu emprendimiento, Notificaciones, PQRS                                                                    |
| Productos             | Mis negocios, Registrar emprendimiento, Promociones y reseñas, Notificaciones, PQRS                                 |
| Servicios con reserva | Mis negocios, Registrar emprendimiento, Reservas (`/panel/pedidos`), Promociones y reseñas, Notificaciones, PQRS    |
| Cotización            | Mis negocios, Registrar emprendimiento, Solicitudes (`/panel/pedidos`), Promociones y reseñas, Notificaciones, PQRS |

**Administrador**: «Administración» (Aprobación de negocios, Negocios aprobados, Mis negocios, Registrar emprendimiento, PQRS, Notificaciones) y «Explorar». No compra, no reserva ni guarda favoritos.

En celular, el menú inferior tiene cuatro pestañas: para el cliente Buscar, Mapa, Compras y Mi cuenta; para el emprendedor las tres primeras de «Mi negocio» y Mi cuenta; para el administrador Aprobar, Aprobados, Negocios y Mi cuenta.

## Páginas

| Páginas                                                                                                                                    | Quién                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `/ingresar`, `/recuperar`, `/verificar-correo`, `/completar-perfil`, `/tienda?id=…`, `/terminos`, `/quienes-somos`, `/pqrs`, `/constancia` | Públicas                                                             |
| `/buscar`, `/mapa`, `/sectores`, `/notificaciones`, `/perfil`                                                                              | Con cuenta                                                           |
| `/pedidos`, `/solicitudes`, `/favoritos`, `/carrito`                                                                                       | Cliente y emprendedor (el administrador vuelve a `/buscar`)          |
| `/panel/…`, `/registro-negocio`                                                                                                            | Emprendedor y administrador (al cliente se le invita a `/emprender`) |
| `/admin/…`                                                                                                                                 | Administrador (los demás vuelven a `/buscar`)                        |

**Páginas retiradas** del menú: `/inicio`, `/puntos`, `/domiciliario`, `/logistica`, `/escuela`, `/recomendaciones`, `/panel/ventas`, `/panel/configuracion` y `/equipo` llevan a `/buscar` (`isRetired`). Su código sigue en `src/features/community` y la API correspondiente sigue activa, pero no se ven en lo publicado.

## Agregar una vista

1. Añadir el enlace a la sección correspondiente en `src/domain/roles.ts` (y su ícono en el mapa de `layouts/default.vue`).
2. Si es exclusiva de un rol, ampliar `requiredRole()` y, si requiere cuenta, `requiresSession()` en `src/domain/access.ts`.
3. Proteger la operación también en el servidor (`requireUser(res, …roles)`).
4. Actualizar las pruebas de `tests/roles.test.ts` y `tests/e2e/roles.spec.ts`, y esta página.
