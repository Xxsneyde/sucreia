// Descuentos del negocio: un descuento para todo el negocio y cupones con código. Lo usan el
// panel «Promociones y reseñas», la página del negocio, el carrito y el servidor, que es quien
// calcula el precio final. Un descuento y un cupón no se acumulan: se aplica el mayor.

/** Porcentaje máximo de un descuento o cupón. */
export const MAX_PERCENT = 70;

/** Descuento para todo el negocio (se guarda en la configuración del negocio). */
export interface StoreDiscount {
  percent: number;
  /** Último día de vigencia (ISO, fin del día en Colombia) o null si no vence. */
  until: string | null;
}

/** Cupón con código que el cliente escribe en el carrito o al reservar. */
export interface StoreCoupon {
  id: string;
  storeId: string;
  code: string;
  percent: number;
  /** Vence al terminar ese día (ISO) o null si no vence. */
  expires: string | null;
  /** Usos permitidos en total (null = sin límite). */
  maxUses: number | null;
  uses: number;
  active: boolean;
  createdAt: string;
}

export type CouponState = 'active' | 'expired' | 'exhausted' | 'inactive';
export const couponStateNames: Record<CouponState, string> = {
  active: 'Activo',
  expired: 'Vencido',
  exhausted: 'Agotado',
  inactive: 'Desactivado',
};

/** Código en mayúsculas, sin espacios: así se guarda y se compara. */
export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');
/** 3 a 20 letras, números o guiones. */
export const validCode = (code: string) => /^[A-Z0-9-]{3,20}$/.test(code);

export function couponState(c: StoreCoupon, now = Date.now()): CouponState {
  if (!c.active) return 'inactive';
  if (c.expires && Date.parse(c.expires) < now) return 'expired';
  if (c.maxUses !== null && c.uses >= c.maxUses) return 'exhausted';
  return 'active';
}

/** Porcentaje vigente del descuento del negocio (0 si no tiene o ya venció). */
export function discountPercent(d: StoreDiscount | null | undefined, now = Date.now()): number {
  if (!d || d.percent <= 0) return 0;
  if (d.until && Date.parse(d.until) < now) return 0;
  return d.percent;
}

/** Precio con el descuento aplicado (redondeado al peso). */
export const discounted = (price: number, percent: number) =>
  percent > 0 ? Math.round((price * (100 - percent)) / 100) : price;

/** Valor descontado de un subtotal. */
export const discountAmount = (subtotal: number, percent: number) =>
  percent > 0 ? Math.floor((subtotal * percent) / 100) : 0;

/** Fin del día (hora de Colombia) de una fecha AAAA-MM-DD, en ISO. */
export const endOfDay = (date: string) => new Date(`${date}T23:59:59-05:00`).toISOString();
/** Fecha AAAA-MM-DD (en Colombia) de un ISO, para los campos de fecha. */
export const dateInput = (iso: string | null) =>
  iso ? new Date(Date.parse(iso) - 5 * 3_600_000).toISOString().slice(0, 10) : '';
