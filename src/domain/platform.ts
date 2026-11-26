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
