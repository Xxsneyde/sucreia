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
/** Vista del menú: cada rol tiene una sola (cliente, emprendedor o administrador). */
export type Mode = 'comprar' | 'negocio' | 'admin';

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
  | 'book'
  | 'calendar'
  | 'chart'
  | 'wand'
  | 'rocket'
  | 'inbox';
export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Otras páginas en las que este enlace se marca como activo. */
  also?: string[];
  /** Abrir en una pestaña nueva. */
  newTab?: boolean;
}
export interface NavSection {
  id: 'principal' | 'explorar' | 'negocio' | 'admin';
  /** Vacío en la sección principal (como en la presentación). */
  title: string;
  items: NavItem[];
}

/** Menú principal: descubrir, comprar, reservar y avisos. */
const principal: NavSection = {
  id: 'principal',
  title: '',
  items: [
    { href: '/buscar', label: 'Buscar negocios', icon: 'search' },
    { href: '/mapa', label: 'Mapa de emprendimientos', icon: 'map' },
    { href: '/pedidos', label: 'Mis compras', icon: 'cart' },
    { href: '/solicitudes', label: 'Mis reservas', icon: 'calendar' },
    { href: '/favoritos', label: 'Favoritos', icon: 'heart' },
    { href: '/notificaciones', label: 'Notificaciones', icon: 'bell' },
  ],
};
/** El cliente con sesión ve además la invitación a montar su emprendimiento. */
const principalCliente: NavSection = {
  ...principal,
  items: [
    ...principal.items,
    { href: '/emprender', label: '¿Quieres montar tu propio emprendimiento?', icon: 'rocket' },
  ],
};
const registrar: NavItem = {
  href: '/panel/configurar',
  label: 'Registrar emprendimiento',
  icon: 'wand',
};
const explorar: NavSection = {
  id: 'explorar',
  title: 'Explorar',
  items: [
    { href: '/buscar', label: 'Buscar negocios', icon: 'search' },
    { href: '/mapa', label: 'Mapa de emprendimientos', icon: 'map' },
  ],
};
const explorarYComprar: NavSection = {
  ...explorar,
  title: 'Explorar y comprar',
  items: [
    ...explorar.items,
    { href: '/pedidos', label: 'Mis compras', icon: 'cart' },
    { href: '/solicitudes', label: 'Mis reservas', icon: 'calendar' },
    { href: '/favoritos', label: 'Favoritos', icon: 'heart' },
  ],
};

/** Tipo de negocio del emprendedor: cambia su menú. */
export type StoreKind = 'products' | 'booking' | 'quote' | 'none';
function negocio(kind: StoreKind): NavSection {
  const items: NavItem[] =
    kind === 'none'
      ? [registrar]
      : [
          {
            href: '/panel/negocios',
            label: 'Mis negocios',
            icon: 'store',
            also: ['/panel', '/panel/perfil', '/panel/productos', '/panel/agenda'],
          },
          registrar,
          ...(kind === 'booking'
            ? [{ href: '/panel/pedidos', label: 'Reservas', icon: 'inbox' } as const]
            : []),
          ...(kind === 'quote'
            ? [{ href: '/panel/pedidos', label: 'Solicitudes', icon: 'inbox' } as const]
            : []),
          { href: '/panel/descuentos', label: 'Promociones y reseñas', icon: 'tag' },
        ];
  items.push(
    { href: '/notificaciones', label: 'Notificaciones', icon: 'bell' },
    { href: '/pqrs', label: 'PQRS', icon: 'inbox' },
  );
  return { id: 'negocio', title: 'Mi negocio', items };
}
const admin: NavSection = {
  id: 'admin',
  title: 'Administración',
  items: [
    { href: '/admin', label: 'Aprobación de negocios', icon: 'shield' },
    { href: '/admin/negocios', label: 'Negocios aprobados', icon: 'grid' },
    { href: '/panel/negocios', label: 'Mis negocios', icon: 'store' },
    registrar,
    { href: '/admin/pqrs', label: 'PQRS', icon: 'inbox' },
    { href: '/notificaciones', label: 'Notificaciones', icon: 'bell' },
  ],
};

export const isMerchant = (role: Role) => role === 'emprendedor' || role === 'admin';
/** Quién puede comprar, reservar y guardar favoritos (el administrador no). */
export const canBuyRole = (role: Role) => role === 'cliente' || role === 'emprendedor';

/** Nombres cortos para el menú inferior del celular. */
const shortLabels: Record<string, string> = {
  'Registrar emprendimiento': 'Registrar',
  'Mapa de emprendimientos': 'Mapa',
  'Mis negocios': 'Negocios',
  'Negocios aprobados': 'Aprobados',
  'Mis productos': 'Productos',
  'Mis servicios': 'Servicios',
  'Horarios y cupos': 'Horarios',
  'Promociones y reseñas': 'Promos',
  'Datos del negocio': 'Mi negocio',
  'Aprobación de negocios': 'Aprobar',
  Notificaciones: 'Avisos',
};
const shorten = (items: NavItem[]): NavItem[] =>
  items.map((i) => ({ ...i, label: shortLabels[i.label] ?? i.label }));

/** Vistas disponibles para cada rol. */
export function modesFor(role: Role): Mode[] {
  return role === 'admin' ? ['admin'] : role === 'emprendedor' ? ['negocio'] : ['comprar'];
}
export const defaultMode = (role: Role): Mode => modesFor(role)[0];
export const modeNames: Record<Mode, string> = {
  comprar: 'Cliente',
  negocio: 'Emprendedor',
  admin: 'Administrador',
};

const account: NavItem = { href: '/perfil', label: 'Mi cuenta', icon: 'user' };

/**
 * Secciones del menú lateral y del menú inferior (celular). Sin sesión se ve el menú principal:
 * las páginas que necesitan cuenta llevan a ingresar.
 */
export function navFor(
  viewer: Viewer | null,
  mode: Mode = 'comprar',
  kind: StoreKind = 'none',
): { sections: NavSection[]; mobile: NavItem[] } {
  const modes = viewer ? modesFor(viewer.role) : (['comprar'] as Mode[]);
  const current = modes.includes(mode) ? mode : modes[0];
  if (current === 'admin')
    return {
      sections: [admin, explorar],
      mobile: shorten([admin.items[0], admin.items[1], admin.items[2], account]),
    };
  if (current === 'negocio') {
    const section = negocio(kind);
    return {
      sections: [section, explorarYComprar],
      mobile: shorten(
        section.items
          .filter((i) => i.href !== '/notificaciones')
          .slice(0, 3)
          .concat(account),
      ),
    };
  }
  return {
    sections: [viewer ? principalCliente : principal],
    mobile: [
      { href: '/buscar', label: 'Buscar', icon: 'search' },
      { href: '/mapa', label: 'Mapa', icon: 'map' },
      { href: '/pedidos', label: 'Compras', icon: 'cart' },
      account,
    ],
  };
}

/** Páginas retiradas del menú: se redirigen a la vista propia del rol. */
const retiredPaths = [
  '/inicio',
  '/puntos',
  '/domiciliario',
  '/logistica',
  '/escuela',
  '/recomendaciones',
  '/panel/ventas',
  '/panel/configuracion',
  '/equipo',
];
export function isRetired(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return retiredPaths.some((base) => clean === base || clean.startsWith(base + '/'));
}

/** Inicio de cada vista (el logo del menú lleva aquí). */
export function modeHome(_mode: Mode): string {
  return '/buscar';
}
/** Dónde empieza cada rol al ingresar: todos empiezan buscando negocios. */
export function roleHome(_role: Role): string {
  return '/buscar';
}

/**
 * Páginas exclusivas de un rol. Las de administración y las de compra redirigen a la vista
 * propia del rol; las del negocio muestran cómo activarlo (RequireMerchant).
 */
export function requiredRole(path: string): 'admin' | 'emprendedor' | 'cliente' | null {
  const clean = path.replace(/\/+$/, '') || '/';
  if (/^\/(admin|equipo)(\/|$)/.test(clean)) return 'admin';
  if (/^\/(panel|registro-negocio)(\/|$)/.test(clean)) return 'emprendedor';
  if (/^\/(pedidos|solicitudes|favoritos|carrito)(\/|$)/.test(clean)) return 'cliente';
  return null;
}
export function canOpen(path: string, role: Role): boolean {
  const need = requiredRole(path);
  if (!need) return true;
  if (need === 'admin') return role === 'admin';
  if (need === 'cliente') return canBuyRole(role);
  return isMerchant(role);
}
