// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { createHash as createHash3, randomBytes as randomBytes2 } from "node:crypto";
var hash = (token) => createHash3("sha256").update(token).digest("hex");
async function issueToken(db2, userId, purpose) {
  const token = randomBytes2(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + (purpose === "reset" ? 30 : 24 * 60) * 6e4
  ).toISOString();
  await db2.transaction(async (tx) => {
    await tx.prepare("DELETE FROM account_tokens WHERE expires_at <= ? OR (user_id = ? AND purpose = ?)").run((/* @__PURE__ */ new Date()).toISOString(), userId, purpose);
    await tx.prepare(
      "INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)"
    ).run(hash(token), userId, purpose, expiresAt);
  });
  return { token, expiresAt };
}
async function consumeToken(db2, token, purpose) {
  const row = await db2.prepare(
    "DELETE FROM account_tokens WHERE token_hash = ? AND purpose = ? AND expires_at > ? RETURNING user_id"
  ).get(hash(token), purpose, (/* @__PURE__ */ new Date()).toISOString());
  if (!row) throw new HttpError(400, "Este enlace ya se us\xF3 o venci\xF3. Solicita uno nuevo.");
  return row.user_id;
}
function localMailbox() {
  const messages = [];
  let sequence = 0;
  return {
    send(to, purpose, token, expiresAt) {
      messages.unshift({
        id: ++sequence,
        to,
        expiresAt,
        subject: purpose === "reset" ? "Recupera tu contrase\xF1a" : "Verifica tu correo",
        path: `${purpose === "reset" ? "/recuperar" : "/verificar-correo"}?token=${encodeURIComponent(token)}`
      });
      messages.splice(100);
    },
    list() {
      return messages.filter((m) => m.expiresAt > (/* @__PURE__ */ new Date()).toISOString());
    }
  };
}
