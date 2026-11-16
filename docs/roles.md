# Vistas por rol

Fuente única: `src/domain/roles.ts` (menú, inicio de cada rol y páginas exclusivas). El layout interno (`src/layouts/default.vue`), el middleware (`src/middleware/access.global.ts`) y Express (`server/app.ts`) usan esas mismas funciones. Pruebas: `tests/roles.test.ts` y `tests/e2e/roles.spec.ts`.

El servidor comprueba permisos en cada operación de la API; estas reglas deciden **qué se muestra**, no reemplazan esa comprobación.

## Roles

| Rol               | Cómo se obtiene                                                                        | Empieza en   |
| ----------------- | -------------------------------------------------------------------------------------- | ------------ |
| **Visitante**     | Sin cuenta                                                                             | `/`          |
| **Cliente**       | Crear cuenta con «Quiero comprar»                                                      | `/inicio`    |
| **Emprendedor**   | Crear cuenta con «Tengo un negocio», o activarlo desde el perfil (misma cuenta)        | `/estudio`   |
| **Domiciliario**  | Permiso extra, no rol: se solicita en «Quiero repartir» y lo aprueba la administración | según su rol |
| **Administrador** | Solo desde la terminal local (ver `docs/operacion.md`)                                 | `/admin`     |

## Qué ve cada uno

| Sección (menú)     | Páginas                                                                                                                                           | Visitante |   Cliente    | Emprendedor | Domiciliario | Admin |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :----------: | :---------: | :----------: | :---: |
| Vitrina pública    | `/`, `/buscar`, `/tienda?id=…`, `/constancia`                                                                                                     |     ✓     |      ✓       |      ✓      |      ✓       |   ✓   |
| Acceso             | `/ingresar`, `/recuperar`, `/verificar-correo`                                                                                                    |     ✓     |              |             |              |       |
| **Comprar**        | Descubrir `/inicio`, Buscar, Carrito `/carrito`, Mis pedidos `/pedidos`, Favoritos `/favoritos`, SucrePuntos `/puntos`                            |           |      ✓       |      ✓      |      ✓       |   ✓   |
| **Comunidad**      | Escuela `/escuela`, Explorar Sucre `/mapa`, Asistente `/asistente`                                                                                |           |      ✓       |      ✓      |      ✓       |   ✓   |
| **Mi negocio**     | Resumen `/panel`, Mis tiendas `/estudio`, Pedidos `/panel/pedidos`, Productos, Datos, Descuentos, Configuración, Configurador `/registro/negocio` |           | (invitación) |      ✓      |              |   ✓   |
| **Entregas**       | `/domiciliario`                                                                                                                                   |           | (solicitud)  | (solicitud) |      ✓       |   ✓   |
| **Mi cuenta**      | Notificaciones `/notificaciones`, Perfil `/perfil`                                                                                                |           |      ✓       |      ✓      |      ✓       |   ✓   |
| **Administración** | Revisión y moderación `/admin`, Guía del proyecto `/equipo`                                                                                       |           |              |             |              |   ✓   |

- **Emprendedor:** en las páginas del negocio el menú pone «Mi negocio» primero; arriba puede cambiar entre «Mi negocio» y «Comprar». En celular, las pestañas inferiores son Resumen, Pedidos, Tiendas y Perfil.
- **Cliente:** no ve opciones del negocio; ve «Abrir mi negocio» (activación en el perfil) y «Quiero repartir». Si abre una página del negocio, se le ofrece activar su cuenta ahí mismo.
- **Administración:** quien no es administrador y abre `/admin` o `/equipo` vuelve a su propio inicio (Express lo redirige antes de enviar la página).
- **Sin cuenta:** las páginas internas redirigen a `/ingresar?volver=…` y, al entrar, se vuelve a ese destino.

## Agregar una vista

1. Añadir el enlace a la sección correspondiente en `src/domain/roles.ts` (y su ícono en el mapa de `layouts/default.vue`).
2. Si es exclusiva de un rol, ampliar `requiredRole()` y, si requiere cuenta, `requiresSession()` en `src/domain/access.ts`.
3. Proteger la operación también en el servidor (`requireUser(res, …roles)`).
4. Actualizar las pruebas de `tests/roles.test.ts` y esta tabla.
