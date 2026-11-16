# Backlog inicial

Cada bloque se puede convertir en un issue con la plantilla disponible.

## P0 · Acuerdos y acceso

- [x] Crear repositorio público Xxsneyde/sucreia y subir main.
- [ ] Invitar a compañeros por su usuario de GitHub.
- [ ] Configurar ruleset de main: PR, una aprobación, CI y bloqueo de force-push.
- [ ] Confirmar responsables por módulo; backend Express + SQLite ya elegido.
- [ ] Definir catálogo de categorías, municipios y modalidades mixtas.

## P1 · Configurador de negocios

- [x] Datos personales y cuenta vinculada al negocio.
- [x] Datos mínimos de negocio, municipio y WhatsApp validado.
- [x] Logo y tres ofertas: subida, validación y edición. _(API Express; validación HTTP/navegador de los cambios recientes pendiente por permisos locales)_
- [x] Motor de plantillas por actividad y modalidad. _(7 estilos, 3 recomendados por área, con tipografías locales)_
- [x] Estilos, colores y distribución visual con accesibilidad móvil. _(API Express; validación HTTP/navegador de los cambios recientes pendiente por permisos locales)_
- [x] Vista previa, borrador persistente y publicación con versión. _(API Express; validación HTTP/navegador de los cambios recientes pendiente por permisos locales)_
- [x] Reabrir y editar el negocio sin perder configuración. _(API Express; validación HTTP/navegador de los cambios recientes pendiente por permisos locales)_

## P1 · Servicios centrales

- [x] Autenticación, roles y aislamiento por negocio. _(API Express + pantallas de cuenta)_
- [x] Catálogo de tiendas persistente en API.
- [x] Inventario, disponibilidad y reservas de existencias.
- [x] Pedidos, reservas y cotizaciones con estados propios.
- [x] Validación de precios y disponibilidad en servidor.
- [ ] CI con pruebas de permisos y recorridos reales.

## P2 · Operación

- [ ] Pagos y conciliación; definir proveedor y alcance.
- [x] Logística: asignación, estados, ETA y PIN de un uso.
- [ ] WhatsApp de cada negocio y notificaciones autorizadas.
- [x] Verificación: requisitos, revisión y sello azul.
- [x] Analítica: ventas, visitas y operaciones de los últimos 365 días.
- [x] SucrePuntos: equivalencia en COP, reglas, saldo y canje.
- [x] Cursos, recomendaciones y ubicación geográfica real.

## P3 · Evolución

- [ ] Ayuda de IA para contenido y estilos, con revisión del propietario.
- [ ] Mapa de entregas en vivo si el equipo prioriza esta función.
- [ ] Rendimiento con conectividad lenta y observabilidad.

## Operación técnica

- [x] Recuperación de contraseña y verificación con tokens de un uso; flujo local y adaptador SMTP.
- [x] Imágenes en disco con propiedad, biblioteca, migración y conservación de versiones.
- [x] Copia coherente SQLite + imágenes y restauración validada en destino nuevo.
- [x] Docker y Compose con persistencia, usuario sin privilegios y salud.
- [ ] Ejecutar pruebas HTTP y navegador de los cambios recientes en un entorno que permita sockets.
- [ ] Configurar y comprobar un servicio SMTP real y remitente autorizado.
- [ ] Elegir hosting Node, desplegar y validar disco/HTTPS/recuperación.
- [ ] Acordar frecuencia, destino externo y retención de copias.

## Actualización: recorrido completo local

Implementados con persistencia: catálogo, inventario, precios de servidor, compra/agenda/cotización, roles y aislamiento, entrega con PIN y domiciliarios revisados, devoluciones manuales, puntos/canje, reseñas, avisos, escuela/evaluaciones/constancia, ubicación declarada y asistente/tutor con Ollama opcional. Estos estados reemplazan los pendientes de módulos de demo anteriores.

Pendientes externos o de una siguiente versión:

- [ ] Ejecutar recorridos visuales de Playwright en un entorno donde Chromium pueda iniciarse; pruebas API y dominio ya no necesitan puertos y sí se ejecutan aquí.
- [ ] Configurar y comprobar SMTP, modelo de IA local y despliegue elegido por el propietario.
- [ ] Probar Docker real, HTTPS, disco y recuperación/retención de copias fuera del equipo.
- [ ] Pagos automáticos, conciliación bancaria, devoluciones parciales y reglas comerciales definitivas.
- [ ] WhatsApp automático mediante proveedor autorizado y GPS de entregas en vivo (opcional en la propuesta original).
- [ ] Políticas operativas de verificación, soporte, privacidad, horarios especiales y cancelaciones antes del lanzamiento.
- [ ] Separar los cambios locales en commits/PR revisables y completar colaboración/protección en GitHub.
