// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var import_express6 = __toESM(require_express2(), 1);
import { randomUUID as randomUUID9 } from "node:crypto";


// --- (continuación en el bundle) ---
function requireClient(res) {
  const user = requireUser(res);
  if (!canBuyRole(user.role))
    throw new HttpError(
      403,
      "La cuenta de administraci\xF3n no hace compras, reservas ni guarda favoritos."
    );
  return user;
}
function platformRoutes(db2, images, assistant2) {
  const r = (0, import_express6.Router)();
  r.use((req, _res, next) => {
    if (["POST", "PUT"].includes(req.method)) {
      if (req.body !== void 0 && (!req.body || typeof req.body !== "object" || Array.isArray(req.body)))
        throw new HttpError(400, "Env\xEDa un objeto con los datos de la solicitud.");
      req.body ??= {};
    }
    next();
  });
  r.get("/estado", async (_req, res) => res.json(await state(db2, requireUser(res))));
  r.get("/negocios/:id", async (req, res) => {
    const store = await getStore(db2, req.params.id);
    if (!store || !store.published && store.ownerId !== currentUser(res)?.id)
      throw new HttpError(404, "Negocio no encontrado.");
    const info = await commerceStore(db2, store.id);
    if (store.ownerId !== currentUser(res)?.id) {
      info.views = {};
      info.settings.verificationNote = "";
    }
    res.json(info);
  });
  r.get("/negocios/:id/horarios", async (req, res) => {
    if (!(await getStore(db2, req.params.id))?.published)
      throw new HttpError(404, "Negocio no publicado.");
    const detail = await slotAvailability(
      db2,
      req.params.id,
      string(req.query.fecha, 10, "la fecha"),
      typeof req.query.servicio === "string" ? req.query.servicio : void 0
    );
    res.json({ slots: detail.filter((s) => s.free > 0).map((s) => s.slot), detail });
  });
  const views = /* @__PURE__ */ new Map();
  const aiAttempts = /* @__PURE__ */ new Map();
  let aiBusy = false;
  r.post("/negocios/:id/visita", async (req, res) => {
    const store = await getStore(db2, req.params.id);
    if (!store?.published) throw new HttpError(404, "Negocio no publicado.");
    const product = typeof req.body?.productId === "string" ? req.body.productId : "";
    if (product && !store.published.design.products.some((p) => p.id === product))
      throw new HttpError(404, "Producto no encontrado.");
    const key = `${req.ip}|${store.id}|${product}`;
    if ((views.get(key) ?? 0) < Date.now()) {
      if (views.size > 1e4) views.clear();
      views.set(key, Date.now() + 30 * 6e4);
      await db2.prepare(
        "INSERT INTO store_views VALUES (?,?,1) ON CONFLICT(store_id,product_id) DO UPDATE SET count=store_views.count+1"
      ).run(store.id, product);
    }
    res.status(204).end();
  });
  r.post(
    "/operaciones",
    async (req, res) => res.status(201).json({
      // Comprar, reservar y cotizar es solo de las cuentas de cliente.
      operation: await createOperation(db2, requireClient(res), req.body)
    })
  );
  r.post(
    "/operaciones/:id/:action",
    async (req, res) => res.json({
      operation: await actOperation(
        db2,
        requireUser(res),
        req.params.id,
        req.params.action,
        req.body ?? {}
      )
    })
  );
  r.post("/favoritos/:id", async (req, res) => {
    const user = requireClient(res);
    if (!(await getStore(db2, req.params.id))?.published)
      throw new HttpError(404, "Negocio no publicado.");
    if (await db2.prepare("SELECT 1 FROM favorites WHERE user_id=? AND store_id=?").get(user.id, req.params.id))
      await db2.prepare("DELETE FROM favorites WHERE user_id=? AND store_id=?").run(user.id, req.params.id);
    else await db2.prepare("INSERT INTO favorites VALUES (?,?)").run(user.id, req.params.id);
    res.status(204).end();
  });
  r.post("/notificaciones/leidas", async (_req, res) => {
    await db2.prepare("UPDATE notifications SET is_read=1 WHERE user_id=?").run(requireUser(res).id);
    res.status(204).end();
  });
  r.post("/lecciones/:id", async (req, res) => {
    await lessonAnswer(
      db2,
      requireUser(res),
      req.params.id,
      integer(req.body?.answer, 0, 10, "la respuesta")
    );
    res.status(204).end();
  });
  r.post("/tutor", async (req, res) => {
    const user = requireUser(res);
    const question = string(req.body.question, 500, "tu pregunta");
    const completed = (await db2.prepare("SELECT lesson_id FROM learning WHERE user_id=?").all(user.id)).map((row) => row.lesson_id);
    const next = lessons.find((l) => !completed.includes(l.id));
    const words2 = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const lesson = lessons.find(
      (l) => words2.some((w) => `${l.title} ${l.content}`.toLowerCase().includes(w))
    ) || next || lessons[0];
    let answer2 = `${lesson.title}: ${lesson.content}
Ejercicio: ${lesson.exercise}`, mode = "guia-local";
    if (assistant2?.teach) {
      const entry = aiAttempts.get(user.id), attempt = entry && entry.until > Date.now() ? entry : { until: Date.now() + 6e4, count: 0 };
      attempt.count++;
      aiAttempts.set(user.id, attempt);
      if (aiBusy || attempt.count > 8)
        throw new HttpError(429, "El tutor est\xE1 ocupado. Vuelve a intentarlo en un momento.");
      aiBusy = true;
      try {
        answer2 = await assistant2.teach(
          {
            lessons: lessons.map((l) => ({
              title: l.title,
              content: l.content,
              exercise: l.exercise
            })),
            completed: completed.length
          },
          question
        );
        mode = "ollama";
      } catch {
        answer2 = "La IA local no respondi\xF3. Te mostramos la gu\xEDa del curso:\n" + answer2;
      } finally {
        aiBusy = false;
      }
    }
    res.json({ answer: answer2, mode });
  });
  r.post("/certificado", async (_req, res) => {
    const user = requireUser(res);
    const completed = (await db2.prepare("SELECT lesson_id FROM learning WHERE user_id=?").all(user.id)).map((row) => row.lesson_id);
    if (!lessons.every((l) => completed.includes(l.id)))
      throw new HttpError(
        409,
        "Completa las lecciones y sus evaluaciones antes de generar la constancia."
      );
    await db2.prepare("INSERT OR IGNORE INTO certificates VALUES (?,?,?,?,?)").run(randomUUID9(), user.id, user.name, lessons.length, (/* @__PURE__ */ new Date()).toISOString());
    res.json(
      await db2.prepare("SELECT id,name,lessons,created_at AS at FROM certificates WHERE user_id=?").get(user.id)
    );
  });
  r.get("/certificados/:id", async (req, res) => {
    const certificate = await db2.prepare("SELECT id,name,lessons,created_at AS at FROM certificates WHERE id=?").get(req.params.id);
    if (!certificate) throw new HttpError(404, "Constancia no encontrada.");
    res.json(certificate);
  });
  r.post(
    "/canjes/:id",
    async (req, res) => res.status(201).json({ coupon: await redeem(db2, requireUser(res), req.params.id) })
  );
  r.post("/resenas", async (req, res) => {
    const user = requireUser(res), op = await operation(db2, string(req.body?.operationId, 80, "la operaci\xF3n"));
    if (op.clientId !== user.id || !op.completedAt || !["completed", "refunded"].includes(op.status))
      throw new HttpError(403, "Solo puedes rese\xF1ar operaciones tuyas completadas.");
    const rating = integer(req.body?.rating, 1, 5, "la calificaci\xF3n"), comment = string(req.body?.comment, 500, "tu rese\xF1a");
    if (await db2.prepare("SELECT id FROM reviews WHERE operation_id=?").get(op.id))
      throw new HttpError(409, "Ya rese\xF1aste esta operaci\xF3n.");
    const courierRating = op.courierId && req.body.courierRating !== void 0 ? integer(req.body.courierRating, 1, 5, "la calificaci\xF3n de entrega") : null;
    await db2.prepare(
      "INSERT INTO reviews (id,operation_id,store_id,user_id,rating,comment,created_at,courier_rating) VALUES (?,?,?,?,?,?,?,?)"
    ).run(
      randomUUID9(),
      op.id,
      op.storeId,
      user.id,
      rating,
      comment,
      (/* @__PURE__ */ new Date()).toISOString(),
      courierRating
    );
    await afterReview(db2, user.id, op.id, op.storeName);
    res.status(201).json({ ok: true });
  });
  r.post("/negocios/:id/resenas", async (req, res) => {
    const user = requireUser(res);
    if (user.role !== "cliente")
      throw new HttpError(403, "Solo los clientes pueden escribir rese\xF1as de los negocios.");
    const store = await getStore(db2, req.params.id);
    if (!store?.published) throw new HttpError(404, "Negocio no encontrado.");
    if (store.ownerId === user.id) throw new HttpError(403, "No puedes rese\xF1ar tu propio negocio.");
    const rating = integer(req.body?.rating, 1, 5, "la calificaci\xF3n"), comment = string(req.body?.comment, 500, "tu rese\xF1a");
    const now3 = (/* @__PURE__ */ new Date()).toISOString();
    const mine = await db2.prepare("SELECT id FROM reviews WHERE store_id=? AND user_id=? AND operation_id IS NULL").get(store.id, user.id);
    if (mine)
      await db2.prepare("UPDATE reviews SET rating=?, comment=?, created_at=? WHERE id=?").run(rating, comment, now3, mine.id);
    else {
      await db2.prepare(
        "INSERT INTO reviews (id,operation_id,store_id,user_id,rating,comment,created_at,courier_rating) VALUES (?,?,?,?,?,?,?,?)"
      ).run(randomUUID9(), null, store.id, user.id, rating, comment, now3, null);
      await notify(
        db2,
        store.ownerId,
        `${user.name} dej\xF3 una rese\xF1a de ${rating} ${rating === 1 ? "estrella" : "estrellas"} en ${store.published.design.name}.`,
        `/tienda?id=${encodeURIComponent(store.id)}&ver=resenas`
      );
    }
    res.status(mine ? 200 : 201).json({ ok: true, updated: !!mine });
  });
  async function boughtProduct(userId, storeId, productId) {
    const orders = await db2.prepare("SELECT payload FROM whatsapp_orders WHERE client_id=? AND store_id=?").all(userId, storeId);
    if (orders.some(
      (o) => JSON.parse(String(o.payload)).lines.some(
        (l) => l.productId === productId
      )
    ))
      return true;
    const ops = await db2.prepare(
      "SELECT payload FROM operations WHERE client_id=? AND store_id=? AND status='completed'"
    ).all(userId, storeId);
    return ops.some(
      (o) => (JSON.parse(String(o.payload)).lines ?? []).some(
        (l) => l.productId === productId
      )
    );
  }
  async function publishedProduct(storeId, productId) {
    const store = await getStore(db2, storeId);
    const product = store?.published?.design.products.find((x) => x.id === productId);
    if (!store || !product) throw new HttpError(404, "Producto no encontrado.");
    return { store, product };
  }
  r.get("/negocios/:id/productos/:productId/resenas", async (req, res) => {
    const { store } = await publishedProduct(req.params.id, req.params.productId);
    const reviews = await db2.prepare(
      "SELECT r.id,r.product_id AS productId,r.store_id AS storeId,u.name,r.rating,r.comment,r.created_at AS createdAt FROM product_reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id=? AND r.product_id=? ORDER BY r.created_at DESC LIMIT 200"
    ).all(store.id, req.params.productId);
    const user = currentUser(res);
    const canReview = !!user && store.ownerId !== user.id && await boughtProduct(user.id, store.id, req.params.productId);
    const mine = user ? await db2.prepare(
      "SELECT rating,comment FROM product_reviews WHERE store_id=? AND product_id=? AND user_id=?"
    ).get(store.id, req.params.productId, user.id) : null;
    res.json({ reviews, canReview, mine: mine ?? null });
  });
  r.post("/negocios/:id/productos/:productId/resenas", async (req, res) => {
    const user = requireUser(res);
    const { store, product } = await publishedProduct(req.params.id, req.params.productId);
    if (store.ownerId === user.id)
      throw new HttpError(403, "No puedes valorar tu propio producto.");
    if (!await boughtProduct(user.id, store.id, product.id))
      throw new HttpError(403, "Solo puede valorar este producto quien lo compr\xF3 o lo contrat\xF3.");
    const rating = integer(req.body?.rating, 1, 5, "la calificaci\xF3n");
    const comment = String(req.body?.comment ?? "").trim();
    if (comment.length > 500)
      throw new HttpError(400, "El comentario debe tener m\xE1ximo 500 caracteres.");
    await db2.prepare("DELETE FROM product_reviews WHERE store_id=? AND product_id=? AND user_id=?").run(store.id, product.id, user.id);
    await db2.prepare(
      "INSERT INTO product_reviews (id,store_id,product_id,user_id,rating,comment,created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(randomUUID9(), store.id, product.id, user.id, rating, comment, (/* @__PURE__ */ new Date()).toISOString());
    res.status(201).json({ ok: true });
  });
  r.get(
    "/eventos",
    async (_req, res) => res.json({ events: await listEvents(db2, currentUser(res)?.id) })
  );
  r.post("/eventos/:id/asistencia", async (req, res) => {
    await attendEvent(db2, requireUser(res), req.params.id, req.body?.code);
    res.status(201).json({ ok: true });
  });
  r.post(
    "/admin/eventos",
    async (req, res) => res.status(201).json({ id: await createEvent(db2, requireUser(res, "admin"), req.body) })
  );
  r.delete("/admin/eventos/:id", async (req, res) => {
    requireUser(res, "admin");
    await deleteEvent(db2, req.params.id);
    res.status(204).end();
  });
  r.put("/negocios/:id/configuracion", async (req, res) => {
    const store = await owned(db2, requireUser(res), req.params.id), old = await settings(db2, store.id), v = req.body;
    const opens = integer(v.opens, 0, 23, "la hora de apertura"), closes = integer(v.closes, 1, 24, "la hora de cierre"), duration = integer(v.duration, 15, 240, "la duraci\xF3n");
    if (closes <= opens || duration > (closes - opens) * 60)
      throw new HttpError(400, "Revisa el horario de atenci\xF3n.");
    const latitude = v.latitude === null || v.latitude === "" ? null : Number(v.latitude), longitude = v.longitude === null || v.longitude === "" ? null : Number(v.longitude);
    if (latitude === null !== (longitude === null) || latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90) || longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180))
      throw new HttpError(400, "Revisa las coordenadas.");
    const week = v.week === void 0 ? old.week : (() => {
      if (!Array.isArray(v.week) || v.week.length !== 7)
        throw new HttpError(400, "Revisa el horario de la semana.");
      return v.week.map(
        (d, i) => {
          const closed = d?.closed === true;
          const o = integer(d?.opens, 0, 23, `la apertura del ${dayNames[i]}`), c = integer(d?.closes, 1, 24, `el cierre del ${dayNames[i]}`);
          if (!closed && c <= o)
            throw new HttpError(400, `Revisa el horario del ${dayNames[i]}.`);
          return { closed, opens: o, closes: c };
        }
      );
    })();
    const capacity = v.capacity === void 0 ? old.capacity : integer(v.capacity, 1, 20, "las citas simult\xE1neas");
    const blocks = v.blocks === void 0 ? old.blocks : (() => {
      if (!Array.isArray(v.blocks) || v.blocks.length > 200)
        throw new HttpError(400, "Revisa los bloqueos de la agenda.");
      return v.blocks.map((b) => {
        const date = string(b?.date, 10, "la fecha del bloqueo");
        const from = typeof b?.from === "string" ? b.from : "";
        const to = typeof b?.to === "string" ? b.to : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
          throw new HttpError(400, "Revisa la fecha del bloqueo.");
        if ((from || to) && (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to) || to <= from))
          throw new HttpError(400, "Revisa las horas del bloqueo.");
        return {
          id: typeof b?.id === "string" && b.id.length <= 60 ? b.id : randomUUID9(),
          date,
          from,
          to,
          note: string(b?.note ?? "", 120, "la nota del bloqueo", false)
        };
      });
    })();
    await setSettings(db2, store.id, {
      ...old,
      week,
      capacity,
      blocks,
      delivery: v.delivery === true,
      deliveryFee: integer(v.deliveryFee, 0, 5e5, "el costo de domicilio"),
      paymentInstructions: string(v.paymentInstructions, 700, "las instrucciones de pago", false),
      opens,
      closes,
      duration,
      latitude,
      longitude
    });
    res.json(await commerceStore(db2, store.id));
  });
  r.put("/negocios/:id/inventario", async (req, res) => {
    const store = await owned(db2, requireUser(res), req.params.id);
    const productId = string(req.body?.productId, 100, "el producto");
    if (!store.draft.products.some((p) => p.id === productId))
      throw new HttpError(404, "Producto no encontrado.");
    if (req.body.quantity === null)
      await db2.prepare("DELETE FROM inventory WHERE store_id=? AND product_id=?").run(store.id, productId);
    else
      await db2.prepare(
        "INSERT INTO inventory VALUES (?,?,?) ON CONFLICT(store_id,product_id) DO UPDATE SET quantity=excluded.quantity"
      ).run(store.id, productId, integer(req.body.quantity, 0, 1e6, "las existencias"));
    res.json(await commerceStore(db2, store.id));
  });
  const savePromotion = async (req, res) => {
    const store = await owned(db2, requireUser(res), req.params.id);
    if (store.published?.design.mode !== "products")
      throw new HttpError(400, "Publica un negocio de productos antes de crear bonos.");
    const v = req.body;
    const expires = string(v.expires, 35, "el vencimiento");
    if (!Number.isFinite(Date.parse(expires)) || Date.parse(expires) <= Date.now() || Date.parse(expires) > Date.now() + 365 * 864e5)
      throw new HttpError(400, "Elige un vencimiento futuro dentro de un a\xF1o.");
    const promotion = {
      id: req.params.promo || randomUUID9(),
      storeId: store.id,
      storeName: store.published.design.name,
      title: string(v.title, 100, "el t\xEDtulo"),
      percent: integer(v.percent, 1, 50, "el descuento"),
      cost: integer(v.cost, 1, 1e6, "los puntos de canje"),
      expires: new Date(expires).toISOString(),
      active: true
    };
    if (req.params.promo) {
      await transaction(db2, async (tx) => {
        const row = await tx.prepare("SELECT payload FROM promotions WHERE id=? AND store_id=?").get(promotion.id, store.id);
        if (!row || !JSON.parse(String(row.payload)).active)
          throw new HttpError(404, "No encontramos una promoci\xF3n activa de tu negocio.");
        await tx.prepare("UPDATE promotions SET payload=? WHERE id=? AND store_id=?").run(JSON.stringify(promotion), promotion.id, store.id);
      });
      res.json({ promotion });
      return;
    }
    await db2.prepare("INSERT INTO promotions VALUES (?,?,?)").run(promotion.id, store.id, JSON.stringify(promotion));
    res.status(201).json({ promotion });
  };
  r.post("/negocios/:id/promociones", savePromotion);
  r.put("/negocios/:id/promociones/:promo", savePromotion);
  r.delete("/promociones/:id", async (req, res) => {
    const row = await db2.prepare("SELECT store_id,payload FROM promotions WHERE id=?").get(req.params.id);
    if (!row) throw new HttpError(404, "Promoci\xF3n no encontrada.");
    await owned(db2, requireUser(res), row.store_id);
    const p = JSON.parse(row.payload);
    p.active = false;
    await db2.prepare("UPDATE promotions SET payload=? WHERE id=?").run(JSON.stringify(p), p.id);
    res.status(204).end();
  });
  r.post("/negocios/:id/verificacion", async (req, res) => {
    const store = await owned(db2, requireUser(res), req.params.id);
    if (!store.published)
      throw new HttpError(400, "Publica tu negocio antes de solicitar verificaci\xF3n.");
    const cfg = await settings(db2, store.id);
    if (cfg.verification === "approved") throw new HttpError(409, "El negocio ya est\xE1 verificado.");
    cfg.verification = "pending";
    cfg.verificationNote = string(
      req.body?.evidence,
      1e3,
      "la informaci\xF3n para verificar tu negocio"
    );
    await setSettings(db2, store.id, cfg);
    res.status(204).end();
  });
  r.put("/domiciliario", async (req, res) => {
    const user = requireUser(res);
    const phone = string(req.body?.phone, 16, "tu WhatsApp");
    if (!/^\+?[1-9]\d{9,14}$/.test(phone))
      throw new HttpError(400, "Revisa el n\xFAmero de WhatsApp.");
    const municipality = string(req.body?.municipality, 80, "tu municipio");
    const vehicle = string(req.body?.vehicle ?? "", 40, "el veh\xEDculo", false);
    let avatar = typeof req.body.avatar === "string" ? req.body.avatar : "";
    if (avatar.startsWith("data:")) avatar = (await images.upload(user.id, avatar)).url;
    if (avatar && (!imageId(avatar) || (await images.row(imageId(avatar)))?.owner_id !== user.id))
      throw new HttpError(400, "Sube tu propia foto para el perfil.");
    await db2.prepare(
      "INSERT INTO couriers (user_id,phone,municipality,approved,avatar,vehicle) VALUES (?,?,?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,municipality=excluded.municipality,avatar=excluded.avatar,vehicle=excluded.vehicle,approved=0,available=0"
    ).run(user.id, phone, municipality, avatar, vehicle);
    res.status(204).end();
  });
  r.put("/domiciliario/disponible", async (req, res) => {
    await setAvailability(db2, requireUser(res), req.body?.available === true);
    res.status(204).end();
  });
  r.put("/domiciliario/ubicacion", async (req, res) => {
    await setLocation(db2, requireUser(res), req.body?.lat, req.body?.lng);
    res.status(204).end();
  });
  r.get(
    "/operaciones/:id/rastreo",
    async (req, res) => res.json(await tracking(db2, requireUser(res), req.params.id))
  );
  r.use(pqrsRoutes(db2));
  r.post("/compras-whatsapp", async (req, res) => {
    const user = requireClient(res);
    const store = await getStore(db2, string(req.body.storeId, 100, "el negocio"));
    const design = store?.published?.design;
    if (!store || !design || design.mode !== "products")
      throw new HttpError(404, "Este negocio no recibe compras en este momento.");
    if (store.ownerId === user.id)
      throw new HttpError(400, "No puedes comprar en tu propio negocio.");
    if (!Array.isArray(req.body.items) || !req.body.items.length || req.body.items.length > 60)
      throw new HttpError(400, "Agrega productos al carrito.");
    const lines = req.body.items.map((item) => {
      const it = item ?? {};
      const product = design.products.find((p) => p.id === it.productId);
      const quantity = Number(it.quantity);
      if (!product)
        throw new HttpError(409, "Un producto ya no est\xE1 en el cat\xE1logo. Revisa tu carrito.");
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
        throw new HttpError(400, "Revisa las cantidades.");
      return { productId: product.id, name: product.name, price: product.price, quantity };
    });
    const rawNote = req.body.note ?? "";
    if (typeof rawNote !== "string" || rawNote.length > 500)
      throw new HttpError(400, "La nota debe tener m\xE1ximo 500 caracteres.");
    const note = rawNote.trim();
    const order2 = {
      id: randomUUID9(),
      storeId: store.id,
      storeName: design.name,
      clientName: user.name,
      lines,
      total: lines.reduce((n, l) => n + l.price * l.quantity, 0),
      note,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const message = orderMessage(order2);
    const url = orderLink(design.whatsapp, message);
    if (!url) throw new HttpError(409, "Este negocio no tiene WhatsApp registrado.");
    await db2.prepare(
      "INSERT INTO whatsapp_orders (id,store_id,client_id,payload,created_at) VALUES (?,?,?,?,?)"
    ).run(order2.id, store.id, user.id, JSON.stringify(order2), order2.createdAt);
    await notify(
      db2,
      store.ownerId,
      `Nuevo pedido por WhatsApp de ${user.name}: ${lines.reduce((n, l) => n + l.quantity, 0)} producto(s).`,
      "/panel"
    );
    res.status(201).json({ order: order2, url, message });
  });
  r.get("/compras-whatsapp", async (_req, res) => {
    const user = requireUser(res);
    const mine = await db2.prepare(
      "SELECT payload FROM whatsapp_orders WHERE client_id=? ORDER BY created_at DESC LIMIT 100"
    ).all(user.id);
    const received = await db2.prepare(
      "SELECT w.payload FROM whatsapp_orders w JOIN stores s ON s.id=w.store_id WHERE s.owner_id=? ORDER BY w.created_at DESC LIMIT 100"
    ).all(user.id);
    const read = (rows) => rows.map((r2) => JSON.parse(String(r2.payload)));
    res.json({ mine: read(mine), received: read(received) });
  });
  async function documentAccess(res, storeId) {
    const user = requireUser(res);
    const store = await getStore(db2, storeId);
    if (!store || store.ownerId !== user.id && user.role !== "admin")
      throw new HttpError(404, "No encontramos el negocio.");
    return { user, store };
  }
  async function documentsOf(storeId) {
    const row = await db2.prepare("SELECT legal_type FROM stores WHERE id=?").get(storeId);
    const legalType = row?.legal_type === "juridica" ? "juridica" : "natural";
    const documents = (await db2.prepare(
      "SELECT kind,name,mime,uploaded_at FROM store_documents WHERE store_id=? ORDER BY kind"
    ).all(storeId)).map((d) => ({
      kind: d.kind,
      name: String(d.name),
      mime: String(d.mime),
      uploadedAt: String(d.uploaded_at)
    }));
    return { legalType, documents, missing: missingDocuments(legalType, documents) };
  }
  r.get("/negocios/:id/documentos", async (req, res) => {
    const { store } = await documentAccess(res, req.params.id);
    res.json(await documentsOf(store.id));
  });
  r.put("/negocios/:id/tipo-legal", async (req, res) => {
    const store = await owned(db2, requireUser(res), req.params.id);
    const type = req.body.legalType;
    if (type !== "natural" && type !== "juridica")
      throw new HttpError(400, "Elige persona natural o jur\xEDdica.");
    await db2.prepare("UPDATE stores SET legal_type=? WHERE id=?").run(type, store.id);
    res.json(await documentsOf(store.id));
  });
  r.put("/negocios/:id/documentos/:kind", async (req, res) => {
    const store = await owned(db2, requireUser(res), req.params.id);
    if (!documentKinds.some((k) => k.id === req.params.kind))
      throw new HttpError(404, "Documento desconocido.");
    const name = string(req.body.name, 160, "el nombre del archivo");
    const match = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.data ?? ""));
    if (!match || !documentMimes.includes(match[1]))
      throw new HttpError(400, "Sube el documento en PDF, JPG, PNG o WEBP.");
    if (Buffer.byteLength(match[2], "base64") > documentMaxBytes)
      throw new HttpError(413, "El archivo supera los 4 MB.");
    await db2.prepare("DELETE FROM store_documents WHERE store_id=? AND kind=?").run(store.id, req.params.kind);
    await db2.prepare(
      "INSERT INTO store_documents (store_id,kind,name,mime,data,uploaded_at) VALUES (?,?,?,?,?,?)"
    ).run(store.id, req.params.kind, name, match[1], match[2], (/* @__PURE__ */ new Date()).toISOString());
    res.json(await documentsOf(store.id));
  });
  r.delete("/negocios/:id/documentos/:kind", async (req, res) => {
    const store = await owned(db2, requireUser(res), req.params.id);
    await db2.prepare("DELETE FROM store_documents WHERE store_id=? AND kind=?").run(store.id, req.params.kind);
    res.json(await documentsOf(store.id));
  });
  r.get("/negocios/:id/documentos/:kind/archivo", async (req, res) => {
    const { store } = await documentAccess(res, req.params.id);
    const doc = await db2.prepare("SELECT name,mime,data FROM store_documents WHERE store_id=? AND kind=?").get(store.id, req.params.kind);
    if (!doc) throw new HttpError(404, "Documento no encontrado.");
    res.setHeader("Content-Type", String(doc.mime));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${String(doc.name).replace(/[^\w.-]+/g, "_")}"`
    );
    res.send(Buffer.from(String(doc.data), "base64"));
  });
  r.get("/admin", async (_req, res) => {
    requireUser(res, "admin");
    const ids = (await db2.prepare("SELECT id FROM stores").all()).map((row) => row.id);
    const stores = await Promise.all(ids.map((id) => getStore(db2, id)));
    res.json({
      stores: await Promise.all(
        stores.map(async (s) => ({
          id: s.id,
          name: s.published?.design.name || s.draft.name,
          registration: s.registration,
          details: await (async () => {
            const row = await db2.prepare("SELECT review_design FROM stores WHERE id=?").get(s.id);
            const design = row?.review_design ? JSON.parse(String(row.review_design)) : s.draft;
            return {
              name: design.name,
              category: design.category,
              municipality: design.municipality,
              description: design.description,
              whatsapp: design.whatsapp,
              phone: design.phone ?? "",
              email: design.email ?? "",
              subcategory: design.subcategory ?? "",
              address: design.address,
              hours: design.hours,
              mode: design.mode,
              logo: design.logo,
              cover: design.content?.heroImage ?? "",
              products: (design.products ?? []).map(
                (p) => ({
                  name: p.name,
                  price: p.price,
                  image: p.image,
                  description: p.description
                })
              )
            };
          })(),
          ownerId: s.ownerId,
          owner: await db2.prepare("SELECT name,email,document_number,home_address FROM users WHERE id=?").get(s.ownerId),
          ...await documentsOf(s.id),
          published: !!s.published,
          settings: await settings(db2, s.id)
        }))
      ),
      pqrs: await db2.prepare(
        "SELECT p.id,p.kind,p.message,p.status,p.response,p.responded_at,u.email,u.name,p.created_at FROM pqrs p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 200"
      ).all(),
      couriers: await couriers(db2),
      users: (await db2.prepare("SELECT COUNT(*) AS n FROM users").get())?.n ?? 0,
      audit: await db2.prepare(
        "SELECT action,target,note,created_at AS at FROM admin_audit ORDER BY rowid DESC LIMIT 50"
      ).all()
    });
  });
  r.post("/admin/:type/:id", async (req, res) => {
    const actor = requireUser(res, "admin");
    const decision = req.body?.approved === true, note = string(req.body?.note, 500, "el motivo de la decisi\xF3n");
    await transaction(db2, async (db3) => {
      if (req.params.type === "registro") {
        const store = await getStore(db3, req.params.id);
        if (!store || store.registration !== "pending")
          throw new HttpError(409, "El registro ya no est\xE1 pendiente.");
        const row = await db3.prepare("SELECT review_design FROM stores WHERE id=?").get(store.id);
        if (decision && row?.review_design && !(await settings(db3, store.id)).suspended) {
          const draft = JSON.parse(String(row.review_design));
          if (!isDesign(draft)) throw new HttpError(422, "La solicitud tiene datos inv\xE1lidos.");
          await writePublication(db3, store.id, publishProject({ ...store, draft }).published);
        }
        await db3.prepare("UPDATE stores SET registration=?,review_design=NULL WHERE id=?").run(decision ? "approved" : "rejected", store.id);
        await notify(
          db3,
          store.ownerId,
          (decision ? "Registro aprobado. " : "Registro rechazado. ") + note,
          "/panel/perfil"
        );
      } else if (["suspender", "reactivar"].includes(req.params.type)) {
        const store = await getStore(db3, req.params.id);
        if (!store) throw new HttpError(404, "Negocio no encontrado.");
        const cfg = await settings(db3, store.id);
        cfg.suspended = req.params.type === "suspender";
        cfg.verification = "pending";
        cfg.verificationNote = note;
        await setSettings(db3, store.id, cfg);
        if (cfg.suspended)
          await db3.prepare("UPDATE stores SET published_version_id=NULL WHERE id=?").run(store.id);
        await notify(
          db3,
          store.ownerId,
          cfg.suspended ? "Tu publicaci\xF3n fue retirada. Revisa el motivo." : "Ya puedes volver a publicar tu negocio.",
          "/panel/configuracion"
        );
      } else if (req.params.type === "negocios") {
        const store = await getStore(db3, req.params.id);
        if (!store) throw new HttpError(404, "Negocio no encontrado.");
        if (!store.published)
          throw new HttpError(400, "El negocio debe estar publicado para revisar su sello.");
        const cfg = await settings(db3, store.id);
        cfg.verification = decision ? "approved" : "rejected";
        cfg.verificationNote = note;
        await setSettings(db3, store.id, cfg);
        await notify(
          db3,
          store.ownerId,
          decision ? `\xA1${store.published.design.name} ya tiene la insignia de negocio verificado! ${note}` : `Se retir\xF3 la verificaci\xF3n de ${store.published.design.name}. ${note}`,
          "/panel/configuracion"
        );
      } else if (req.params.type === "domiciliarios") {
        if (!(await couriers(db3)).some((c) => c.id === req.params.id))
          throw new HttpError(404, "Solicitud no encontrada.");
        await db3.prepare("UPDATE couriers SET approved=? WHERE user_id=?").run(decision ? 1 : 0, req.params.id);
        await notify(
          db3,
          req.params.id,
          decision ? "Tu perfil de domiciliario fue aprobado" : "Revisa tu solicitud de domiciliario",
          "/domiciliario"
        );
      } else throw new HttpError(404, "Acci\xF3n desconocida.");
      await db3.prepare("INSERT INTO admin_audit VALUES (?,?,?,?,?,?)").run(
        randomUUID9(),
        actor.id,
        `${req.params.type}:${decision}`,
        req.params.id,
        note,
        (/* @__PURE__ */ new Date()).toISOString()
      );
    });
    res.status(204).end();
  });
  return r;
}
