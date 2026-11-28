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

**Cliente** (y visitante, que al abrir una página con cuenta va al ingreso): Buscar negocios, Mapa de emprendimientos, Mis compras, Mis reservas, Favoritos y, con sesión, «¿Quieres montar tu propio emprendimiento?» (`/emprender`).

**Emprendedor**: «Mi negocio» primero y luego «Explorar y comprar» (Buscar negocios, Mapa, Mis compras, Mis reservas, Favoritos). «Mi negocio» cambia según si ya tiene negocios:

| Negocio     | Mi negocio                                                          |
| ----------- | ------------------------------------------------------------------- |
| Sin negocio | Registra tu emprendimiento, PQRS                                    |
| Con negocio | Mis negocios, Registrar emprendimiento, Promociones y reseñas, PQRS |

Las reservas (negocios con reserva) y las solicitudes de cotización se abren desde cada negocio en «Mis negocios» (botón «Reservas» o «Solicitudes», `/panel/pedidos`), junto a Panel, Datos del negocio, Productos o Servicios, Horario y cupos y Ver página.

**Administrador**: «Administración» (Aprobación de negocios, Negocios aprobados, PQRS) y «Explorar». No compra, no reserva ni guarda favoritos. En el menú de su cuenta (arriba a la derecha) puede **cambiar de rol** a «Emprendedor»: el menú muestra entonces solo lo de sus negocios (Mis negocios, Registrar emprendimiento, Promociones y reseñas, PQRS) y «Explorar». La vista elegida se recuerda en ese navegador (`src/lib/view-mode.ts`); solo cambia el menú, los permisos siguen siendo los de la cuenta.

**Promociones y reseñas** (`/panel/descuentos`): lista de negocios y, al elegir uno, sus productos en tarjetas (precio con el descuento aplicado y calificación), el descuento para todo el negocio o para los productos que se marquen en sus tarjetas, los cupones con código (porcentaje, vencimiento y usos máximos opcionales) y el botón «Ver reseñas» con las reseñas del negocio o de cada producto, ordenadas de mejores a peores o al revés. Un descuento del negocio y un cupón no se acumulan: se aplica el que descuente más, en el carrito (compra por WhatsApp) y en las reservas.

**Notificaciones**: solo en la campana de la barra superior, que las despliega ahí mismo (las 8 más recientes, «Marcar todas como leídas» y «Ver todas» si hay más). No están en el menú lateral.

**Mi cuenta**: solo en el menú de la cuenta, arriba a la derecha.

En celular, el menú inferior tiene cuatro pestañas: para el cliente Buscar, Mapa, Compras y Reservas; para el emprendedor las cuatro primeras de «Mi negocio» (sin avisos; si hay menos, se completa con Buscar); para el administrador Aprobar, Aprobados, Negocios y Registrar.

**Mi cuenta** (`/perfil`) se abre solo desde el menú de la cuenta, arriba a la derecha («Hola, …»). El menú lateral no la repite; sin sesión, ahí aparece «Ingresar».

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
