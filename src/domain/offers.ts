// Descuentos del negocio: uno para todo el negocio, uno propio por producto y cupones con código.
// Lo usan el panel «Promociones y reseñas», la página del negocio, el carrito y el servidor, que
// es quien calcula el precio final. No se acumulan: a cada producto se le aplica el mayor entre el
// del negocio y el suyo, y en el pedido gana el cupón solo si descuenta más.

/** Porcentaje máximo de un descuento o cupón. */
export const MAX_PERCENT = 70;

/** Descuento para todo el negocio (se guarda en su configuración). */
export interface StoreDiscount {
  percent: number;
  /** Último día de vigencia (ISO, fin del día en Colombia) o null si no vence. */
  until: string | null;
  /** Versión anterior: un solo descuento para varios productos. Se lee como descuentos por producto. */
  products?: string[];
}
/** Descuento propio de un producto o servicio. */
export interface ProductDiscount {
  percent: number;
  until: string | null;
}
/** Descuentos por producto: id del producto → su descuento. */
export type ProductDiscounts = Record<string, ProductDiscount>;

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

/**
 * Separa el descuento de todo el negocio y los de cada producto. El formato anterior (un descuento
 * con lista de productos) se convierte en un descuento por cada uno de esos productos.
 */
export function splitOffers(
  store: StoreDiscount | null | undefined,
  products: ProductDiscounts | null | undefined,
): { store: StoreDiscount | null; products: ProductDiscounts } {
  const own: ProductDiscounts = { ...(products ?? {}) };
  if (store?.products?.length) {
    for (const id of store.products) own[id] ??= { percent: store.percent, until: store.until };
    return { store: null, products: own };
  }
  return { store: store ?? null, products: own };
}

/** Solo los descuentos por producto vigentes (para mostrarlos al público). */
export function activeProductDiscounts(products: ProductDiscounts, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(products).filter(([, d]) => discountPercent(d, now) > 0),
  ) as ProductDiscounts;
}

/** Porcentaje vigente para un producto: el mayor entre el del negocio y el suyo propio. */
export function discountFor(
  store: StoreDiscount | null | undefined,
  products: ProductDiscounts | null | undefined,
  productId: string,
  now = Date.now(),
): number {
  const o = splitOffers(store, products);
  return Math.max(discountPercent(o.store, now), discountPercent(o.products[productId], now));
}

/** Mayor porcentaje vigente del negocio (para «hasta N %» en listados). */
export function bestPercent(
  store: StoreDiscount | null | undefined,
  products: ProductDiscounts | null | undefined,
  now = Date.now(),
): number {
  const o = splitOffers(store, products);
  return Math.max(
    discountPercent(o.store, now),
    0,
    ...Object.values(o.products).map((d) => discountPercent(d, now)),
  );
}

/**
 * Lo que descuenta el negocio en un pedido: cada línea con el porcentaje que le corresponde. El
 * texto dice si fue el descuento de todo el negocio o el de productos seleccionados.
 */
export function storeOffer(
  store: StoreDiscount | null | undefined,
  products: ProductDiscounts | null | undefined,
  lines: { productId: string; amount: number }[],
  now = Date.now(),
): { amount: number; percent: number; label: string } {
  const o = splitOffers(store, products);
  const storePct = discountPercent(o.store, now);
  const byPercent = new Map<number, number>();
  let own = false;
  for (const l of lines) {
    const pct = discountFor(o.store, o.products, l.productId, now);
    if (!pct) continue;
    if (pct > storePct) own = true;
    byPercent.set(pct, (byPercent.get(pct) ?? 0) + l.amount);
  }
  const amount = [...byPercent].reduce((n, [pct, base]) => n + discountAmount(base, pct), 0);
  if (!amount) return { amount: 0, percent: 0, label: '' };
  const percents = [...byPercent.keys()];
  const percent = Math.max(...percents);
  const label = !own
    ? `Descuento del negocio (${storePct} %)`
    : percents.length === 1
      ? `Descuento en productos seleccionados (${percent} %)`
      : 'Descuento en productos seleccionados';
  return { amount, percent, label };
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
