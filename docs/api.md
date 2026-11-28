# API de SucreIA (Node.js + Express)

Código en `server/`. Base de datos SQLite (`node:sqlite`, incluida en Node) en `server/data/sucreia.db`, que se crea sola y no se sube al repositorio.

```bash
npm run dev:api   # API en http://127.0.0.1:4000/api (se reinicia al guardar)
npm run dev       # Sitio en http://127.0.0.1:3000; reenvía /api a la API
npm run build && npm start   # Producción: API + sitio en el mismo puerto (PORT, por defecto 4000)
```

Variables opcionales: `PORT`, `HOST`, `DATABASE_PATH`. `npm start` usa `--production`: cookies solo por HTTPS y Express entrega también el sitio compilado (`.output/public`).

## Organización

| Archivo              | Qué hace                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| `server/index.ts`    | Arranca el servidor                                                         |
| `server/app.ts`      | Arma Express: seguridad, rutas `/api` y sitio estático                      |
| `server/db.ts`       | Conexión y migraciones numeradas (agrega nuevas al final, no edites viejas) |
| `server/auth.ts`     | Contraseñas (scrypt), sesiones y permisos por rol                           |
| `server/stores.ts`   | Repositorio de tiendas (SQL ↔ tipos de `src/domain`)                        |
| `server/routes/*.ts` | Rutas por módulo                                                            |
| `tests/api.test.ts`  | Pruebas de la API contra un servidor real con base en memoria               |

Las validaciones de negocio vienen de `src/domain` (las mismas del navegador). Para un módulo nuevo (por ejemplo pedidos): migración en `db.ts`, repositorio `server/pedidos.ts`, rutas `server/routes/pedidos.ts`, registrarlas en `app.ts` y pruebas en `tests/`.

## Respuestas y errores

JSON. Los errores responden `{ "error": "mensaje en español" }` con el código HTTP adecuado: 400 datos inválidos, 401 sin sesión, 403 sin permiso u origen ajeno, 404 no existe (o no es tuyo), 409 conflicto, 413 demasiado grande, 422 no se puede publicar, 429 demasiados intentos.

## Cuentas — `/api/auth`

| Método | Ruta        | Cuerpo                                                                   | Respuesta                                                                                            |
| ------ | ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| POST   | `/registro` | `{ email, name, password, role: "cliente" \| "emprendedor", referido? }` | 201 `{ user }` y cookie (`referido`: código de 6 caracteres de quien invita; uno inválido se ignora) |
| POST   | `/ingresar` | `{ email, password }`                                                    | 200 `{ user }` y cookie                                                                              |
| POST   | `/salir`    | —                                                                        | 204                                                                                                  |
| GET    | `/yo`       | —                                                                        | `{ user }` o `{ user: null }`                                                                        |

Desde el flujo nuevo de cuenta: `user` incluye `profileComplete`, `termsAccepted`, `verifyChannel` (`email` o `sms`) y `phone`.

`/registro` exige `acceptTerms: true` (Política de uso y condiciones generales, `/terminos`; se guardan fecha y versión en `terms_accepted_at` y `terms_version`). Quien entra con Google desde la pestaña de registro la acepta antes de continuar (`?terminos=1`); si no, la acepta en `PUT /perfil/datos` con `acceptTerms: true`. El código de invitación (`referido`) llega en el enlace `?ref=`; el formulario ya no lo pide. `POST /compras-whatsapp` y las reservas (`POST /operaciones` con `kind: "booking"`) aceptan `code` (cupón); el servidor aplica el que descuente más entre el cupón (todo el pedido) y el descuento del negocio (todo o solo los productos elegidos); no se acumulan y guarda `subtotal`, `discount` y `discountLabel`. Los correos de verificación y recuperación se envían en texto y HTML (`accountEmail` en `server/mail.ts`).

| Método | Ruta                          | Cuerpo / qué hace                                                                                                                                      |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/registro`                   | También `verifyBy: "sms"` y `phone` (celular colombiano) para confirmar por mensaje de texto; `name`, `documentNumber` y `address` son opcionales aquí |
| POST   | `/verificacion`               | Sesión: `{ channel: "email" \| "sms", phone? }` elige cómo confirmar y envía el enlace o el código (uno por minuto)                                    |
| POST   | `/verificar-sms`              | Sesión: `{ code }`; código de 6 dígitos, vence a los 10 minutos, 5 intentos; responde `{ message, email }`                                             |
| GET    | `/sms/estado`                 | `{ enabled }`: si la confirmación por SMS (Onurix) está configurada                                                                                    |
| POST   | `/verificar-correo`           | `{ token }`; responde `{ message, email }`                                                                                                             |
| PUT    | `/perfil/datos`               | Sesión con cuenta confirmada: `{ name, documentNumber, address }` completa el perfil; responde `{ user }`                                              |
| POST   | `/emprender`                  | Sesión: un cliente debe enviar `aceptoDejarDeSerCliente: true` (no hay vuelta atrás)                                                                   |
| GET    | `/google`, `/google/callback` | Ingreso con Google (OAuth); `?rol=emprendedor` y `?volver=` opcionales. `GET /google/estado` dice si está configurado                                  |

Límites de ingreso: 10 intentos cada 15 minutos por IP y correo, 20 por cuenta (desde cualquier IP) y 50 por IP.

La sesión viaja en la cookie `sucreia_sesion` (httpOnly, SameSite=Lax, 30 días). Contraseña mínima de 8 caracteres. No se pueden crear administradores desde el registro. Máximo 10 intentos de ingreso cada 15 minutos por IP y correo; hasta 60 registros cada 15 minutos por IP.

## Tiendas públicas — `/api/tiendas`

| Método | Ruta   | Respuesta                                                                                              |
| ------ | ------ | ------------------------------------------------------------------------------------------------------ |
| GET    | `/`    | `{ stores: Business[] }` (solo publicadas, formato del catálogo, con `logo`, `rating` y `reviewCount`) |
| GET    | `/:id` | `{ id, publishedAt, design }` (versión publicada; 404 si no lo está)                                   |

## Mis tiendas — `/api/mis-tiendas` (rol emprendedor o admin)

`design.category` guarda uno de los 10 sectores de `src/domain/sectors.ts`. Campos opcionales: `phone`, `email` y `products[].category` (grupo del catálogo).

| Método | Ruta               | Cuerpo                     | Respuesta                                                                                                                                          |
| ------ | ------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`                | —                          | `{ stores: StoreProject[] }`                                                                                                                       |
| POST   | `/`                | `{ design, termsVersion }` | 201 `{ store }` (máximo 30 por persona; `termsVersion` debe ser la vigente, `2026-11-23`)                                                          |
| GET    | `/:id`             | —                          | `{ store }`                                                                                                                                        |
| PUT    | `/:id`             | `{ design }`               | `{ store }` (guarda el borrador)                                                                                                                   |
| POST   | `/:id/publicar`    | —                          | Registro sin aprobar: 202 `{ store }` (queda en revisión; 422 si faltan datos, fotos o documentos). Aprobado: 200 `{ store }` (guarda 8 versiones) |
| DELETE | `/:id/publicacion` | —                          | `{ store }` (retira la publicación)                                                                                                                |
| DELETE | `/:id`             | —                          | 204                                                                                                                                                |

`design` es un `StoreDesign` de `src/domain/studio.ts` y se valida con `isDesign`. Las tiendas de otra persona responden 404.

## Seguridad incluida

Contraseñas con scrypt y sal, comparación en tiempo constante, mismo mensaje si el correo no existe, token de sesión aleatorio guardado como hash, cookies httpOnly/SameSite (y Secure en producción), rechazo de peticiones de otro origen en métodos que modifican datos, cabeceras de `server/security-headers.ts` (política de contenido, `nosniff`, `X-Frame-Options`, `Permissions-Policy` y HSTS con HTTPS), conexión a Postgres verificada (`server/db-ssl.ts`), límite de 13 MB por petición y bloqueo de archivos ocultos al servir el sitio. Documentos del registro y adjuntos de PQRS se entregan con `default-src 'none'` para que no ejecuten código.

El frontend usa la API desde `src/lib/api.ts`, `src/lib/session.ts` (cuenta) y `src/lib/studio-store.ts` (tiendas; guarda medio segundo después de la última tecla). Las operaciones, favoritos, puntos, avisos y aprendizaje ahora usan `/api/plataforma`. Solo el carrito permanece en el navegador, aislado por cuenta.

## Recuperación y verificación

| Método | Ruta (bajo `/api/auth`)   | Cuerpo                | Resultado                                                             |
| ------ | ------------------------- | --------------------- | --------------------------------------------------------------------- |
| POST   | `/recuperar`              | `{ email }`           | Mensaje genérico, exista o no la cuenta                               |
| POST   | `/restablecer`            | `{ token, password }` | Nueva contraseña y revocación de **todas** las sesiones de esa cuenta |
| POST   | `/solicitar-verificacion` | —                     | Requiere sesión; envía o reenvía el enlace                            |
| POST   | `/verificar-correo`       | `{ token }`           | Confirma la propiedad del correo                                      |

`user` incluye `emailVerifiedAt: string | null`. Las cuentas existentes empiezan sin verificar; no se bloquea el estudio ni la publicación durante esta etapa. Confirmar el correo no concede el sello de negocio verificado.

Los tokens aleatorios se guardan como SHA-256 en SQLite, separados por propósito. Caducan a los 30 minutos (contraseña) o 24 horas (correo); solo se usan una vez. Reenviar invalida el enlace anterior del mismo propósito. El cambio y el consumo son una transacción. Las solicitudes de recuperación y las confirmaciones tienen límites por IP; los reenvíos de verificación, por cuenta (10 cada 15 minutos).

### Correo local

`npm run dev:api`, sin SMTP configurado, activa una bandeja **en memoria**, solo con HOST de loopback (`127.0.0.1` o `::1`). Visita `/correo-local` en el sitio: allí aparecen los correos de prueba y sus enlaces. Los enlaces son relativos, sin confiar en el Host enviado por el cliente. No hay correo externo ni escritura de enlaces en archivos o logs. Se conservan como máximo 100 mensajes no persistentes y la pantalla permite actualizarlos.

`GET /api/desarrollo/correos` solo existe con `createApp({ localMail: true })`. La opción está apagada por defecto; `npm start` siempre la mantiene desactivada, aunque uses `COOKIE_SECURE=false`. Sin transporte configurado, pedir un correo devuelve 503 en lugar de simular un envío. El registro sigue disponible sin envío automático en ese entorno.

Las pruebas de navegador usan `tests/browser-server.ts` con Express real, SQLite en memoria y bandeja local; no arrancan el servidor de producción con una bandeja habilitada.

El adaptador SMTP, los comandos de copia/restauración y Docker están implementados. Falta configurar y comprobar el servicio de correo y la operación real; ver [operacion.md](operacion.md).

## Imágenes locales — `/api/imagenes`

Los archivos se almacenan en `server/data/images` (configurable mediante `IMAGES_PATH`). SQLite guarda metadatos, propietario y rutas; nunca el binario de las nuevas imágenes. Las rutas son `/api/imagenes/<64 caracteres hex>.webp`, admitidas por `validImage` junto a las ilustraciones y los datos antiguos.

| Método | Ruta        | Cuerpo / resultado                                                                                                    |
| ------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`         | Sesión de emprendedor: `{ images }`, biblioteca propia con tamaño, dimensiones y número de referencias                |
| POST   | `/`         | Sesión de emprendedor: `{ data: "data:image/png;base64,…" }` → 201 `{ image: { id, url, bytes, width, height } }`     |
| GET    | `/:id.webp` | WebP: propietario autenticado o cualquier visitante si una tienda publicada actualmente usa la foto; en otro caso 404 |
| DELETE | `/:id`      | Solo propietario; 204 si no tiene referencias, 409 si aparece en cualquier borrador o versión                         |

Se aceptan JPG, PNG y WebP estáticos, hasta 8 MB y 40 megapíxeles. Sharp comprueba el contenido y formato, aplica orientación, reduce a 1200 px y convierte a WebP sin conservar metadatos EXIF. SVG y animaciones no se aceptan. Límite por cuenta: 500 imágenes o 128 MB de archivos procesados. Fotos iguales de la misma cuenta se reutilizan; cuentas distintas tienen identificadores diferentes.

El configurador actual requiere una cuenta de emprendedor y sube las fotos al seleccionarlas. Los borradores de versiones anteriores que se hubieran creado sin cuenta se conservan y convierten al ingresar. Al crear/importar una tienda, el frontend sube las fotos antiguas por separado antes del diseño. El servidor también convierte base64 recibido en diseños y valida que cada referencia sea de su propietario. Si falla una subida, el campo conserva su imagen anterior y muestra el error. La biblioteca permite reutilizar y eliminar archivos sin uso.

Quitar una foto del diseño solo la separa del borrador. Una versión publicada o guardada puede seguir usándola; por eso el archivo no se elimina automáticamente. Al restaurar una versión, sus fotos siguen disponibles. Al borrar la tienda, sus archivos quedan en la biblioteca para poder reutilizarlos o borrarlos expresamente. Las fotos privadas se sirven con `Cache-Control: no-store`; no se expone el directorio como carpeta estática.

### Migración y persistencia

Al iniciar `npm run dev:api` o `npm start`, `migrateImages` convierte fotos base64 de borradores **y todas sus versiones**. Es idempotente y no altera fechas, identificadores ni publicación. Primero crea los archivos y luego actualiza todos los JSON de cada tienda en una transacción. Si alguna imagen falla, conserva íntegros los JSON originales de esa tienda y registra solo el número de tiendas omitidas; las imágenes válidas preparadas pueden quedar en la biblioteca sin uso para su borrado manual. Las tiendas antiguas del navegador se convierten al importarlas.

Las copias de seguridad deben incluir **SQLite y la carpeta de imágenes juntas**, con escrituras detenidas o una instantánea coherente. Ambos requieren disco persistente al desplegar. No borrar `server/data/`; está ignorada por Git. Cambiar `IMAGES_PATH` exige trasladar los archivos ya existentes. Los JSON exportados contienen rutas de archivos: para trasladarlos a otro servidor se necesita también la biblioteca de archivos, y para otra cuenta se deben volver a subir las fotos.

Las pruebas usan carpetas temporales aisladas y no modifican fotos ni cuentas del servidor local.

## Operación

La API iniciada desde `server/index.ts` bloquea sus datos mientras está en uso. `npm run backup` exige detenerla y copia SQLite junto a las imágenes; `npm run restore` valida la copia y restaura en una carpeta nueva. SMTP se inyecta como `MailTransport`; la bandeja local se desactiva si se configura SMTP. El registro incluye `verificationSent` y conserva la cuenta si falla el envío; la recuperación nunca expone esa condición por destinatario. Variables, comandos y límites en [operacion.md](operacion.md).

## Plataforma persistente — `/api/plataforma`

Ver contratos en `src/domain/platform.ts`, reglas en `server/platform.ts` y [recorrido funcional](recorrido-completo.md).

| Método | Ruta                                                  | Acceso y comportamiento                                                                                                                                                                                                                         |
| ------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/estado`                                             | Sesión: operaciones propias, ventas propias, entregas asignadas, favoritos, libro de puntos, bonos, avisos, aprendizaje, `referral`, `challenges` y `events`; PIN solo para su cliente                                                          |
| GET    | `/negocios/:id`                                       | Publicación o propietario: metadatos de comercio, stock y reseñas; vistas/evidencias privadas solo al dueño                                                                                                                                     |
| GET    | `/negocios/:id/horarios?fecha=YYYY-MM-DD&servicio=id` | Horas libres (`slots`) y `detail` con cada hora, sus cupos libres y la capacidad (las llenas salen como agotadas): horario del día, duración del servicio, cupo y bloqueos; hora de Colombia, hasta 90 días                                     |
| POST   | `/negocios/:id/visita`                                | `{ productId? }`; limita por IP/producto/30 min; no equivale a venta                                                                                                                                                                            |
| POST   | `/operaciones`                                        | Sesión: `{ storeId, key, kind, items?, detail?, slot?, phone, fulfillment?, address?, addressLat?, addressLng?, paymentMethod?, couponId?, expectedSubtotal? }`; precios y permisos del servidor                                                |
| POST   | `/operaciones/:id/:action`                            | Participante autorizado: `prepare`, `ready`, `confirm`, `arrive`, `noshow`, `quote`, `accept`, `payment`, `claim`, `release`, `pickup`, `dispatch` (sin domiciliario: entrega propia), `complete`, `cancel`, `refund`; estado y rol comprobados |
| POST   | `/favoritos/:id`                                      | Alterna un negocio publicado en favoritos del usuario                                                                                                                                                                                           |
| POST   | `/notificaciones/leidas`                              | Marca solo los avisos de la cuenta                                                                                                                                                                                                              |
| PUT    | `/negocios/:id/configuracion`                         | Dueño: domicilio/tarifa, instrucciones de pago, horario por día (`week`, 7 días), cupo `capacity` 1–20, bloqueos `blocks` (fecha y horas opcionales), duración y coordenadas                                                                    |
| PUT    | `/negocios/:id/inventario`                            | Dueño: `{ productId, quantity: integer \| null }`; null significa sin límite                                                                                                                                                                    |
| POST   | `/negocios/:id/promociones`                           | Dueño de negocio publicado de productos: título, porcentaje 1–50, costo de canje y vencimiento futuro                                                                                                                                           |
| DELETE | `/promociones/:id`                                    | Dueño: detiene canjes nuevos y conserva bonos emitidos                                                                                                                                                                                          |
| GET    | `/negocios/:id/promociones-panel`                     | Dueño: `{ discount, coupons }` (descuento del negocio y cupones con usos)                                                                                                                                                                       |
| PUT    | `/negocios/:id/descuento`                             | Dueño: `{ percent (0–70; 0 lo quita), until? AAAA-MM-DD, products? [ids] }` descuento para todo el negocio o, con `products`, solo para esos productos                                                                                          |
| POST   | `/negocios/:id/cupones`                               | Dueño: `{ code (3–20 letras, números o guiones), percent 1–70, expires?, maxUses? }`; código único por negocio                                                                                                                                  |
| PUT    | `/negocios/:id/cupones/:cupon`                        | Dueño: `{ active }` activa o desactiva un cupón                                                                                                                                                                                                 |
| GET    | `/negocios/:id/resenas`                               | Dueño: `{ store, products }` reseñas del negocio y de sus productos (con `productName`)                                                                                                                                                         |
| POST   | `/cupones/validar`                                    | Sesión: `{ storeId, code }` → `{ code, percent, storePercent, storeDiscount }` (404 si no existe, 409 si venció, se agotó o está desactivado)                                                                                                   |
| POST   | `/canjes/:id`                                         | Sesión: descuenta puntos y emite un bono ligado a cuenta/negocio; saldo comprobado en transacción                                                                                                                                               |
| POST   | `/resenas`                                            | Cliente de operación completada: `{ operationId, rating, comment, courierRating? }`; una por operación                                                                                                                                          |
| POST   | `/negocios/:id/verificacion`                          | Dueño: solicita revisión con referencias; no concede sello automáticamente                                                                                                                                                                      |
| PUT    | `/domiciliario/disponible`                            | Domiciliario aprobado: `{ available }`; solo disponible ve la bolsa de su municipio                                                                                                                                                             |
| PUT    | `/domiciliario/ubicacion`                             | Domiciliario: `{ lat, lng }` desde el GPS del teléfono                                                                                                                                                                                          |
| GET    | `/operaciones/:id/rastreo`                            | Participantes: negocio, punto de entrega y posición del domiciliario (solo mientras va hacia el cliente)                                                                                                                                        |
| PUT    | `/domiciliario`                                       | Cuenta: contacto, municipio, vehículo y foto propia opcional; requiere revisión tras cambios                                                                                                                                                    |
| GET    | `/admin`                                              | Solo admin: revisión y auditoría                                                                                                                                                                                                                |
| POST   | `/admin/:type/:id`                                    | Solo admin, motivo obligatorio: negocios/domiciliarios aprueban o rechazan; suspender/reactivar controlan la publicación                                                                                                                        |
| POST   | `/lecciones/:id`                                      | Cuenta, `{ answer }`; respuesta correcta comprobada en servidor e idempotente                                                                                                                                                                   |
| POST   | `/certificado`                                        | Cuenta con todas las evaluaciones completas; devuelve la misma constancia en reintentos                                                                                                                                                         |
| GET    | `/certificados/:id`                                   | Consulta pública por código: nombre y fecha aceptados al generar, sin email ni operaciones                                                                                                                                                      |
| GET    | `/eventos`                                            | Ferias y eventos de los últimos 30 días y próximos; con sesión indica `attended`. Nunca expone el código                                                                                                                                        |
| POST   | `/eventos/:id/asistencia`                             | Sesión, `{ code }`: del día del evento a 7 días después; suma sus puntos una vez; 8 intentos fallidos bloquean 15 min                                                                                                                           |
| POST   | `/admin/eventos`                                      | Solo admin: `{ title, place, municipality, date, points 1–100, code }` (código guardado como hash)                                                                                                                                              |
| DELETE | `/admin/eventos/:id`                                  | Solo admin                                                                                                                                                                                                                                      |
| POST   | `/tutor`                                              | Sesión: pregunta sobre material de aprendizaje; guía local o modelo opcional                                                                                                                                                                    |
| POST   | `/negocios/:id/resenas`                               | Solo clientes (no el dueño): `{ rating, comment }`; una reseña directa por cliente y negocio, la siguiente la actualiza (200 `{ updated: true }`)                                                                                               |
| GET    | `/negocios/:id/productos/:productId/resenas`          | Valoraciones del producto, `canReview` (solo quien lo compró o contrató) y la propia (`mine`)                                                                                                                                                   |
| POST   | `/negocios/:id/productos/:productId/resenas`          | Quien lo compró (por WhatsApp o en una operación completada): `{ rating, comment? }`; una por persona, la nueva reemplaza a la anterior                                                                                                         |
| PUT    | `/negocios/:id/promociones/:promo`                    | Dueño: edita un bono activo con los mismos campos que al crearlo                                                                                                                                                                                |
| POST   | `/compras-whatsapp`                                   | Cliente o emprendedor (no el admin ni el dueño): `{ storeId, items: [{ productId, quantity }], note? }`; precios del catálogo publicado; 201 `{ order, url, message }` con el enlace a WhatsApp                                                 |
| GET    | `/compras-whatsapp`                                   | Sesión: `{ mine, received }` (pedidos hechos y recibidos en sus negocios)                                                                                                                                                                       |
| GET    | `/negocios/:id/documentos`                            | Dueño o admin: `{ legalType, documents, missing }`                                                                                                                                                                                              |
| PUT    | `/negocios/:id/tipo-legal`                            | Dueño: `{ legalType: "natural" \| "juridica" }` (la jurídica exige además la Cámara de Comercio)                                                                                                                                                |
| PUT    | `/negocios/:id/documentos/:kind`                      | Dueño: `{ name, data }` (PDF, JPG, PNG o WEBP como data URL, máx. 4 MB); `kind`: `identidad` (obligatoria, solo PDF), `rut`, `camara` (opcionales)                                                                                              |
| DELETE | `/negocios/:id/documentos/:kind`                      | Dueño                                                                                                                                                                                                                                           |
| GET    | `/negocios/:id/documentos/:kind/archivo`              | Dueño o admin: el archivo (sin caché)                                                                                                                                                                                                           |
| POST   | `/pqrs`                                               | Sesión: `{ kind: Petición \| Queja \| Reclamo \| Sugerencia, message, file? }` (adjunto opcional, foto o PDF de hasta 5 MB, se comprueba el contenido); avisa a la administración                                                               |
| GET    | `/pqrs`                                               | Sesión: sus casos con mensajes y adjuntos                                                                                                                                                                                                       |
| POST   | `/pqrs/:id/mensajes`                                  | Autor del caso: `{ message, file? }`; no se puede en un caso cerrado                                                                                                                                                                            |
| GET    | `/pqrs/archivos/:id`                                  | Autor del caso o admin                                                                                                                                                                                                                          |
| GET    | `/admin/pqrs`                                         | Solo admin: todos los casos con datos de la persona                                                                                                                                                                                             |
| POST   | `/admin/pqrs/:id`, `/admin/pqrs/:id/cerrar`           | Solo admin: `{ response }` responde (caso abierto) y `{ note? }` cierra; ambos auditados y con aviso a la persona                                                                                                                               |

`/admin` incluye por negocio `registration`, los datos enviados a revisión (`details`), el titular (`owner`) y sus documentos; `POST /admin/registro/:id` con `{ approved, note }` aprueba (publica la versión enviada) o rechaza el registro.

## Asistente — `/api/asistente`

`POST /` con `{ question, context?, location?, store? }` responde `{ reply, context }` con los negocios publicados (`src/domain/brain`, sin IA externa). `store` limita la respuesta a un negocio; a emprendedores y admin también les cuenta el estado de sus negocios. Máximo 40 preguntas por minuto por IP. Reemplaza al antiguo `POST /plataforma/asistente/:id`.

`POST /api/auth/emprender` activa el rol emprendedor de una cuenta cliente sin poder convertirse en administrador; `PUT /api/auth/perfil` cambia el nombre. Las rutas de gestión de tiendas se limitan al propietario; la administración modera mediante sus rutas auditadas.

La operación conserva nombre/precio/datos de entrega e instrucciones de pago del momento de creación. `payment` confirma un pago recibido directamente, nunca inicia un cobro. El dueño confirma transferencias; un domiciliario asignado solo puede confirmar efectivo de su entrega. Para completar productos se exige pago y PIN; para servicios, aceptación/confirmación y pago, y una cita no se completa antes de su hora.

`refund` registra una devolución total **ya efectuada** fuera de la plataforma, con motivo; `returned: true` indica que productos despachados o entregados también regresaron. Revierte puntos emitidos y libera bono de forma única. No implementa devolución parcial ni API bancaria. Un ajuste puede dejar saldo negativo de puntos y suspender el uso de bonos hasta compensarlo.

No hay endpoints para modificar saldos, emitir reseñas arbitrarias ni promover administradores. Los datos de demo previos no se convierten en operaciones. Los errores conservan códigos y mensajes generales de la API. Ejemplos y límites operativos en [recorrido-completo.md](recorrido-completo.md).

### Logística (estilo Uber)

Un pedido a domicilio en preparación o listo y sin domiciliario entra en la **bolsa** de su municipio (`state.pool`). Los domiciliarios aprobados y disponibles la ven sin teléfono, dirección exacta ni coordenadas del cliente; el primero que hace `claim` se lo queda (en transacción). Etapas: `to_store` (puede `release`) → `pickup` cuando el negocio lo marcó listo → `to_client` (estado `dispatched`) → `payment` (efectivo) y `complete` con PIN. La tarifa del domicilio es 100 % del domiciliario; SucreIA no mueve dinero. Si nadie lo toma en 15 minutos, se avisa al negocio y puede entregarlo él mismo (`dispatch` sin domiciliario). Los avisos programados (recordatorio de cita 24 h antes, pedido sin tomar) se generan al consultar el estado, porque no hay tareas programadas.
