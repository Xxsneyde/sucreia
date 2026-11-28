// Descuento para todo el negocio y cupones con código (src/domain/offers.ts). El servidor calcula
// siempre el descuento: el precio que envía el navegador no cuenta.
import { randomUUID } from 'node:crypto';
import type { Db } from './db.ts';
import { HttpError } from './http.ts';
import { setSettings, settings } from './platform.ts';
import {
  couponState,
  discountAmount,
  discountPercent,
  splitOffers,
  storeOffer,
  endOfDay,
  MAX_PERCENT,
  normalizeCode,
  validCode,
  type StoreCoupon,
  type ProductDiscounts,
  type StoreDiscount,
} from '../src/domain/offers.ts';

const dateField = (value: unknown, label: string): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new HttpError(400, `Revisa ${label}.`);
  const iso = endOfDay(value);
  if (Number.isNaN(Date.parse(iso))) throw new HttpError(400, `Revisa ${label}.`);
  if (Date.parse(iso) < Date.now())
    throw new HttpError(
      400,
      `${label} ya pasó.`.replace(/^./, (c) => c.toUpperCase()),
    );
  return iso;
};
const percentField = (value: unknown, min: number) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > MAX_PERCENT)
    throw new HttpError(
      400,
      `El descuento debe ser un número entero entre ${Math.max(min, 1)} y ${MAX_PERCENT} %.`,
    );
  return n;
};

interface CouponRow {
  id: string;
  store_id: string;
  code: string;
  percent: number;
  expires: string | null;
  max_uses: number | null;
  uses: number;
  active: number;
  created_at: string;
}
const toCoupon = (r: CouponRow): StoreCoupon => ({
  id: String(r.id),
  storeId: String(r.store_id),
  code: String(r.code),
  percent: Number(r.percent),
  expires: r.expires ? String(r.expires) : null,
  maxUses: r.max_uses === null || r.max_uses === undefined ? null : Number(r.max_uses),
  uses: Number(r.uses),
  active: Number(r.active) === 1,
  createdAt: String(r.created_at),
});

export async function listCoupons(db: Db, storeId: string): Promise<StoreCoupon[]> {
  const rows = await db
    .prepare('SELECT * FROM store_coupons WHERE store_id=? ORDER BY created_at DESC LIMIT 200')
    .all<CouponRow>(storeId);
  return rows.map(toCoupon);
}

export async function createCoupon(db: Db, storeId: string, body: Record<string, unknown>) {
  const code = normalizeCode(typeof body.code === 'string' ? body.code : '');
  if (!validCode(code))
    throw new HttpError(
      400,
      'El código debe tener de 3 a 20 letras, números o guiones, sin espacios.',
    );
  const percent = percentField(body.percent, 1);
  const expires = dateField(body.expires, 'la fecha de vencimiento');
  let maxUses: number | null = null;
  if (body.maxUses !== null && body.maxUses !== undefined && body.maxUses !== '') {
    maxUses = Number(body.maxUses);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000)
      throw new HttpError(400, 'Los usos permitidos deben ser un número entre 1 y 100.000.');
  }
  if (
    await db.prepare('SELECT id FROM store_coupons WHERE store_id=? AND code=?').get(storeId, code)
  )
    throw new HttpError(409, `Ya tienes un cupón con el código ${code}.`);
  const coupon: StoreCoupon = {
    id: randomUUID(),
    storeId,
    code,
    percent,
    expires,
    maxUses,
    uses: 0,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await db
    .prepare(
      'INSERT INTO store_coupons (id,store_id,code,percent,expires,max_uses,uses,active,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    )
    .run(coupon.id, storeId, code, percent, expires, maxUses, 0, 1, coupon.createdAt);
  return coupon;
}

/** Activa o desactiva un cupón (los pedidos que ya lo usaron no cambian). */
export async function setCouponActive(db: Db, storeId: string, id: string, active: boolean) {
  const { changes } = await db
    .prepare('UPDATE store_coupons SET active=? WHERE id=? AND store_id=?')
    .run(active ? 1 : 0, id, storeId);
  if (!changes) throw new HttpError(404, 'No encontramos ese cupón.');
}

/** Descuento de todo el negocio y descuentos por producto guardados (formato actual). */
export async function storeOffers(db: Db, storeId: string) {
  const cfg = await settings(db, storeId);
  return splitOffers(cfg.storeDiscount, cfg.productDiscounts);
}
async function saveOffers(
  db: Db,
  storeId: string,
  offers: { store: StoreDiscount | null; products: ProductDiscounts },
) {
  await setSettings(db, storeId, {
    ...(await settings(db, storeId)),
    storeDiscount: offers.store,
    productDiscounts: offers.products,
  });
}

/** Guarda el descuento para todo el negocio; con 0 % lo quita. No toca los de cada producto. */
export async function setStoreDiscount(db: Db, storeId: string, body: Record<string, unknown>) {
  const percent = percentField(body.percent, 0);
  const discount: StoreDiscount | null = percent
    ? { percent, until: dateField(body.until, 'la fecha de fin') }
    : null;
  const offers = await storeOffers(db, storeId);
  await saveOffers(db, storeId, { ...offers, store: discount });
  return discount;
}

/**
 * Pone (o con 0 % quita) el descuento de los productos indicados. Los demás productos conservan
 * el suyo: elegir otro producto no le quita el descuento al anterior.
 */
export async function setProductDiscounts(
  db: Db,
  storeId: string,
  body: Record<string, unknown>,
  catalog: string[],
): Promise<ProductDiscounts> {
  if (!Array.isArray(body.products) || !body.products.length || body.products.length > 200)
    throw new HttpError(400, 'Elige al menos un producto para el descuento.');
  const ids = [...new Set(body.products.map(String))];
  if (ids.some((id) => !catalog.includes(id)))
    throw new HttpError(400, 'Uno de los productos ya no está en tu catálogo.');
  const percent = percentField(body.percent, 0);
  const until = percent ? dateField(body.until, 'la fecha de fin') : null;
  const offers = await storeOffers(db, storeId);
  // Se limpian los de productos que ya no están en el catálogo.
  const products: ProductDiscounts = Object.fromEntries(
    Object.entries(offers.products).filter(([id]) => catalog.includes(id)),
  );
  for (const id of ids)
    if (percent) products[id] = { percent, until };
    else delete products[id];
  await saveOffers(db, storeId, { store: offers.store, products });
  return products;
}

/** Cupón vigente con ese código, o error con el motivo. */
export async function findCoupon(db: Db, storeId: string, rawCode: string): Promise<StoreCoupon> {
  const code = normalizeCode(rawCode);
  const row = validCode(code)
    ? await db
        .prepare('SELECT * FROM store_coupons WHERE store_id=? AND code=?')
        .get<CouponRow>(storeId, code)
    : undefined;
  if (!row) throw new HttpError(404, 'Ese cupón no existe en este negocio. Revisa el código.');
  const coupon = toCoupon(row);
  const state = couponState(coupon);
  if (state === 'expired') throw new HttpError(409, 'Ese cupón ya venció.');
  if (state === 'exhausted') throw new HttpError(409, 'Ese cupón ya alcanzó su límite de usos.');
  if (state === 'inactive') throw new HttpError(409, 'Ese cupón ya no está disponible.');
  return coupon;
}

export interface AppliedOffer {
  percent: number;
  amount: number;
  /** «Cupón BIENVENIDA (10 %)» o «Descuento del negocio (15 %)»; vacío si no hay. */
  label: string;
  code: string;
  couponId: string;
}

/**
 * Mejor descuento para un pedido: el del negocio (el de todo el negocio o el propio de cada
 * producto, el mayor) o el del cupón, que vale para todo el pedido. No se acumulan: se aplica el que descuente más. Si el
 * cupón gana, se cuenta su uso; si alcanzó el límite entre tanto, se rechaza.
 */
export async function applyOffers(
  db: Db,
  storeId: string,
  lines: { productId: string; amount: number }[],
  rawCode?: unknown,
): Promise<AppliedOffer> {
  const subtotal = lines.reduce((n, l) => n + l.amount, 0);
  const offers = await storeOffers(db, storeId);
  const fromStore = storeOffer(offers.store, offers.products, lines);
  const storeAmount = fromStore.amount;
  const code = typeof rawCode === 'string' ? rawCode.trim() : '';
  const coupon = code ? await findCoupon(db, storeId, code) : null;
  if (coupon && discountAmount(subtotal, coupon.percent) > storeAmount) {
    const { changes } = await db
      .prepare(
        'UPDATE store_coupons SET uses=uses+1 WHERE id=? AND active=1 AND (max_uses IS NULL OR uses < max_uses)',
      )
      .run(coupon.id);
    if (!changes) throw new HttpError(409, 'Ese cupón ya alcanzó su límite de usos.');
    return {
      percent: coupon.percent,
      amount: discountAmount(subtotal, coupon.percent),
      label: `Cupón ${coupon.code} (${coupon.percent} %)`,
      code: coupon.code,
      couponId: coupon.id,
    };
  }
  return storeAmount > 0
    ? {
        percent: fromStore.percent,
        amount: storeAmount,
        label: fromStore.label,
        code: '',
        couponId: '',
      }
    : { percent: 0, amount: 0, label: '', code: '', couponId: '' };
}
