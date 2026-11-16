# Recorrido completo de SucreIA

La aplicación funciona con cuentas y datos guardados en la API local. No crea compras, puntos, reseñas, repartidores ni negocios ficticios al iniciarse.

## Arrancar

1. En la raíz del proyecto, ejecuta `npm ci` si necesitas instalar dependencias.
2. En una terminal ejecuta `npm run dev:api`.
3. En otra ejecuta `npm run dev`.
4. Abre `http://127.0.0.1:3000`.

Usa una sola API con esta base de datos. Si existe un bloqueo de datos de una ejecución que terminó abruptamente, consulta `operacion.md`; no borres la base ni las imágenes. La primera apertura aplica las migraciones pendientes.

## 1. Visitante → cliente o emprendedor

1. La portada muestra únicamente negocios publicados. Puedes buscar por producto, categoría y municipio y abrir sus páginas sin cuenta.
2. Pulsa **Ingresar → Crear cuenta**. Elige **Quiero comprar** o **Tengo un negocio**.
3. Un cliente entra a su inicio y un emprendedor a su estudio. Una cuenta de cliente puede activar su espacio de emprendedor desde **Perfil** sin perder compras, puntos ni favoritos.
4. La plataforma interna nunca muestra sus menús antes de comprobar la sesión. Pedidos, panel, perfil, escuela y demás herramientas requieren cuenta.
5. Para probar correos sin SMTP, abre la bandeja de desarrollo desde el acceso. Con SMTP configurado, los mensajes usan ese servicio. Cerrar sesión está disponible en cabecera y perfil.

## 2. Emprendedor → publicación

1. Abre **Mi negocio → Estudio visual → Crear tienda**.
2. Completa nombre, municipio, actividad y WhatsApp; carga logo y al menos tres productos o servicios. Selecciona la modalidad: productos, citas o cotizaciones.
3. Revisa las siete propuestas, elige una y crea la tienda. Puedes editar portada, historia, catálogo, imágenes y estilo, y previsualizar en celular.
4. Publica la página. Ya aparece en la vitrina pública; los cambios posteriores del borrador no se muestran hasta volver a publicar.
5. En **Configuración**, define pago por transferencia si lo ofreces, domicilio y tarifa, horario diario de agenda y duración de citas. Si quieres aparecer en el mapa, registra latitud y longitud reales. Las coordenadas son opcionales; no se inventan ubicaciones.
6. En **Productos y servicios**, indica existencias disponibles o déjalas sin límite. Los cambios de stock se aplican inmediatamente; nombres, fotos y precios se cambian en el editor y se publican.

## 3. Compra → recogida

Para recorrer esta parte usa dos cuentas distintas, en dos perfiles/ventanas de navegador. No se permite comprar al propio negocio.

1. Como cliente, abre un negocio de productos y agrega una oferta. El carrito solo contiene productos de un negocio a la vez.
2. Abre **Finalizar pedido**. Revisa cantidades, WhatsApp, recogida/domicilio, método de pago y bono si tienes uno.
3. Confirma. El servidor toma el precio publicado, comprueba los importes, reserva existencias y guarda una copia del nombre y precio de cada línea. Los reintentos con la misma clave no crean compras duplicadas.
4. El cliente ve la operación en **Pedidos**. El emprendedor la recibe en **Mi negocio → Pedidos y solicitudes** y en sus avisos.
5. El negocio toma el pedido, lo prepara y lo marca listo. Confirma el pago solamente cuando lo recibe: SucreIA no cobra ni comprueba transferencias bancarias automáticamente.
6. Para recogida, el cliente comunica su PIN de seis dígitos **al recibir** el producto. El negocio introduce ese PIN para completar la entrega. No se muestra el PIN al negocio ni al repartidor.
7. Al completarse una operación pagada se calculan puntos. El cliente puede escribir una reseña de esa operación. No puede escribir varias ni reseñar operaciones ajenas.

## 4. Domicilio → entrega

1. Una cuenta abre **Entregas**, registra municipio, WhatsApp y foto opcional y envía su perfil a revisión. Al cambiar esos datos vuelve a necesitar aprobación.
2. Una cuenta administradora aprueba el perfil. El contacto queda disponible para asignación por negocios; el cliente lo ve cuando recibe una entrega asignada.
3. El emprendedor activa domicilio en su negocio y define su tarifa.
4. El cliente compra con dirección. El negocio prepara el pedido y, al estar listo, elige un repartidor aprobado y los minutos estimados antes de despachar.
5. El domiciliario ve solo sus entregas asignadas, dirección y contacto del cliente. Puede abrir WhatsApp por decisión propia.
6. Si corresponde efectivo, el repartidor puede registrar que lo recibió. Las transferencias las confirma el negocio. Finalmente introduce el PIN que le comunica el cliente al recibir.
7. El cliente ve nombre, foto, contacto y calificación del repartidor al asignarlo, cuando existen. Puede calificar la entrega al escribir la reseña. Los estados se actualizan al refrescar y mediante consulta periódica cada 15 segundos.

Los minutos son estimados por el negocio. No hay GPS en vivo ni asignación automática por proximidad. No se envían mensajes automáticos de WhatsApp: existen enlaces para contactar y avisos persistentes dentro de la aplicación.

## 5. Servicios → cita o cotización

- **Cita:** el cliente elige servicio, día y una hora libre de los próximos 90 días. La reserva pendiente bloquea ese intervalo para evitar solapamientos; cambiar la duración del negocio tampoco permite superponer citas existentes. El negocio confirma o cancela. El cierre se permite después de la hora de la cita y de registrar el pago.
- **Cotización:** el cliente describe su necesidad. El negocio envía un precio; el cliente debe aceptarlo antes de que se registre el pago y se complete el servicio. Una propuesta pendiente se puede cancelar.
- **Cancelación sin pago:** si el estado lo permite, devuelve las existencias y libera el bono. Una operación cerrada no se vuelve a cancelar.
- **Devolución:** después de devolver el dinero por el medio acordado, el negocio registra motivo y devolución total. Indica si también regresaron los productos. Se ajustan stock, bono y puntos una sola vez. No es una transferencia de dinero realizada por SucreIA.

Si se habían gastado puntos de una operación después devuelta, el saldo puede quedar ajustado en negativo; impide usar nuevos bonos hasta compensarlo. Es saldo de puntos, no una deuda de dinero. No hay devoluciones parciales ni reprogramación de citas en esta versión: se cancela/recrea una solicitud permitida o se acuerda el cambio con el negocio.

## 6. Promociones y SucrePuntos

1. Ganas **1 punto por cada $1.000 COP** netos de productos o servicios pagados y completados. No se cuenta domicilio; no se regalan puntos al registrarse o responder lecciones.
2. La referencia del saldo es **1 punto = $1 COP**. No es dinero retirable ni un monedero bancario.
3. Un negocio de productos publicado crea una promoción: título, porcentaje (1–50 %), costo en puntos y vencimiento. En esta versión los bonos se aplican a compras de productos.
4. El cliente canjea en **SucrePuntos**. El servidor descuenta los puntos y emite un bono ligado a su cuenta y a ese negocio. Hay como máximo un bono disponible vigente de un negocio por cuenta.
5. Al comprar, el cliente elige ese bono en el carrito. Solo se usa una vez; el servidor verifica propietario, tienda y vencimiento.
6. Desactivar una promoción detiene canjes nuevos; los bonos emitidos mantienen sus condiciones hasta vencer. El historial explica cada suma, canje y ajuste.

## 7. Escuela, tutor y constancia

1. La escuela contiene seis lecciones con contenido, práctica y evaluación. El orden sugerido cambia según la modalidad del negocio; el progreso se guarda por cuenta.
2. El servidor solo marca una lección completada si la respuesta es correcta. Repetirla no suma completados ni puntos.
3. El tutor usa el contenido de los cursos. Si se configura un modelo local, puede responder con IA local; si no, utiliza una guía del material y lo identifica.
4. Al completar todas las lecciones aparece **Generar constancia de finalización**. La constancia guarda nombre, fecha y código consultable en `/constancia?id=…`; puedes imprimirla o guardarla como PDF.
5. Se informa antes de generar que el enlace permite consultar tu nombre. La constancia acredita finalización dentro de SucreIA; no es un título ni una acreditación académica oficial.

## 8. Administración y verificación

1. Crea una cuenta normal desde el sitio.
2. Detén la API y ejecuta `npm run admin -- correo-de-esa-cuenta` en la terminal local. No hay una contraseña de administrador incluida ni un endpoint público para promover administradores.
3. Reinicia la API y vuelve a ingresar con esa cuenta. En **Administración** puedes revisar negocios publicados, evidencias y perfiles de domiciliarios, registrar aprobación/rechazo y justificar cada decisión.
4. El sello azul se muestra solo después de aprobación manual. Cuenta operaciones completadas de los últimos 365 días. Cambiar identidad o contacto publicado vuelve a requerir revisión.
5. La administración puede retirar una publicación y bloquear que el propietario la vuelva a publicar hasta habilitarla. Se conserva el historial de operaciones; una tienda con operaciones o bonos no se borra, se despublica.
6. Las decisiones administrativas guardan actor, motivo y fecha. Los dueños gestionan sus propios negocios; las acciones administrativas pasan por sus rutas específicas.

## 9. Asistente del negocio y IA local opcional

El asistente consulta catálogo, precios, horarios y dirección publicados. Sin modelo responde mediante búsqueda local. Para utilizar un modelo ya instalado en Ollama, configura `OLLAMA_MODEL` y opcionalmente `OLLAMA_URL` en `.env` y reinicia la API. El origen debe ser loopback; no se descargan modelos automáticamente. El conector está documentado con la [API oficial de Ollama](https://github.com/ollama/ollama/blob/main/docs/api.md).

La IA se usa solo con cuenta, con límite de solicitudes, una consulta simultánea y tiempo máximo de espera. Sus respuestas son informativas: no crean operaciones ni confirman pagos, existencias, citas o reputación. El tutor no recibe datos privados de pedidos ni respuestas de evaluaciones. Si el servicio no responde, se muestra la guía local indicando la sustitución.

El modelo no está instalado/provisionado por esta implementación. En Docker necesitaría ejecutarse en el mismo espacio de red local del servidor o adaptar explícitamente el despliegue; Compose conserva el modo de guía local por defecto.

## Validación y límites de esta entrega

`npm run check` ejecuta TypeScript, pruebas de dominio/almacenamiento y API con HTTP de Node/Express en memoria, y compilación. Las pruebas de API pasan por parser, cookies, permisos y SQLite sin abrir puertos; las pruebas de navegador siguen en `npm run test:e2e` y utilizan el servidor local real.

En este entorno no se pudo iniciar Chromium. Se añadieron recorridos de dos cuentas y se adaptaron los anteriores al comercio persistente, pero necesitan ejecución en un equipo con navegador permitido. No se debe afirmar validación visual completa.

SMTP real, modelo de IA, hosting, HTTPS y copias externas requieren configuración. No se contrató un proveedor, no se cobraron compras reales y no se enviaron mensajes a personas. Las copias/restauración incluyen la base y las imágenes; consulta `operacion.md`.
