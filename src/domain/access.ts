/** Las páginas públicas no muestran el espacio de trabajo. Las de demo también requieren cuenta. */
export function requiresSession(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return [
    '/inicio',
    '/notificaciones',
    '/asistente',
    '/panel',
    '/estudio',
    '/perfil',
    '/carrito',
    '/pedidos',
    '/favoritos',
    '/puntos',
    '/escuela',
    '/mapa',
    '/domiciliario',
    '/admin',
    '/equipo',
    '/registro/negocio',
    '/negocios',
  ].some((base) => clean === base || clean.startsWith(base + '/'));
}
