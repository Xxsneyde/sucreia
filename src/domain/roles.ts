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
/**
 * Vista del menú. El cliente y el emprendedor tienen una sola; el administrador puede cambiar
 * entre «Administrador» y «Emprendedor» (sus propios negocios) desde el menú de su cuenta.
 */
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

/** Menú principal: descubrir, comprar y reservar. Las notificaciones están en la campana de arriba. */
const principal: NavSection = {
  id: 'principal',
  title: '',
  items: [
    { href: '/buscar', label: 'Buscar negocios', icon: 'search' },
    { href: '/mapa', label: 'Mapa de emprendimientos', icon: 'map' },
    { href: '/pedidos', label: 'Mis compras', icon: 'cart' },
    { href: '/solicitudes', label: 'Mis reservas', icon: 'calendar' },
    { href: '/favoritos', label: 'Favoritos', icon: 'heart' },
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
/** Mientras el emprendedor no tiene ningún negocio, la invitación habla de «tu» emprendimiento. */
const registrarPrimero: NavItem = { ...registrar, label: 'Registra tu emprendimiento' };
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
      ? [registrarPrimero]
      : [
          {
            href: '/panel/negocios',
            label: 'Mis negocios',
            icon: 'store',
            // Reservas y solicitudes se abren desde cada negocio en «Mis negocios».
            also: [
              '/panel',
              '/panel/perfil',
              '/panel/productos',
              '/panel/agenda',
              '/panel/pedidos',
            ],
          },
          registrar,
          { href: '/panel/descuentos', label: 'Promociones y reseñas', icon: 'tag' },
        ];
  items.push({ href: '/pqrs', label: 'PQRS', icon: 'inbox' });
  return { id: 'negocio', title: 'Mi negocio', items };
}
const admin: NavSection = {
  id: 'admin',
  title: 'Administración',
  items: [
    { href: '/admin', label: 'Aprobación de negocios', icon: 'shield' },
    { href: '/admin/negocios', label: 'Negocios aprobados', icon: 'grid' },
    { href: '/admin/pqrs', label: 'PQRS', icon: 'inbox' },
  ],
};

export const isMerchant = (role: Role) => role === 'emprendedor' || role === 'admin';
/** Quién puede comprar, reservar y guardar favoritos (el administrador no). */
export const canBuyRole = (role: Role) => role === 'cliente' || role === 'emprendedor';

/** Nombres cortos para el menú inferior del celular. */
const shortLabels: Record<string, string> = {
  'Registrar emprendimiento': 'Registrar',
  'Registra tu emprendimiento': 'Registrar',
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
  // El administrador no compra: su otra vista es la de emprendedor (sus negocios).
  return role === 'admin'
    ? ['admin', 'negocio']
    : role === 'emprendedor'
      ? ['negocio']
      : ['comprar'];
}
export const defaultMode = (role: Role): Mode => modesFor(role)[0];
export const modeNames: Record<Mode, string> = {
  comprar: 'Cliente',
  negocio: 'Emprendedor',
  admin: 'Administrador',
};

// «Mi cuenta» no va en estos menús: el perfil se administra desde el menú de la cuenta, arriba a
// la derecha (src/layouts/default.vue).
const buscarCorto: NavItem = { href: '/buscar', label: 'Buscar', icon: 'search' };

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
      mobile: shorten([...admin.items, buscarCorto].slice(0, 4)),
    };
  if (current === 'negocio') {
    const section = negocio(kind);
    return {
      // El administrador como emprendedor no compra: solo explora.
      sections: [section, viewer?.role === 'admin' ? explorar : explorarYComprar],
      // Cuatro accesos del negocio; si hay menos, se completa con Buscar.
      mobile: shorten([...section.items, buscarCorto].slice(0, 4)),
    };
  }
  return {
    sections: [viewer ? principalCliente : principal],
    mobile: [
      buscarCorto,
      { href: '/mapa', label: 'Mapa', icon: 'map' },
      { href: '/pedidos', label: 'Compras', icon: 'cart' },
      { href: '/solicitudes', label: 'Reservas', icon: 'calendar' },
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
/** A dónde lleva el cambio de vista (menú de la cuenta del administrador). */
export function modeStart(mode: Mode, kind: StoreKind = 'none'): string {
  if (mode === 'admin') return '/admin';
  if (mode === 'negocio') return kind === 'none' ? '/panel' : '/panel/negocios';
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
