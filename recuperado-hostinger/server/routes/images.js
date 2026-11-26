// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var import_express4 = __toESM(require_express2(), 1);
function imageRoutes(storage) {
  const router = (0, import_express4.Router)();
  router.get("/", async (_req, res) => {
    const user = requireUser(res);
    res.json({ images: await storage.list(user.id) });
  });
  router.post("/", async (req, res) => {
    const user = requireUser(res);
    if (typeof req.body?.data !== "string") throw new HttpError(400, "Selecciona una imagen.");
    res.status(201).json({ image: await storage.upload(user.id, req.body.data) });
  });
  router.get("/:file", async (req, res) => {
    const match = /^([a-f0-9]{64})(-480)?\.webp$/.exec(req.params.file);
    if (!match) throw new HttpError(404, "Imagen no encontrada.");
    const { data, isPublic } = await storage.read(match[1], currentUser(res)?.id, !!match[2]);
    res.setHeader("Cache-Control", isPublic ? "public, max-age=86400" : "private, no-store");
    res.type("image/webp").send(data);
  });
  router.delete("/:id", async (req, res) => {
    await storage.remove(requireUser(res).id, req.params.id);
    res.status(204).end();
  });
  return router;
}
