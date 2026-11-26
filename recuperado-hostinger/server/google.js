// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var import_express = __toESM(require_express2(), 1);
import { randomBytes as randomBytes3, randomUUID as randomUUID3 } from "node:crypto";


// --- (continuación en el bundle) ---
function googleConfig(env2) {
  if (!env2.GOOGLE_CLIENT_ID && !env2.GOOGLE_CLIENT_SECRET) return;
  for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "PUBLIC_URL"])
    if (!env2[key]) throw new Error(`Falta configurar ${key} para ingresar con Google.`);
  const origin = new URL(env2.PUBLIC_URL).origin;
  return { clientId: env2.GOOGLE_CLIENT_ID, clientSecret: env2.GOOGLE_CLIENT_SECRET, origin };
}
var STATE_COOKIE = "sucreia_google";
var TEN_MINUTES = 10 * 6e4;
async function saveState(db2, kind, payload) {
  const id = randomBytes3(24).toString("base64url");
  await db2.prepare("DELETE FROM oauth_states WHERE expires_at < ?").run((/* @__PURE__ */ new Date()).toISOString());
  await db2.prepare("INSERT INTO oauth_states (id, kind, payload, expires_at) VALUES (?, ?, ?, ?)").run(id, kind, JSON.stringify(payload), new Date(Date.now() + TEN_MINUTES).toISOString());
  return id;
}
async function takeState(db2, kind, id) {
  if (!id) return null;
  const row = await db2.prepare("SELECT payload, expires_at FROM oauth_states WHERE id = ? AND kind = ?").get(id, kind);
  await db2.prepare("DELETE FROM oauth_states WHERE id = ?").run(id);
  if (!row || row.expires_at < (/* @__PURE__ */ new Date()).toISOString()) return null;
  return JSON.parse(row.payload);
}
function shortCookie(res, name, value, secure) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: TEN_MINUTES,
    path: "/api/auth"
  });
}
function googleRoutes(db2, config, secure, fetchImpl = fetch, mailbox) {
  const router = (0, import_express.Router)();
  const redirectUri = config ? `${config.origin}/api/auth/google/callback` : "";
  router.get("/google/estado", (_req, res) => {
    res.json({ enabled: !!config });
  });
  router.get("/google", async (req, res) => {
    if (!config) throw new HttpError(503, "El ingreso con Google todav\xEDa no est\xE1 configurado.");
    const state2 = randomBytes3(24).toString("base64url");
    const role = req.query.rol === "emprendedor" ? "emprendedor" : "cliente";
    const id = await saveState(db2, "google-state", {
      state: state2,
      role,
      back: internalReturn(req.query.volver)
    });
    shortCookie(res, STATE_COOKIE, id, secure);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state2);
    url.searchParams.set("prompt", "select_account");
    res.redirect(302, url.href);
  });
  router.get("/google/callback", async (req, res) => {
    if (!config) throw new HttpError(503, "El ingreso con Google todav\xEDa no est\xE1 configurado.");
    const saved = await takeState(
      db2,
      "google-state",
      readCookie(req, STATE_COOKIE)
    );
    res.clearCookie(STATE_COOKIE, { path: "/api/auth" });
    if (!saved || typeof req.query.state !== "string" || req.query.state !== saved.state)
      return res.redirect(302, "/ingresar/?google=error");
    if (typeof req.query.code !== "string") return res.redirect(302, "/ingresar/?google=cancelado");
    let profile;
    try {
      const tokenRes = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: req.query.code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });
      const token = await tokenRes.json();
      if (!tokenRes.ok || !token.access_token) throw new Error("token");
      const infoRes = await fetchImpl("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      if (!infoRes.ok) throw new Error("perfil");
      profile = await infoRes.json();
    } catch {
      return res.redirect(302, "/ingresar/?google=error");
    }
    const email = profile.email?.toLowerCase() ?? "";
    if (!email || profile.email_verified !== true)
      return res.redirect(302, "/ingresar/?google=sin-correo");
    const found = await findUserByEmail(db2, email);
    if (found) {
      if (!found.emailVerifiedAt)
        await db2.prepare("UPDATE users SET emailVerifiedAt = ? WHERE id = ?").run((/* @__PURE__ */ new Date()).toISOString(), found.id);
      const session2 = await createSession(db2, found.id);
      setSessionCookie(res, session2.token, session2.expires, secure);
      return res.redirect(302, saved.back || `${roleHome(found.role)}/`);
    }
    const user = await createUser(db2, {
      email,
      name: (profile.name ?? "").trim().slice(0, 80),
      role: saved.role,
      // Contraseña aleatoria que nadie conoce: se entra con Google (o se crea una con «Recuperar»).
      passwordHash: await hashPassword(randomUUID3() + randomBytes3(16).toString("hex"))
    });
    const session = await createSession(db2, user.id);
    setSessionCookie(res, session.token, session.expires, secure);
    if (mailbox) {
      try {
        const { token, expiresAt } = await issueToken(db2, user.id, "verify");
        await mailbox.send(user.email, "verify", token, expiresAt);
      } catch {
        console.warn("No se pudo entregar un correo de verificaci\xF3n (Google).");
      }
    }
    res.redirect(302, "/verificar-correo/");
  });
  return router;
}
