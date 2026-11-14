# Instrucciones para cambios en SucreIA

- Leer README.md y docs/arquitectura.md antes de cambiar arquitectura.
- Mantener rutas delgadas en src/app y lógica de función en src/features.
- Usar TypeScript estricto; evitar any.
- Interfaz y documentación en español; preservar accesibilidad y diseño móvil.
- No convertir datos de demo en producción ni simular integraciones como completadas.
- Validar cambios con npm run check. Los recorridos principales tienen pruebas en tests/e2e.
- No modificar contratos de src/domain sin actualizar consumidores y documentación.
- No subir secretos, datos de clientes ni salidas de compilación.
- Trabajar con rama por tarea y pull request; no hacer force-push a main.
