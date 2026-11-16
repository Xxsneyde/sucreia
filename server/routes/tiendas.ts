import { Router, type Response } from 'express';
import type { Db } from '../db.ts';
import { HttpError } from '../http.ts';
import { requireUser } from '../auth.ts';
import {
  isDesign,
  publishProject,
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

const MAX_STORES = 30;

/** Valida el diseño con las mismas reglas que el navegador (src/domain). */
function readDesign(body: unknown): StoreDesign {
  const design = upgradeDesign((body as { design?: unknown } | undefined)?.design);
  if (!isDesign(design)) throw new HttpError(400, 'El diseño de la tienda no es válido.');
  return design;
}

/** Tiendas publicadas: cualquier persona puede verlas. */
export function publicStoreRoutes(db: Db) {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json({ stores: listPublishedStores(db).map((p) => toBusiness(p)) });
  });
  router.get('/:id', (req, res) => {
    const store = getStore(db, req.params.id);
    if (!store?.published) throw new HttpError(404, 'Esta tienda no existe o no está publicada.');
    res.json({ id: store.id, publishedAt: store.published.at, design: store.published.design });
  });
  return router;
}

/** Tiendas del emprendedor con sesión iniciada (el administrador puede gestionar cualquiera). */
export function ownerStoreRoutes(db: Db) {
  const router = Router();
  const owned = (res: Response, id: string) => {
    const user = requireUser(res, 'emprendedor', 'admin');
    const store = getStore(db, id);
    // 404 también si es de otra persona: no revelamos qué tiendas existen.
    if (!store || (store.ownerId !== user.id && user.role !== 'admin'))
      throw new HttpError(404, 'No encontramos esa tienda.');
    return store;
  };

  router.get('/', (_req, res) => {
    const user = requireUser(res, 'emprendedor', 'admin');
    res.json({ stores: listStoresByOwner(db, user.id) });
  });
  router.post('/', (req, res) => {
    const user = requireUser(res, 'emprendedor', 'admin');
    const design = readDesign(req.body);
    if (countStoresByOwner(db, user.id) >= MAX_STORES)
      throw new HttpError(409, `Puedes tener hasta ${MAX_STORES} tiendas.`);
    res.status(201).json({ store: createStore(db, user.id, design) });
  });
  router.get('/:id', (req, res) => {
    res.json({ store: owned(res, req.params.id) });
  });
  router.put('/:id', (req, res) => {
    const store = owned(res, req.params.id);
    res.json({ store: updateDraft(db, store.id, readDesign(req.body)) });
  });
  router.post('/:id/publicar', (req, res) => {
    const store = owned(res, req.params.id);
    let published;
    try {
      published = publishProject(store);
    } catch (error) {
      throw new HttpError(422, (error as Error).message);
    }
    res.json({ store: savePublication(db, store.id, published.published!) });
  });
  router.delete('/:id/publicacion', (req, res) => {
    const store = owned(res, req.params.id);
    res.json({ store: unpublish(db, store.id) });
  });
  router.delete('/:id', (req, res) => {
    const store = owned(res, req.params.id);
    deleteStore(db, store.id);
    res.status(204).end();
  });
  return router;
}
