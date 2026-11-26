// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { createHash as createHash6, randomInt as randomInt3, randomUUID as randomUUID7 } from "node:crypto";


// --- (continuación en el bundle) ---
var now2 = () => (/* @__PURE__ */ new Date()).toISOString();
function transaction(db2, fn) {
  return db2.transaction(fn);
}
function integer(value, min, max, label) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    throw new HttpError(400, `Revisa ${label}.`);
  return value;
}
function string(value, max, label, required = true) {
  if (typeof value !== "string" || value.length > max || required && !value.trim())
    throw new HttpError(400, `Revisa ${label}.`);
  return value.trim();
}
async function owned(db2, actor, storeId) {
  const store = await getStore(db2, storeId);
  if (!store || store.ownerId !== actor.id) throw new HttpError(404, "No encontramos tu negocio.");
  return store;
}
var parse = (rows) => rows.map((r) => JSON.parse(r.payload));
async function settings(db2, storeId) {
  const row = await db2.prepare("SELECT payload FROM store_settings WHERE store_id = ?").get(storeId);
  return row ? { ...defaultSettings(), ...JSON.parse(row.payload) } : defaultSettings();
}
async function settingsMany(db2, ids) {
  const map = /* @__PURE__ */ new Map();
  if (!ids.length) return map;
  const rows = await db2.prepare(
    `SELECT store_id, payload FROM store_settings WHERE store_id IN (${ids.map(() => "?").join(",")})`
  ).all(...ids);
  for (const r of rows)
    map.set(r.store_id, { ...defaultSettings(), ...JSON.parse(r.payload) });
  return map;
}
async function setSettings(db2, storeId, data) {
  await db2.prepare(
    "INSERT INTO store_settings VALUES (?, ?) ON CONFLICT(store_id) DO UPDATE SET payload=excluded.payload"
  ).run(storeId, JSON.stringify(data));
}
async function notify(db2, userId, title, link2) {
  await db2.prepare("INSERT INTO notifications (id,user_id,title,link,created_at) VALUES (?,?,?,?,?)").run(randomUUID7(), userId, title, link2, now2());
}
async function balance(db2, userId) {
  return (await db2.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM points_ledger WHERE user_id=?").get(userId))?.n ?? 0;
}
async function points(db2, userId, id, amount, note) {
  await db2.prepare("INSERT OR IGNORE INTO points_ledger VALUES (?,?,?,?,?)").run(id, userId, amount, note, now2());
}
async function operation(db2, id) {
  const row = await db2.prepare("SELECT payload FROM operations WHERE id=?").get(id);
  if (!row) throw new HttpError(404, "Operaci\xF3n no encontrada.");
  return JSON.parse(row.payload);
}
async function saveOperation(db2, op) {
  await db2.prepare("UPDATE operations SET status=?,payload=? WHERE id=?").run(op.status, JSON.stringify(op), op.id);
}
function serialize(op, userId) {
  const copy = structuredClone(op);
  if (op.clientId !== userId) delete copy.pin;
  copy.pinAttempts = 0;
  copy.pinLockedUntil = 0;
  return copy;
}
async function couriers(db2) {
  return (await db2.prepare(
    `SELECT c.user_id AS id,u.name,c.phone,c.municipality,c.approved,c.avatar,c.vehicle,c.available,c.lat,c.lng,c.location_at AS locationAt,(SELECT AVG(r.courier_rating) FROM reviews r JOIN operations o ON o.id=r.operation_id WHERE json_extract(o.payload,'$.courierId')=c.user_id) AS rating FROM couriers c JOIN users u ON u.id=c.user_id`
  ).all()).map((r) => ({
    ...r,
    approved: !!r.approved,
    available: !!r.available
  }));
}
async function state(db2, user) {
  const [opsFirst, salesFirst] = await Promise.all([
    db2.prepare("SELECT payload FROM operations WHERE client_id=? ORDER BY rowid DESC").all(user.id).then(parse),
    db2.prepare(
      "SELECT o.payload FROM operations o JOIN stores s ON s.id=o.store_id WHERE s.owner_id=? ORDER BY o.rowid DESC"
    ).all(user.id).then(parse)
  ]);
  await lazyNotices(db2, opsFirst, salesFirst);
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
    challenges2,
    events
  ] = await Promise.all([
    Promise.resolve(opsFirst),
    Promise.resolve(salesFirst),
    db2.prepare(
      "SELECT payload FROM operations WHERE json_extract(payload,'$.courierId')=? AND status IN ('preparing','ready','dispatched','completed','refunded')"
    ).all(user.id).then((rows) => parse(rows).filter((o) => o.courierId === user.id)),
    db2.prepare(
      "SELECT p.payload FROM promotions p JOIN stores s ON s.id=p.store_id WHERE s.published_version_id IS NOT NULL OR s.owner_id=?"
    ).all(user.id).then(parse),
    couriers(db2),
    db2.prepare("SELECT store_id FROM favorites WHERE user_id=?").all(user.id),
    balance(db2, user.id),
    db2.prepare(
      "SELECT id,amount,note,created_at AS at FROM points_ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 100"
    ).all(user.id),
    db2.prepare("SELECT payload,used FROM coupons WHERE user_id=?").all(user.id),
    db2.prepare(
      "SELECT id,title,link,is_read AS read,created_at AS at FROM notifications WHERE user_id=? ORDER BY rowid DESC LIMIT 100"
    ).all(user.id),
    db2.prepare("SELECT lesson_id FROM learning WHERE user_id=?").all(user.id),
    referralCode(db2, user.id),
    referralStats(db2, user.id),
    challengeProgress(db2, user.id),
    listEvents(db2, user.id)
  ]);
  const me = allCouriers.find((c) => c.id === user.id);
  const pool = me?.approved && me.available ? parse(
    await db2.prepare(
      "SELECT payload FROM operations WHERE kind='products' AND status IN ('preparing','ready') ORDER BY rowid"
    ).all()
  ).filter(
    (o) => o.fulfillment === "delivery" && !o.courierId && o.clientId !== user.id && o.ownerId !== user.id && (o.storeMunicipality ?? "") === me.municipality
  ).map((o) => ({
    ...serialize(o, user.id),
    clientName: o.clientName.split(" ")[0],
    phone: "",
    address: "",
    addressLat: null,
    addressLng: null,
    paymentInstructions: ""
  })) : [];
  return {
    pool,
    operations: ops.map((o) => serialize(o, user.id)),
    sales: sales.map((o) => serialize(o, user.id)),
    deliveries: delivery.map((o) => serialize(o, user.id)),
    favorites: favorites.map((r) => r.store_id),
    points: pts,
    ledger,
    promotions: activePromos.filter((p) => p.active && p.expires > now2()),
    coupons: coupons.map((r) => ({ ...JSON.parse(r.payload), used: !!r.used })),
    notifications: notes.map((r) => ({
      ...r,
      read: !!r.read
    })),
    lessons: learned.map((r) => r.lesson_id),
    couriers: user.role === "emprendedor" || user.role === "admin" ? allCouriers.filter((c) => c.approved) : [],
    courier: allCouriers.find((c) => c.id === user.id) ?? null,
    referral: { code, ...stats },
    challenges: challenges2,
    events
  };
}
async function lazyNotices(db2, ops, sales) {
  const nowMs = Date.now();
  for (const o of ops)
    if (o.kind === "booking" && o.status === "accepted" && !o.reminded && Date.parse(o.slot) > nowMs && Date.parse(o.slot) - nowMs < 24 * 36e5) {
      o.reminded = true;
      await saveOperation(db2, o);
      const hour = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        weekday: "long",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(o.slot));
      await notify(
        db2,
        o.clientId,
        `Recordatorio: tu cita en ${o.storeName} es el ${hour}`,
        "/solicitudes"
      );
    }
  for (const o of sales)
    if (o.kind === "products" && o.fulfillment === "delivery" && o.status === "ready" && !o.courierId && !o.unclaimedNotified && o.readyAt && nowMs - Date.parse(o.readyAt) > 15 * 6e4) {
      o.unclaimedNotified = true;
      await saveOperation(db2, o);
      await notify(
        db2,
        o.ownerId,
        `Ning\xFAn domiciliario ha tomado el pedido de ${o.clientName}. Puedes entregarlo t\xFA.`,
        "/panel"
      );
    }
}
async function tracking(db2, actor, id) {
  const op = await operation(db2, id);
  if (![op.clientId, op.ownerId, op.courierId].includes(actor.id))
    throw new HttpError(404, "Operaci\xF3n no encontrada.");
  const courier = op.courierId ? (await couriers(db2)).find((c) => c.id === op.courierId) : void 0;
  const live = courier && courier.lat != null && courier.lng != null && op.status === "dispatched" ? { lat: courier.lat, lng: courier.lng, at: courier.locationAt ?? "" } : null;
  return {
    status: op.status,
    stage: op.courierStage ?? "",
    courierName: op.courierName,
    store: {
      name: op.storeName,
      address: op.storeAddress ?? "",
      municipality: op.storeMunicipality ?? "",
      lat: op.storeLat ?? null,
      lng: op.storeLng ?? null
    },
    client: { address: op.address, lat: op.addressLat ?? null, lng: op.addressLng ?? null },
    courier: live,
    etaMinutes: op.etaMinutes
  };
}
async function setAvailability(db2, actor, available) {
  const result = await db2.prepare("UPDATE couriers SET available=? WHERE user_id=? AND approved=1").run(available ? 1 : 0, actor.id);
  if (!result.changes) throw new HttpError(403, "Tu perfil de domiciliario a\xFAn no est\xE1 aprobado.");
}
async function setLocation(db2, actor, lat, lng) {
  const la = Number(lat), ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180)
    throw new HttpError(400, "Ubicaci\xF3n no v\xE1lida.");
  const result = await db2.prepare("UPDATE couriers SET lat=?, lng=?, location_at=? WHERE user_id=? AND approved=1").run(la, ln, now2(), actor.id);
  if (!result.changes) throw new HttpError(403, "Tu perfil de domiciliario a\xFAn no est\xE1 aprobado.");
}
async function commerceStore(db2, storeId) {
  const [reviews, completed, reviewStats, cfg, stock, views, productStats] = await Promise.all([
    db2.prepare(
      "SELECT r.id,r.operation_id AS operationId,r.store_id AS storeId,u.name,r.rating,r.comment,r.created_at AS createdAt FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id=? ORDER BY r.rowid DESC LIMIT 100"
    ).all(storeId),
    db2.prepare("SELECT payload FROM operations WHERE store_id=? AND status='completed'").all(storeId).then(parse),
    db2.prepare("SELECT COUNT(*) AS n,AVG(rating) AS rating FROM reviews WHERE store_id=?").get(storeId),
    settings(db2, storeId),
    db2.prepare("SELECT product_id,quantity FROM inventory WHERE store_id=?").all(storeId),
    db2.prepare("SELECT product_id,count FROM store_views WHERE store_id=?").all(storeId),
    db2.prepare(
      "SELECT product_id, COUNT(*) AS n, AVG(rating) AS rating FROM product_reviews WHERE store_id=? GROUP BY product_id"
    ).all(storeId)
  ]);
  return {
    reviewCount: reviewStats?.n ?? 0,
    settings: cfg,
    stock: Object.fromEntries(stock.map((r) => [r.product_id, r.quantity])),
    views: Object.fromEntries(views.map((r) => [r.product_id, r.count])),
    productRatings: Object.fromEntries(
      productStats.map((r) => [
        String(r.product_id),
        { rating: Math.round(Number(r.rating) * 10) / 10, count: Number(r.n) }
      ])
    ),
    reviews,
    completed365: completed.filter((o) => Date.parse(o.completedAt) > Date.now() - 365 * 864e5).length,
    rating: reviewStats?.rating ?? null
  };
}
async function storeSummaries(db2, ids) {
  const result = /* @__PURE__ */ new Map();
  if (!ids.length) return result;
  const marks = ids.map(() => "?").join(",");
  const since = new Date(Date.now() - 365 * 864e5).toISOString();
  const [cfgs, stats, done, promos] = await Promise.all([
    settingsMany(db2, ids),
    db2.prepare(
      `SELECT store_id, COUNT(*) AS n, AVG(rating) AS rating FROM reviews WHERE store_id IN (${marks}) GROUP BY store_id`
    ).all(...ids),
    db2.prepare(
      `SELECT store_id, COUNT(*) AS n FROM operations WHERE status='completed' AND store_id IN (${marks}) AND json_extract(payload,'$.completedAt') > ? GROUP BY store_id`
    ).all(...ids, since),
    db2.prepare(`SELECT store_id, payload FROM promotions WHERE store_id IN (${marks})`).all(...ids)
  ]);
  for (const id of ids) {
    const st = stats.find((r) => r.store_id === id);
    const cfg = cfgs.get(id) ?? defaultSettings();
    const discount = Math.max(
      0,
      ...promos.filter((r) => r.store_id === id).map((r) => JSON.parse(String(r.payload))).filter((x) => x.active && Date.parse(x.expires) > Date.now()).map((x) => x.percent)
    );
    result.set(id, {
      lat: cfg.latitude,
      lng: cfg.longitude,
      discount,
      verified: cfg.verification === "approved",
      completed365: Number(done.find((r) => r.store_id === id)?.n ?? 0),
      rating: Number(st?.rating ?? 0),
      reviewCount: Number(st?.n ?? 0)
    });
  }
  return result;
}
var minutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
async function slots(db2, storeId, date, productId) {
  return (await slotAvailability(db2, storeId, date, productId)).filter((s) => s.free > 0).map((s) => s.slot);
}
async function slotAvailability(db2, storeId, date, productId) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + "T12:00:00Z")) || (/* @__PURE__ */ new Date(date + "T12:00:00Z")).toISOString().slice(0, 10) !== date)
    throw new HttpError(400, "Selecciona una fecha v\xE1lida.");
  const cfg = await settings(db2, storeId), list = [];
  const store = await getStore(db2, storeId);
  const offer = store?.published?.design.products.find((p) => p.id === productId);
  const duration = offer?.duration ?? cfg.duration;
  const day = daySchedule(cfg, (/* @__PURE__ */ new Date(date + "T12:00:00Z")).getUTCDay());
  if (day.closed) return list;
  const capacity = Math.max(1, cfg.capacity ?? 1);
  const blocks = (cfg.blocks ?? []).filter((b) => b.date === date);
  if (blocks.some((b) => !b.from || !b.to)) return list;
  const busy = parse(
    await db2.prepare(
      "SELECT payload FROM operations WHERE store_id=? AND kind='booking' AND status IN ('pending','accepted')"
    ).all(storeId)
  );
  for (let min = day.opens * 60; min + duration <= day.closes * 60; min += Math.min(duration, 30)) {
    const slot = `${date}T${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}:00-05:00`, start = Date.parse(slot), end = start + duration * 6e4;
    const overlapping = busy.filter(
      (o) => start < Date.parse(o.slotEnd || new Date(Date.parse(o.slot) + 60 * 6e4).toISOString()) && end > Date.parse(o.slot)
    ).length;
    const blocked = blocks.some((b) => min < minutes(b.to) && min + duration > minutes(b.from));
    if (start > Date.now() && start < Date.now() + 90 * 864e5 && !blocked)
      list.push({ slot, free: Math.max(0, capacity - overlapping), capacity });
  }
  return list;
}
async function createOperation(db2, actor, data) {
  if (!data || typeof data !== "object")
    throw new HttpError(400, "Revisa los datos de la solicitud.");
  const key = string(data.key, 80, "el identificador de solicitud");
  const hash3 = createHash6("sha256").update(JSON.stringify(data)).digest("hex");
  return transaction(db2, async (db3) => {
    const existing = await db3.prepare("SELECT payload,request_hash FROM operations WHERE client_id=? AND idempotency=?").get(actor.id, key);
    if (existing) {
      if (existing.request_hash !== hash3)
        throw new HttpError(409, "Esta solicitud ya se us\xF3 con otros datos.");
      return serialize(JSON.parse(existing.payload), actor.id);
    }
    const store = await getStore(db3, string(data.storeId, 100, "el negocio"));
    if (!store?.published) throw new HttpError(404, "El negocio no est\xE1 publicado.");
    if (store.ownerId === actor.id)
      throw new HttpError(400, "No puedes comprar o contratar tu propio negocio.");
    const design = store.published.design, cfg = await settings(db3, store.id);
    if (data.kind !== design.mode)
      throw new HttpError(400, "La modalidad del negocio cambi\xF3. Revisa su p\xE1gina.");
    const phone = string(data.phone, 16, "tu WhatsApp");
    if (!/^\+?[1-9]\d{9,14}$/.test(phone))
      throw new HttpError(400, "Escribe un WhatsApp con c\xF3digo de pa\xEDs.");
    const op = {
      id: randomUUID7(),
      storeId: store.id,
      storeName: design.name,
      clientId: actor.id,
      clientName: actor.name,
      ownerId: store.ownerId,
      kind: design.mode,
      status: "pending",
      lines: [],
      detail: "",
      slot: "",
      slotEnd: "",
      amount: 0,
      subtotal: 0,
      discount: 0,
      fee: 0,
      fulfillment: "pickup",
      address: "",
      phone,
      payment: "pending",
      paidAt: "",
      paymentMethod: data.paymentMethod === "transfer" ? "transfer" : "cash",
      paymentInstructions: cfg.paymentInstructions,
      storeAddress: design.address,
      storeMunicipality: design.municipality,
      storeLat: cfg.latitude,
      storeLng: cfg.longitude,
      courierStage: "",
      courierId: "",
      courierName: "",
      courierPhone: "",
      courierAvatar: "",
      courierRating: null,
      etaMinutes: 0,
      pin: String(randomInt3(1e5, 1e6)),
      couponId: "",
      events: [],
      createdAt: now2(),
      completedAt: "",
      pinAttempts: 0,
      pinLockedUntil: 0
    };
    if (op.paymentMethod === "transfer" && !cfg.paymentInstructions)
      throw new HttpError(
        400,
        "Este negocio a\xFAn no ha configurado las instrucciones de transferencia."
      );
    if (op.kind === "products") {
      if (!Array.isArray(data.items) || !data.items.length || data.items.length > 60)
        throw new HttpError(400, "Agrega productos al pedido.");
      const ids = /* @__PURE__ */ new Set();
      for (const item of data.items) {
        if (!item || typeof item !== "object")
          throw new HttpError(400, "Revisa los productos del carrito.");
        const product = design.products.find((p) => p.id === item.productId);
        if (!product || ids.has(product.id))
          throw new HttpError(400, "Revisa los productos del carrito.");
        ids.add(product.id);
        const quantity = integer(item.quantity, 1, 99, "la cantidad");
        const stock = await db3.prepare("SELECT quantity FROM inventory WHERE store_id=? AND product_id=?").get(store.id, product.id);
        if (stock && Number(stock.quantity) < quantity)
          throw new HttpError(409, `No hay suficientes unidades de ${product.name}.`);
        if (stock)
          await db3.prepare("UPDATE inventory SET quantity=quantity-? WHERE store_id=? AND product_id=?").run(quantity, store.id, product.id);
        op.lines.push({
          businessId: store.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity
        });
      }
      op.subtotal = op.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
      if (data.expectedSubtotal !== void 0 && data.expectedSubtotal !== op.subtotal)
        throw new HttpError(
          409,
          "El precio del cat\xE1logo cambi\xF3. Revisa los productos antes de confirmar."
        );
      if (data.fulfillment === "delivery") {
        if (!cfg.delivery) throw new HttpError(400, "Este negocio no ofrece domicilio.");
        op.fulfillment = "delivery";
        op.address = string(data.address, 300, "la direcci\xF3n");
        if (data.addressLat !== void 0 && data.addressLat !== null) {
          const lat = Number(data.addressLat), lng = Number(data.addressLng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
            throw new HttpError(400, "Revisa la ubicaci\xF3n de entrega en el mapa.");
          op.addressLat = lat;
          op.addressLng = lng;
        }
        op.fee = cfg.deliveryFee;
      }
      if (data.couponId && await balance(db3, actor.id) < 0)
        throw new HttpError(
          409,
          "Tu saldo de puntos fue ajustado por una devoluci\xF3n. Comp\xE9nsalo antes de utilizar bonos."
        );
      if (data.couponId) {
        const row = await db3.prepare("SELECT payload,used FROM coupons WHERE id=? AND user_id=? AND store_id=?").get(data.couponId, actor.id, store.id);
        if (!row || row.used)
          throw new HttpError(409, "Ese bono no est\xE1 disponible para este negocio.");
        const coupon = JSON.parse(row.payload);
        if (coupon.expires < now2()) throw new HttpError(409, "El bono venci\xF3.");
        op.discount = Math.floor(op.subtotal * coupon.percent / 100);
        op.couponId = data.couponId;
        await db3.prepare("UPDATE coupons SET used=1 WHERE id=?").run(op.couponId);
      }
    } else {
      op.detail = string(data.detail, 1500, "el detalle de la solicitud");
      if (op.kind === "booking") {
        const slot = string(data.slot, 40, "el horario");
        const offer = design.products.find((p) => p.id === data.items?.[0]?.productId);
        if (!offer) throw new HttpError(400, "Selecciona el servicio.");
        if (!(await slots(db3, store.id, slot.slice(0, 10), offer.id)).includes(slot))
          throw new HttpError(409, "Ese horario ya no est\xE1 disponible.");
        op.slot = slot;
        op.slotEnd = new Date(
          Date.parse(slot) + (offer.duration ?? cfg.duration) * 6e4
        ).toISOString();
        op.subtotal = offer.price;
        op.detail = `${offer.name}: ${op.detail}`;
      }
    }
    op.amount = op.subtotal - op.discount + op.fee;
    if (!Number.isSafeInteger(op.amount) || op.amount < 0 || op.amount > 1e11)
      throw new HttpError(400, "Revisa el importe de la operaci\xF3n.");
    op.events.push({ status: "pending", at: now2(), note: "Solicitud recibida por el negocio." });
    await db3.prepare("INSERT INTO operations VALUES (?,?,?,?,?,?,?,?,?)").run(
      op.id,
      op.storeId,
      op.clientId,
      op.kind,
      op.status,
      op.slot || null,
      key,
      hash3,
      JSON.stringify(op)
    );
    await notify(
      db3,
      store.ownerId,
      `Nueva ${op.kind === "products" ? "compra" : "solicitud"} de ${actor.name}`,
      "/panel/pedidos"
    );
    await notify(db3, actor.id, `Tu solicitud a ${op.storeName} fue recibida`, "/pedidos");
    return serialize(op, actor.id);
  });
}
async function actOperation(db2, actor, id, action, body = {}) {
  const current = await operation(db2, id);
  let completedClient = "";
  const owner = current.ownerId === actor.id, client = current.clientId === actor.id, courier = current.courierId === actor.id;
  if (!owner && !client && !courier && action !== "claim")
    throw new HttpError(404, "Operaci\xF3n no encontrada.");
  if (action === "complete" && current.kind === "products") {
    if (!(owner && current.fulfillment === "pickup" || courier && current.fulfillment === "delivery") || !(current.status === "ready" && current.fulfillment === "pickup" || current.status === "dispatched" && current.fulfillment === "delivery"))
      throw new HttpError(409, "La entrega todav\xEDa no se puede confirmar.");
    if (current.pinLockedUntil > Date.now())
      throw new HttpError(429, "Espera 15 minutos antes de volver a intentar el PIN.");
    if (body.pin !== current.pin) {
      current.pinAttempts++;
      if (current.pinAttempts % 5 === 0) current.pinLockedUntil = Date.now() + 15 * 6e4;
      await saveOperation(db2, current);
      throw new HttpError(400, "PIN incorrecto. P\xEDdele el c\xF3digo al cliente al entregar.");
    }
  }
  return transaction(db2, async (db3) => {
    const op = await operation(db3, id);
    if (["completed", "cancelled", "refunded", "no_show"].includes(op.status) && action !== "refund")
      throw new HttpError(409, "La operaci\xF3n ya est\xE1 cerrada.");
    let next = op.status;
    let note = "";
    if (action === "refund" && owner && op.payment === "confirmed") {
      const reason = string(body.note, 500, "el motivo de la devoluci\xF3n");
      if (op.kind === "products" && (!["completed", "dispatched"].includes(op.status) || body.returned === true))
        for (const line of op.lines)
          await db3.prepare("UPDATE inventory SET quantity=quantity+? WHERE store_id=? AND product_id=?").run(line.quantity, op.storeId, line.productId);
      const earned = await db3.prepare("SELECT amount FROM points_ledger WHERE id=?").get(`earn:${op.id}`);
      if (earned)
        await points(
          db3,
          op.clientId,
          `refund:${op.id}`,
          -Number(earned.amount),
          `Ajuste por devoluci\xF3n en ${op.storeName}`
        );
      if (op.couponId) await db3.prepare("UPDATE coupons SET used=0 WHERE id=?").run(op.couponId);
      op.payment = "refunded";
      next = "refunded";
      op.events.push({
        status: "refunded",
        at: now2(),
        note: `Devoluci\xF3n registrada por el negocio: ${reason}. El dinero se devuelve por fuera de SucreIA.`
      });
    } else if (action === "cancel") {
      if (!(owner && op.status !== "dispatched" || client && ["pending", "quoted"].includes(op.status)) || op.payment === "confirmed")
        throw new HttpError(
          409,
          "No se puede cancelar en este estado. Un pago confirmado requiere resolverlo con el negocio."
        );
      next = "cancelled";
      for (const line of op.lines)
        await db3.prepare("UPDATE inventory SET quantity=quantity+? WHERE store_id=? AND product_id=?").run(line.quantity, op.storeId, line.productId);
      if (op.couponId) await db3.prepare("UPDATE coupons SET used=0 WHERE id=?").run(op.couponId);
    } else if (action === "payment" && (owner || courier && op.paymentMethod === "cash" && op.status === "dispatched") && op.payment === "pending") {
      if (op.kind === "quote" && op.status !== "accepted")
        throw new HttpError(409, "El cliente debe aceptar la cotizaci\xF3n antes del pago.");
      op.payment = "confirmed";
      op.paidAt = now2();
    } else if (action === "prepare" && owner && op.kind === "products" && op.status === "pending")
      next = "preparing";
    else if (action === "ready" && owner && op.kind === "products" && op.status === "preparing") {
      next = "ready";
      op.readyAt = now2();
    } else if (action === "claim") {
      const me = (await couriers(db3)).find((c) => c.id === actor.id);
      if (!me?.approved)
        throw new HttpError(403, "Tu perfil de domiciliario a\xFAn no est\xE1 aprobado.");
      if (!me.available) throw new HttpError(409, "Activa \xABDisponible\xBB para tomar pedidos.");
      if (op.kind !== "products" || op.fulfillment !== "delivery" || !["preparing", "ready"].includes(op.status) || op.courierId)
        throw new HttpError(409, "Otro domiciliario ya tom\xF3 este pedido o ya no est\xE1 disponible.");
      if (owner || client) throw new HttpError(400, "No puedes repartir tu propio pedido.");
      if ((op.storeMunicipality ?? me.municipality) !== me.municipality)
        throw new HttpError(403, "Este pedido es de otra zona.");
      op.courierId = me.id;
      op.courierName = me.name;
      op.courierPhone = me.phone;
      op.courierAvatar = me.avatar;
      op.courierRating = me.rating;
      op.courierStage = "to_store";
      op.claimedAt = now2();
      note = `${me.name} tom\xF3 el pedido y va hacia el negocio.`;
      await notify(db3, op.ownerId, `${me.name} recoger\xE1 el pedido de ${op.clientName}`, "/panel");
      await notify(db3, op.clientId, `${me.name} llevar\xE1 tu pedido de ${op.storeName}`, "/pedidos");
    } else if (action === "release" && courier && !owner && op.courierStage === "to_store") {
      op.courierId = op.courierName = op.courierPhone = op.courierAvatar = "";
      op.courierRating = null;
      op.courierStage = "";
      note = "El domiciliario liber\xF3 el pedido; vuelve a estar disponible en la zona.";
      await notify(
        db3,
        op.ownerId,
        `Pedido de ${op.clientName}: el domiciliario lo liber\xF3`,
        "/panel"
      );
    } else if (action === "pickup" && courier && op.status === "ready" && op.courierStage === "to_store") {
      next = "dispatched";
      op.courierStage = "to_client";
      op.etaMinutes = body.etaMinutes === void 0 ? 20 : integer(body.etaMinutes, 1, 240, "los minutos estimados");
      note = `${op.courierName} recogi\xF3 el pedido y va hacia el cliente.`;
    } else if (action === "arrive" && owner && op.kind === "booking" && op.status === "accepted") {
      op.arrivedAt = now2();
      note = "El cliente lleg\xF3 a su cita.";
    } else if (action === "noshow" && owner && op.kind === "booking" && op.status === "accepted" && op.payment !== "confirmed" && Date.parse(op.slot) <= Date.now())
      next = "no_show";
    else if (action === "confirm" && owner && op.kind === "booking" && op.status === "pending")
      next = "accepted";
    else if (action === "quote" && owner && op.kind === "quote" && ["pending", "quoted"].includes(op.status)) {
      op.amount = op.subtotal = integer(body.amount, 1, 1e9, "el precio de la cotizaci\xF3n");
      next = "quoted";
    } else if (action === "accept" && client && op.kind === "quote" && op.status === "quoted")
      next = "accepted";
    else if (action === "dispatch" && owner && op.kind === "products" && op.status === "ready" && op.fulfillment === "delivery") {
      if (op.courierId) throw new HttpError(409, "Un domiciliario ya tom\xF3 este pedido.");
      op.etaMinutes = integer(body.etaMinutes ?? 30, 1, 240, "los minutos estimados");
      next = "dispatched";
      op.courierStage = "to_client";
      if (body.courierId) {
        const assigned = (await couriers(db3)).find((c) => c.approved && c.id === body.courierId);
        if (!assigned) throw new HttpError(400, "Selecciona un domiciliario aprobado.");
        op.courierId = assigned.id;
        op.courierName = assigned.name;
        op.courierPhone = assigned.phone;
        op.courierAvatar = assigned.avatar;
        op.courierRating = assigned.rating;
        await notify(db3, assigned.id, `Entrega asignada: ${op.storeName}`, "/domiciliario");
      } else {
        op.courierId = actor.id;
        op.courierName = `${op.storeName} (entrega propia)`;
        op.courierPhone = "";
        op.courierAvatar = "";
        op.courierRating = null;
        note = "El negocio sali\xF3 a entregar el pedido.";
      }
    } else if (action === "complete" && op.payment === "confirmed" && (op.kind === "products" || owner && op.status === "accepted" && (!op.slot || Date.parse(op.slot) <= Date.now()))) {
      next = "completed";
      op.completedAt = now2();
      await points(
        db3,
        op.clientId,
        `earn:${op.id}`,
        Math.floor((op.amount - op.fee) / 1e3),
        `Compra o servicio completado en ${op.storeName}`
      );
      completedClient = op.clientId;
    } else throw new HttpError(409, "Esta acci\xF3n no est\xE1 permitida en el estado actual.");
    op.status = next;
    op.events.push({
      status: next,
      at: now2(),
      actorId: actor.id,
      note: action === "payment" ? courier ? "Pago confirmado en efectivo por el domiciliario." : "Pago confirmado manualmente por el negocio." : note || `Estado actualizado: ${statusNames[next]}.`
    });
    await saveOperation(db3, op);
    if (completedClient) await afterCompleted(db3, completedClient);
    await notify(
      db3,
      op.clientId,
      `${op.storeName}: ${action === "payment" ? "pago confirmado" : statusNames[next]}`,
      "/pedidos"
    );
    if (client)
      await notify(
        db3,
        op.ownerId,
        `Respuesta de ${op.clientName}: ${statusNames[next]}`,
        "/panel/pedidos"
      );
    return serialize(op, actor.id);
  });
}
async function redeem(db2, actor, id) {
  return transaction(db2, async (db3) => {
    const row = await db3.prepare("SELECT payload FROM promotions WHERE id=?").get(id);
    if (!row) throw new HttpError(404, "Promoci\xF3n no encontrada.");
    const p = JSON.parse(row.payload);
    const store = await getStore(db3, p.storeId);
    if (!p.active || p.expires < now2() || !store?.published)
      throw new HttpError(409, "Esta promoci\xF3n ya no est\xE1 activa.");
    if (store.ownerId === actor.id)
      throw new HttpError(400, "No puedes canjear tu propia promoci\xF3n.");
    if (await balance(db3, actor.id) < p.cost)
      throw new HttpError(409, "No tienes puntos suficientes.");
    const unused = (await db3.prepare("SELECT payload FROM coupons WHERE user_id=? AND used=0").all(actor.id)).some((r) => {
      const c = JSON.parse(r.payload);
      return c.expires > now2() && c.storeId === p.storeId;
    });
    if (unused) throw new HttpError(409, "Ya tienes un bono disponible de este negocio.");
    const coupon = { ...p, id: randomUUID7(), used: false };
    await points(db3, actor.id, `redeem:${coupon.id}`, -p.cost, `Bono: ${p.title}`);
    await db3.prepare("INSERT INTO coupons VALUES (?,?,?,?,?)").run(coupon.id, actor.id, p.storeId, 0, JSON.stringify(coupon));
    return coupon;
  });
}
async function lessonAnswer(db2, actor, id, answer2) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) throw new HttpError(404, "Lecci\xF3n no encontrada.");
  if (answer2 !== lesson.correct)
    throw new HttpError(400, "Revisa el contenido y vuelve a intentarlo.");
  await db2.prepare("INSERT OR IGNORE INTO learning VALUES (?,?,?)").run(actor.id, id, now2());
  await checkChallenges(db2, actor.id);
}
