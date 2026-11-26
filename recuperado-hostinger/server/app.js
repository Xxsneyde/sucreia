// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var import_express8 = __toESM(require_express2(), 1);


// --- (continuación en el bundle) ---
import { existsSync as existsSync2 } from "node:fs";
import { join as join3, resolve as resolve2 } from "node:path";


// --- (continuación en el bundle) ---
function sameOrigin(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host)
    return next(new HttpError(403, "Origen no permitido."));
  next();
}
function createApp({
  db: db2,
  secureCookies = false,
  staticDir: staticDir2,
  localMail = false,
  mail: mail2,
  sms,
  assistant: assistant2,
  imagesDir: imagesDir2 = resolve2("server/data/images"),
  registrationLimit,
  linkLimit,
  loginLimit,
  trustProxy = false,
  google,
  googleFetch
}) {
  if (localMail && mail2) throw new Error("Elige correo local o SMTP, no ambos.");
  const app = (0, import_express8.default)();
  app.disable("x-powered-by");
  app.set(
    "trust proxy",
    typeof trustProxy === "number" && trustProxy > 0 ? trustProxy : trustProxy === true ? true : "loopback"
  );
  app.use((_req, res, next) => {
    for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
    if (secureCookies) res.setHeader("Strict-Transport-Security", strictTransportSecurity);
    next();
  });
  const api = import_express8.default.Router();
  api.use(import_express8.default.json({ limit: "13mb" }));
  api.use(sameOrigin);
  api.use(loadUser(db2));
  api.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  api.get("/salud", async (_req, res) => {
    await db2.prepare("SELECT 1 AS ok").get();
    res.json({ ok: true, db: db2.dialect });
  });
  api.get("/salud/red", (req, res) => {
    const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const chain = [...forwarded, req.socket.remoteAddress ?? ""];
    const mask = (ip) => /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|::ffff:(10|127|192\.168)\.)/i.test(
      ip
    ) ? "interna" : ip.replace(/[.:][0-9a-f]+$/i, (end) => `${end[0]}x`);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      saltos: forwarded.length,
      cloudflare: !!req.headers["cf-ray"],
      ipActual: mask(req.ip ?? ""),
      // proxies: n → IP que usaría la app con TRUST_PROXY=n.
      candidatos: [1, 2, 3, 4].map((n) => ({
        proxies: n,
        ip: mask(chain[chain.length - 1 - n] ?? "")
      })),
      // Otros encabezados donde los proxies suelen poner la IP del visitante (valores enmascarados).
      encabezados: Object.fromEntries(
        Object.entries(req.headers).filter(
          ([name]) => /(^|-)(ip|client|forwarded|real|connecting)(-|$)|^x-forwarded-for$/i.test(name)
        ).map(([name, value]) => [
          name,
          String(value).split(",").map((v) => mask(v.trim().replace(/^for=/i, "").replace(/"/g, ""))).join(", ")
        ])
      )
    });
  });
  api.get("/salud/ip-salida", async (_req, res) => {
    if (currentUser(res)?.role !== "admin")
      throw new HttpError(404, "Ruta de la API no encontrada.");
    const r = await fetch("https://www.onurix.com/api/v1/my-ip", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(1e4)
    });
    const data = await r.json().catch(() => ({}));
    res.json({ ip: data.ip ?? null, sms: !!sms });
  });
  const mailbox = localMail ? localMailbox() : void 0;
  if (mailbox)
    api.get("/desarrollo/correos", (_req, res) => res.json({ messages: mailbox.list() }));
  const smsbox = localMail && !sms ? localSmsbox() : void 0;
  if (smsbox) api.get("/desarrollo/sms", (_req, res) => res.json({ messages: smsbox.list() }));
  const images = new ImageStorage(db2, imagesDir2);
  const brain = brainSource(db2);
  api.use((req, res, next) => {
    if (req.method !== "GET" && /^\/(mis-tiendas|plataforma\/admin|plataforma\/domiciliario)/.test(req.path))
      res.on("finish", () => {
        if (res.statusCode < 400) images.invalidate();
      });
    if (req.method !== "GET" && /^\/(mis-tiendas|plataforma)/.test(req.path) && !/\/visita$/.test(req.path))
      res.on("finish", () => {
        if (res.statusCode < 400) brain.invalidate();
      });
    next();
  });
  api.use("/plataforma", platformRoutes(db2, images, assistant2));
  api.use(
    "/auth",
    authRoutes(
      db2,
      secureCookies,
      mail2 ?? mailbox,
      registrationLimit,
      linkLimit,
      sms ?? smsbox,
      loginLimit
    )
  );
  api.use("/auth", googleRoutes(db2, google, secureCookies, googleFetch, mail2 ?? mailbox));
  api.use("/tiendas", publicStoreRoutes(db2));
  api.use("/imagenes", imageRoutes(images));
  api.use("/asistente", assistantRoutes(db2, brain));
  api.use("/mis-tiendas", ownerStoreRoutes(db2, images));
  api.use((_req, _res, next) => next(new HttpError(404, "Ruta de la API no encontrada.")));
  api.use(errorHandler);
  app.use("/api", api);
  if (staticDir2 && existsSync2(staticDir2)) {
    app.use((req, res, next) => {
      if (req.path.split("/").some((part) => part.startsWith("."))) res.status(404).end();
      else next();
    });
    app.use(loadUser(db2), (req, res, next) => {
      if (["GET", "HEAD"].includes(req.method) && req.path === "/")
        return res.redirect(302, currentUser(res) ? "/buscar/" : "/ingresar/");
      const isFile = /\.[a-z0-9]+$/i.test(req.path);
      if (!["GET", "HEAD"].includes(req.method) || isFile || !requiresSession(req.path))
        return next();
      const user = currentUser(res);
      if (user && requiredRole(req.path) === "admin" && user.role !== "admin")
        return res.redirect(302, `${roleHome(user.role)}/`);
      if (user) return next();
      const url = new URL(req.originalUrl, "http://sucreia.local");
      const volver = returnTarget(url.pathname, url.pathname + url.search);
      res.redirect(302, `/ingresar/?volver=${encodeURIComponent(volver)}`);
    });
    app.use(import_express8.default.static(staticDir2, { extensions: ["html"], dotfiles: "allow" }));
    app.use((_req, res) => {
      res.status(404).sendFile(join3(staticDir2, "404.html"), { dotfiles: "allow" });
    });
  }
  return app;
}
