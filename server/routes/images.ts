import { Router } from 'express';
import { currentUser, requireUser } from '../auth.ts';
import { HttpError } from '../http.ts';
import type { ImageStorage } from '../images.ts';
export function imageRoutes(storage: ImageStorage) {
  const router = Router();
  router.get('/', (_req, res) => {
    const user = requireUser(res);
    res.json({ images: storage.list(user.id) });
  });
  router.post('/', async (req, res) => {
    const user = requireUser(res);
    if (typeof req.body?.data !== 'string') throw new HttpError(400, 'Selecciona una imagen.');
    res.status(201).json({ image: await storage.upload(user.id, req.body.data) });
  });
  router.get('/:file', (req, res) => {
    const id = /^([a-f0-9]{64})\.webp$/.exec(req.params.file)?.[1];
    if (!id) throw new HttpError(404, 'Imagen no encontrada.');
    res.type('image/webp').send(storage.read(id, currentUser(res)?.id));
  });
  router.delete('/:id', (req, res) => {
    storage.remove(requireUser(res).id, req.params.id);
    res.status(204).end();
  });
  return router;
}
