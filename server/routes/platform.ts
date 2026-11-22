import type { CatalogAI } from '../catalog-ai.ts';
import { Router } from 'express';
import { lessons as courseLessons } from '../../src/features/community/lessons.ts';
import { randomUUID } from 'node:crypto';
import { imageId, type ImageStorage } from '../images.ts';
import type { Db } from '../db.ts';
import { currentUser, requireUser } from '../auth.ts';
import { HttpError } from '../http.ts';
import { afterReview, attendEvent, createEvent, deleteEvent, listEvents } from '../rewards.ts';
import { getStore, listPublishedStores } from '../stores.ts';
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
  slots,
  state,
  string,
  transaction,
  type CreateOperation,
} from '../platform.ts';
import type { Promotion, Review } from '../../src/domain/platform.ts';
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
  r.get('/estado', (_req, res) => res.json(state(db, requireUser(res))));
  r.get('/negocios/:id', (req, res) => {
    const store = getStore(db, req.params.id);
    if (!store || (!store.published && store.ownerId !== currentUser(res)?.id))
      throw new HttpError(404, 'Negocio no encontrado.');
    const info = commerceStore(db, store.id);
    if (store.ownerId !== currentUser(res)?.id) {
      info.views = {};
      info.settings.verificationNote = '';
    }
    res.json(info);
  });
  r.get('/negocios/:id/horarios', (req, res) => {
    if (!getStore(db, req.params.id)?.published) throw new HttpError(404, 'Negocio no publicado.');
    res.json({ slots: slots(db, req.params.id, string(req.query.fecha, 10, 'la fecha')) });
  });
  const views = new Map<string, number>();
  const aiAttempts = new Map<string, { until: number; count: number }>();
  let aiBusy = false;
  r.post('/negocios/:id/visita', (req, res) => {
    const store = getStore(db, req.params.id);
    if (!store?.published) throw new HttpError(404, 'Negocio no publicado.');
    const product = typeof req.body?.productId === 'string' ? req.body.productId : '';
    if (product && !store.published.design.products.some((p) => p.id === product))
      throw new HttpError(404, 'Producto no encontrado.');
    const key = `${req.ip}|${store.id}|${product}`;
    if ((views.get(key) ?? 0) < Date.now()) {
      if (views.size > 10000) views.clear();
      views.set(key, Date.now() + 30 * 60000);
      db.prepare(
        'INSERT INTO store_views VALUES (?,?,1) ON CONFLICT(store_id,product_id) DO UPDATE SET count=count+1',
      ).run(store.id, product);
    }
    res.status(204).end();
  });
  r.post('/operaciones', (req, res) =>
    res
      .status(201)
      .json({ operation: createOperation(db, requireUser(res), req.body as CreateOperation) }),
  );
  r.post('/operaciones/:id/:action', (req, res) =>
    res.json({
      operation: actOperation(
        db,
        requireUser(res),
        req.params.id,
        req.params.action,
        req.body ?? {},
      ),
    }),
  );
  r.post('/favoritos/:id', (req, res) => {
    const user = requireUser(res);
    if (!getStore(db, req.params.id)?.published) throw new HttpError(404, 'Negocio no publicado.');
    if (
      db
        .prepare('SELECT 1 FROM favorites WHERE user_id=? AND store_id=?')
        .get(user.id, req.params.id)
    )
      db.prepare('DELETE FROM favorites WHERE user_id=? AND store_id=?').run(
        user.id,
        req.params.id,
      );
    else db.prepare('INSERT INTO favorites VALUES (?,?)').run(user.id, req.params.id);
    res.status(204).end();
  });
  r.post('/notificaciones/leidas', (_req, res) => {
    db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(requireUser(res).id);
    res.status(204).end();
  });
  r.post('/lecciones/:id', (req, res) => {
    lessonAnswer(
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
    const completed = db
      .prepare('SELECT lesson_id FROM learning WHERE user_id=?')
      .all(user.id)
      .map((row) => row.lesson_id as string);
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
  r.post('/certificado', (_req, res) => {
    const user = requireUser(res);
    const completed = db
      .prepare('SELECT lesson_id FROM learning WHERE user_id=?')
      .all(user.id)
      .map((row) => row.lesson_id as string);
    if (!courseLessons.every((l) => completed.includes(l.id)))
      throw new HttpError(
        409,
        'Completa las lecciones y sus evaluaciones antes de generar la constancia.',
      );
    db.prepare('INSERT OR IGNORE INTO certificates VALUES (?,?,?,?,?)').run(
      randomUUID(),
      user.id,
      user.name,
      courseLessons.length,
      new Date().toISOString(),
    );
    res.json(
      db
        .prepare('SELECT id,name,lessons,created_at AS at FROM certificates WHERE user_id=?')
        .get(user.id),
    );
  });
  r.get('/certificados/:id', (req, res) => {
    const certificate = db
      .prepare('SELECT id,name,lessons,created_at AS at FROM certificates WHERE id=?')
      .get(req.params.id);
    if (!certificate) throw new HttpError(404, 'Constancia no encontrada.');
    res.json(certificate);
  });
  r.post('/canjes/:id', (req, res) =>
    res.status(201).json({ coupon: redeem(db, requireUser(res), req.params.id) }),
  );
  r.post('/resenas', (req, res) => {
    const user = requireUser(res),
      op = operation(db, string(req.body?.operationId, 80, 'la operación'));
    if (
      op.clientId !== user.id ||
      !op.completedAt ||
      !['completed', 'refunded'].includes(op.status)
    )
      throw new HttpError(403, 'Solo puedes reseñar operaciones tuyas completadas.');
    const rating = integer(req.body?.rating, 1, 5, 'la calificación'),
      comment = string(req.body?.comment, 500, 'tu reseña');
    if (db.prepare('SELECT id FROM reviews WHERE operation_id=?').get(op.id))
      throw new HttpError(409, 'Ya reseñaste esta operación.');
    const courierRating =
      op.courierId && req.body.courierRating !== undefined
        ? integer(req.body.courierRating, 1, 5, 'la calificación de entrega')
        : null;
    db.prepare(
      'INSERT INTO reviews (id,operation_id,store_id,user_id,rating,comment,created_at,courier_rating) VALUES (?,?,?,?,?,?,?,?)',
    ).run(
      randomUUID(),
      op.id,
      op.storeId,
      user.id,
      rating,
      comment,
      new Date().toISOString(),
      courierRating,
    );
    afterReview(db, user.id, op.id, op.storeName);
    res.status(201).json({ ok: true });
  });
  // Ferias y eventos: lista pública; asistencia con el código que se entrega en el evento.
  r.get('/eventos', (_req, res) => res.json({ events: listEvents(db, currentUser(res)?.id) }));
  r.post('/eventos/:id/asistencia', (req, res) => {
    attendEvent(db, requireUser(res), req.params.id, req.body?.code);
    res.status(201).json({ ok: true });
  });
  r.post('/admin/eventos', (req, res) =>
    res.status(201).json({ id: createEvent(db, requireUser(res, 'admin'), req.body) }),
  );
  r.delete('/admin/eventos/:id', (req, res) => {
    requireUser(res, 'admin');
    deleteEvent(db, req.params.id);
    res.status(204).end();
  });
  r.put('/negocios/:id/configuracion', (req, res) => {
    const store = owned(db, requireUser(res), req.params.id),
      old = settings(db, store.id),
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
    setSettings(db, store.id, {
      ...old,
      delivery: v.delivery === true,
      deliveryFee: integer(v.deliveryFee, 0, 500000, 'el costo de domicilio'),
      paymentInstructions: string(v.paymentInstructions, 700, 'las instrucciones de pago', false),
      opens,
      closes,
      duration,
      latitude,
      longitude,
    });
    res.json(commerceStore(db, store.id));
  });
  r.put('/negocios/:id/inventario', (req, res) => {
    const store = owned(db, requireUser(res), req.params.id);
    const productId = string(req.body?.productId, 100, 'el producto');
    if (!store.draft.products.some((p) => p.id === productId))
      throw new HttpError(404, 'Producto no encontrado.');
    if (req.body.quantity === null)
      db.prepare('DELETE FROM inventory WHERE store_id=? AND product_id=?').run(
        store.id,
        productId,
      );
    else
      db.prepare(
        'INSERT INTO inventory VALUES (?,?,?) ON CONFLICT(store_id,product_id) DO UPDATE SET quantity=excluded.quantity',
      ).run(store.id, productId, integer(req.body.quantity, 0, 1000000, 'las existencias'));
    res.json(commerceStore(db, store.id));
  });
  r.post('/negocios/:id/promociones', (req, res) => {
    const store = owned(db, requireUser(res), req.params.id);
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
      id: randomUUID(),
      storeId: store.id,
      storeName: store.published.design.name,
      title: string(v.title, 100, 'el título'),
      percent: integer(v.percent, 1, 50, 'el descuento'),
      cost: integer(v.cost, 1, 1000000, 'los puntos de canje'),
      expires: new Date(expires).toISOString(),
      active: true,
    };
    db.prepare('INSERT INTO promotions VALUES (?,?,?)').run(
      promotion.id,
      store.id,
      JSON.stringify(promotion),
    );
    res.status(201).json({ promotion });
  });
  r.delete('/promociones/:id', (req, res) => {
    const row = db.prepare('SELECT store_id,payload FROM promotions WHERE id=?').get(req.params.id);
    if (!row) throw new HttpError(404, 'Promoción no encontrada.');
    owned(db, requireUser(res), row.store_id as string);
    const p = JSON.parse(row.payload as string) as Promotion;
    p.active = false;
    db.prepare('UPDATE promotions SET payload=? WHERE id=?').run(JSON.stringify(p), p.id);
    res.status(204).end();
  });
  r.post('/negocios/:id/verificacion', (req, res) => {
    const store = owned(db, requireUser(res), req.params.id);
    if (!store.published)
      throw new HttpError(400, 'Publica tu negocio antes de solicitar verificación.');
    const cfg = settings(db, store.id);
    if (cfg.verification === 'approved') throw new HttpError(409, 'El negocio ya está verificado.');
    cfg.verification = 'pending';
    cfg.verificationNote = string(
      req.body?.evidence,
      1000,
      'la información para verificar tu negocio',
    );
    setSettings(db, store.id, cfg);
    res.status(204).end();
  });
  r.put('/domiciliario', async (req, res) => {
    const user = requireUser(res);
    const phone = string(req.body?.phone, 16, 'tu WhatsApp');
    if (!/^\+?[1-9]\d{9,14}$/.test(phone))
      throw new HttpError(400, 'Revisa el número de WhatsApp.');
    const municipality = string(req.body?.municipality, 80, 'tu municipio');
    let avatar = typeof req.body.avatar === 'string' ? req.body.avatar : '';
    if (avatar.startsWith('data:')) avatar = (await images.upload(user.id, avatar)).url;
    if (avatar && (!imageId(avatar) || images.row(imageId(avatar)!)?.owner_id !== user.id))
      throw new HttpError(400, 'Sube tu propia foto para el perfil.');
    db.prepare(
      'INSERT INTO couriers (user_id,phone,municipality,approved,avatar) VALUES (?,?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,municipality=excluded.municipality,avatar=excluded.avatar,approved=0',
    ).run(user.id, phone, municipality, avatar);
    res.status(204).end();
  });
  r.get('/admin', (_req, res) => {
    requireUser(res, 'admin');
    res.json({
      stores: db
        .prepare('SELECT id FROM stores')
        .all()
        .map((row) => getStore(db, row.id as string)!)
        .map((s) => ({
          id: s.id,
          name: s.published?.design.name || s.draft.name,
          ownerId: s.ownerId,
          published: !!s.published,
          settings: settings(db, s.id),
        })),
      couriers: couriers(db),
      users: (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n,
      audit: db
        .prepare(
          'SELECT action,target,note,created_at AS at FROM admin_audit ORDER BY rowid DESC LIMIT 50',
        )
        .all(),
    });
  });
  r.post('/admin/:type/:id', (req, res) => {
    const actor = requireUser(res, 'admin');
    const decision = req.body?.approved === true,
      note = string(req.body?.note, 500, 'el motivo de la decisión');
    transaction(db, () => {
      if (['suspender', 'reactivar'].includes(req.params.type)) {
        const store = getStore(db, req.params.id);
        if (!store) throw new HttpError(404, 'Negocio no encontrado.');
        const cfg = settings(db, store.id);
        cfg.suspended = req.params.type === 'suspender';
        cfg.verification = 'pending';
        cfg.verificationNote = note;
        setSettings(db, store.id, cfg);
        if (cfg.suspended)
          db.prepare('UPDATE stores SET published_version_id=NULL WHERE id=?').run(store.id);
        notify(
          db,
          store.ownerId,
          cfg.suspended
            ? 'Tu publicación fue retirada. Revisa el motivo.'
            : 'Ya puedes volver a publicar tu negocio.',
          '/panel/configuracion',
        );
      } else if (req.params.type === 'negocios') {
        const store = getStore(db, req.params.id);
        if (!store) throw new HttpError(404, 'Negocio no encontrado.');
        if (!store.published)
          throw new HttpError(400, 'El negocio debe estar publicado para revisar su sello.');
        const cfg = settings(db, store.id);
        cfg.verification = decision ? 'approved' : 'rejected';
        cfg.verificationNote = note;
        setSettings(db, store.id, cfg);
        notify(
          db,
          store.ownerId,
          `Verificación de negocio: ${cfg.verification}`,
          '/panel/configuracion',
        );
      } else if (req.params.type === 'domiciliarios') {
        if (!couriers(db).some((c) => c.id === req.params.id))
          throw new HttpError(404, 'Solicitud no encontrada.');
        db.prepare('UPDATE couriers SET approved=? WHERE user_id=?').run(
          decision ? 1 : 0,
          req.params.id,
        );
        notify(
          db,
          req.params.id,
          decision
            ? 'Tu perfil de domiciliario fue aprobado'
            : 'Revisa tu solicitud de domiciliario',
          '/domiciliario',
        );
      } else throw new HttpError(404, 'Acción desconocida.');
      db.prepare('INSERT INTO admin_audit VALUES (?,?,?,?,?,?)').run(
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
  // Asistencia local basada exclusivamente en el catálogo: no se presenta como un modelo de IA.
  r.post('/asistente/:id', async (req, res) => {
    const question = string(req.body?.question, 500, 'tu pregunta').toLowerCase();
    const store = getStore(db, req.params.id);
    if (!store?.published) throw new HttpError(404, 'Negocio no publicado.');
    const d = store.published.design;
    const words = question
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\W+/)
      .filter((w) => w.length > 2);
    const matches = d.products
      .filter((p) =>
        words.some((w) =>
          `${p.name} ${p.description}`
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(w),
        ),
      )
      .slice(0, 5);
    let answer = matches.length
      ? matches
          .map(
            (p) =>
              `${p.name}: ${d.mode === 'quote' ? 'bajo cotización' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price)}. ${p.description}`,
          )
          .join('\n')
      : `En ${d.name}: ${d.description}. Puedes consultar su catálogo o contactar al negocio para confirmar detalles.`;
    if (/horario|hora|abren/.test(question))
      answer = d.hours || 'El negocio todavía no indicó su horario.';
    if (/direcci|ubic|donde/.test(question))
      answer = `${d.address || 'Dirección por confirmar'}, ${d.municipality}.`;
    let mode = 'catalogo-local';
    const user = currentUser(res);
    if (assistant && user) {
      const entry = aiAttempts.get(user.id),
        attempt =
          entry && entry.until > Date.now() ? entry : { until: Date.now() + 60000, count: 0 };
      if (aiAttempts.size > 5000) aiAttempts.clear();
      attempt.count++;
      aiAttempts.set(user.id, attempt);
      if (aiBusy || attempt.count > 8)
        throw new HttpError(429, 'El asistente está ocupado. Inténtalo en un momento.');
      aiBusy = true;
      try {
        answer = await assistant.answer(d, question);
        mode = 'ollama';
      } catch {
        mode = 'catalogo-respaldo';
        answer = 'La IA local no respondió. Te mostramos la consulta del catálogo:\n' + answer;
      } finally {
        aiBusy = false;
      }
    }
    res.json({ answer, mode });
  });
  return r;
}
