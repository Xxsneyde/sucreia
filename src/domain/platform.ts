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
  | 'refunded';
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
