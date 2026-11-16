# Operación local y preparación de despliegue

Esta guía cubre correo SMTP, copias, restauración y ejecución con Docker. El código queda preparado; no se ha contratado hosting, enviado correo a usuarios ni publicado esta rama.

## Correo

1. Copia `.env.example` a `.env` en la raíz del repositorio si todavía no tienes uno. Conserva los valores existentes si ya lo usas.
2. Completa estas variables con los datos de tu servicio SMTP:

   ```dotenv
   PUBLIC_URL=https://tu-dominio.example
   SMTP_HOST=smtp.tu-proveedor.example
   SMTP_PORT=587
   SMTP_USER=tu-usuario
   SMTP_PASSWORD=tu-credencial
   SMTP_FROM=cuentas@tu-dominio.example
   ```

3. Ejecuta `npm run mail:check`. Solo comprueba conexión y autenticación; no envía mensajes. No imprime la configuración ni los detalles internos del proveedor.
4. Reinicia la API. Con SMTP configurado se utiliza ese transporte y la bandeja local desaparece. Sin SMTP, `npm run dev:api` mantiene la bandeja efímera; `npm start` no simula envíos.
5. Con una cuenta de prueba propia, solicita verificación desde `/verificar-correo` y recuperación desde `/recuperar`. El remitente debe estar autorizado por el servicio elegido. La aceptación SMTP no garantiza la entrega final al buzón.

Se admite puerto 465 con TLS desde el inicio o 587 con STARTTLS obligatorio. No se desactiva la validación del certificado. Los enlaces se construyen con `PUBLIC_URL`, sin confiar en Host/Origin enviados por el cliente. HTTP solo se admite para un origen loopback de prueba.

El registro crea la cuenta incluso si falla la entrega: responde `verificationSent: false` y el perfil permite reenviar. Una recuperación siempre usa el mismo mensaje genérico para un correo existente o desconocido, incluso si falla el transporte. Los errores de envío solo producen avisos generales en servidor, sin registrar direcciones, enlaces o credenciales. La solicitud de verificación, con sesión iniciada, sí muestra un error de entrega para permitir reintentar.

No se agregó una cola de reintentos ni se configuró ningún proveedor real. Las credenciales se suministran por el entorno del servidor y nunca se incluyen en Git, imágenes Docker ni respaldos. Para un hosting, utiliza su gestor de secretos.

## Copia local

1. Detén la API con Ctrl+C y espera a que termine. Nuxt puede permanecer abierto, pero la API debe estar detenida. Si había una API anterior al bloqueo compartido, detenla también.
2. Desde la raíz del proyecto ejecuta:

   ```bash
   npm run backup
   ```

   Se crea una carpeta nueva en `server/backups/` con fecha UTC. También puedes elegir un destino nuevo:

   ```bash
   npm run backup -- /ruta/privada/copia-sucreia-2026-11-16
   ```

3. Conserva toda la carpeta: `sucreia.db`, `images/` y `manifest.json`. El manifiesto registra SHA-256 por archivo y se verifica la integridad de SQLite. Copia esa carpeta a otro disco o ubicación privada para protegerte frente a un fallo del equipo. El comando no la sube a ningún servicio.
4. Reinicia la API con `npm run dev:api` o `npm start` según tu modo de trabajo.

La copia utiliza la API de backup de SQLite, no copia solo el archivo principal de una base abierta. Se incluyen todos los archivos registrados en la biblioteca, incluso si aún no se usan. Si falta alguno, la operación falla y elimina su carpeta parcial. No se incluyen temporales u otros archivos ajenos a la biblioteca.

Servidor y mantenimiento usan bloqueos de archivo exclusivos para impedir escrituras concurrentes durante la copia. Si los datos están en uso, la operación se rechaza. Tras SIGKILL, un corte eléctrico o una caída pueden quedar bloqueos (`<DATABASE_PATH>.lock` y `<IMAGES_PATH>/.sucreia.lock`). Primero comprueba que la API y el mantenimiento estén detenidos; solo entonces retira esos dos archivos de bloqueo. No borres SQLite ni la carpeta de fotos. No se retiran bloqueos automáticamente por PID, para evitar confusiones entre contenedores o procesos.

## Restaurar y comprobar

1. Elige una carpeta de destino que **no exista**; no apuntes a los datos actuales:

   ```bash
   npm run restore -- server/backups/NOMBRE-DE-LA-COPIA /ruta/privada/sucreia-restaurada
   ```

2. Se verifican manifiesto, hashes, integridad SQLite, claves foráneas y presencia de fotos. Las rutas del manifiesto se restringen a la base y las fotos; no se aceptan enlaces simbólicos. Si falla, el destino no se publica.
3. La restauración crea `sucreia.db` e `images/` en la carpeta nueva. Las sesiones y enlaces de cuenta antiguos se revocan **en la copia restaurada**. El contenido original y el respaldo se conservan.
4. Para revisarla, detén la API y configura `DATABASE_PATH` e `IMAGES_PATH` en tu entorno apuntando a la carpeta restaurada. Inicia la API y comprueba ingreso, tiendas y fotos. No sustituyas los datos activos hasta haber revisado el resultado.

El manifiesto detecta daños o cambios; no es una firma de autenticidad ni cifra los datos. Guarda los respaldos en una ubicación privada. No se implementó una programación automática ni retención: el equipo debe acordar frecuencia y destino antes de operar con información real.

## Docker local

Requiere Docker Engine y Compose. `compose.yaml` publica el puerto solo en loopback y usa dos volúmenes: datos y copias.

1. Para probar por HTTP local, define `COOKIE_SECURE=false` en tu entorno o `.env`. En un sitio servido por HTTPS, usa `COOKIE_SECURE=true`.
2. Ejecuta:

   ```bash
   docker compose up --build -d
   docker compose ps
   ```

3. Abre `http://127.0.0.1:4000`. La comprobación de salud consulta `/api/salud`. El contenedor ejecuta Node como usuario sin privilegios y recibe señales mediante `init`.
4. Para detenerlo conservando los volúmenes: `docker compose stop`. No utilices `down -v` sobre datos que quieras conservar.

La configuración Docker no modifica ni importa automáticamente `server/data/` de tu repositorio: sus volúmenes empiezan vacíos. Para trasladar datos, restaura una copia en una carpeta nueva del volumen y configura sus dos rutas antes de iniciar el servicio.

### Copia de los volúmenes

1. `docker compose stop web`
2. `docker compose run --rm --no-deps web node server/commands/backup.ts create /backups/copia-2026-11-16`
3. `docker compose up -d web`

Utiliza un nombre nuevo en cada copia. Para comprobar una restauración sin sustituir los datos activos:

```bash
docker compose run --rm --no-deps web node server/commands/backup.ts restore /backups/copia-2026-11-16 /backups/restauracion-prueba
```

Las copias del volumen deben exportarse a otra ubicación: los volúmenes de datos y copias pertenecen al mismo equipo.

## Hosting Node

Puedes usar la imagen Docker o `npm ci && npm run build`, seguido de `npm start`. El servicio necesita Node 24, un único proceso escritor y disco persistente compartido por `DATABASE_PATH` e `IMAGES_PATH`. No iniciar varias réplicas sobre estos archivos. No se diseñó esta etapa para funciones efímeras ni para escalar horizontalmente SQLite.

El proxy debe terminar HTTPS, conservar el encabezado Host y reenviar `/api` y el sitio al mismo servidor. Configura `PUBLIC_URL`, SMTP y `COOKIE_SECURE=true`. Revisa límites y periodos de conservación del disco con el hosting que elija el equipo. Esta sesión no aprovisionó ni desplegó servicios externos.

## Referencias técnicas

- [Nodemailer: transporte SMTP, TLS y verificación de conexión](https://nodemailer.com/smtp).
- [Node.js: API de SQLite y backup](https://nodejs.org/download/release/v26.2.0/docs/api/sqlite.html).
- [Imagen oficial de Node: usuario, señales y producción](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md).
- [Docker Compose: variables del contenedor](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/).
