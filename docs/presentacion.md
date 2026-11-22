# Plataforma según la presentación

Desde la rama `feature/plataforma-presentacion`, la interfaz replica la presentación
«Presentación de app de emprendimiento SucreIA» (8 diapositivas). Se retiraron el Configurador,
el Estudio visual con los 7 estilos, la portada anterior y su tema: cada negocio tiene una página
fija con el diseño de la presentación y el emprendedor solo llena sus datos, fotos y productos.

## Diapositiva → pantalla

| Diapositiva                           | Ruta                                                                   | Componente                                                   |
| ------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1. Portada                            | `/`                                                                    | `pages/index.vue`                                            |
| 2. Iniciar sesión / Registrarse       | `/ingresar`                                                            | `layouts/auth.vue`, `features/account/SignIn.vue`            |
| 3. Buscar negocios                    | `/buscar` (y `/favoritos`)                                             | `features/explore/SearchPage.vue`                            |
| 4 y 6. Página del negocio             | `/tienda?id=…`                                                         | `features/explore/BusinessPage.vue`                          |
| 5. Descuentos y SucrePuntos           | `/puntos`                                                              | `features/community/PointsPage.vue`                          |
| 6. Logística y entregas               | `/logistica`                                                           | `features/community/LogisticsPage.vue`                       |
| 7. Escuela del Emprendedor con IA     | `/escuela`                                                             | `features/community/SchoolPage.vue`                          |
| 8. Mapa de emprendimientos            | `/mapa`                                                                | `features/explore/MapPage.vue`                               |
| Menú lateral y barra (3 a 8)          | todas las internas                                                     | `layouts/default.vue`, `domain/roles.ts`                     |
| Complementos del menú                 | `/inicio`, `/sectores`, `/recomendaciones`, `/solicitudes`, `/pedidos` | `features/explore/*`, `features/commerce/Requests.vue`       |
| Datos del negocio (reemplaza Estudio) | `/panel/perfil`, `/panel/productos`                                    | `features/commerce/BusinessEditor.vue`, `ProductsEditor.vue` |

Sistema visual: `assets/css/sucre.css` (azul marino, verde, Poppins) y piezas en
`components/sucre/` (logo, buscador, sectores, tarjeta de negocio, encabezado con foto, chat,
asistente flotante, diálogo). Los 10 sectores y las 5 subregiones con sus 26 municipios están en
`domain/sectors.ts`; las categorías anteriores (Artesanías, Gastronomía…) se traducen al sector.

## Qué es real y qué está pendiente

Todo lo que muestran las pantallas sale de la API: negocios publicados, valoraciones y reseñas
(solo de compras completadas), puntos, bonos, pedidos, entregas, lecciones y constancias.

Pendiente (la interfaz lo dice en pantalla, no se simula):

- **Google y Facebook:** botones desactivados con aviso «Próximamente». Requieren crear las
  aplicaciones OAuth y sus claves.
- **IA:** el «Bot IA» de cada negocio y el asistente de la Escuela usan la API existente (búsqueda
  en el catálogo o en las lecciones; Ollama opcional). El «Asistente SucreIA» flotante, las
  «Recomendaciones IA» y la «ruta personalizada» usan reglas con datos reales. Conectar un modelo
  (Gemini o Claude) necesita una clave y una decisión de costos.
- **SucrePuntos (funcionan todas las formas de ganar):** compras completadas (1 punto por cada
  $1.000), reseñas (+20), recomendar a un amigo (+30 cuando el invitado completa su primera
  compra; código de 6 caracteres, enlace `/ingresar?ref=CÓDIGO` y QR), ferias y eventos (hasta
  +100 con el código que entrega la administración, del día del evento a 7 días después) y retos
  (+50: compras en 3 sectores, 3 reseñas, 3 lecciones). Reglas en `src/domain/rewards.ts` y
  `server/rewards.ts`; cada premio se paga una sola vez y llega como aviso. Los niveles
  (Explorador, Emprendedor, Embajador) se calculan con el saldo.
- **Mapa:** es la ilustración de la presentación; las subregiones son botones que filtran. Las
  cifras son las de los negocios publicados.
- **Video del negocio:** la galería muestra fotos; no hay videos.

## Imágenes

Las fotos están recortadas de las diapositivas (`public/sucre/*.webp`, 1672×941 px de origen),
por decisión del propietario. Las fotos `demo-*` solo las usa el script de demostración.

## Datos de demostración

```bash
npm run dev:api                                  # en otra terminal
DEMO_PASSWORD=una-clave npm run demo -- --confirmar
```

Crea, a través de la API y con todas sus reglas, los 9 negocios de la presentación (Delicias de
Sucre, Arepas de Sucre, Moda Caribe, Cabañas San Onofre…) y 30 más repartidos en los 10 sectores y
las 5 subregiones, con fotos, productos, descuentos, compras completadas con reseñas de cinco
clientes de prueba, un referido (María, invitada por Ana) y un pedido en preparación de «Ana Demo».
Las ferias de ejemplo necesitan la cuenta `admin@demo.sucreia.local` como administradora
(`npm run admin -- admin@demo.sucreia.local` con la API detenida) y volver a ejecutar el script.
Solo acepta APIs en `127.0.0.1`/`localhost`; las cuentas usan `@demo.sucreia.local` y los contactos
son ficticios. **Nunca** ejecutarlo contra producción. Las cifras resultantes (valoraciones,
reseñas, totales) son las reales de esos datos, no las de las diapositivas.
