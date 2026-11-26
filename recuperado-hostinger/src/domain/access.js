// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
function requiresSession(path) {
  const clean = path.replace(/\/+$/, "") || "/";
  return [
    "/buscar",
    "/mapa",
    "/sectores",
    "/inicio",
    "/notificaciones",
    "/asistente",
    "/panel",
    "/registro-negocio",
    "/perfil",
    "/carrito",
    "/pedidos",
    "/solicitudes",
    "/favoritos",
    "/puntos",
    "/logistica",
    "/escuela",
    "/recomendaciones",
    "/domiciliario",
    "/admin",
    "/equipo"
  ].some((base) => clean === base || clean.startsWith(base + "/"));
}
