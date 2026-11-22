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
  | 'home'
  | 'search'
  | 'grid'
  | 'map'
  | 'tag'
  | 'truck'
  | 'school'
  | 'sparkles'
  | 'bag'
  | 'cart'
  | 'heart'
  | 'bell'
  | 'user'
  | 'dashboard'
  | 'store'
  | 'package'
  | 'settings'
  | 'shield'
  | 'book';
export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}
export interface NavSection {
  id: 'principal' | 'negocio' | 'entregas' | 'admin';
  /** Vacío en la sección principal (como en la presentación). */
  title: string;
  items: NavItem[];
}

/** Menú principal de la presentación: igual para visitantes, clientes y emprendedores. */
const principal: NavSection = {
  id: 'principal',
  title: '',
  items: [
    { href: '/inicio', label: 'Inicio', icon: 'home' },
    { href: '/buscar', label: 'Buscar negocios', icon: 'search' },
    { href: '/sectores', label: 'Sectores', icon: 'grid' },
    { href: '/mapa', label: 'Mapa de emprendimientos', icon: 'map' },
    { href: '/puntos', label: 'Descuentos y SucrePuntos', icon: 'tag' },
    { href: '/logistica', label: 'Logística y entregas', icon: 'truck' },
    { href: '/escuela', label: 'Escuela del Emprendedor con IA', icon: 'school' },
    { href: '/recomendaciones', label: 'Recomendaciones IA', icon: 'sparkles' },
    { href: '/solicitudes', label: 'Mis solicitudes', icon: 'bag' },
    { href: '/pedidos', label: 'Mis compras', icon: 'cart' },
    { href: '/favoritos', label: 'Favoritos', icon: 'heart' },
    { href: '/notificaciones', label: 'Notificaciones', icon: 'bell' },
  ],
};
const negocio: NavSection = {
  id: 'negocio',
  title: 'Mi negocio',
  items: [
    { href: '/panel', label: 'Resumen', icon: 'dashboard' },
    { href: '/panel/perfil', label: 'Datos del negocio', icon: 'store' },
    { href: '/panel/productos', label: 'Productos y servicios', icon: 'package' },
    { href: '/panel/pedidos', label: 'Pedidos y solicitudes', icon: 'bag' },
    { href: '/panel/descuentos', label: 'Descuentos', icon: 'tag' },
    { href: '/panel/configuracion', label: 'Configuración', icon: 'settings' },
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

/**
 * Secciones del menú lateral y del menú inferior (celular). Sin sesión se ve el menú principal:
 * las páginas que necesitan cuenta llevan a ingresar.
 */
export function navFor(
  viewer: Viewer | null,
  mode: Mode = 'comprar',
): { sections: NavSection[]; mobile: NavItem[] } {
  const sections: NavSection[] = [principal];
  const merchant = !!viewer && isMerchant(viewer.role);
  if (merchant) {
    if (mode === 'negocio') sections.unshift(negocio);
    else sections.push(negocio);
  }
  if (viewer && viewer.courier !== 'none') sections.push(entregas);
  if (viewer?.role === 'admin') sections.push(admin);
  const mobile: NavItem[] =
    merchant && mode === 'negocio'
      ? [
          { href: '/panel', label: 'Resumen', icon: 'dashboard' },
          { href: '/panel/pedidos', label: 'Pedidos', icon: 'bag' },
          { href: '/panel/productos', label: 'Productos', icon: 'package' },
          { href: '/perfil', label: 'Mi cuenta', icon: 'user' },
        ]
      : [
          { href: '/inicio', label: 'Inicio', icon: 'home' },
          { href: '/buscar', label: 'Buscar', icon: 'search' },
          { href: '/puntos', label: 'Puntos', icon: 'tag' },
          { href: '/perfil', label: 'Mi cuenta', icon: 'user' },
        ];
  return { sections, mobile };
}

/** Modo según la página: las del negocio abren el menú del negocio. */
export function modeFor(path: string): Mode {
  return /^\/panel(\/|$)/.test(path) ? 'negocio' : 'comprar';
}

/** Dónde empieza cada rol al ingresar. */
export function roleHome(role: Role): string {
  return role === 'admin' ? '/admin' : role === 'emprendedor' ? '/panel' : '/inicio';
}

/**
 * Páginas exclusivas de un rol. Las del negocio muestran cómo activarlo (RequireMerchant);
 * las de administración redirigen a la vista propia del rol.
 */
export function requiredRole(path: string): 'admin' | 'emprendedor' | null {
  const clean = path.replace(/\/+$/, '') || '/';
  if (/^\/(admin|equipo)(\/|$)/.test(clean)) return 'admin';
  if (/^\/panel(\/|$)/.test(clean)) return 'emprendedor';
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
    ve: ['Portada', 'Buscar negocios', 'Sectores', 'Mapa', 'Página de cada negocio', 'Ingresar'],
  },
  cliente: { inicio: '/inicio', ve: ['Menú principal', 'Mi cuenta'] },
  emprendedor: { inicio: '/panel', ve: ['Mi negocio', 'Menú principal', 'Mi cuenta'] },
  domiciliario: { inicio: '(según su rol)', ve: ['Entregas', '+ lo de su rol'] },
  admin: { inicio: '/admin', ve: ['Todo lo anterior', 'Administración'] },
} as const;
