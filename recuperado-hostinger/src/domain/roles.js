// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var principal = {
  id: "principal",
  title: "",
  items: [
    { href: "/buscar", label: "Buscar negocios", icon: "search" },
    { href: "/mapa", label: "Mapa de emprendimientos", icon: "map" },
    { href: "/pedidos", label: "Mis compras", icon: "cart" },
    { href: "/solicitudes", label: "Mis reservas", icon: "calendar" },
    { href: "/favoritos", label: "Favoritos", icon: "heart" },
    { href: "/notificaciones", label: "Notificaciones", icon: "bell" }
  ]
};
var principalCliente = {
  ...principal,
  items: [
    ...principal.items,
    { href: "/emprender", label: "\xBFQuieres montar tu propio emprendimiento?", icon: "rocket" }
  ]
};
var explorar = {
  id: "explorar",
  title: "Explorar",
  items: [
    { href: "/buscar", label: "Buscar negocios", icon: "search" },
    { href: "/mapa", label: "Mapa de emprendimientos", icon: "map" }
  ]
};
var explorarYComprar = {
  ...explorar,
  title: "Explorar y comprar",
  items: [
    ...explorar.items,
    { href: "/pedidos", label: "Mis compras", icon: "cart" },
    { href: "/solicitudes", label: "Mis reservas", icon: "calendar" },
    { href: "/favoritos", label: "Favoritos", icon: "heart" }
  ]
};
var canBuyRole = (role) => role === "cliente" || role === "emprendedor";
function roleHome(_role) {
  return "/buscar";
}
function requiredRole(path) {
  const clean = path.replace(/\/+$/, "") || "/";
  if (/^\/(admin|equipo)(\/|$)/.test(clean)) return "admin";
  if (/^\/(panel|registro-negocio)(\/|$)/.test(clean)) return "emprendedor";
  if (/^\/(pedidos|solicitudes|favoritos|carrito)(\/|$)/.test(clean)) return "cliente";
  return null;
}
