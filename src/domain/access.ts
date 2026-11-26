/** Páginas que necesitan cuenta. La portada, cada negocio y las páginas informativas son públicas. */
export function requiresSession(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return [
    '/buscar',
    '/mapa',
    '/sectores',
    '/inicio',
    '/notificaciones',
    '/asistente',
    '/panel',
    '/registro-negocio',
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

/** Páginas que se pueden abrir aunque falte verificar el correo o completar el perfil. */
const profileFree = [
  '/verificar-correo',
  '/completar-perfil',
  '/ingresar',
  '/recuperar',
  '/terminos',
  '/quienes-somos',
  '/correo-local',
];

/**
 * A dónde debe ir una cuenta antes de usar la plataforma: primero verificar el correo y luego
 * completar el perfil. El administrador no pasa por estos pasos. null = puede seguir.
 */
export function profileGate(
  user: { role: string; emailVerifiedAt?: string | null; profileComplete?: boolean } | null,
  path: string,
): string | null {
  if (!user || user.role === 'admin') return null;
  const clean = path.replace(/\/+$/, '') || '/';
  if (profileFree.some((base) => clean === base || clean.startsWith(base + '/'))) return null;
  if (!user.emailVerifiedAt) return '/verificar-correo';
  return user.profileComplete ? null : '/completar-perfil';
}
