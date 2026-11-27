import type { BusinessMode, CartLine } from './types.ts';
import type { ChallengeProgress, SucreEvent } from './rewards.ts';
export type OperationStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'quoted'
  | 'accepted'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'no_show';
export const statusNames: Record<OperationStatus, string> = {
  pending: 'Recibido',
  preparing: 'En preparación',
  ready: 'Listo para entregar',
  dispatched: 'En camino',
  quoted: 'Cotización enviada',
  accepted: 'Aceptado / confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded: 'Devuelto',
  no_show: 'No asistió',
};
export interface Operation {
  id: string;
  storeId: string;
  storeName: string;
  clientId: string;
  clientName: string;
  ownerId: string;
  kind: BusinessMode;
  status: OperationStatus;
  lines: CartLine[];
  detail: string;
  slot: string;
  slotEnd: string;
  amount: number;
  subtotal: number;
  discount: number;
  fee: number;
  fulfillment: 'pickup' | 'delivery';
  address: string;
  phone: string;
  payment: 'pending' | 'confirmed' | 'refunded';
  paidAt: string;
  paymentMethod: 'cash' | 'transfer';
  paymentInstructions: string;
  courierId: string;
  courierName: string;
  courierPhone: string;
  courierAvatar: string;
  courierRating: number | null;
  etaMinutes: number;
  pin?: string;
  couponId: string;
  events: { status: OperationStatus; at: string; note: string; actorId?: string }[];
  createdAt: string;
  completedAt: string;
  pinAttempts: number;
  pinLockedUntil: number;
  /** Ubicación de entrega elegida en el mapa (domicilios). */
  addressLat?: number | null;
  addressLng?: number | null;
  /** Punto de recogida (copiado del negocio al crear el pedido). */
  storeAddress?: string;
  storeMunicipality?: string;
  storeLat?: number | null;
  storeLng?: number | null;
  /** Etapa del domiciliario: ir al negocio o ir al cliente. */
  courierStage?: '' | 'to_store' | 'to_client';
  readyAt?: string;
  claimedAt?: string;
  /** Avisos que se envían una sola vez. */
  unclaimedNotified?: boolean;
  reminded?: boolean;
  /** Cita: el cliente llegó al negocio. */
  arrivedAt?: string;
}
export interface StoreSettings {
  suspended: boolean;
  delivery: boolean;
  deliveryFee: number;
  paymentInstructions: string;
  opens: number;
  closes: number;
  duration: number;
  latitude: number | null;
  longitude: number | null;
  verification: 'none' | 'pending' | 'approved' | 'rejected';
  verificationNote: string;
  /** Horario por día (0 = domingo … 6 = sábado). Si falta, se usa opens/closes todos los días. */
  week?: DaySchedule[];
  /** Citas que se pueden atender a la misma hora (por ejemplo, dos barberos). */
  capacity?: number;
  /** Días u horas sin atención (vacaciones, almuerzo…). */
  blocks?: ScheduleBlock[];
}
export interface DaySchedule {
  closed: boolean;
  opens: number;
  closes: number;
}
export interface ScheduleBlock {
  id: string;
  /** AAAA-MM-DD */
  date: string;
  /** HH:MM; vacíos = todo el día. */
  from: string;
  to: string;
  note: string;
}
export const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** Horario de un día con el horario general como respaldo. */
export function daySchedule(s: StoreSettings, day: number): DaySchedule {
  return s.week?.[day] ?? { closed: false, opens: s.opens, closes: s.closes };
}
export const defaultSettings = (): StoreSettings => ({
  suspended: false,
  delivery: false,
  deliveryFee: 0,
  paymentInstructions: '',
  opens: 9,
  closes: 17,
  duration: 60,
  latitude: null,
  longitude: null,
  verification: 'none',
  verificationNote: '',
});
export interface Promotion {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  percent: number;
  cost: number;
  expires: string;
  active: boolean;
}
export interface Coupon extends Promotion {
  used: boolean;
}
export interface Courier {
  avatar: string;
  rating: number | null;
  id: string;
  name: string;
  phone: string;
  municipality: string;
  approved: boolean;
  vehicle?: string;
  /** Recibe pedidos de su zona (interruptor «Disponible»). */
  available?: boolean;
  lat?: number | null;
  lng?: number | null;
  locationAt?: string | null;
}
export interface Review {
  id: string;
  operationId: string;
  storeId: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}
export interface PlatformState {
  operations: Operation[];
  sales: Operation[];
  deliveries: Operation[];
  favorites: string[];
  points: number;
  ledger: { id: string; amount: number; note: string; at: string }[];
  promotions: Promotion[];
  coupons: Coupon[];
  notifications: { id: string; title: string; link: string; read: boolean; at: string }[];
  lessons: string[];
  couriers: Courier[];
  courier: Courier | null;
  /** Domiciliarios disponibles: pedidos a domicilio de su municipio que nadie ha tomado. */
  pool: Operation[];
  /** Código para invitar amigos y cuántos se registraron / completaron su primera compra. */
  referral: { code: string; invited: number; rewarded: number };
  challenges: ChallengeProgress[];
  events: SucreEvent[];
}
export interface CommerceStore {
  settings: StoreSettings;
  stock: Record<string, number>;
  views: Record<string, number>;
  reviews: Review[];
  reviewCount: number;
  completed365: number;
  rating: number | null;
  /** Promedio y número de valoraciones de cada producto. */
  productRatings?: Record<string, { rating: number; count: number }>;
}

export const verificationNames = {
  none: 'Sin solicitar',
  pending: 'En revisión',
  approved: 'Verificado',
  rejected: 'Requiere corrección',
} as const;

/** PQRS: tipos de solicitud, adjuntos permitidos y número de radicado visible. */
export const pqrsKinds = ['Petición', 'Queja', 'Reclamo', 'Sugerencia'] as const;
export type PqrsKind = (typeof pqrsKinds)[number];
export const pqrsFileMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const pqrsFileMaxBytes = 5 * 1024 * 1024;
export const radicado = (id: string): string => id.slice(0, 8).toUpperCase();
export type PqrsStatus = 'pending' | 'answered' | 'closed';
export const pqrsStatusNames: Record<PqrsStatus, string> = {
  pending: 'Pendiente',
  answered: 'Caso abierto',
  closed: 'Resuelto',
};
export interface PqrsFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** null = adjunto de la solicitud inicial. */
  messageId: string | null;
}
export interface PqrsMessage {
  id: string;
  fromAdmin: boolean;
  author: string;
  body: string;
  createdAt: string;
}
/** Caso de PQRS como lo devuelve la API (/plataforma/pqrs y /admin/pqrs). */
export interface PqrsCase {
  id: string;
  kind: PqrsKind;
  message: string;
  status: PqrsStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: PqrsMessage[];
  files: PqrsFile[];
  /** Solo en la vista de la administración. */
  user?: { id: string; name: string; email: string; role: string };
}

// --- Horario legible y orden del catálogo --------------------------------------------------

/** Días de lunes a domingo (índices de dayNames). */
export const weekOrder = [1, 2, 3, 4, 5, 6, 0];
/** 9 → «9:00 a. m.», 12 → «12:00 m.», 18 → «6:00 p. m.». */
export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return h === 12 ? '12:00 m.' : `${h % 12 || 12}:00 ${h < 12 ? 'a. m.' : 'p. m.'}`;
}
/** «Lunes a viernes, 8:00 a. m. a 6:00 p. m. · Sábado, 9:00 a. m. a 1:00 p. m.» */
export function weekSummary(week: (DaySchedule | null | undefined)[]): string {
  const key = (d: DaySchedule | null | undefined) =>
    !d || d.closed ? '' : `${d.opens}-${d.closes}`;
  const runs: { from: number; to: number; day: DaySchedule }[] = [];
  for (const i of weekOrder) {
    const day = week[i];
    if (!day || day.closed) continue;
    const last = runs.at(-1);
    const previous = weekOrder[weekOrder.indexOf(i) - 1];
    if (last && last.to === previous && key(week[last.from]) === key(day)) last.to = i;
    else runs.push({ from: i, to: i, day });
  }
  if (!runs.length) return '';
  return runs
    .map(({ from, to, day }) => {
      const days =
        from === 1 && to === 0
          ? 'Todos los días'
          : from === to
            ? dayNames[from]
            : `${dayNames[from]} ${weekOrder.indexOf(to) - weekOrder.indexOf(from) === 1 ? 'y' : 'a'} ${dayNames[to].toLocaleLowerCase('es')}`;
      return `${days}, ${hourLabel(day.opens)} a ${hourLabel(day.closes)}`;
    })
    .join(' · ');
}
/**
 * Productos con reseñas primero (mejor calificación y más reseñas); los demás conservan el
 * orden del catálogo.
 */
export function rankByRating<T extends { id: string }>(
  products: T[],
  stats: Record<string, { rating: number; count: number }> | undefined,
): T[] {
  const statOf = (p: T) => stats?.[p.id];
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const x = statOf(a.p),
        y = statOf(b.p);
      if (x && y) return y.rating - x.rating || y.count - x.count || a.i - b.i;
      if (x || y) return x ? -1 : 1;
      return a.i - b.i;
    })
    .map((e) => e.p);
}
