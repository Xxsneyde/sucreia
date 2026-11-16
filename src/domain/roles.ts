// Vistas de cada rol: qué secciones ve en el menú, dónde empieza y qué páginas son exclusivas.
// Fuente única para el layout, el middleware, las pruebas y docs/roles.md.
// El servidor sigue comprobando permisos en cada operación; esto decide lo que se muestra.

export type Role = 'cliente' | 'emprendedor' | 'admin';
/** El domiciliario no es un rol sino un permiso extra que aprueba la administración. */
export type CourierState = 'none' | 'pending' | 'approved';
export interface Viewer {
  role: Role;
  courier: CourierState;
}
/** Modo del menú para quien tiene negocio: gestionarlo o usar SucreIA como cliente. */
export type Mode = 'negocio' | 'comprar';

export type IconName =
  | 'compass'
  | 'search'
  | 'cart'
  | 'bag'
  | 'heart'
  | 'gift'
  | 'school'
  | 'map'
  | 'sparkles'
  | 'bell'
  | 'user'
  | 'dashboard'
  | 'store'
  | 'package'
  | 'id'
  | 'tag'
  | 'settings'
  | 'truck'
  | 'shield'
  | 'book';
export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}
export interface NavSection {
  id: 'negocio' | 'comprar' | 'comunidad' | 'cuenta' | 'entregas' | 'admin';
  title: string;
  items: NavItem[];
}

const comprar: NavSection = {
  id: 'comprar',
  title: 'Comprar',
  items: [
    { href: '/inicio', label: 'Descubrir', icon: 'compass' },
    { href: '/buscar', label: 'Buscar negocios', icon: 'search' },
    { href: '/carrito', label: 'Carrito', icon: 'cart' },
    { href: '/pedidos', label: 'Mis pedidos', icon: 'bag' },
    { href: '/favoritos', label: 'Favoritos', icon: 'heart' },
    { href: '/puntos', label: 'SucrePuntos', icon: 'gift' },
  ],
};
const comunidad: NavSection = {
  id: 'comunidad',
  title: 'Comunidad',
  items: [
    { href: '/escuela', label: 'Escuela emprendedora', icon: 'school' },
    { href: '/mapa', label: 'Explorar Sucre', icon: 'map' },
    { href: '/asistente', label: 'Asistente de catálogo', icon: 'sparkles' },
  ],
};
const negocio: NavSection = {
  id: 'negocio',
  title: 'Mi negocio',
  items: [
    { href: '/panel', label: 'Resumen', icon: 'dashboard' },
    { href: '/estudio', label: 'Mis tiendas', icon: 'store' },
    { href: '/panel/pedidos', label: 'Pedidos y solicitudes', icon: 'bag' },
    { href: '/panel/productos', label: 'Productos y servicios', icon: 'package' },
    { href: '/panel/perfil', label: 'Datos del negocio', icon: 'id' },
    { href: '/panel/descuentos', label: 'Descuentos', icon: 'tag' },
    { href: '/panel/configuracion', label: 'Configuración', icon: 'settings' },
  ],
};
const cuenta: NavSection = {
  id: 'cuenta',
  title: 'Mi cuenta',
  items: [
    { href: '/notificaciones', label: 'Notificaciones', icon: 'bell' },
    { href: '/perfil', label: 'Perfil', icon: 'user' },
  ],
};
const entregas: NavSection = {
  id: 'entregas',
  title: 'Entregas',
  items: [{ href: '/domiciliario', label: 'Mis entregas', icon: 'truck' }],
};
const admin: NavSection = {
  id: 'admin',
  title: 'Administración',
  items: [
    { href: '/admin', label: 'Revisión y moderación', icon: 'shield' },
    { href: '/equipo', label: 'Guía del proyecto', icon: 'book' },
  ],
};

export const isMerchant = (role: Role) => role === 'emprendedor' || role === 'admin';

/** Secciones del menú lateral y pestañas del menú inferior (celular) para quien navega. */
export function navFor(viewer: Viewer, mode: Mode): { sections: NavSection[]; mobile: NavItem[] } {
  const merchant = isMerchant(viewer.role);
  const businessFirst = merchant && mode === 'negocio';
  const sections: NavSection[] = businessFirst
    ? [negocio, comprar, comunidad]
    : merchant
      ? [comprar, comunidad, negocio]
      : [comprar, comunidad];
  if (viewer.courier !== 'none') sections.push(entregas);
  sections.push(cuenta);
  if (viewer.role === 'admin') sections.push(admin);
  const mobile: NavItem[] = businessFirst
    ? [
        { href: '/panel', label: 'Resumen', icon: 'dashboard' },
        { href: '/panel/pedidos', label: 'Pedidos', icon: 'bag' },
        { href: '/estudio', label: 'Tiendas', icon: 'store' },
        { href: '/perfil', label: 'Perfil', icon: 'user' },
      ]
    : [
        { href: '/inicio', label: 'Inicio', icon: 'compass' },
        { href: '/buscar', label: 'Buscar', icon: 'search' },
        { href: '/pedidos', label: 'Pedidos', icon: 'bag' },
        { href: '/perfil', label: 'Perfil', icon: 'user' },
      ];
  return { sections, mobile };
}

/** Modo según la página: las del negocio abren el menú del negocio. */
export function modeFor(path: string): Mode {
  return /^\/(panel|estudio|registro\/negocio)(\/|$)/.test(path) ? 'negocio' : 'comprar';
}

/** Dónde empieza cada rol al ingresar. */
export function roleHome(role: Role): string {
  return role === 'admin' ? '/admin' : role === 'emprendedor' ? '/estudio' : '/inicio';
}

/**
 * Páginas exclusivas de un rol. Las del negocio muestran cómo activarlo (RequireMerchant);
 * las de administración redirigen a la vista propia del rol.
 */
export function requiredRole(path: string): 'admin' | 'emprendedor' | null {
  const clean = path.replace(/\/+$/, '') || '/';
  if (/^\/(admin|equipo)(\/|$)/.test(clean)) return 'admin';
  if (/^\/(panel|estudio|registro\/negocio)(\/|$)/.test(clean)) return 'emprendedor';
  return null;
}
export function canOpen(path: string, role: Role): boolean {
  const need = requiredRole(path);
  return !need || (need === 'admin' ? role === 'admin' : isMerchant(role));
}

/** Resumen legible de la matriz (documentación y pruebas). */
export const roleViews = {
  visitante: {
    inicio: '/',
    ve: ['Vitrina pública', 'Buscar negocios', 'Página de cada tienda', 'Ingresar o crear cuenta'],
  },
  cliente: { inicio: '/inicio', ve: ['Comprar', 'Comunidad', 'Mi cuenta'] },
  emprendedor: { inicio: '/estudio', ve: ['Mi negocio', 'Comprar', 'Comunidad', 'Mi cuenta'] },
  domiciliario: { inicio: '(según su rol)', ve: ['Entregas', '+ lo de su rol'] },
  admin: { inicio: '/admin', ve: ['Todo lo anterior', 'Administración'] },
} as const;
