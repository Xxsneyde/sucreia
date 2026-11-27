import { Router } from 'express';
import { currentUser, requireUser } from '../auth.ts';
import { HttpError } from '../http.ts';
import type { ImageStorage } from '../images.ts';
export function imageRoutes(storage: ImageStorage) {
  const router = Router();
  router.get('/', async (_req, res) => {
    const user = requireUser(res);
    res.json({ images: await storage.list(user.id) });
  });
  router.post('/', async (req, res) => {
    const user = requireUser(res);
    if (typeof req.body?.data !== 'string') throw new HttpError(400, 'Selecciona una imagen.');
    res.status(201).json({ image: await storage.upload(user.id, req.body.data) });
  });
  router.get('/:file', async (req, res) => {
    const match = /^([a-f0-9]{64})(-480)?\.webp$/.exec(req.params.file);
    if (!match) throw new HttpError(404, 'Imagen no encontrada.');
    const { data, isPublic } = await storage.read(match[1], currentUser(res)?.id, !!match[2]);
    // El nombre es el hash del contenido: una foto publicada nunca cambia.
    res.setHeader('Cache-Control', isPublic ? 'public, max-age=86400' : 'private, no-store');
    res.type('image/webp').send(data);
  });
  router.delete('/:id', async (req, res) => {
    await storage.remove(requireUser(res).id, req.params.id);
    res.status(204).end();
  });
  return router;
}
