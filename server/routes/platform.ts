import type { CatalogAI } from '../catalog-ai.ts';
import { Router, type Request, type Response } from 'express';
import { lessons as courseLessons } from '../../src/features/community/lessons.ts';
import { randomUUID } from 'node:crypto';
import { imageId, type ImageStorage } from '../images.ts';
import type { Db } from '../db.ts';
import { currentUser, requireUser } from '../auth.ts';
import { pqrsRoutes } from './pqrs.ts';
import { HttpError } from '../http.ts';
import { afterReview, attendEvent, createEvent, deleteEvent, listEvents } from '../rewards.ts';
import { getStore, listPublishedStores, writePublication } from '../stores.ts';
import {
  actOperation,
  balance,
  commerceStore,
  couriers,
  createOperation,
  integer,
  lessonAnswer,
  notify,
  operation,
  owned,
  redeem,
  setSettings,
  settings,
  slotAvailability,
  setAvailability,
  setLocation,
  state,
  string,
  tracking,
  transaction,
  type CreateOperation,
} from '../platform.ts';
import {
  dayNames,
  type ProductReview,
  type Promotion,
  type Review,
} from '../../src/domain/platform.ts';
import { discountPercent } from '../../src/domain/offers.ts';
import {
  applyOffers,
  createCoupon,
  findCoupon,
  listCoupons,
  setCouponActive,
  setStoreDiscount,
} from '../offers.ts';
import { canBuyRole } from '../../src/domain/roles.ts';
import { isDesign, publishProject, type StoreDesign } from '../../src/domain/studio.ts';
import {
  documentKinds,
  documentMaxBytes,
  documentMimes,
  missingDocuments,
  type DocumentKind,
  type PersonType,
} from '../../src/domain/documents.ts';
import {
  orderLink,
  orderMessage,
  type WhatsappOrderRecord,
} from '../../src/domain/whatsapp-order.ts';

/** Comprar, reservar, cotizar y guardar favoritos es de clientes y emprendedores, no del admin. */
function requireClient(res: Response) {
  const user = requireUser(res);
  if (!canBuyRole(user.role))
    throw new HttpError(
      403,
      'La cuenta de administración no hace compras, reservas ni guarda favoritos.',
    );
  return user;
}
export function platformRoutes(db: Db, images: ImageStorage, assistant?: CatalogAI) {
  const r = Router();
  r.use((req, _res, next) => {
    if (['POST', 'PUT'].includes(req.method)) {
      if (
        req.body !== undefined &&
        (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
      )
        throw new HttpError(400, 'Envía un objeto con los datos de la solicitud.');
      req.body ??= {};
    }
    next();
  });
  r.get('/estado', async (_req, res) => res.json(await state(db, requireUser(res))));
  r.get('/negocios/:id', async (req, res) => {
    const store = await getStore(db, req.params.id);
    if (!store || (!store.published && store.ownerId !== currentUser(res)?.id))
      throw new HttpError(404, 'Negocio no encontrado.');
    const info = await commerceStore(db, store.id);
    if (store.ownerId !== currentUser(res)?.id) {
      info.views = {};
      info.settings.verificationNote = '';
    }
    res.json(info);
  });
  r.get('/negocios/:id/horarios', async (req, res) => {
    if (!(await getStore(db, req.params.id))?.published)
      throw new HttpError(404, 'Negocio no publicado.');
    // `detail` trae también las horas llenas, para mostrarlas como «Agotado».
    const detail = await slotAvailability(
      db,
      req.params.id,
      string(req.query.fecha, 10, 'la fecha'),
      typeof req.query.servicio === 'string' ? req.query.servicio : undefined,
    );
    res.json({ slots: detail.filter((s) => s.free > 0).map((s) => s.slot), detail });
  });
  const views = new Map<string, number>();
  const aiAttempts = new Map<string, { until: number; count: number }>();
  let aiBusy = false;
  r.post('/negocios/:id/visita', async (req, res) => {
    const store = await getStore(db, req.params.id);
    if (!store?.published) throw new HttpError(404, 'Negocio no publicado.');
    const product = typeof req.body?.productId === 'string' ? req.body.productId : '';
    if (product && !store.published.design.products.some((p) => p.id === product))
      throw new HttpError(404, 'Producto no encontrado.');
    const key = `${req.ip}|${store.id}|${product}`;
    if ((views.get(key) ?? 0) < Date.now()) {
      if (views.size > 10000) views.clear();
      views.set(key, Date.now() + 30 * 60000);
      await db
        .prepare(
          'INSERT INTO store_views VALUES (?,?,1) ON CONFLICT(store_id,product_id) DO UPDATE SET count=store_views.count+1',
        )
        .run(store.id, product);
    }
    res.status(204).end();
  });
  r.post('/operaciones', async (req, res) =>
    res.status(201).json({
      // Comprar, reservar y cotizar es solo de las cuentas de cliente.
      operation: await createOperation(db, requireClient(res), req.body as CreateOperation),
    }),
  );
  r.post('/operaciones/:id/:action', async (req, res) =>
    res.json({
      operation: await actOperation(
        db,
        requireUser(res),
        req.params.id,
        req.params.action,
        req.body ?? {},
      ),
    }),
  );
  r.post('/favoritos/:id', async (req, res) => {
    const user = requireClient(res);
    if (!(await getStore(db, req.params.id))?.published)
      throw new HttpError(404, 'Negocio no publicado.');
    if (
      await db
        .prepare('SELECT 1 FROM favorites WHERE user_id=? AND store_id=?')
        .get(user.id, req.params.id)
    )
      await db
        .prepare('DELETE FROM favorites WHERE user_id=? AND store_id=?')
        .run(user.id, req.params.id);
    else await db.prepare('INSERT INTO favorites VALUES (?,?)').run(user.id, req.params.id);
    res.status(204).end();
  });
  r.post('/notificaciones/leidas', async (_req, res) => {
    await db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(requireUser(res).id);
    res.status(204).end();
  });
  r.post('/lecciones/:id', async (req, res) => {
    await lessonAnswer(
      db,
      requireUser(res),
      req.params.id,
      integer(req.body?.answer, 0, 10, 'la respuesta'),
    );
    res.status(204).end();
  });
  r.post('/tutor', async (req, res) => {
    const user = requireUser(res);
    const question = string(req.body.question, 500, 'tu pregunta');
    const completed = (
      await db.prepare('SELECT lesson_id FROM learning WHERE user_id=?').all(user.id)
    ).map((row) => row.lesson_id as string);
    const next = courseLessons.find((l) => !completed.includes(l.id));
    const words = question
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);
    const lesson =
      courseLessons.find((l) =>
        words.some((w) => `${l.title} ${l.content}`.toLowerCase().includes(w)),
      ) ||
      next ||
      courseLessons[0];
    let answer = `${lesson.title}: ${lesson.content}\nEjercicio: ${lesson.exercise}`,
      mode = 'guia-local';
    if (assistant?.teach) {
      const entry = aiAttempts.get(user.id),
        attempt =
          entry && entry.until > Date.now() ? entry : { until: Date.now() + 60000, count: 0 };
      attempt.count++;
      aiAttempts.set(user.id, attempt);
      if (aiBusy || attempt.count > 8)
        throw new HttpError(429, 'El tutor está ocupado. Vuelve a intentarlo en un momento.');
      aiBusy = true;
      try {
        answer = await assistant.teach(
          {
            lessons: courseLessons.map((l) => ({
              title: l.title,
              content: l.content,
              exercise: l.exercise,
            })),
            completed: completed.length,
          },
          question,
        );
        mode = 'ollama';
      } catch {
        answer = 'La IA local no respondió. Te mostramos la guía del curso:\n' + answer;
      } finally {
        aiBusy = false;
      }
    }
    res.json({ answer, mode });
  });
  r.post('/certificado', async (_req, res) => {
    const user = requireUser(res);
    const completed = (
      await db.prepare('SELECT lesson_id FROM learning WHERE user_id=?').all(user.id)
    ).map((row) => row.lesson_id as string);
    if (!courseLessons.every((l) => completed.includes(l.id)))
      throw new HttpError(
        409,
        'Completa las lecciones y sus evaluaciones antes de generar la constancia.',
      );
    await db
      .prepare('INSERT OR IGNORE INTO certificates VALUES (?,?,?,?,?)')
      .run(randomUUID(), user.id, user.name, courseLessons.length, new Date().toISOString());
    res.json(
      await db
        .prepare('SELECT id,name,lessons,created_at AS at FROM certificates WHERE user_id=?')
        .get(user.id),
    );
  });
  r.get('/certificados/:id', async (req, res) => {
    const certificate = await db
      .prepare('SELECT id,name,lessons,created_at AS at FROM certificates WHERE id=?')
      .get(req.params.id);
    if (!certificate) throw new HttpError(404, 'Constancia no encontrada.');
    res.json(certificate);
  });
  r.post('/canjes/:id', async (req, res) =>
    res.status(201).json({ coupon: await redeem(db, requireUser(res), req.params.id) }),
  );
  r.post('/resenas', async (req, res) => {
    const user = requireUser(res),
      op = await operation(db, string(req.body?.operationId, 80, 'la operación'));
    if (
      op.clientId !== user.id ||
      !op.completedAt ||
      !['completed', 'refunded'].includes(op.status)
    )
      throw new HttpError(403, 'Solo puedes reseñar operaciones tuyas completadas.');
    const rating = integer(req.body?.rating, 1, 5, 'la calificación'),
      comment = string(req.body?.comment, 500, 'tu reseña');
    if (await db.prepare('SELECT id FROM reviews WHERE operation_id=?').get(op.id))
      throw new HttpError(409, 'Ya reseñaste esta operación.');
    const courierRating =
      op.courierId && req.body.courierRating !== undefined
        ? integer(req.body.courierRating, 1, 5, 'la calificación de entrega')
        : null;
    await db
      .prepare(
        'INSERT INTO reviews (id,operation_id,store_id,user_id,rating,comment,created_at,courier_rating) VALUES (?,?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        op.id,
        op.storeId,
        user.id,
        rating,
        comment,
        new Date().toISOString(),
        courierRating,
      );
    await afterReview(db, user.id, op.id, op.storeName);
    res.status(201).json({ ok: true });
  });
  // Reseña directa del negocio («Añadir reseña»): una por cliente; si ya existe, se actualiza.
  r.post('/negocios/:id/resenas', async (req, res) => {
    const user = requireUser(res);
    if (user.role !== 'cliente')
      throw new HttpError(403, 'Solo los clientes pueden escribir reseñas de los negocios.');
    const store = await getStore(db, req.params.id);
    if (!store?.published) throw new HttpError(404, 'Negocio no encontrado.');
    if (store.ownerId === user.id) throw new HttpError(403, 'No puedes reseñar tu propio negocio.');
    const rating = integer(req.body?.rating, 1, 5, 'la calificación'),
      comment = string(req.body?.comment, 500, 'tu reseña');
    const now = new Date().toISOString();
    const mine = await db
      .prepare('SELECT id FROM reviews WHERE store_id=? AND user_id=? AND operation_id IS NULL')
      .get<{ id: string }>(store.id, user.id);
    if (mine)
      await db
        .prepare('UPDATE reviews SET rating=?, comment=?, created_at=? WHERE id=?')
        .run(rating, comment, now, mine.id);
    else {
      await db
        .prepare(
          'INSERT INTO reviews (id,operation_id,store_id,user_id,rating,comment,created_at,courier_rating) VALUES (?,?,?,?,?,?,?,?)',
        )
        .run(randomUUID(), null, store.id, user.id, rating, comment, now, null);
      await notify(
        db,
        store.ownerId,
        `${user.name} dejó una reseña de ${rating} ${rating === 1 ? 'estrella' : 'estrellas'} en ${store.published.design.name}.`,
        `/tienda?id=${encodeURIComponent(store.id)}&ver=resenas`,
      );
    }
    res.status(mine ? 200 : 201).json({ ok: true, updated: !!mine });
  });
  /** ¿Lo compró (por WhatsApp o en una operación completada)? Solo así puede valorarlo. */
  async function boughtProduct(userId: string, storeId: string, productId: string) {
    const orders = await db
      .prepare('SELECT payload FROM whatsapp_orders WHERE client_id=? AND store_id=?')
      .all(userId, storeId);
    if (
      orders.some((o) =>
        (JSON.parse(String(o.payload)) as WhatsappOrderRecord).lines.some(
          (l) => l.productId === productId,
        ),
      )
    )
      return true;
    const ops = await db
      .prepare(
        "SELECT payload FROM operations WHERE client_id=? AND store_id=? AND status='completed'",
      )
      .all(userId, storeId);
    return ops.some((o) =>
      ((JSON.parse(String(o.payload)) as { lines?: { productId: string }[] }).lines ?? []).some(
        (l) => l.productId === productId,
      ),
    );
  }
  async function publishedProduct(storeId: string, productId: string) {
    const store = await getStore(db, storeId);
    const product = store?.published?.design.products.find((x) => x.id === productId);
    if (!store || !product) throw new HttpError(404, 'Producto no encontrado.');
    return { store, product };
  }
  r.get('/negocios/:id/productos/:productId/resenas', async (req, res) => {
    const { store } = await publishedProduct(req.params.id, req.params.productId);
    const reviews = await db
      .prepare(
        'SELECT r.id,r.product_id AS productId,r.store_id AS storeId,u.name,r.rating,r.comment,r.created_at AS createdAt FROM product_reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id=? AND r.product_id=? ORDER BY r.created_at DESC LIMIT 200',
      )
      .all(store.id, req.params.productId);
    const user = currentUser(res);
    const canReview =
      !!user &&
      store.ownerId !== user.id &&
      (await boughtProduct(user.id, store.id, req.params.productId));
    const mine = user
      ? await db
          .prepare(
            'SELECT rating,comment FROM product_reviews WHERE store_id=? AND product_id=? AND user_id=?',
          )
          .get(store.id, req.params.productId, user.id)
      : null;
    res.json({ reviews, canReview, mine: mine ?? null });
  });
  r.post('/negocios/:id/productos/:productId/resenas', async (req, res) => {
    const user = requireUser(res);
    const { store, product } = await publishedProduct(req.params.id, req.params.productId);
    if (store.ownerId === user.id)
      throw new HttpError(403, 'No puedes valorar tu propio producto.');
    if (!(await boughtProduct(user.id, store.id, product.id)))
      throw new HttpError(403, 'Solo puede valorar este producto quien lo compró o lo contrató.');
    const rating = integer(req.body?.rating, 1, 5, 'la calificación');
    const comment = String(req.body?.comment ?? '').trim();
    if (comment.length > 500)
      throw new HttpError(400, 'El comentario debe tener máximo 500 caracteres.');
    // Una valoración por persona y producto: la nueva reemplaza a la anterior.
    await db
      .prepare('DELETE FROM product_reviews WHERE store_id=? AND product_id=? AND user_id=?')
      .run(store.id, product.id, user.id);
    await db
      .prepare(
        'INSERT INTO product_reviews (id,store_id,product_id,user_id,rating,comment,created_at) VALUES (?,?,?,?,?,?,?)',
      )
      .run(randomUUID(), store.id, product.id, user.id, rating, comment, new Date().toISOString());
    res.status(201).json({ ok: true });
  });
  // Ferias y eventos: lista pública; asistencia con el código que se entrega en el evento.
  r.get('/eventos', async (_req, res) =>
    res.json({ events: await listEvents(db, currentUser(res)?.id) }),
  );
  r.post('/eventos/:id/asistencia', async (req, res) => {
    await attendEvent(db, requireUser(res), req.params.id, req.body?.code);
    res.status(201).json({ ok: true });
  });
  r.post('/admin/eventos', async (req, res) =>
    res.status(201).json({ id: await createEvent(db, requireUser(res, 'admin'), req.body) }),
  );
  r.delete('/admin/eventos/:id', async (req, res) => {
    requireUser(res, 'admin');
    await deleteEvent(db, req.params.id);
    res.status(204).end();
  });
  r.put('/negocios/:id/configuracion', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id),
      old = await settings(db, store.id),
      v = req.body;
    const opens = integer(v.opens, 0, 23, 'la hora de apertura'),
      closes = integer(v.closes, 1, 24, 'la hora de cierre'),
      duration = integer(v.duration, 15, 240, 'la duración');
    if (closes <= opens || duration > (closes - opens) * 60)
      throw new HttpError(400, 'Revisa el horario de atención.');
    const latitude = v.latitude === null || v.latitude === '' ? null : Number(v.latitude),
      longitude = v.longitude === null || v.longitude === '' ? null : Number(v.longitude);
    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180))
    )
      throw new HttpError(400, 'Revisa las coordenadas.');
    // Horario por día, cupo y bloqueos (opcionales; si faltan se conservan los anteriores).
    const week =
      v.week === undefined
        ? old.week
        : (() => {
            if (!Array.isArray(v.week) || v.week.length !== 7)
              throw new HttpError(400, 'Revisa el horario de la semana.');
            return v.week.map(
              (d: { closed?: unknown; opens?: unknown; closes?: unknown }, i: number) => {
                const closed = d?.closed === true;
                const o = integer(d?.opens, 0, 23, `la apertura del ${dayNames[i]}`),
                  c = integer(d?.closes, 1, 24, `el cierre del ${dayNames[i]}`);
                if (!closed && c <= o)
                  throw new HttpError(400, `Revisa el horario del ${dayNames[i]}.`);
                return { closed, opens: o, closes: c };
              },
            );
          })();
    const capacity =
      v.capacity === undefined ? old.capacity : integer(v.capacity, 1, 20, 'las citas simultáneas');
    const blocks =
      v.blocks === undefined
        ? old.blocks
        : (() => {
            if (!Array.isArray(v.blocks) || v.blocks.length > 200)
              throw new HttpError(400, 'Revisa los bloqueos de la agenda.');
            return v.blocks.map((b: Record<string, unknown>) => {
              const date = string(b?.date, 10, 'la fecha del bloqueo');
              const from = typeof b?.from === 'string' ? b.from : '';
              const to = typeof b?.to === 'string' ? b.to : '';
              if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
                throw new HttpError(400, 'Revisa la fecha del bloqueo.');
              if (
                (from || to) &&
                (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to) || to <= from)
              )
                throw new HttpError(400, 'Revisa las horas del bloqueo.');
              return {
                id: typeof b?.id === 'string' && b.id.length <= 60 ? b.id : randomUUID(),
                date,
                from,
                to,
                note: string(b?.note ?? '', 120, 'la nota del bloqueo', false),
              };
            });
          })();
    await setSettings(db, store.id, {
      ...old,
      week,
      capacity,
      blocks,
      delivery: v.delivery === true,
      deliveryFee: integer(v.deliveryFee, 0, 500000, 'el costo de domicilio'),
      paymentInstructions: string(v.paymentInstructions, 700, 'las instrucciones de pago', false),
      opens,
      closes,
      duration,
      latitude,
      longitude,
    });
    res.json(await commerceStore(db, store.id));
  });
  r.put('/negocios/:id/inventario', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    const productId = string(req.body?.productId, 100, 'el producto');
    if (!store.draft.products.some((p) => p.id === productId))
      throw new HttpError(404, 'Producto no encontrado.');
    if (req.body.quantity === null)
      await db
        .prepare('DELETE FROM inventory WHERE store_id=? AND product_id=?')
        .run(store.id, productId);
    else
      await db
        .prepare(
          'INSERT INTO inventory VALUES (?,?,?) ON CONFLICT(store_id,product_id) DO UPDATE SET quantity=excluded.quantity',
        )
        .run(store.id, productId, integer(req.body.quantity, 0, 1000000, 'las existencias'));
    res.json(await commerceStore(db, store.id));
  });
  /** Crea un bono (POST) o edita uno activo (PUT con :promo). */
  const savePromotion = async (req: Request<{ id: string; promo?: string }>, res: Response) => {
    const store = await owned(db, requireUser(res), req.params.id);
    if (store.published?.design.mode !== 'products')
      throw new HttpError(400, 'Publica un negocio de productos antes de crear bonos.');
    const v = req.body;
    const expires = string(v.expires, 35, 'el vencimiento');
    if (
      !Number.isFinite(Date.parse(expires)) ||
      Date.parse(expires) <= Date.now() ||
      Date.parse(expires) > Date.now() + 365 * 86400000
    )
      throw new HttpError(400, 'Elige un vencimiento futuro dentro de un año.');
    const promotion: Promotion = {
      id: req.params.promo || randomUUID(),
      storeId: store.id,
      storeName: store.published.design.name,
      title: string(v.title, 100, 'el título'),
      percent: integer(v.percent, 1, 50, 'el descuento'),
      cost: integer(v.cost, 1, 1000000, 'los puntos de canje'),
      expires: new Date(expires).toISOString(),
      active: true,
    };
    if (req.params.promo) {
      await transaction(db, async (tx) => {
        const row = await tx
          .prepare('SELECT payload FROM promotions WHERE id=? AND store_id=?')
          .get(promotion.id, store.id);
        if (!row || !(JSON.parse(String(row.payload)) as Promotion).active)
          throw new HttpError(404, 'No encontramos una promoción activa de tu negocio.');
        await tx
          .prepare('UPDATE promotions SET payload=? WHERE id=? AND store_id=?')
          .run(JSON.stringify(promotion), promotion.id, store.id);
      });
      res.json({ promotion });
      return;
    }
    await db
      .prepare('INSERT INTO promotions VALUES (?,?,?)')
      .run(promotion.id, store.id, JSON.stringify(promotion));
    res.status(201).json({ promotion });
  };
  // Promociones y reseñas (panel del negocio): descuento para todo el negocio, cupones con
  // código y reseñas del negocio y de sus productos. Solo el dueño.
  r.get('/negocios/:id/promociones-panel', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    res.json({
      discount: (await settings(db, store.id)).storeDiscount ?? null,
      coupons: await listCoupons(db, store.id),
    });
  });
  r.put('/negocios/:id/descuento', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    res.json({ discount: await setStoreDiscount(db, store.id, req.body ?? {}) });
  });
  r.post('/negocios/:id/cupones', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    res.status(201).json({ coupon: await createCoupon(db, store.id, req.body ?? {}) });
  });
  r.put('/negocios/:id/cupones/:cupon', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    await setCouponActive(db, store.id, req.params.cupon, req.body?.active === true);
    res.json({ coupons: await listCoupons(db, store.id) });
  });
  r.get('/negocios/:id/resenas', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    const products = store.published?.design.products ?? store.draft.products ?? [];
    const names = new Map(products.map((p) => [p.id, p.name]));
    const storeReviews = await db
      .prepare(
        'SELECT r.id,r.operation_id AS operationId,r.store_id AS storeId,u.name,r.rating,r.comment,r.created_at AS createdAt FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id=? ORDER BY r.created_at DESC LIMIT 500',
      )
      .all<Review>(store.id);
    const productReviews = (
      await db
        .prepare(
          'SELECT r.id,r.product_id AS productId,r.store_id AS storeId,u.name,r.rating,r.comment,r.created_at AS createdAt FROM product_reviews r JOIN users u ON u.id=r.user_id WHERE r.store_id=? ORDER BY r.created_at DESC LIMIT 500',
        )
        .all<Omit<ProductReview, 'productName'>>(store.id)
    ).map((r) => ({ ...r, productName: names.get(r.productId) ?? 'Producto retirado' }));
    res.json({ store: storeReviews, products: productReviews });
  });
  /** El carrito y la reserva comprueban un cupón antes de enviar el pedido. */
  r.post('/cupones/validar', async (req, res) => {
    requireUser(res);
    const store = await getStore(db, string(req.body?.storeId, 100, 'el negocio'));
    if (!store?.published) throw new HttpError(404, 'Negocio no encontrado.');
    const coupon = await findCoupon(db, store.id, string(req.body?.code, 40, 'el código'));
    const storePercent = discountPercent((await settings(db, store.id)).storeDiscount);
    res.json({ code: coupon.code, percent: coupon.percent, storePercent });
  });
  r.post('/negocios/:id/promociones', savePromotion);
  r.put('/negocios/:id/promociones/:promo', savePromotion);
  r.delete('/promociones/:id', async (req, res) => {
    const row = await db
      .prepare('SELECT store_id,payload FROM promotions WHERE id=?')
      .get(req.params.id);
    if (!row) throw new HttpError(404, 'Promoción no encontrada.');
    await owned(db, requireUser(res), row.store_id as string);
    const p = JSON.parse(row.payload as string) as Promotion;
    p.active = false;
    await db.prepare('UPDATE promotions SET payload=? WHERE id=?').run(JSON.stringify(p), p.id);
    res.status(204).end();
  });
  r.post('/negocios/:id/verificacion', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    if (!store.published)
      throw new HttpError(400, 'Publica tu negocio antes de solicitar verificación.');
    const cfg = await settings(db, store.id);
    if (cfg.verification === 'approved') throw new HttpError(409, 'El negocio ya está verificado.');
    cfg.verification = 'pending';
    cfg.verificationNote = string(
      req.body?.evidence,
      1000,
      'la información para verificar tu negocio',
    );
    await setSettings(db, store.id, cfg);
    res.status(204).end();
  });
  r.put('/domiciliario', async (req, res) => {
    const user = requireUser(res);
    const phone = string(req.body?.phone, 16, 'tu WhatsApp');
    if (!/^\+?[1-9]\d{9,14}$/.test(phone))
      throw new HttpError(400, 'Revisa el número de WhatsApp.');
    const municipality = string(req.body?.municipality, 80, 'tu municipio');
    const vehicle = string(req.body?.vehicle ?? '', 40, 'el vehículo', false);
    let avatar = typeof req.body.avatar === 'string' ? req.body.avatar : '';
    if (avatar.startsWith('data:')) avatar = (await images.upload(user.id, avatar)).url;
    if (avatar && (!imageId(avatar) || (await images.row(imageId(avatar)!))?.owner_id !== user.id))
      throw new HttpError(400, 'Sube tu propia foto para el perfil.');
    await db
      .prepare(
        'INSERT INTO couriers (user_id,phone,municipality,approved,avatar,vehicle) VALUES (?,?,?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,municipality=excluded.municipality,avatar=excluded.avatar,vehicle=excluded.vehicle,approved=0,available=0',
      )
      .run(user.id, phone, municipality, avatar, vehicle);
    res.status(204).end();
  });
  r.put('/domiciliario/disponible', async (req, res) => {
    await setAvailability(db, requireUser(res), req.body?.available === true);
    res.status(204).end();
  });
  r.put('/domiciliario/ubicacion', async (req, res) => {
    await setLocation(db, requireUser(res), req.body?.lat, req.body?.lng);
    res.status(204).end();
  });
  r.get('/operaciones/:id/rastreo', async (req, res) =>
    res.json(await tracking(db, requireUser(res), req.params.id)),
  );
  r.use(pqrsRoutes(db));
  // Compra por WhatsApp: se arma el mensaje con los precios publicados (no los del navegador),
  // queda el registro para el cliente y el negocio, y se devuelve el enlace a wa.me.
  r.post('/compras-whatsapp', async (req, res) => {
    const user = requireClient(res);
    const store = await getStore(db, string(req.body.storeId, 100, 'el negocio'));
    const design = store?.published?.design;
    if (!store || !design || design.mode !== 'products')
      throw new HttpError(404, 'Este negocio no recibe compras en este momento.');
    if (store.ownerId === user.id)
      throw new HttpError(400, 'No puedes comprar en tu propio negocio.');
    if (!Array.isArray(req.body.items) || !req.body.items.length || req.body.items.length > 60)
      throw new HttpError(400, 'Agrega productos al carrito.');
    const lines = (req.body.items as unknown[]).map((item) => {
      const it = (item ?? {}) as { productId?: unknown; quantity?: unknown };
      const product = design.products.find((p) => p.id === it.productId);
      const quantity = Number(it.quantity);
      if (!product)
        throw new HttpError(409, 'Un producto ya no está en el catálogo. Revisa tu carrito.');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
        throw new HttpError(400, 'Revisa las cantidades.');
      return { productId: product.id, name: product.name, price: product.price, quantity };
    });
    const rawNote = req.body.note ?? '';
    if (typeof rawNote !== 'string' || rawNote.length > 500)
      throw new HttpError(400, 'La nota debe tener máximo 500 caracteres.');
    const note = rawNote.trim();
    const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
    if (!orderLink(design.whatsapp, ''))
      throw new HttpError(409, 'Este negocio no tiene WhatsApp registrado.');
    // Descuento del negocio o cupón: el mayor (no se acumulan). Lo calcula el servidor.
    const offer = await applyOffers(db, store.id, subtotal, req.body.code);
    const order: WhatsappOrderRecord = {
      id: randomUUID(),
      storeId: store.id,
      storeName: design.name,
      clientName: user.name,
      lines,
      subtotal,
      discount: offer.amount,
      discountLabel: offer.label,
      total: subtotal - offer.amount,
      note,
      createdAt: new Date().toISOString(),
    };
    const message = orderMessage(order);
    const url = orderLink(design.whatsapp, message);
    if (!url) throw new HttpError(409, 'Este negocio no tiene WhatsApp registrado.');
    await db
      .prepare(
        'INSERT INTO whatsapp_orders (id,store_id,client_id,payload,created_at) VALUES (?,?,?,?,?)',
      )
      .run(order.id, store.id, user.id, JSON.stringify(order), order.createdAt);
    await notify(
      db,
      store.ownerId,
      `Nuevo pedido por WhatsApp de ${user.name}: ${lines.reduce((n, l) => n + l.quantity, 0)} producto(s).`,
      '/panel',
    );
    res.status(201).json({ order, url, message });
  });
  /** Pedidos por WhatsApp hechos por la cuenta y recibidos en sus negocios. */
  r.get('/compras-whatsapp', async (_req, res) => {
    const user = requireUser(res);
    const mine = await db
      .prepare(
        'SELECT payload FROM whatsapp_orders WHERE client_id=? ORDER BY created_at DESC LIMIT 100',
      )
      .all(user.id);
    const received = await db
      .prepare(
        'SELECT w.payload FROM whatsapp_orders w JOIN stores s ON s.id=w.store_id WHERE s.owner_id=? ORDER BY w.created_at DESC LIMIT 100',
      )
      .all(user.id);
    const read = (rows: { payload?: unknown }[]) =>
      rows.map((row) => JSON.parse(String(row.payload)) as WhatsappOrderRecord);
    res.json({ mine: read(mine), received: read(received) });
  });

  // Documentos del registro: los ve el dueño y la administración (nadie más).
  async function documentAccess(res: Response, storeId: string) {
    const user = requireUser(res);
    const store = await getStore(db, storeId);
    if (!store || (store.ownerId !== user.id && user.role !== 'admin'))
      throw new HttpError(404, 'No encontramos el negocio.');
    return { user, store };
  }
  async function documentsOf(storeId: string) {
    const row = await db
      .prepare('SELECT legal_type FROM stores WHERE id=?')
      .get<{ legal_type: string }>(storeId);
    const legalType: PersonType = row?.legal_type === 'juridica' ? 'juridica' : 'natural';
    const documents = (
      await db
        .prepare(
          'SELECT kind,name,mime,uploaded_at FROM store_documents WHERE store_id=? ORDER BY kind',
        )
        .all(storeId)
    ).map((d) => ({
      kind: d.kind as DocumentKind,
      name: String(d.name),
      mime: String(d.mime),
      uploadedAt: String(d.uploaded_at),
    }));
    return { legalType, documents, missing: missingDocuments(legalType, documents) };
  }
  r.get('/negocios/:id/documentos', async (req, res) => {
    const { store } = await documentAccess(res, req.params.id);
    res.json(await documentsOf(store.id));
  });
  r.put('/negocios/:id/tipo-legal', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    const type = req.body.legalType;
    if (type !== 'natural' && type !== 'juridica')
      throw new HttpError(400, 'Elige persona natural o jurídica.');
    await db.prepare('UPDATE stores SET legal_type=? WHERE id=?').run(type, store.id);
    res.json(await documentsOf(store.id));
  });
  r.put('/negocios/:id/documentos/:kind', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    if (!documentKinds.some((k) => k.id === req.params.kind))
      throw new HttpError(404, 'Documento desconocido.');
    const name = string(req.body.name, 160, 'el nombre del archivo');
    const match = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.data ?? ''));
    if (!match || !(documentMimes as readonly string[]).includes(match[1]))
      throw new HttpError(400, 'Sube el documento en PDF, JPG, PNG o WEBP.');
    if (Buffer.byteLength(match[2], 'base64') > documentMaxBytes)
      throw new HttpError(413, 'El archivo supera los 4 MB.');
    await db
      .prepare('DELETE FROM store_documents WHERE store_id=? AND kind=?')
      .run(store.id, req.params.kind);
    await db
      .prepare(
        'INSERT INTO store_documents (store_id,kind,name,mime,data,uploaded_at) VALUES (?,?,?,?,?,?)',
      )
      .run(store.id, req.params.kind, name, match[1], match[2], new Date().toISOString());
    res.json(await documentsOf(store.id));
  });
  r.delete('/negocios/:id/documentos/:kind', async (req, res) => {
    const store = await owned(db, requireUser(res), req.params.id);
    await db
      .prepare('DELETE FROM store_documents WHERE store_id=? AND kind=?')
      .run(store.id, req.params.kind);
    res.json(await documentsOf(store.id));
  });
  r.get('/negocios/:id/documentos/:kind/archivo', async (req, res) => {
    const { store } = await documentAccess(res, req.params.id);
    const doc = await db
      .prepare('SELECT name,mime,data FROM store_documents WHERE store_id=? AND kind=?')
      .get(store.id, req.params.kind);
    if (!doc) throw new HttpError(404, 'Documento no encontrado.');
    res.setHeader('Content-Type', String(doc.mime));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Un PDF o una imagen no deben poder ejecutar código en el dominio de SucreIA.
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${String(doc.name).replace(/[^\w.-]+/g, '_')}"`,
    );
    res.send(Buffer.from(String(doc.data), 'base64'));
  });
  r.get('/admin', async (_req, res) => {
    requireUser(res, 'admin');
    const ids = (await db.prepare('SELECT id FROM stores').all()).map((row) => row.id as string);
    const stores = await Promise.all(ids.map((id) => getStore(db, id)));
    res.json({
      stores: await Promise.all(
        stores.map(async (s) => ({
          id: s!.id,
          name: s!.published?.design.name || s!.draft.name,
          registration: s!.registration,
          // Lo que se revisa: el diseño enviado a revisión (o el borrador si no hay envío).
          details: await (async () => {
            const row = await db
              .prepare('SELECT review_design FROM stores WHERE id=?')
              .get<{ review_design: string | null }>(s!.id);
            const design: StoreDesign = row?.review_design
              ? JSON.parse(String(row.review_design))
              : s!.draft;
            return {
              name: design.name,
              category: design.category,
              municipality: design.municipality,
              description: design.description,
              whatsapp: design.whatsapp,
              phone: design.phone ?? '',
              email: design.email ?? '',
              subcategory: design.subcategory ?? '',
              address: design.address,
              hours: design.hours,
              mode: design.mode,
              logo: design.logo,
              cover: design.content?.heroImage ?? '',
              products: (design.products ?? []).map((p) => ({
                name: p.name,
                price: p.price,
                image: p.image,
                description: p.description,
              })),
            };
          })(),
          ownerId: s!.ownerId,
          owner: await db
            .prepare('SELECT name,email,document_number,home_address FROM users WHERE id=?')
            .get(s!.ownerId),
          ...(await documentsOf(s!.id)),
          published: !!s!.published,
          settings: await settings(db, s!.id),
        })),
      ),
      pqrs: await db
        .prepare(
          'SELECT p.id,p.kind,p.message,p.status,p.response,p.responded_at,u.email,u.name,p.created_at FROM pqrs p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 200',
        )
        .all(),
      couriers: await couriers(db),
      users: (await db.prepare('SELECT COUNT(*) AS n FROM users').get<{ n: number }>())?.n ?? 0,
      audit: await db
        .prepare(
          'SELECT action,target,note,created_at AS at FROM admin_audit ORDER BY rowid DESC LIMIT 50',
        )
        .all(),
    });
  });
  r.post('/admin/:type/:id', async (req, res) => {
    const actor = requireUser(res, 'admin');
    const decision = req.body?.approved === true,
      note = string(req.body?.note, 500, 'el motivo de la decisión');
    await transaction(db, async (db) => {
      if (req.params.type === 'registro') {
        // Aprobar el registro publica la versión enviada a revisión (salvo negocio suspendido).
        const store = await getStore(db, req.params.id);
        if (!store || store.registration !== 'pending')
          throw new HttpError(409, 'El registro ya no está pendiente.');
        const row = await db
          .prepare('SELECT review_design FROM stores WHERE id=?')
          .get<{ review_design: string | null }>(store.id);
        if (decision && row?.review_design && !(await settings(db, store.id)).suspended) {
          const draft = JSON.parse(String(row.review_design));
          if (!isDesign(draft)) throw new HttpError(422, 'La solicitud tiene datos inválidos.');
          await writePublication(db, store.id, publishProject({ ...store, draft }).published!);
        }
        await db
          .prepare('UPDATE stores SET registration=?,review_design=NULL WHERE id=?')
          .run(decision ? 'approved' : 'rejected', store.id);
        await notify(
          db,
          store.ownerId,
          (decision ? 'Registro aprobado. ' : 'Registro rechazado. ') + note,
          '/panel/perfil',
        );
      } else if (['suspender', 'reactivar'].includes(req.params.type)) {
        const store = await getStore(db, req.params.id);
        if (!store) throw new HttpError(404, 'Negocio no encontrado.');
        const cfg = await settings(db, store.id);
        cfg.suspended = req.params.type === 'suspender';
        cfg.verification = 'pending';
        cfg.verificationNote = note;
        await setSettings(db, store.id, cfg);
        if (cfg.suspended)
          await db.prepare('UPDATE stores SET published_version_id=NULL WHERE id=?').run(store.id);
        await notify(
          db,
          store.ownerId,
          cfg.suspended
            ? 'Tu publicación fue retirada. Revisa el motivo.'
            : 'Ya puedes volver a publicar tu negocio.',
          '/panel/configuracion',
        );
      } else if (req.params.type === 'negocios') {
        const store = await getStore(db, req.params.id);
        if (!store) throw new HttpError(404, 'Negocio no encontrado.');
        if (!store.published)
          throw new HttpError(400, 'El negocio debe estar publicado para revisar su sello.');
        const cfg = await settings(db, store.id);
        cfg.verification = decision ? 'approved' : 'rejected';
        cfg.verificationNote = note;
        await setSettings(db, store.id, cfg);
        await notify(
          db,
          store.ownerId,
          decision
            ? `¡${store.published.design.name} ya tiene la insignia de negocio verificado! ${note}`
            : `Se retiró la verificación de ${store.published.design.name}. ${note}`,
          '/panel/configuracion',
        );
      } else if (req.params.type === 'domiciliarios') {
        if (!(await couriers(db)).some((c) => c.id === req.params.id))
          throw new HttpError(404, 'Solicitud no encontrada.');
        await db
          .prepare('UPDATE couriers SET approved=? WHERE user_id=?')
          .run(decision ? 1 : 0, req.params.id);
        await notify(
          db,
          req.params.id,
          decision
            ? 'Tu perfil de domiciliario fue aprobado'
            : 'Revisa tu solicitud de domiciliario',
          '/domiciliario',
        );
      } else throw new HttpError(404, 'Acción desconocida.');
      await db
        .prepare('INSERT INTO admin_audit VALUES (?,?,?,?,?,?)')
        .run(
          randomUUID(),
          actor.id,
          `${req.params.type}:${decision}`,
          req.params.id,
          note,
          new Date().toISOString(),
        );
    });
    res.status(204).end();
  });
  return r;
}
