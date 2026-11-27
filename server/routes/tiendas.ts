import { Router, type Response } from 'express';
import { settings, setSettings, storeSummaries } from '../platform.ts';
import type { ImageStorage } from '../images.ts';
import type { Db } from '../db.ts';
import { HttpError } from '../http.ts';
import { requireUser } from '../auth.ts';
import {
  isDesign,
  publishProject,
  registrationErrors,
  toBusiness,
  upgradeDesign,
  type StoreDesign,
} from '../../src/domain/studio.ts';
import {
  countStoresByOwner,
  createStore,
  deleteStore,
  getStore,
  listPublishedStores,
  listStoresByOwner,
  savePublication,
  unpublish,
  updateDraft,
} from '../stores.ts';
import { documentKinds, missingDocuments } from '../../src/domain/documents.ts';

const MAX_STORES = 30;
/** Versión de los términos que se aceptan al crear un negocio (igual que src/lib/studio-store.ts). */
const TERMS_VERSION = '2026-11-23';

/** Valida el diseño con las mismas reglas que el navegador (src/domain). */
function readDesign(body: unknown): StoreDesign {
  const design = upgradeDesign((body as { design?: unknown } | undefined)?.design);
  if (!isDesign(design)) throw new HttpError(400, 'El diseño de la tienda no es válido.');
  return design;
}

/** Tiendas publicadas: cualquier persona puede verlas. */
export function publicStoreRoutes(db: Db) {
  const router = Router();
  router.get('/', async (_req, res) => {
    const published = await listPublishedStores(db);
    const summaries = await storeSummaries(
      db,
      published.map((p) => p.id),
    );
    res.json({
      stores: published.map((p) => ({ ...toBusiness(p)!, ...summaries.get(p.id)! })),
    });
  });
  router.get('/:id', async (req, res) => {
    const store = await getStore(db, req.params.id);
    if (!store?.published) throw new HttpError(404, 'Esta tienda no existe o no está publicada.');
    res.json({ id: store.id, publishedAt: store.published.at, design: store.published.design });
  });
  return router;
}

/** Tiendas del emprendedor con sesión iniciada (el administrador puede gestionar cualquiera). */
export function ownerStoreRoutes(db: Db, images: ImageStorage) {
  const router = Router();
  const owned = async (res: Response, id: string) => {
    const user = requireUser(res, 'emprendedor', 'admin');
    const store = await getStore(db, id);
    // 404 también si es de otra persona: no revelamos qué tiendas existen.
    if (!store || store.ownerId !== user.id) throw new HttpError(404, 'No encontramos esa tienda.');
    return store;
  };

  router.get('/', async (_req, res) => {
    const user = requireUser(res, 'emprendedor', 'admin');
    res.json({ stores: await listStoresByOwner(db, user.id) });
  });
  router.post('/', async (req, res) => {
    const user = requireUser(res, 'emprendedor', 'admin');
    if (req.body?.termsVersion !== TERMS_VERSION)
      throw new HttpError(400, 'Acepta los términos para crear el negocio.');
    const design = await images.externalize(user.id, readDesign(req.body));
    if ((await countStoresByOwner(db, user.id)) >= MAX_STORES)
      throw new HttpError(409, `Puedes tener hasta ${MAX_STORES} tiendas.`);
    res.status(201).json({ store: await createStore(db, user.id, design, TERMS_VERSION) });
  });
  router.get('/:id', async (req, res) => {
    res.json({ store: await owned(res, req.params.id) });
  });
  router.put('/:id', async (req, res) => {
    const store = await owned(res, req.params.id);
    res.json({
      store: await updateDraft(
        db,
        store.id,
        await images.externalize(store.ownerId, readDesign(req.body)),
      ),
    });
  });
  router.post('/:id/publicar', async (req, res) => {
    const store = await owned(res, req.params.id);
    const cfg = await settings(db, store.id);
    if (cfg.suspended)
      throw new HttpError(
        403,
        'La administración retiró esta publicación. Revisa el motivo en la configuración y solicita revisión.',
      );
    let published;
    try {
      published = publishProject(store);
    } catch (error) {
      throw new HttpError(422, (error as Error).message);
    }
    // Primer envío (o tras un rechazo): el registro completo con sus documentos va a revisión de
    // la administración, que publica la versión enviada al aprobarla.
    if (store.registration !== 'approved') {
      const errors = registrationErrors(published.published!.design);
      const legal = await db
        .prepare('SELECT legal_type FROM stores WHERE id=?')
        .get<{ legal_type: string }>(store.id);
      const docs = await db
        .prepare('SELECT kind FROM store_documents WHERE store_id=?')
        .all(store.id);
      const missing = missingDocuments(
        legal?.legal_type === 'juridica' ? 'juridica' : 'natural',
        docs.map((d) => ({ kind: String(d.kind) })),
      );
      if (missing.length)
        errors.push(
          `Adjunta: ${missing.map((k) => documentKinds.find((x) => x.id === k)!.label).join(', ')}.`,
        );
      if (errors.length)
        throw new HttpError(422, `Completa el registro antes de enviarlo: ${errors.join(' ')}`);
    }
    const queued = await db
      .prepare(
        "UPDATE stores SET registration='pending', review_design=? WHERE id=? AND registration <> 'approved'",
      )
      .run(JSON.stringify(published.published!.design), store.id);
    if (queued.changes) {
      res.status(202).json({ store: await getStore(db, store.id) });
      return;
    }
    if (
      store.published &&
      ['name', 'whatsapp', 'address'].some(
        (key) => store.published!.design[key as 'name'] !== store.draft[key as 'name'],
      ) &&
      cfg.verification === 'approved'
    ) {
      cfg.verification = 'pending';
      cfg.verificationNote = 'Cambió la identidad o contacto del negocio; requiere revisión.';
      await setSettings(db, store.id, cfg);
    }
    res.json({ store: await savePublication(db, store.id, published.published!) });
  });
  router.delete('/:id/publicacion', async (req, res) => {
    const store = await owned(res, req.params.id);
    res.json({ store: await unpublish(db, store.id) });
  });
  router.delete('/:id', async (req, res) => {
    const store = await owned(res, req.params.id);
    if (
      (await db.prepare('SELECT id FROM operations WHERE store_id=? LIMIT 1').get(store.id)) ||
      (await db.prepare('SELECT id FROM promotions WHERE store_id=? LIMIT 1').get(store.id))
    )
      throw new HttpError(
        409,
        'Este negocio tiene operaciones o bonos. Retira su publicación para conservar el historial.',
      );
    await deleteStore(db, store.id);
    res.status(204).end();
  });
  return router;
}
