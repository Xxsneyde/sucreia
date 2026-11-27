import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { Db } from './db.ts';
import type { User } from './auth.ts';
import { HttpError } from './http.ts';
import { getStore, listPublishedStores, listStoresByOwner } from './stores.ts';
import {
  daySchedule,
  defaultSettings,
  statusNames,
  type Operation,
  type OperationStatus,
  type StoreSettings,
  type Promotion,
  type Coupon,
  type Courier,
  type Review,
  type PlatformState,
  type CommerceStore,
} from '../src/domain/platform.ts';
import { lessons } from '../src/features/community/lessons.ts';
import {
  afterCompleted,
  challengeProgress,
  checkChallenges,
  listEvents,
  referralCode,
  referralStats,
} from './rewards.ts';
import { applyOffers } from './offers.ts';
import { discountPercent } from '../src/domain/offers.ts';
const now = () => new Date().toISOString();
/** Transacción exclusiva: dentro de `fn` usa siempre `tx`. */
export function transaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
export function integer(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw new HttpError(400, `Revisa ${label}.`);
  return value;
}
export function string(value: unknown, max: number, label: string, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new HttpError(400, `Revisa ${label}.`);
  return value.trim();
}
export async function owned(db: Db, actor: User, storeId: string) {
  const store = await getStore(db, storeId);
  if (!store || store.ownerId !== actor.id) throw new HttpError(404, 'No encontramos tu negocio.');
  return store;
}
const parse = <T>(rows: { payload?: unknown }[]) =>
  rows.map((r) => JSON.parse(r.payload as string) as T);
export async function settings(db: Db, storeId: string): Promise<StoreSettings> {
  const row = await db
    .prepare('SELECT payload FROM store_settings WHERE store_id = ?')
    .get(storeId);
  return row ? { ...defaultSettings(), ...JSON.parse(row.payload as string) } : defaultSettings();
}
/** Configuración de varias tiendas en una consulta (listado público). */
export async function settingsMany(db: Db, ids: string[]) {
  const map = new Map<string, StoreSettings>();
  if (!ids.length) return map;
  const rows = await db
    .prepare(
      `SELECT store_id, payload FROM store_settings WHERE store_id IN (${ids.map(() => '?').join(',')})`,
    )
    .all(...ids);
  for (const r of rows)
    map.set(r.store_id as string, { ...defaultSettings(), ...JSON.parse(r.payload as string) });
  return map;
}
export async function setSettings(db: Db, storeId: string, data: StoreSettings) {
  await db
    .prepare(
      'INSERT INTO store_settings VALUES (?, ?) ON CONFLICT(store_id) DO UPDATE SET payload=excluded.payload',
    )
    .run(storeId, JSON.stringify(data));
}
export async function notify(db: Db, userId: string, title: string, link: string) {
  await db
    .prepare('INSERT INTO notifications (id,user_id,title,link,created_at) VALUES (?,?,?,?,?)')
    .run(randomUUID(), userId, title, link, now());
}
export async function balance(db: Db, userId: string) {
  return (
    (
      await db
        .prepare('SELECT COALESCE(SUM(amount),0) AS n FROM points_ledger WHERE user_id=?')
        .get<{ n: number }>(userId)
    )?.n ?? 0
  );
}
async function points(db: Db, userId: string, id: string, amount: number, note: string) {
  await db
    .prepare('INSERT OR IGNORE INTO points_ledger VALUES (?,?,?,?,?)')
    .run(id, userId, amount, note, now());
}
export async function operation(db: Db, id: string): Promise<Operation> {
  const row = await db.prepare('SELECT payload FROM operations WHERE id=?').get(id);
  if (!row) throw new HttpError(404, 'Operación no encontrada.');
  return JSON.parse(row.payload as string);
}
async function saveOperation(db: Db, op: Operation) {
  await db
    .prepare('UPDATE operations SET status=?,payload=? WHERE id=?')
    .run(op.status, JSON.stringify(op), op.id);
}
export function serialize(op: Operation, userId: string) {
  const copy = structuredClone(op);
  if (op.clientId !== userId) delete copy.pin;
  copy.pinAttempts = 0;
  copy.pinLockedUntil = 0;
  return copy;
}
export async function couriers(db: Db): Promise<Courier[]> {
  return (
    await db
      .prepare(
        `SELECT c.user_id AS id,u.name,c.phone,c.municipality,c.approved,c.avatar,c.vehicle,c.available,c.lat,c.lng,c.location_at AS locationAt,(SELECT AVG(r.courier_rating) FROM reviews r JOIN operations o ON o.id=r.operation_id WHERE json_extract(o.payload,'$.courierId')=c.user_id) AS rating FROM couriers c JOIN users u ON u.id=c.user_id`,
      )
      .all()
  ).map((r) => ({
    ...r,
    approved: !!r.approved,
    available: !!r.available,
  })) as unknown as Courier[];
}
export async function state(db: Db, user: User): Promise<PlatformState> {
  // Primero los avisos pendientes (recordatorios, pedidos sin tomar): así llegan en esta misma
  // consulta de notificaciones.
  const [opsFirst, salesFirst] = await Promise.all([
    db
      .prepare('SELECT payload FROM operations WHERE client_id=? ORDER BY rowid DESC')
      .all(user.id)
      .then(parse<Operation>),
    db
      .prepare(
        'SELECT o.payload FROM operations o JOIN stores s ON s.id=o.store_id WHERE s.owner_id=? ORDER BY o.rowid DESC',
      )
      .all(user.id)
      .then(parse<Operation>),
  ]);
  await lazyNotices(db, opsFirst, salesFirst);
  const [
    ops,
    sales,
    delivery,
    activePromos,
    allCouriers,
    favorites,
    pts,
    ledger,
    coupons,
    notes,
    learned,
    code,
    stats,
    challenges,
    events,
  ] = await Promise.all([
    Promise.resolve(opsFirst),
    Promise.resolve(salesFirst),
    db
      .prepare(
        "SELECT payload FROM operations WHERE json_extract(payload,'$.courierId')=? AND status IN ('preparing','ready','dispatched','completed','refunded')",
      )
      .all(user.id)
      .then((rows) => parse<Operation>(rows).filter((o) => o.courierId === user.id)),
    db
      .prepare(
        'SELECT p.payload FROM promotions p JOIN stores s ON s.id=p.store_id WHERE s.published_version_id IS NOT NULL OR s.owner_id=?',
      )
      .all(user.id)
      .then(parse<Promotion>),
    couriers(db),
    db.prepare('SELECT store_id FROM favorites WHERE user_id=?').all(user.id),
    balance(db, user.id),
    db
      .prepare(
        'SELECT id,amount,note,created_at AS at FROM points_ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 100',
      )
      .all<PlatformState['ledger'][number]>(user.id),
    db.prepare('SELECT payload,used FROM coupons WHERE user_id=?').all(user.id),
    db
      .prepare(
        'SELECT id,title,link,is_read AS read,created_at AS at FROM notifications WHERE user_id=? ORDER BY rowid DESC LIMIT 100',
      )
      .all(user.id),
    db.prepare('SELECT lesson_id FROM learning WHERE user_id=?').all(user.id),
    referralCode(db, user.id),
    referralStats(db, user.id),
    challengeProgress(db, user.id),
    listEvents(db, user.id),
  ]);
  const me = allCouriers.find((c) => c.id === user.id);
  // Bolsa de logística: pedidos a domicilio de su municipio que nadie ha tomado. Sin datos
  // personales del cliente hasta que el domiciliario acepta (como en las apps de transporte).
  const pool =
    me?.approved && me.available
      ? parse<Operation>(
          await db
            .prepare(
              "SELECT payload FROM operations WHERE kind='products' AND status IN ('preparing','ready') ORDER BY rowid",
            )
            .all(),
        )
          .filter(
            (o) =>
              o.fulfillment === 'delivery' &&
              !o.courierId &&
              o.clientId !== user.id &&
              o.ownerId !== user.id &&
              (o.storeMunicipality ?? '') === me.municipality,
          )
          .map((o) => ({
            ...serialize(o, user.id),
            clientName: o.clientName.split(' ')[0],
            phone: '',
            address: '',
            addressLat: null,
            addressLng: null,
            paymentInstructions: '',
          }))
      : [];
  return {
    pool,
    operations: ops.map((o) => serialize(o, user.id)),
    sales: sales.map((o) => serialize(o, user.id)),
    deliveries: delivery.map((o) => serialize(o, user.id)),
    favorites: favorites.map((r) => r.store_id as string),
    points: pts,
    ledger,
    promotions: activePromos.filter((p) => p.active && p.expires > now()),
    coupons: coupons.map((r) => ({ ...JSON.parse(r.payload as string), used: !!r.used }) as Coupon),
    notifications: notes.map((r) => ({
      ...r,
      read: !!r.read,
    })) as unknown as PlatformState['notifications'],
    lessons: learned.map((r) => r.lesson_id as string),
    couriers:
      user.role === 'emprendedor' || user.role === 'admin'
        ? allCouriers.filter((c) => c.approved)
        : [],
    courier: allCouriers.find((c) => c.id === user.id) ?? null,
    referral: { code, ...stats },
    challenges,
    events,
  };
}
/**
 * Avisos que no necesitan un reloj del servidor (Vercel no tiene tareas programadas gratis):
 * se revisan cuando la persona abre la plataforma y se envían una sola vez.
 */
async function lazyNotices(db: Db, ops: Operation[], sales: Operation[]) {
  const nowMs = Date.now();
  for (const o of ops)
    if (
      o.kind === 'booking' &&
      o.status === 'accepted' &&
      !o.reminded &&
      Date.parse(o.slot) > nowMs &&
      Date.parse(o.slot) - nowMs < 24 * 3600_000
    ) {
      o.reminded = true;
      await saveOperation(db, o);
      const hour = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(o.slot));
      await notify(
        db,
        o.clientId,
        `Recordatorio: tu cita en ${o.storeName} es el ${hour}`,
        '/solicitudes',
      );
    }
  for (const o of sales)
    if (
      o.kind === 'products' &&
      o.fulfillment === 'delivery' &&
      o.status === 'ready' &&
      !o.courierId &&
      !o.unclaimedNotified &&
      o.readyAt &&
      nowMs - Date.parse(o.readyAt) > 15 * 60_000
    ) {
      o.unclaimedNotified = true;
      await saveOperation(db, o);
      await notify(
        db,
        o.ownerId,
        `Ningún domiciliario ha tomado el pedido de ${o.clientName}. Puedes entregarlo tú.`,
        '/panel',
      );
    }
}

/** Rastreo de una entrega: solo para el cliente, el negocio y el domiciliario del pedido. */
export async function tracking(db: Db, actor: User, id: string) {
  const op = await operation(db, id);
  if (![op.clientId, op.ownerId, op.courierId].includes(actor.id))
    throw new HttpError(404, 'Operación no encontrada.');
  const courier = op.courierId
    ? (await couriers(db)).find((c) => c.id === op.courierId)
    : undefined;
  const live =
    courier && courier.lat != null && courier.lng != null && op.status === 'dispatched'
      ? { lat: courier.lat, lng: courier.lng, at: courier.locationAt ?? '' }
      : null;
  return {
    status: op.status,
    stage: op.courierStage ?? '',
    courierName: op.courierName,
    store: {
      name: op.storeName,
      address: op.storeAddress ?? '',
      municipality: op.storeMunicipality ?? '',
      lat: op.storeLat ?? null,
      lng: op.storeLng ?? null,
    },
    client: { address: op.address, lat: op.addressLat ?? null, lng: op.addressLng ?? null },
    courier: live,
    etaMinutes: op.etaMinutes,
  };
}

/** Domiciliario: interruptor «Disponible» y última ubicación (cada pocos segundos en entrega). */
export async function setAvailability(db: Db, actor: User, available: boolean) {
  const result = await db
    .prepare('UPDATE couriers SET available=? WHERE user_id=? AND approved=1')
    .run(available ? 1 : 0, actor.id);
  if (!result.changes) throw new HttpError(403, 'Tu perfil de domiciliario aún no está aprobado.');
}
export async function setLocation(db: Db, actor: User, lat: unknown, lng: unknown) {
  const la = Number(lat),
    ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180)
    throw new HttpError(400, 'Ubicación no válida.');
  const result = await db
    .prepare('UPDATE couriers SET lat=?, lng=?, location_at=? WHERE user_id=? AND approved=1')
    .run(la, ln, now(), actor.id);
  if (!result.changes) throw new HttpError(403, 'Tu perfil de domiciliario aún no está aprobado.');
}

export async function commerceStore(db: Db, storeId: string): Promise<CommerceStore> {
  const [reviews, completed, reviewStats, cfg, stock, views, productStats] = await Promise.all([
    db
      .prepare(
        'SELECT r.id,r.operation_id AS operationId,r.store_id AS storeId,u.name,r.rating,r.comment,r.created_at AS createdAt FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id=? ORDER BY r.rowid DESC LIMIT 100',
      )
      .all<Review>(storeId),
    db
      .prepare("SELECT payload FROM operations WHERE store_id=? AND status='completed'")
      .all(storeId)
      .then(parse<Operation>),
    db
      .prepare('SELECT COUNT(*) AS n,AVG(rating) AS rating FROM reviews WHERE store_id=?')
      .get<{ n: number; rating: number | null }>(storeId),
    settings(db, storeId),
    db.prepare('SELECT product_id,quantity FROM inventory WHERE store_id=?').all(storeId),
    db.prepare('SELECT product_id,count FROM store_views WHERE store_id=?').all(storeId),
    db
      .prepare(
        'SELECT product_id, COUNT(*) AS n, AVG(rating) AS rating FROM product_reviews WHERE store_id=? GROUP BY product_id',
      )
      .all(storeId),
  ]);
  return {
    reviewCount: reviewStats?.n ?? 0,
    settings: cfg,
    stock: Object.fromEntries(stock.map((r) => [r.product_id, r.quantity as number])),
    views: Object.fromEntries(views.map((r) => [r.product_id, r.count as number])),
    // Valoración de cada producto (de quienes lo compraron o contrataron), con un decimal.
    productRatings: Object.fromEntries(
      productStats.map((r) => [
        String(r.product_id),
        { rating: Math.round(Number(r.rating) * 10) / 10, count: Number(r.n) },
      ]),
    ),
    reviews,
    discount: discountPercent(cfg.storeDiscount) ? (cfg.storeDiscount ?? null) : null,
    completed365: completed.filter((o) => Date.parse(o.completedAt) > Date.now() - 365 * 86400000)
      .length,
    rating: reviewStats?.rating ?? null,
  };
}
/** Resumen público de muchas tiendas (listado): pocas consultas en total, no por tienda. */
export async function storeSummaries(db: Db, ids: string[]) {
  const result = new Map<
    string,
    {
      lat: number | null;
      lng: number | null;
      /** Mayor descuento vigente del negocio (0 si no tiene promociones activas). */
      discount: number;
      verified: boolean;
      completed365: number;
      rating: number;
      reviewCount: number;
    }
  >();
  if (!ids.length) return result;
  const marks = ids.map(() => '?').join(',');
  const since = new Date(Date.now() - 365 * 86400000).toISOString();
  const [cfgs, stats, done, promos] = await Promise.all([
    settingsMany(db, ids),
    db
      .prepare(
        `SELECT store_id, COUNT(*) AS n, AVG(rating) AS rating FROM reviews WHERE store_id IN (${marks}) GROUP BY store_id`,
      )
      .all(...ids),
    db
      .prepare(
        `SELECT store_id, COUNT(*) AS n FROM operations WHERE status='completed' AND store_id IN (${marks}) AND json_extract(payload,'$.completedAt') > ? GROUP BY store_id`,
      )
      .all(...ids, since),
    db.prepare(`SELECT store_id, payload FROM promotions WHERE store_id IN (${marks})`).all(...ids),
  ]);
  for (const id of ids) {
    const st = stats.find((r) => r.store_id === id);
    const cfg = cfgs.get(id) ?? defaultSettings();
    const discount = Math.max(
      0,
      ...promos
        .filter((r) => r.store_id === id)
        .map((r) => JSON.parse(String(r.payload)) as Promotion)
        .filter((x) => x.active && Date.parse(x.expires) > Date.now())
        .map((x) => x.percent),
      discountPercent(cfg.storeDiscount),
    );
    result.set(id, {
      lat: cfg.latitude,
      lng: cfg.longitude,
      discount,
      verified: cfg.verification === 'approved',
      completed365: Number(done.find((r) => r.store_id === id)?.n ?? 0),
      rating: Number(st?.rating ?? 0),
      reviewCount: Number(st?.n ?? 0),
    });
  }
  return result;
}
/** Minutos desde medianoche de «HH:MM». */
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
/**
 * Horas libres de un día (hora de Colombia): horario de ese día de la semana, bloqueos, duración
 * del servicio y cupo de citas simultáneas.
 */
export async function slots(db: Db, storeId: string, date: string, productId?: string) {
  return (await slotAvailability(db, storeId, date, productId))
    .filter((s) => s.free > 0)
    .map((s) => s.slot);
}
/** Cada hora del día con sus cupos libres (también las llenas, para mostrarlas como agotadas). */
export async function slotAvailability(
  db: Db,
  storeId: string,
  date: string,
  productId?: string,
): Promise<{ slot: string; free: number; capacity: number }[]> {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + 'T12:00:00Z')) ||
    new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date
  )
    throw new HttpError(400, 'Selecciona una fecha válida.');
  const cfg = await settings(db, storeId),
    list: { slot: string; free: number; capacity: number }[] = [];
  const store = await getStore(db, storeId);
  const offer = store?.published?.design.products.find((p) => p.id === productId);
  const duration = offer?.duration ?? cfg.duration;
  const day = daySchedule(cfg, new Date(date + 'T12:00:00Z').getUTCDay());
  if (day.closed) return list;
  const capacity = Math.max(1, cfg.capacity ?? 1);
  const blocks = (cfg.blocks ?? []).filter((b) => b.date === date);
  if (blocks.some((b) => !b.from || !b.to)) return list;
  const busy = parse<Operation>(
    await db
      .prepare(
        "SELECT payload FROM operations WHERE store_id=? AND kind='booking' AND status IN ('pending','accepted')",
      )
      .all(storeId),
  );
  for (let min = day.opens * 60; min + duration <= day.closes * 60; min += Math.min(duration, 30)) {
    const slot = `${date}T${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00-05:00`,
      start = Date.parse(slot),
      end = start + duration * 60000;
    const overlapping = busy.filter(
      (o) =>
        start < Date.parse(o.slotEnd || new Date(Date.parse(o.slot) + 60 * 60000).toISOString()) &&
        end > Date.parse(o.slot),
    ).length;
    const blocked = blocks.some((b) => min < minutes(b.to) && min + duration > minutes(b.from));
    if (start > Date.now() && start < Date.now() + 90 * 86400000 && !blocked)
      list.push({ slot, free: Math.max(0, capacity - overlapping), capacity });
  }
  return list;
}

export interface CreateOperation {
  storeId: string;
  key: string;
  kind: 'products' | 'booking' | 'quote';
  items?: { productId: string; quantity: number }[];
  detail?: string;
  slot?: string;
  fulfillment?: 'pickup' | 'delivery';
  address?: string;
  phone: string;
  paymentMethod?: 'cash' | 'transfer';
  couponId?: string;
  /** Cupón con código del negocio (reservas). */
  code?: string;
  expectedSubtotal?: number;
  addressLat?: number | null;
  addressLng?: number | null;
}
export async function createOperation(
  db: Db,
  actor: User,
  data: CreateOperation,
): Promise<Operation> {
  if (!data || typeof data !== 'object')
    throw new HttpError(400, 'Revisa los datos de la solicitud.');
  const key = string(data.key, 80, 'el identificador de solicitud');
  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return transaction(db, async (db) => {
    const existing = await db
      .prepare('SELECT payload,request_hash FROM operations WHERE client_id=? AND idempotency=?')
      .get(actor.id, key);
    if (existing) {
      if (existing.request_hash !== hash)
        throw new HttpError(409, 'Esta solicitud ya se usó con otros datos.');
      return serialize(JSON.parse(existing.payload as string), actor.id);
    }
    const store = await getStore(db, string(data.storeId, 100, 'el negocio'));
    if (!store?.published) throw new HttpError(404, 'El negocio no está publicado.');
    if (store.ownerId === actor.id)
      throw new HttpError(400, 'No puedes comprar o contratar tu propio negocio.');
    const design = store.published.design,
      cfg = await settings(db, store.id);
    if (data.kind !== design.mode)
      throw new HttpError(400, 'La modalidad del negocio cambió. Revisa su página.');
    const phone = string(data.phone, 16, 'tu WhatsApp');
    if (!/^\+?[1-9]\d{9,14}$/.test(phone))
      throw new HttpError(400, 'Escribe un WhatsApp con código de país.');
    const op: Operation = {
      id: randomUUID(),
      storeId: store.id,
      storeName: design.name,
      clientId: actor.id,
      clientName: actor.name,
      ownerId: store.ownerId,
      kind: design.mode,
      status: 'pending',
      lines: [],
      detail: '',
      slot: '',
      slotEnd: '',
      amount: 0,
      subtotal: 0,
      discount: 0,
      fee: 0,
      fulfillment: 'pickup',
      address: '',
      phone,
      payment: 'pending',
      paidAt: '',
      paymentMethod: data.paymentMethod === 'transfer' ? 'transfer' : 'cash',
      paymentInstructions: cfg.paymentInstructions,
      storeAddress: design.address,
      storeMunicipality: design.municipality,
      storeLat: cfg.latitude,
      storeLng: cfg.longitude,
      courierStage: '',
      courierId: '',
      courierName: '',
      courierPhone: '',
      courierAvatar: '',
      courierRating: null,
      etaMinutes: 0,
      pin: String(randomInt(100000, 1000000)),
      couponId: '',
      events: [],
      createdAt: now(),
      completedAt: '',
      pinAttempts: 0,
      pinLockedUntil: 0,
    };
    if (op.paymentMethod === 'transfer' && !cfg.paymentInstructions)
      throw new HttpError(
        400,
        'Este negocio aún no ha configurado las instrucciones de transferencia.',
      );
    if (op.kind === 'products') {
      if (!Array.isArray(data.items) || !data.items.length || data.items.length > 60)
        throw new HttpError(400, 'Agrega productos al pedido.');
      const ids = new Set<string>();
      for (const item of data.items) {
        if (!item || typeof item !== 'object')
          throw new HttpError(400, 'Revisa los productos del carrito.');
        const product = design.products.find((p) => p.id === item.productId);
        if (!product || ids.has(product.id))
          throw new HttpError(400, 'Revisa los productos del carrito.');
        ids.add(product.id);
        const quantity = integer(item.quantity, 1, 99, 'la cantidad');
        const stock = await db
          .prepare('SELECT quantity FROM inventory WHERE store_id=? AND product_id=?')
          .get(store.id, product.id);
        if (stock && Number(stock.quantity) < quantity)
          throw new HttpError(409, `No hay suficientes unidades de ${product.name}.`);
        if (stock)
          await db
            .prepare('UPDATE inventory SET quantity=quantity-? WHERE store_id=? AND product_id=?')
            .run(quantity, store.id, product.id);
        op.lines.push({
          businessId: store.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
        });
      }
      op.subtotal = op.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
      if (data.expectedSubtotal !== undefined && data.expectedSubtotal !== op.subtotal)
        throw new HttpError(
          409,
          'El precio del catálogo cambió. Revisa los productos antes de confirmar.',
        );
      if (data.fulfillment === 'delivery') {
        if (!cfg.delivery) throw new HttpError(400, 'Este negocio no ofrece domicilio.');
        op.fulfillment = 'delivery';
        op.address = string(data.address, 300, 'la dirección');
        // Punto exacto elegido en el mapa (opcional): lo usa el domiciliario para llegar.
        if (data.addressLat !== undefined && data.addressLat !== null) {
          const lat = Number(data.addressLat),
            lng = Number(data.addressLng);
          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            Math.abs(lat) > 90 ||
            Math.abs(lng) > 180
          )
            throw new HttpError(400, 'Revisa la ubicación de entrega en el mapa.');
          op.addressLat = lat;
          op.addressLng = lng;
        }
        op.fee = cfg.deliveryFee;
      }
      if (data.couponId && (await balance(db, actor.id)) < 0)
        throw new HttpError(
          409,
          'Tu saldo de puntos fue ajustado por una devolución. Compénsalo antes de utilizar bonos.',
        );
      if (data.couponId) {
        const row = await db
          .prepare('SELECT payload,used FROM coupons WHERE id=? AND user_id=? AND store_id=?')
          .get(data.couponId, actor.id, store.id);
        if (!row || row.used)
          throw new HttpError(409, 'Ese bono no está disponible para este negocio.');
        const coupon = JSON.parse(row.payload as string) as Coupon;
        if (coupon.expires < now()) throw new HttpError(409, 'El bono venció.');
        op.discount = Math.floor((op.subtotal * coupon.percent) / 100);
        op.couponId = data.couponId;
        await db.prepare('UPDATE coupons SET used=1 WHERE id=?').run(op.couponId);
      }
    } else {
      op.detail = string(data.detail, 1500, 'el detalle de la solicitud');
      if (op.kind === 'booking') {
        const slot = string(data.slot, 40, 'el horario');
        const offer = design.products.find((p) => p.id === data.items?.[0]?.productId);
        if (!offer) throw new HttpError(400, 'Selecciona el servicio.');
        if (!(await slots(db, store.id, slot.slice(0, 10), offer.id)).includes(slot))
          throw new HttpError(409, 'Ese horario ya no está disponible.');
        op.slot = slot;
        op.slotEnd = new Date(
          Date.parse(slot) + (offer.duration ?? cfg.duration) * 60000,
        ).toISOString();
        op.subtotal = offer.price;
        op.detail = `${offer.name}: ${op.detail}`;
        // Descuento del negocio o cupón (el mayor; no se acumulan).
        const offerApplied = await applyOffers(db, store.id, op.subtotal, data.code);
        op.discount = offerApplied.amount;
        if (offerApplied.label) op.discountLabel = offerApplied.label;
      }
    }
    op.amount = op.subtotal - op.discount + op.fee;
    if (!Number.isSafeInteger(op.amount) || op.amount < 0 || op.amount > 100000000000)
      throw new HttpError(400, 'Revisa el importe de la operación.');
    op.events.push({ status: 'pending', at: now(), note: 'Solicitud recibida por el negocio.' });
    await db
      .prepare('INSERT INTO operations VALUES (?,?,?,?,?,?,?,?,?)')
      .run(
        op.id,
        op.storeId,
        op.clientId,
        op.kind,
        op.status,
        op.slot || null,
        key,
        hash,
        JSON.stringify(op),
      );
    await notify(
      db,
      store.ownerId,
      `Nueva ${op.kind === 'products' ? 'compra' : 'solicitud'} de ${actor.name}`,
      '/panel/pedidos',
    );
    await notify(db, actor.id, `Tu solicitud a ${op.storeName} fue recibida`, '/pedidos');
    return serialize(op, actor.id);
  });
}
export async function actOperation(
  db: Db,
  actor: User,
  id: string,
  action: string,
  body: {
    amount?: number;
    courierId?: string;
    etaMinutes?: number;
    pin?: string;
    note?: string;
    returned?: boolean;
  } = {},
) {
  // Los intentos fallidos del PIN deben persistir incluso al rechazar la acción.
  const current = await operation(db, id);
  let completedClient = '';
  const owner = current.ownerId === actor.id,
    client = current.clientId === actor.id,
    courier = current.courierId === actor.id;
  // «claim»: un domiciliario de la zona toma un pedido que todavía no es suyo.
  if (!owner && !client && !courier && action !== 'claim')
    throw new HttpError(404, 'Operación no encontrada.');
  if (action === 'complete' && current.kind === 'products') {
    if (
      !(
        (owner && current.fulfillment === 'pickup') ||
        (courier && current.fulfillment === 'delivery')
      ) ||
      !(
        (current.status === 'ready' && current.fulfillment === 'pickup') ||
        (current.status === 'dispatched' && current.fulfillment === 'delivery')
      )
    )
      throw new HttpError(409, 'La entrega todavía no se puede confirmar.');
    if (current.pinLockedUntil > Date.now())
      throw new HttpError(429, 'Espera 15 minutos antes de volver a intentar el PIN.');
    if (body.pin !== current.pin) {
      current.pinAttempts++;
      if (current.pinAttempts % 5 === 0) current.pinLockedUntil = Date.now() + 15 * 60000;
      await saveOperation(db, current);
      throw new HttpError(400, 'PIN incorrecto. Pídele el código al cliente al entregar.');
    }
  }
  return transaction(db, async (db) => {
    const op = await operation(db, id);
    if (
      ['completed', 'cancelled', 'refunded', 'no_show'].includes(op.status) &&
      action !== 'refund'
    )
      throw new HttpError(409, 'La operación ya está cerrada.');
    let next: OperationStatus = op.status;
    let note = '';
    if (action === 'refund' && owner && op.payment === 'confirmed') {
      const reason = string(body.note, 500, 'el motivo de la devolución');
      if (
        op.kind === 'products' &&
        (!['completed', 'dispatched'].includes(op.status) || body.returned === true)
      )
        for (const line of op.lines)
          await db
            .prepare('UPDATE inventory SET quantity=quantity+? WHERE store_id=? AND product_id=?')
            .run(line.quantity, op.storeId, line.productId);
      const earned = await db
        .prepare('SELECT amount FROM points_ledger WHERE id=?')
        .get(`earn:${op.id}`);
      if (earned)
        await points(
          db,
          op.clientId,
          `refund:${op.id}`,
          -Number(earned.amount),
          `Ajuste por devolución en ${op.storeName}`,
        );
      if (op.couponId) await db.prepare('UPDATE coupons SET used=0 WHERE id=?').run(op.couponId);
      op.payment = 'refunded';
      next = 'refunded';
      op.events.push({
        status: 'refunded',
        at: now(),
        note: `Devolución registrada por el negocio: ${reason}. El dinero se devuelve por fuera de SucreIA.`,
      });
    } else if (action === 'cancel') {
      if (
        !(
          (owner && op.status !== 'dispatched') ||
          (client && ['pending', 'quoted'].includes(op.status))
        ) ||
        op.payment === 'confirmed'
      )
        throw new HttpError(
          409,
          'No se puede cancelar en este estado. Un pago confirmado requiere resolverlo con el negocio.',
        );
      next = 'cancelled';
      for (const line of op.lines)
        await db
          .prepare('UPDATE inventory SET quantity=quantity+? WHERE store_id=? AND product_id=?')
          .run(line.quantity, op.storeId, line.productId);
      if (op.couponId) await db.prepare('UPDATE coupons SET used=0 WHERE id=?').run(op.couponId);
    } else if (
      action === 'payment' &&
      (owner || (courier && op.paymentMethod === 'cash' && op.status === 'dispatched')) &&
      op.payment === 'pending'
    ) {
      if (op.kind === 'quote' && op.status !== 'accepted')
        throw new HttpError(409, 'El cliente debe aceptar la cotización antes del pago.');
      op.payment = 'confirmed';
      op.paidAt = now();
    } else if (action === 'prepare' && owner && op.kind === 'products' && op.status === 'pending')
      next = 'preparing';
    else if (action === 'ready' && owner && op.kind === 'products' && op.status === 'preparing') {
      next = 'ready';
      op.readyAt = now();
    } else if (action === 'claim') {
      const me = (await couriers(db)).find((c) => c.id === actor.id);
      if (!me?.approved)
        throw new HttpError(403, 'Tu perfil de domiciliario aún no está aprobado.');
      if (!me.available) throw new HttpError(409, 'Activa «Disponible» para tomar pedidos.');
      if (
        op.kind !== 'products' ||
        op.fulfillment !== 'delivery' ||
        !['preparing', 'ready'].includes(op.status) ||
        op.courierId
      )
        throw new HttpError(409, 'Otro domiciliario ya tomó este pedido o ya no está disponible.');
      if (owner || client) throw new HttpError(400, 'No puedes repartir tu propio pedido.');
      if ((op.storeMunicipality ?? me.municipality) !== me.municipality)
        throw new HttpError(403, 'Este pedido es de otra zona.');
      op.courierId = me.id;
      op.courierName = me.name;
      op.courierPhone = me.phone;
      op.courierAvatar = me.avatar;
      op.courierRating = me.rating;
      op.courierStage = 'to_store';
      op.claimedAt = now();
      note = `${me.name} tomó el pedido y va hacia el negocio.`;
      await notify(db, op.ownerId, `${me.name} recogerá el pedido de ${op.clientName}`, '/panel');
      await notify(db, op.clientId, `${me.name} llevará tu pedido de ${op.storeName}`, '/pedidos');
    } else if (action === 'release' && courier && !owner && op.courierStage === 'to_store') {
      op.courierId = op.courierName = op.courierPhone = op.courierAvatar = '';
      op.courierRating = null;
      op.courierStage = '';
      note = 'El domiciliario liberó el pedido; vuelve a estar disponible en la zona.';
      await notify(
        db,
        op.ownerId,
        `Pedido de ${op.clientName}: el domiciliario lo liberó`,
        '/panel',
      );
    } else if (
      action === 'pickup' &&
      courier &&
      op.status === 'ready' &&
      op.courierStage === 'to_store'
    ) {
      next = 'dispatched';
      op.courierStage = 'to_client';
      op.etaMinutes =
        body.etaMinutes === undefined
          ? 20
          : integer(body.etaMinutes, 1, 240, 'los minutos estimados');
      note = `${op.courierName} recogió el pedido y va hacia el cliente.`;
    } else if (action === 'arrive' && owner && op.kind === 'booking' && op.status === 'accepted') {
      op.arrivedAt = now();
      note = 'El cliente llegó a su cita.';
    } else if (
      action === 'noshow' &&
      owner &&
      op.kind === 'booking' &&
      op.status === 'accepted' &&
      op.payment !== 'confirmed' &&
      Date.parse(op.slot) <= Date.now()
    )
      next = 'no_show';
    else if (action === 'confirm' && owner && op.kind === 'booking' && op.status === 'pending')
      next = 'accepted';
    else if (
      action === 'quote' &&
      owner &&
      op.kind === 'quote' &&
      ['pending', 'quoted'].includes(op.status)
    ) {
      op.amount = op.subtotal = integer(body.amount, 1, 1000000000, 'el precio de la cotización');
      next = 'quoted';
    } else if (action === 'accept' && client && op.kind === 'quote' && op.status === 'quoted')
      next = 'accepted';
    else if (
      action === 'dispatch' &&
      owner &&
      op.kind === 'products' &&
      op.status === 'ready' &&
      op.fulfillment === 'delivery'
    ) {
      if (op.courierId) throw new HttpError(409, 'Un domiciliario ya tomó este pedido.');
      op.etaMinutes = integer(body.etaMinutes ?? 30, 1, 240, 'los minutos estimados');
      next = 'dispatched';
      op.courierStage = 'to_client';
      if (body.courierId) {
        const assigned = (await couriers(db)).find((c) => c.approved && c.id === body.courierId);
        if (!assigned) throw new HttpError(400, 'Selecciona un domiciliario aprobado.');
        op.courierId = assigned.id;
        op.courierName = assigned.name;
        op.courierPhone = assigned.phone;
        op.courierAvatar = assigned.avatar;
        op.courierRating = assigned.rating;
        await notify(db, assigned.id, `Entrega asignada: ${op.storeName}`, '/domiciliario');
      } else {
        // Entrega propia: el negocio lleva el pedido y confirma con el PIN del cliente.
        op.courierId = actor.id;
        op.courierName = `${op.storeName} (entrega propia)`;
        op.courierPhone = '';
        op.courierAvatar = '';
        op.courierRating = null;
        note = 'El negocio salió a entregar el pedido.';
      }
    } else if (
      action === 'complete' &&
      op.payment === 'confirmed' &&
      (op.kind === 'products' ||
        (owner && op.status === 'accepted' && (!op.slot || Date.parse(op.slot) <= Date.now())))
    ) {
      next = 'completed';
      op.completedAt = now();
      await points(
        db,
        op.clientId,
        `earn:${op.id}`,
        Math.floor((op.amount - op.fee) / 1000),
        `Compra o servicio completado en ${op.storeName}`,
      );
      completedClient = op.clientId;
    } else throw new HttpError(409, 'Esta acción no está permitida en el estado actual.');
    op.status = next;
    op.events.push({
      status: next,
      at: now(),
      actorId: actor.id,
      note:
        action === 'payment'
          ? courier
            ? 'Pago confirmado en efectivo por el domiciliario.'
            : 'Pago confirmado manualmente por el negocio.'
          : note || `Estado actualizado: ${statusNames[next]}.`,
    });
    await saveOperation(db, op);
    if (completedClient) await afterCompleted(db, completedClient);
    await notify(
      db,
      op.clientId,
      `${op.storeName}: ${action === 'payment' ? 'pago confirmado' : statusNames[next]}`,
      '/pedidos',
    );
    if (client)
      await notify(
        db,
        op.ownerId,
        `Respuesta de ${op.clientName}: ${statusNames[next]}`,
        '/panel/pedidos',
      );
    return serialize(op, actor.id);
  });
}
export async function redeem(db: Db, actor: User, id: string) {
  return transaction(db, async (db) => {
    const row = await db.prepare('SELECT payload FROM promotions WHERE id=?').get(id);
    if (!row) throw new HttpError(404, 'Promoción no encontrada.');
    const p = JSON.parse(row.payload as string) as Promotion;
    const store = await getStore(db, p.storeId);
    if (!p.active || p.expires < now() || !store?.published)
      throw new HttpError(409, 'Esta promoción ya no está activa.');
    if (store.ownerId === actor.id)
      throw new HttpError(400, 'No puedes canjear tu propia promoción.');
    if ((await balance(db, actor.id)) < p.cost)
      throw new HttpError(409, 'No tienes puntos suficientes.');
    const unused = (
      await db.prepare('SELECT payload FROM coupons WHERE user_id=? AND used=0').all(actor.id)
    ).some((r) => {
      const c = JSON.parse(r.payload as string) as Coupon;
      return c.expires > now() && c.storeId === p.storeId;
    });
    if (unused) throw new HttpError(409, 'Ya tienes un bono disponible de este negocio.');
    const coupon = { ...p, id: randomUUID(), used: false };
    await points(db, actor.id, `redeem:${coupon.id}`, -p.cost, `Bono: ${p.title}`);
    await db
      .prepare('INSERT INTO coupons VALUES (?,?,?,?,?)')
      .run(coupon.id, actor.id, p.storeId, 0, JSON.stringify(coupon));
    return coupon;
  });
}
export async function lessonAnswer(db: Db, actor: User, id: string, answer: number) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) throw new HttpError(404, 'Lección no encontrada.');
  if (answer !== lesson.correct)
    throw new HttpError(400, 'Revisa el contenido y vuelve a intentarlo.');
  await db.prepare('INSERT OR IGNORE INTO learning VALUES (?,?,?)').run(actor.id, id, now());
  await checkChallenges(db, actor.id);
}
