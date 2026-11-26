// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { createHash, randomInt } from "node:crypto";
function colombianMobile(raw) {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? `57${digits}` : null;
}
var maskPhone = (phone) => `${phone.slice(2, 5)} *** ${phone.slice(-4)}`;
var newCode = () => String(randomInt(0, 1e6)).padStart(6, "0");
var hashCode = (userId, code) => createHash("sha256").update(`${userId}:${code}`).digest("hex");
function onurixSms(config) {
  const doFetch = config.fetch ?? fetch;
  return {
    async send(phone, text2) {
      const body = new URLSearchParams({
        client: config.client,
        key: config.key,
        phone,
        sms: text2,
        "is-transactional": "1"
      });
      const res = await doFetch("https://www.onurix.com/api/v1/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        },
        body,
        signal: AbortSignal.timeout(15e3)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        console.warn(`Onurix rechaz\xF3 el SMS: ${data.error ?? res.status} ${data.msg ?? ""}`.trim());
        throw new Error("onurix");
      }
    }
  };
}
function smsFromEnv(env2) {
  const client = env2.ONURIX_CLIENT?.trim(), key = env2.ONURIX_KEY?.trim();
  if (!client && !key) return void 0;
  if (!client || !key) throw new Error("Faltan ONURIX_CLIENT u ONURIX_KEY.");
  if (!/^\d+$/.test(client)) throw new Error("ONURIX_CLIENT debe ser el n\xFAmero de cliente.");
  return onurixSms({ client, key });
}
function localSmsbox() {
  const messages = [];
  return {
    async send(phone, text2) {
      messages.unshift({ phone, text: text2, at: (/* @__PURE__ */ new Date()).toISOString() });
      messages.splice(100);
    },
    list() {
      return messages;
    }
  };
}
