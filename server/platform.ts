import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { Db } from './db.ts';
import type { User } from './auth.ts';
import { HttpError } from './http.ts';
import { getStore, listPublishedStores, listStoresByOwner } from './stores.ts';
import {
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
const now = () => new Date().toISOString();
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
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
export function owned(db: Db, actor: User, storeId: string) {
  const store = getStore(db, storeId);
  if (!store || store.ownerId !== actor.id) throw new HttpError(404, 'No encontramos tu negocio.');
  return store;
}
export function settings(db: Db, storeId: string): StoreSettings {
  const row = db.prepare('SELECT payload FROM store_settings WHERE store_id = ?').get(storeId);
  return row ? { ...defaultSettings(), ...JSON.parse(row.payload as string) } : defaultSettings();
}
export function setSettings(db: Db, storeId: string, data: StoreSettings) {
  db.prepare(
    'INSERT INTO store_settings VALUES (?, ?) ON CONFLICT(store_id) DO UPDATE SET payload=excluded.payload',
  ).run(storeId, JSON.stringify(data));
}
export function notify(db: Db, userId: string, title: string, link: string) {
  db.prepare('INSERT INTO notifications (id,user_id,title,link,created_at) VALUES (?,?,?,?,?)').run(
    randomUUID(),
    userId,
    title,
    link,
    now(),
  );
}
export function balance(db: Db, userId: string) {
  return (
    db
      .prepare('SELECT COALESCE(SUM(amount),0) AS n FROM points_ledger WHERE user_id=?')
      .get(userId) as { n: number }
  ).n;
}
function points(db: Db, userId: string, id: string, amount: number, note: string) {
  db.prepare('INSERT OR IGNORE INTO points_ledger VALUES (?,?,?,?,?)').run(
    id,
    userId,
    amount,
    note,
    now(),
  );
}
export function operation(db: Db, id: string): Operation {
  const row = db.prepare('SELECT payload FROM operations WHERE id=?').get(id);
  if (!row) throw new HttpError(404, 'Operación no encontrada.');
  return JSON.parse(row.payload as string);
}
function saveOperation(db: Db, op: Operation) {
  db.prepare('UPDATE operations SET status=?,payload=? WHERE id=?').run(
    op.status,
    JSON.stringify(op),
    op.id,
  );
}
export function serialize(op: Operation, userId: string) {
  const copy = structuredClone(op);
  if (op.clientId !== userId) delete copy.pin;
  copy.pinAttempts = 0;
  copy.pinLockedUntil = 0;
  return copy;
}
export function couriers(db: Db): Courier[] {
  return db
    .prepare(
      `SELECT c.user_id AS id,u.name,c.phone,c.municipality,c.approved,c.avatar,(SELECT AVG(r.courier_rating) FROM reviews r JOIN operations o ON o.id=r.operation_id WHERE json_extract(o.payload,'$.courierId')=c.user_id) AS rating FROM couriers c JOIN users u ON u.id=c.user_id`,
    )
    .all()
    .map((r) => ({ ...r, approved: !!r.approved })) as unknown as Courier[];
}
function operations(db: Db, sql: string, id: string) {
  return db
    .prepare(sql)
    .all(id)
    .map((r) => JSON.parse(r.payload as string) as Operation);
}
export function state(db: Db, user: User): PlatformState {
  const ops = operations(
    db,
    'SELECT payload FROM operations WHERE client_id=? ORDER BY rowid DESC',
    user.id,
  );
  const sales = operations(
    db,
    'SELECT o.payload FROM operations o JOIN stores s ON s.id=o.store_id WHERE s.owner_id=? ORDER BY o.rowid DESC',
    user.id,
  );
  const delivery = db
    .prepare(
      "SELECT payload FROM operations WHERE json_extract(payload,'$.courierId')=? AND status IN ('dispatched','completed','refunded')",
    )
    .all(user.id)
    .map((r) => JSON.parse(r.payload as string) as Operation)
    .filter((o) => o.courierId === user.id);
  const activePromos = db
    .prepare(
      'SELECT p.payload FROM promotions p JOIN stores s ON s.id=p.store_id WHERE s.published_version_id IS NOT NULL OR s.owner_id=?',
    )
    .all(user.id)
    .map((r) => JSON.parse(r.payload as string) as Promotion);
  const allCouriers = couriers(db);
  return {
    operations: ops.map((o) => serialize(o, user.id)),
    sales: sales.map((o) => serialize(o, user.id)),
    deliveries: delivery.map((o) => serialize(o, user.id)),
    favorites: db
      .prepare('SELECT store_id FROM favorites WHERE user_id=?')
      .all(user.id)
      .map((r) => r.store_id as string),
    points: balance(db, user.id),
    ledger: db
      .prepare(
        'SELECT id,amount,note,created_at AS at FROM points_ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 100',
      )
      .all(user.id) as unknown as PlatformState['ledger'],
    promotions: activePromos.filter((p) => p.active && p.expires > now()),
    coupons: db
      .prepare('SELECT payload,used FROM coupons WHERE user_id=?')
      .all(user.id)
      .map((r) => ({ ...JSON.parse(r.payload as string), used: !!r.used }) as Coupon),
    notifications: db
      .prepare(
        'SELECT id,title,link,is_read AS read,created_at AS at FROM notifications WHERE user_id=? ORDER BY rowid DESC LIMIT 100',
      )
      .all(user.id)
      .map((r) => ({ ...r, read: !!r.read })) as unknown as PlatformState['notifications'],
    lessons: db
      .prepare('SELECT lesson_id FROM learning WHERE user_id=?')
      .all(user.id)
      .map((r) => r.lesson_id as string),
    couriers:
      user.role === 'emprendedor' || user.role === 'admin'
        ? allCouriers.filter((c) => c.approved)
        : [],
    courier: allCouriers.find((c) => c.id === user.id) ?? null,
    referral: { code: referralCode(db, user.id), ...referralStats(db, user.id) },
    challenges: challengeProgress(db, user.id),
    events: listEvents(db, user.id),
  };
}
export function commerceStore(db: Db, storeId: string): CommerceStore {
  const reviews = db
    .prepare(
      'SELECT r.id,r.operation_id AS operationId,r.store_id AS storeId,u.name,r.rating,r.comment,r.created_at AS createdAt FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id=? ORDER BY r.rowid DESC LIMIT 100',
    )
    .all(storeId) as unknown as Review[];
  const completed = db
    .prepare("SELECT payload FROM operations WHERE store_id=? AND status='completed'")
    .all(storeId)
    .map((r) => JSON.parse(r.payload as string) as Operation);
  const reviewStats = db
    .prepare('SELECT COUNT(*) AS n,AVG(rating) AS rating FROM reviews WHERE store_id=?')
    .get(storeId) as { n: number; rating: number | null };
  return {
    reviewCount: reviewStats.n,
    settings: settings(db, storeId),
    stock: Object.fromEntries(
      db
        .prepare('SELECT product_id,quantity FROM inventory WHERE store_id=?')
        .all(storeId)
        .map((r) => [r.product_id, r.quantity as number]),
    ),
    views: Object.fromEntries(
      db
        .prepare('SELECT product_id,count FROM store_views WHERE store_id=?')
        .all(storeId)
        .map((r) => [r.product_id, r.count as number]),
    ),
    reviews,
    completed365: completed.filter((o) => Date.parse(o.completedAt) > Date.now() - 365 * 86400000)
      .length,
    rating: reviewStats.rating,
  };
}
export function slots(db: Db, storeId: string, date: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + 'T12:00:00Z')) ||
    new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date
  )
    throw new HttpError(400, 'Selecciona una fecha válida.');
  const cfg = settings(db, storeId),
    list: string[] = [];
  const busy = db
    .prepare(
      "SELECT payload FROM operations WHERE store_id=? AND kind='booking' AND status IN ('pending','accepted')",
    )
    .all(storeId)
    .map((row) => JSON.parse(row.payload as string) as Operation);
  for (let min = cfg.opens * 60; min + cfg.duration <= cfg.closes * 60; min += cfg.duration) {
    const slot = `${date}T${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00-05:00`,
      start = Date.parse(slot),
      end = start + cfg.duration * 60000;
    if (
      start > Date.now() &&
      start < Date.now() + 90 * 86400000 &&
      !busy.some(
        (o) =>
          start <
            Date.parse(o.slotEnd || new Date(Date.parse(o.slot) + 60 * 60000).toISOString()) &&
          end > Date.parse(o.slot),
      )
    )
      list.push(slot);
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
  expectedSubtotal?: number;
}
export function createOperation(db: Db, actor: User, data: CreateOperation): Operation {
  if (!data || typeof data !== 'object')
    throw new HttpError(400, 'Revisa los datos de la solicitud.');
  const key = string(data.key, 80, 'el identificador de solicitud');
  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return transaction(db, () => {
    const existing = db
      .prepare('SELECT payload,request_hash FROM operations WHERE client_id=? AND idempotency=?')
      .get(actor.id, key);
    if (existing) {
      if (existing.request_hash !== hash)
        throw new HttpError(409, 'Esta solicitud ya se usó con otros datos.');
      return serialize(JSON.parse(existing.payload as string), actor.id);
    }
    const store = getStore(db, string(data.storeId, 100, 'el negocio'));
    if (!store?.published) throw new HttpError(404, 'El negocio no está publicado.');
    if (store.ownerId === actor.id)
      throw new HttpError(400, 'No puedes comprar o contratar tu propio negocio.');
    const design = store.published.design,
      cfg = settings(db, store.id);
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
        const stock = db
          .prepare('SELECT quantity FROM inventory WHERE store_id=? AND product_id=?')
          .get(store.id, product.id);
        if (stock && Number(stock.quantity) < quantity)
          throw new HttpError(409, `No hay suficientes unidades de ${product.name}.`);
        if (stock)
          db.prepare(
            'UPDATE inventory SET quantity=quantity-? WHERE store_id=? AND product_id=?',
          ).run(quantity, store.id, product.id);
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
        op.fee = cfg.deliveryFee;
      }
      if (data.couponId && balance(db, actor.id) < 0)
        throw new HttpError(
          409,
          'Tu saldo de puntos fue ajustado por una devolución. Compénsalo antes de utilizar bonos.',
        );
      if (data.couponId) {
        const row = db
          .prepare('SELECT payload,used FROM coupons WHERE id=? AND user_id=? AND store_id=?')
          .get(data.couponId, actor.id, store.id);
        if (!row || row.used)
          throw new HttpError(409, 'Ese bono no está disponible para este negocio.');
        const coupon = JSON.parse(row.payload as string) as Coupon;
        if (coupon.expires < now()) throw new HttpError(409, 'El bono venció.');
        op.discount = Math.floor((op.subtotal * coupon.percent) / 100);
        op.couponId = data.couponId;
        db.prepare('UPDATE coupons SET used=1 WHERE id=?').run(op.couponId);
      }
    } else {
      op.detail = string(data.detail, 1500, 'el detalle de la solicitud');
      if (op.kind === 'booking') {
        const slot = string(data.slot, 40, 'el horario');
        if (!slots(db, store.id, slot.slice(0, 10)).includes(slot))
          throw new HttpError(409, 'Ese horario ya no está disponible.');
        op.slot = slot;
        op.slotEnd = new Date(Date.parse(slot) + cfg.duration * 60000).toISOString();
        const offer = design.products.find((p) => p.id === data.items?.[0]?.productId);
        if (!offer) throw new HttpError(400, 'Selecciona el servicio.');
        op.subtotal = offer.price;
        op.detail = `${offer.name}: ${op.detail}`;
      }
    }
    op.amount = op.subtotal - op.discount + op.fee;
    if (!Number.isSafeInteger(op.amount) || op.amount < 0 || op.amount > 100000000000)
      throw new HttpError(400, 'Revisa el importe de la operación.');
    op.events.push({ status: 'pending', at: now(), note: 'Solicitud recibida por el negocio.' });
    db.prepare('INSERT INTO operations VALUES (?,?,?,?,?,?,?,?,?)').run(
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
    notify(
      db,
      store.ownerId,
      `Nueva ${op.kind === 'products' ? 'compra' : 'solicitud'} de ${actor.name}`,
      '/panel/pedidos',
    );
    notify(db, actor.id, `Tu solicitud a ${op.storeName} fue recibida`, '/pedidos');
    return serialize(op, actor.id);
  });
}
export function actOperation(
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
  const current = operation(db, id);
  let completedClient = '';
  const owner = current.ownerId === actor.id,
    client = current.clientId === actor.id,
    courier = current.courierId === actor.id;
  if (!owner && !client && !courier) throw new HttpError(404, 'Operación no encontrada.');
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
      saveOperation(db, current);
      throw new HttpError(400, 'PIN incorrecto. Pídele el código al cliente al entregar.');
    }
  }
  return transaction(db, () => {
    const op = operation(db, id);
    if (['completed', 'cancelled', 'refunded'].includes(op.status) && action !== 'refund')
      throw new HttpError(409, 'La operación ya está cerrada.');
    let next: OperationStatus = op.status;
    if (action === 'refund' && owner && op.payment === 'confirmed') {
      const reason = string(body.note, 500, 'el motivo de la devolución');
      if (
        op.kind === 'products' &&
        (!['completed', 'dispatched'].includes(op.status) || body.returned === true)
      )
        for (const line of op.lines)
          db.prepare(
            'UPDATE inventory SET quantity=quantity+? WHERE store_id=? AND product_id=?',
          ).run(line.quantity, op.storeId, line.productId);
      const earned = db.prepare('SELECT amount FROM points_ledger WHERE id=?').get(`earn:${op.id}`);
      if (earned)
        points(
          db,
          op.clientId,
          `refund:${op.id}`,
          -Number(earned.amount),
          `Ajuste por devolución en ${op.storeName}`,
        );
      if (op.couponId) db.prepare('UPDATE coupons SET used=0 WHERE id=?').run(op.couponId);
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
        db.prepare(
          'UPDATE inventory SET quantity=quantity+? WHERE store_id=? AND product_id=?',
        ).run(line.quantity, op.storeId, line.productId);
      if (op.couponId) db.prepare('UPDATE coupons SET used=0 WHERE id=?').run(op.couponId);
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
    else if (action === 'ready' && owner && op.kind === 'products' && op.status === 'preparing')
      next = 'ready';
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
      const assigned = couriers(db).find((c) => c.approved && c.id === body.courierId);
      if (!assigned) throw new HttpError(400, 'Selecciona un domiciliario aprobado.');
      op.courierId = assigned.id;
      op.courierName = assigned.name;
      op.courierPhone = assigned.phone;
      op.courierAvatar = assigned.avatar;
      op.courierRating = assigned.rating;
      op.etaMinutes = integer(body.etaMinutes, 1, 240, 'los minutos estimados');
      next = 'dispatched';
      notify(db, assigned.id, `Entrega asignada: ${op.storeName}`, '/domiciliario');
    } else if (
      action === 'complete' &&
      op.payment === 'confirmed' &&
      (op.kind === 'products' ||
        (owner && op.status === 'accepted' && (!op.slot || Date.parse(op.slot) <= Date.now())))
    ) {
      next = 'completed';
      op.completedAt = now();
      points(
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
          : `Estado actualizado: ${statusNames[next]}.`,
    });
    saveOperation(db, op);
    if (completedClient) afterCompleted(db, completedClient);
    notify(
      db,
      op.clientId,
      `${op.storeName}: ${action === 'payment' ? 'pago confirmado' : statusNames[next]}`,
      '/pedidos',
    );
    if (client)
      notify(
        db,
        op.ownerId,
        `Respuesta de ${op.clientName}: ${statusNames[next]}`,
        '/panel/pedidos',
      );
    return serialize(op, actor.id);
  });
}
export function redeem(db: Db, actor: User, id: string) {
  return transaction(db, () => {
    const row = db.prepare('SELECT payload FROM promotions WHERE id=?').get(id);
    if (!row) throw new HttpError(404, 'Promoción no encontrada.');
    const p = JSON.parse(row.payload as string) as Promotion;
    if (!p.active || p.expires < now() || !getStore(db, p.storeId)?.published)
      throw new HttpError(409, 'Esta promoción ya no está activa.');
    if (getStore(db, p.storeId)?.ownerId === actor.id)
      throw new HttpError(400, 'No puedes canjear tu propia promoción.');
    if (balance(db, actor.id) < p.cost) throw new HttpError(409, 'No tienes puntos suficientes.');
    const unused = db
      .prepare('SELECT payload FROM coupons WHERE user_id=? AND used=0')
      .all(actor.id)
      .some((r) => {
        const c = JSON.parse(r.payload as string) as Coupon;
        return c.expires > now() && c.storeId === p.storeId;
      });
    if (unused) throw new HttpError(409, 'Ya tienes un bono disponible de este negocio.');
    const coupon = { ...p, id: randomUUID(), used: false };
    points(db, actor.id, `redeem:${coupon.id}`, -p.cost, `Bono: ${p.title}`);
    db.prepare('INSERT INTO coupons VALUES (?,?,?,?,?)').run(
      coupon.id,
      actor.id,
      p.storeId,
      0,
      JSON.stringify(coupon),
    );
    return coupon;
  });
}
export function lessonAnswer(db: Db, actor: User, id: string, answer: number) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) throw new HttpError(404, 'Lección no encontrada.');
  if (answer !== lesson.correct)
    throw new HttpError(400, 'Revisa el contenido y vuelve a intentarlo.');
  db.prepare('INSERT OR IGNORE INTO learning VALUES (?,?,?)').run(actor.id, id, now());
  checkChallenges(db, actor.id);
}
