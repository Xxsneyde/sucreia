# Reparto del trabajo

Los nombres de responsables se asignan cuando el propietario comparta las cuentas del equipo. La organización por carpetas ya permite trabajar en paralelo.

| Área                              | Carpeta                                                                                   | Responsabilidad                                         | Dependencias                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| Catálogo cliente                  | src/features/marketplace                                                                  | Inicio, búsqueda, negocio, favoritos                    | Negocios y ofertas              |
| Pedidos                           | src/features/orders                                                                       | Carrito, checkout, seguimiento                          | Catálogo, pagos, entregas       |
| Panel empresa                     | src/features/business                                                                     | Indicadores, catálogo, gestión                          | Autenticación, pedidos          |
| Configurador (área de Esneyder)   | src/features/onboarding                                                                   | Registro y elección entre 7 estilos (3 recomendados)    | Negocio, ofertas, archivos      |
| Estudio visual (área de Esneyder) | src/features/studio, src/domain/studio.ts, src/domain/designs.ts, src/lib/studio-store.ts | Diseños por área, «Mi tienda», versiones y tienda local | Configurador, catálogo, pedidos |
| Cuenta                            | src/features/account                                                                      | Registro, acceso y perfil                               | Autenticación                   |
| SucrePuntos                       | src/features/rewards                                                                      | Saldo, bonos y canje                                    | Reglas comerciales, pedidos     |
| Comunidad                         | src/features/community                                                                    | Escuela, directorio y entregas                          | Contenidos, mapas, logística    |
| Administración                    | src/features/admin                                                                        | Verificación y moderación                               | Autorización y auditoría        |
| API (backend)                     | server/                                                                                   | Express, cuentas, base de datos y rutas por módulo      | Todos los módulos               |
| Base compartida                   | src/domain, src/components, src/lib                                                       | Contratos, diseño, repositorios                         | Acuerdo del equipo              |

Para equipos más grandes, separar `community` en escuela, mapa y logística al asignar responsables. Evitar que dos tareas modifiquen simultáneamente el estado global o las mismas entidades sin coordinación.
