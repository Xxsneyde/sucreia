# Plan: recuperación de contraseña y verificación de correo

Base: feature/frontend-api. Alcance local; el envío real de correos requiere configurar un proveedor antes del despliegue.

1. [x] Añadir migración de verificación y tokens de un solo uso, con caducidad y hash en SQLite.
2. [x] Implementar solicitudes y confirmaciones, límites de intentos y revocación de sesiones al cambiar contraseña. Bandeja local solo habilitada explícitamente en desarrollo.
3. [x] Conectar ingreso, perfil, recuperación, verificación y bandeja local; conservar los datos del configurador.
4. [ ] Documentar endpoints y límites. Validar con `npm run check` y recorridos de navegador en escritorio y móvil.

Aceptación: no revelar cuentas en recuperación; tokens separados por propósito, caducados o usados rechazados; contraseña validada; sesiones anteriores revocadas; correo verificado visible sin confundirse con negocio verificado; bandeja desactivada por defecto en createApp y en producción.

## Validación de esta sesión

- TypeScript de frontend, servidor y pruebas: correcto.
- Compilación (`npm run build`): correcta, 71 rutas generadas.
- Dominio + diseños + tokens: 25/25 correctas al ejecutarlas sin sockets.
- `npm run check`: se detiene en las pruebas de API porque el entorno rechaza `listen` en loopback (`EPERM`); 11 pruebas de API canceladas, sin concluir su validación.
- Recorridos Playwright añadidos para escritorio y móvil; pendientes de ejecutar en una terminal que permita abrir puertos. Ejecutar `npm run check` y después `npm run test:e2e`.
- Correo externo pendiente: la implementación actual entrega a una bandeja local en memoria. El modo producción no expone esa bandeja y devuelve 503 al pedir envíos.

# Plan: imágenes locales de tiendas

Base de trabajo: rama `feature/imagenes-locales`, conservando los cambios de correo pendientes.

1. [x] Guardar imágenes normalizadas con Sharp en disco, con metadatos y propietario en SQLite; validar formato, dimensiones, tamaño, permisos y cuotas.
2. [x] Exponer subida, biblioteca, lectura y eliminación con comprobación de referencias de borradores, publicaciones y versiones.
3. [x] Convertir imágenes base64 al guardar; migrar tiendas existentes sin perder versiones. Admitir las nuevas rutas en el dominio.
4. [x] Conectar ImageField con subida, previsualización, reemplazo, reutilización y borrado; mantener el configurador sin cuenta.
5. [ ] Documentar persistencia y copias de seguridad. Ejecutar tipos, pruebas de almacenamiento, compilación y recorridos disponibles.

## Validación de imágenes

- Implementadas API, biblioteca, cambios del configurador y migración de todas las versiones.
- TypeScript correcto. Compilación correcta (71 rutas).
- 30 pruebas sin red correctas: dominio (4), diseños (16), cuenta/tokens (5) e imágenes (5).
- `npm run check` alcanza los tests API pero no puede abrir loopback (`EPERM`). `npm run test:e2e` falla al arrancar el servidor por el mismo permiso. Pendiente ejecutarlos en una terminal con sockets permitidos; los tests de correo continúan pendientes por ese motivo.
- Pruebas Playwright nuevas en `tests/e2e/images.spec.ts`: subida, borrador privado, publicación pública, quitar y reutilizar foto conservada por versiones, reemplazo y ancho móvil.
- Copias de seguridad: SQLite y `IMAGES_PATH` juntos; ver `docs/api.md`.

# Plan: operación local y preparación de despliegue

Rama `feature/operacion-local`, conservando los cambios anteriores sin commit.

1. [x] Adaptador SMTP configurable, enlaces con origen confiable y errores sin secretos. Bandeja local como alternativa de desarrollo.
2. [x] Bloqueo compartido de datos; backup íntegro de SQLite e imágenes con manifiesto SHA-256; restauración en destino nuevo y sesiones revocadas.
3. [x] Dockerfile, Compose, persistencia, salud y variables documentadas; sin publicar ni contratar servicios.
4. [ ] Pruebas de correo con transporte inyectado, copia/restauración real en carpetas temporales, TypeScript y compilación. Registrar validaciones bloqueadas.

## Validación de operación

- TypeScript y compilación correctos (71 rutas).
- 35 pruebas sin sockets correctas: 30 anteriores y 5 nuevas de SMTP, bloqueos y backup/restauración.
- `docker compose config --quiet`: correcto. No se construyó ni arrancó el contenedor: acceso a `/var/run/docker.sock` denegado.
- HTTP y navegador siguen pendientes por `listen EPERM`. No se enviaron correos reales ni se configuró infraestructura externa.
- Guía completa en `docs/operacion.md`. SMTP necesita credenciales y remitente autorizado; copia/restauración exigen detener la API y respetan bloqueos compartidos.

# Corrección: flujo de acceso y cierre de sesión

Rama `fix/flujo-sesion`, conservando cambios previos sin commit.

- [x] Layout de acceso independiente, sin menú lateral, navegación inferior ni banner del prototipo.
- [x] Botón de salida visible en cabecera de escritorio/celular y perfil; mensajes de error y estado de cierre.
- [x] Guardar antes de salir, limpiar cuenta tras confirmar salida y descartar respuestas de la cuenta anterior.
- [x] Redirigir al ingreso al abrir el estudio sin cuenta; conservar destino y borrador del configurador.
- [x] Corregir el perfil para mostrar la cuenta real y permitir cambiar de cuenta desde el acceso.
- [x] Compilación y comprobación del HTML generado: ingresar/recuperar/verificar-correo/correo-local usan auth sin sidebar/topbar/bottom-nav/demo-banner.
- [ ] Recorridos reales de navegador: añadidos/actualizados tests de salida, errores al cerrar, retorno al destino y acceso móvil; pendientes por permisos de sockets. `npm run check` vuelve a fallar en hooks de API con EPERM, no equivale a validación completa.

# Corrección: vitrina pública sin plataforma

Rama `fix/vitrina-publica`, conservando cambios previos sin commit.

- [x] `/` y `/buscar` con layout público y listado exclusivo de tiendas publicadas de la API; búsqueda, filtros, carga, error y vacío sin datos inventados.
- [x] Espacio autenticado en `/inicio`; menús, panel, perfil, pedidos, configurador y demás herramientas requieren sesión con retorno al destino.
- [x] Layout interno oculto en HTML inicial y antes de comprobar sesión; acceso y errores usan sus layouts independientes.
- [x] Tiendas públicas visibles sin cuenta; pedidos, reservas y datos personales piden ingresar.
- [x] Adaptar recorridos existentes y agregar tests de política, directorio y catálogo público.
- [ ] Verificar tipos, compilación, HTML público/interno y pruebas disponibles; recorrido HTTP/navegador pendiente por restricción de puertos.

## Validación de vitrina pública

- TypeScript correcto, build correcto (75 rutas).
- HTML de / y /buscar comprobado: layout público, sin menús ni negocios de ejemplo; rutas internas generan solo espera inicial y no menús.
- 39 pruebas sin red correctas. Nuevas: política de acceso y publicación/privacidad/retirada del directorio.
- HTTP/Playwright pendientes por bloqueo de puertos; npm run check se detiene en hooks de API por EPERM. Recorridos actualizados y tests/e2e/public.spec.ts agregado para escritorio y móvil.
- El configurador ahora requiere sesión por la última indicación del usuario. Los borradores anteriores se conservan; esta decisión reemplaza el flujo previo de empezar sin cuenta.

# Plan: recorrido completo de SucreIA (usuario asume todo el proyecto)

Rama feature/flujo-completo. Conservar cambios anteriores. Sin integraciones ni actividad ficticia.

1. [x] Contratos y migración de operaciones, stock, agenda, promociones, puntos, reseñas, notificaciones, escuela y verificación.
2. [x] Compra con precios del servidor, reserva de stock, idempotencia, estados, pago manual y PIN; agenda y cotizaciones con permisos.
3. [x] Comercio conectado a catálogo, carrito, pedidos, panel, entregas y configuración.
4. [x] Promociones/canje y libro de puntos; reseñas por operaciones completadas; notificaciones.
5. [x] Escuela con evaluación/progreso; directorio por ubicación; asistente de catálogo local explícito.
6. [x] Revisión administrativa de negocios/domiciliarios y primer administrador mediante CLI local.
7. [x] Validación de permisos, transacciones, concurrencia, tipos y recorridos disponibles; guía de operación del recorrido.

## Resultado del recorrido completo

- Rutas activas conectadas al servidor: compra, agenda, cotización, panel, stock, promociones, puntos, reseñas, domiciliarios, notificaciones, escuela, tutor, constancias y administración.
- Incluye perfil editable, activación de emprendedor, devoluciones manuales, suspensión/reapertura y trazabilidad de participantes.
- IA local opcional con Ollama para catálogo y tutor; sin modelo funciona la guía/búsqueda identificada como local. No se instaló un modelo ni se simulan respuestas de un proveedor.
- `npm run check` **correcto**: tipos + 67 pruebas + compilación (81 rutas). Incluye API HTTP de Node/Express en memoria, no solo pruebas de funciones. El bloqueo anterior de API queda resuelto.
- Comprobación del HTML generado: vitrina pública separada, herramientas ocultas antes de sesión y constancia pública sin datos privados de operaciones.
- Playwright: recorridos actualizados y nuevos para dos cuentas, citas, cotizaciones y constancias. Chromium no pudo iniciarse en este entorno; validación visual pendiente en un entorno permitido. No se afirma E2E visual completo.
- Guía de uso: `docs/recorrido-completo.md`. Configuración externa pendiente: SMTP real, modelo local, hosting, Docker real, HTTPS y copias fuera del equipo.
- No se hicieron commits ni push. La rama contiene también los cambios anteriores conservados.
