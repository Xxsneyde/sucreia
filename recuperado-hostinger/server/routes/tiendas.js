// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var import_express7 = __toESM(require_express2(), 1);
var MAX_STORES = 30;
function readDesign(body) {
  const design = upgradeDesign(body?.design);
  if (!isDesign(design)) throw new HttpError(400, "El dise\xF1o de la tienda no es v\xE1lido.");
  return design;
}
function publicStoreRoutes(db2) {
  const router = (0, import_express7.Router)();
  router.get("/", async (_req, res) => {
    const published = await listPublishedStores(db2);
    const summaries = await storeSummaries(
      db2,
      published.map((p) => p.id)
    );
    res.json({
      stores: published.map((p) => ({ ...toBusiness(p), ...summaries.get(p.id) }))
    });
  });
  router.get("/:id", async (req, res) => {
    const store = await getStore(db2, req.params.id);
    if (!store?.published) throw new HttpError(404, "Esta tienda no existe o no est\xE1 publicada.");
    res.json({ id: store.id, publishedAt: store.published.at, design: store.published.design });
  });
  return router;
}
function ownerStoreRoutes(db2, images) {
  const router = (0, import_express7.Router)();
  const owned2 = async (res, id) => {
    const user = requireUser(res, "emprendedor", "admin");
    const store = await getStore(db2, id);
    if (!store || store.ownerId !== user.id) throw new HttpError(404, "No encontramos esa tienda.");
    return store;
  };
  router.get("/", async (_req, res) => {
    const user = requireUser(res, "emprendedor", "admin");
    res.json({ stores: await listStoresByOwner(db2, user.id) });
  });
  router.post("/", async (req, res) => {
    const user = requireUser(res, "emprendedor", "admin");
    if (req.body?.termsVersion !== "2026-11-23")
      throw new HttpError(400, "Acepta los t\xE9rminos para crear el negocio.");
    const design = await images.externalize(user.id, readDesign(req.body));
    if (await countStoresByOwner(db2, user.id) >= MAX_STORES)
      throw new HttpError(409, `Puedes tener hasta ${MAX_STORES} tiendas.`);
    res.status(201).json({ store: await createStore(db2, user.id, design, req.body.termsVersion) });
  });
  router.get("/:id", async (req, res) => {
    res.json({ store: await owned2(res, req.params.id) });
  });
  router.put("/:id", async (req, res) => {
    const store = await owned2(res, req.params.id);
    res.json({
      store: await updateDraft(
        db2,
        store.id,
        await images.externalize(store.ownerId, readDesign(req.body))
      )
    });
  });
  router.post("/:id/publicar", async (req, res) => {
    const store = await owned2(res, req.params.id);
    const cfg = await settings(db2, store.id);
    if (cfg.suspended)
      throw new HttpError(
        403,
        "La administraci\xF3n retir\xF3 esta publicaci\xF3n. Revisa el motivo en la configuraci\xF3n y solicita revisi\xF3n."
      );
    let published;
    try {
      published = publishProject(store);
    } catch (error) {
      throw new HttpError(422, error.message);
    }
    if (store.registration !== "approved") {
      const errors = registrationErrors(published.published.design);
      const legal = await db2.prepare("SELECT legal_type FROM stores WHERE id=?").get(store.id);
      const docs = await db2.prepare("SELECT kind FROM store_documents WHERE store_id=?").all(store.id);
      const missing = missingDocuments(
        legal?.legal_type === "juridica" ? "juridica" : "natural",
        docs.map((d) => ({ kind: String(d.kind) }))
      );
      if (missing.length)
        errors.push(
          `Adjunta: ${missing.map((k) => documentKinds.find((x) => x.id === k).label).join(", ")}.`
        );
      if (errors.length)
        throw new HttpError(422, `Completa el registro antes de enviarlo: ${errors.join(" ")}`);
    }
    const queued = await db2.prepare(
      "UPDATE stores SET registration='pending', review_design=? WHERE id=? AND registration <> 'approved'"
    ).run(JSON.stringify(published.published.design), store.id);
    if (queued.changes) {
      res.status(202).json({ store: await getStore(db2, store.id) });
      return;
    }
    if (store.published && ["name", "whatsapp", "address"].some(
      (key) => store.published.design[key] !== store.draft[key]
    ) && cfg.verification === "approved") {
      cfg.verification = "pending";
      cfg.verificationNote = "Cambi\xF3 la identidad o contacto del negocio; requiere revisi\xF3n.";
      await setSettings(db2, store.id, cfg);
    }
    res.json({ store: await savePublication(db2, store.id, published.published) });
  });
  router.delete("/:id/publicacion", async (req, res) => {
    const store = await owned2(res, req.params.id);
    res.json({ store: await unpublish(db2, store.id) });
  });
  router.delete("/:id", async (req, res) => {
    const store = await owned2(res, req.params.id);
    if (await db2.prepare("SELECT id FROM operations WHERE store_id=? LIMIT 1").get(store.id) || await db2.prepare("SELECT id FROM promotions WHERE store_id=? LIMIT 1").get(store.id))
      throw new HttpError(
        409,
        "Este negocio tiene operaciones o bonos. Retira su publicaci\xF3n para conservar el historial."
      );
    await deleteStore(db2, store.id);
    res.status(204).end();
  });
  return router;
}
