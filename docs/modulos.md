# Reparto del trabajo

Los nombres de responsables se asignan cuando el propietario comparta las cuentas del equipo. La organización por carpetas ya permite trabajar en paralelo.

| Área                            | Carpeta                             | Responsabilidad                      | Dependencias                 |
| ------------------------------- | ----------------------------------- | ------------------------------------ | ---------------------------- |
| Catálogo cliente                | src/features/marketplace            | Inicio, búsqueda, negocio, favoritos | Negocios y ofertas           |
| Pedidos                         | src/features/orders                 | Carrito, checkout, seguimiento       | Catálogo, pagos, entregas    |
| Panel empresa                   | src/features/business               | Indicadores, catálogo, gestión       | Autenticación, pedidos       |
| Configurador (área de Esneyder) | src/features/onboarding             | Registro progresivo y plantillas     | Negocio, ofertas, archivos   |
| Cuenta                          | src/features/account                | Registro, acceso y perfil            | Autenticación                |
| SucrePuntos                     | src/features/rewards                | Saldo, bonos y canje                 | Reglas comerciales, pedidos  |
| Comunidad                       | src/features/community              | Escuela, directorio y entregas       | Contenidos, mapas, logística |
| Administración                  | src/features/admin                  | Verificación y moderación            | Autorización y auditoría     |
| Base compartida                 | src/domain, src/components, src/lib | Contratos, diseño, repositorios      | Acuerdo del equipo           |

Para equipos más grandes, separar `community` en escuela, mapa y logística al asignar responsables. Evitar que dos tareas modifiquen simultáneamente el estado global o las mismas entidades sin coordinación.
