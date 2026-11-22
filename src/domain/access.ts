/** Páginas que necesitan cuenta. Portada, buscar, sectores, mapa y cada negocio son públicas. */
export function requiresSession(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return [
    '/inicio',
    '/notificaciones',
    '/asistente',
    '/panel',
    '/perfil',
    '/carrito',
    '/pedidos',
    '/solicitudes',
    '/favoritos',
    '/puntos',
    '/logistica',
    '/escuela',
    '/recomendaciones',
    '/domiciliario',
    '/admin',
    '/equipo',
  ].some((base) => clean === base || clean.startsWith(base + '/'));
}
