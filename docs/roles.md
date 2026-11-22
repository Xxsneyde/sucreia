# Vistas por rol

Fuente única: `src/domain/roles.ts` (menú, inicio de cada rol y páginas exclusivas). El layout interno (`src/layouts/default.vue`), el middleware (`src/middleware/access.global.ts`) y Express (`server/app.ts`) usan esas mismas funciones. Pruebas: `tests/roles.test.ts` y `tests/e2e/roles.spec.ts`.

El servidor comprueba permisos en cada operación de la API; estas reglas deciden **qué se muestra**, no reemplazan esa comprobación.

## Roles

| Rol               | Cómo se obtiene                                                                        | Empieza en   |
| ----------------- | -------------------------------------------------------------------------------------- | ------------ |
| **Visitante**     | Sin cuenta                                                                             | `/`          |
| **Cliente**       | Crear cuenta con «Quiero comprar»                                                      | `/inicio`    |
| **Emprendedor**   | Crear cuenta con «Tengo un negocio», o activarlo desde el perfil (misma cuenta)        | `/panel`     |
| **Domiciliario**  | Permiso extra, no rol: se solicita en «Quiero repartir» y lo aprueba la administración | según su rol |
| **Administrador** | Solo desde la terminal local (ver `docs/operacion.md`)                                 | `/admin`     |

## Qué ve cada uno

El menú del **cliente** sigue el diagrama del equipo: Inicio, Buscar negocios, Sectores, Mapa de emprendimientos, Descuentos y SucrePuntos, Recomendaciones IA, Mis compras (con seguimiento en mapa), Mis reservas, Favoritos y Notificaciones. La Escuela es del emprendedor: al cliente se le muestra «¿Quieres emprender?» en el inicio.

El menú de **Mi negocio** cambia según el tipo del negocio activo:

| Tipo                  | Menú                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin negocio           | Configurar mi negocio (asistente de 6 pasos), Datos del negocio, Escuela                                                                                        |
| Productos             | Pedidos (tablero Recientes → Preparando → Enviados), Ventas, Mis productos, Descuentos y reseñas, Cobros y entregas, Datos del negocio, Escuela                 |
| Servicios con reserva | Reservas de hoy (confirmar, llegó, cobrar, completar, no asistió), Agenda (semana, horario por día, cupo, bloqueos), Mis servicios (con duración), Dashboard, … |
| Cotización            | Solicitudes (por cotizar → esperando → aceptadas), Mis servicios, Dashboard, …                                                                                  |

**Logística** (`/domiciliario`): registro con zona y vehículo, interruptor Disponible, pedidos de su zona con distancia y tarifa, entrega en curso con mapa y ruta, cobro en efectivo, PIN, ganancias e historial.

| Sección (menú)     | Páginas                                                                                                                                                | Visitante  |        Cliente         | Emprendedor | Domiciliario | Admin |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------: | :--------------------: | :---------: | :----------: | :---: |
| Públicas           | `/`, `/buscar`, `/sectores`, `/mapa`, `/tienda?id=…`, `/constancia`                                                                                    |     ✓      |           ✓            |      ✓      |      ✓       |   ✓   |
| Acceso             | `/ingresar`, `/recuperar`, `/verificar-correo`                                                                                                         |     ✓      |                        |             |              |       |
| Menú principal     | `/inicio`, `/puntos`, `/logistica`, `/escuela`, `/recomendaciones`, `/solicitudes`, `/pedidos`, `/favoritos`, `/notificaciones`, `/carrito`, `/perfil` | (ingresar) |           ✓            |      ✓      |      ✓       |   ✓   |
| **Mi negocio**     | Resumen `/panel`, Datos del negocio `/panel/perfil`, Productos, Pedidos y solicitudes, Descuentos, Configuración                                       |            | (activar en el perfil) |      ✓      |              |   ✓   |
| **Entregas**       | `/domiciliario`                                                                                                                                        |            |      (solicitud)       | (solicitud) |      ✓       |   ✓   |
| **Administración** | Revisión y moderación `/admin`, Guía del proyecto `/equipo`                                                                                            |            |                        |             |              |   ✓   |

- **Emprendedor:** en las páginas del panel el menú pone «Mi negocio» primero. En celular, las pestañas inferiores son las tres primeras de su tipo de negocio y Mi cuenta.
- **Visitante:** ve el mismo menú; las páginas que necesitan cuenta llevan a `/ingresar?volver=…`.
- **Administración:** quien no es administrador y abre `/admin` o `/equipo` vuelve a su propio inicio (Express lo redirige antes de enviar la página).

## Agregar una vista

1. Añadir el enlace a la sección correspondiente en `src/domain/roles.ts` (y su ícono en el mapa de `layouts/default.vue`).
2. Si es exclusiva de un rol, ampliar `requiredRole()` y, si requiere cuenta, `requiresSession()` en `src/domain/access.ts`.
3. Proteger la operación también en el servidor (`requireUser(res, …roles)`).
4. Actualizar las pruebas de `tests/roles.test.ts` y esta tabla.
