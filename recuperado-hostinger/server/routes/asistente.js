// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var import_express3 = __toESM(require_express2(), 1);


// --- (continuación en el bundle) ---
var queryKeys = {
  terms: "terms",
  town: "string",
  region: "string",
  sector: "string",
  subcategory: "string",
  mode: "string",
  delivery: "boolean",
  maxPrice: "number",
  minPrice: "number",
  people: "number",
  openNow: "boolean",
  day: "number",
  sort: "string",
  promo: "boolean",
  verified: "boolean",
  near: "boolean"
};
function cleanContext(raw) {
  if (!raw || typeof raw !== "object") return {};
  const r = raw;
  const id = (v) => typeof v === "string" && v.length <= 100 ? v : void 0;
  const ctx = {};
  if (Array.isArray(r.results)) ctx.results = r.results.map(id).filter((x) => !!x).slice(0, 20);
  if (id(r.focus)) ctx.focus = id(r.focus);
  if (typeof r.shown === "number" && Number.isInteger(r.shown) && r.shown >= 0 && r.shown <= 200) ctx.shown = r.shown;
  if (r.products && typeof r.products === "object")
    ctx.products = Object.fromEntries(
      Object.entries(r.products).slice(0, 20).filter(([k, v]) => id(k) && id(v)).map(([k, v]) => [k, v])
    );
  if (r.query && typeof r.query === "object") {
    const q = r.query;
    const query = {};
    for (const [key, type] of Object.entries(queryKeys)) {
      const v = q[key];
      if (type === "terms")
        query[key] = Array.isArray(v) ? v.filter((t) => typeof t === "string" && t.length <= 40).slice(0, 12) : [];
      else if (type === "string") query[key] = typeof v === "string" && v.length <= 80 ? v : "";
      else if (type === "number") query[key] = typeof v === "number" && Number.isFinite(v) ? v : key === "day" ? -1 : 0;
      else query[key] = v === true;
    }
    if (!["relevance", "cheap", "best", "expensive", "near"].includes(query.sort)) query.sort = "relevance";
    if (!["", "products", "booking", "quote"].includes(query.mode)) query.mode = "";
    ctx.query = query;
  }
  return ctx;
}
var statusLabel = (s) => s.registration === "rejected" ? "Registro rechazado" : s.registration !== "approved" ? s.publicationRequested ? "En revisi\xF3n" : "Registro incompleto" : s.published ? "Publicado" : "Inactivo";
function assistantRoutes(db2, brain) {
  const r = (0, import_express3.Router)();
  const limiter = attemptLimiter(40);
  r.post("/", async (req, res) => {
    try {
      limiter(`asistente|${req.ip}|${Math.floor(Date.now() / 6e4)}`);
    } catch {
      throw new HttpError(429, "Vas muy r\xE1pido. Espera un momento y vuelve a preguntar.");
    }
    const question = string(req.body?.question, 400, "tu pregunta");
    const user = currentUser(res);
    const loc = req.body?.location;
    const location = loc && typeof loc.lat === "number" && typeof loc.lng === "number" && Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180 ? { lat: loc.lat, lng: loc.lng } : null;
    const store = typeof req.body?.store === "string" && req.body.store.length <= 100 ? req.body.store : void 0;
    const knowledge = await brain.knowledge();
    let myStores;
    let admin;
    if (user && user.role !== "cliente")
      myStores = (await listStoresByOwner(db2, user.id)).map((s) => ({
        id: s.id,
        name: s.draft.name || "Sin nombre",
        status: statusLabel(s)
      }));
    if (user?.role === "admin") {
      const count = async (sql) => Number((await db2.prepare(sql).get())?.n ?? 0);
      admin = {
        pending: await count("SELECT COUNT(*) AS n FROM stores WHERE registration <> 'approved' AND review_design IS NOT NULL"),
        approved: await count("SELECT COUNT(*) AS n FROM stores WHERE registration = 'approved'"),
        pqrsPending: await count("SELECT COUNT(*) AS n FROM pqrs WHERE status = 'pending'")
      };
    }
    const result = answer(question, cleanContext(req.body?.context), knowledge, {
      role: user?.role ?? "visitante",
      location,
      myStores,
      admin,
      store
    });
    res.json(result);
  });
  return r;
}
