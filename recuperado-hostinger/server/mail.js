// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { createRequire } from "node:module";


// --- (continuación en el bundle) ---
function smtpConfig(env2) {
  if (!env2.SMTP_HOST && !env2.SMTP_USER && !env2.SMTP_PASSWORD && !env2.SMTP_FROM) return;
  for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "PUBLIC_URL"])
    if (!env2[key]) throw new Error(`Falta configurar ${key} para enviar correos.`);
  const port2 = Number(env2.SMTP_PORT ?? 587);
  if (!Number.isInteger(port2) || ![465, 587].includes(port2))
    throw new Error("SMTP_PORT debe ser 465 o 587.");
  if (/[\r\n]/.test(env2.SMTP_HOST) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env2.SMTP_FROM))
    throw new Error("Revisa SMTP_HOST y SMTP_FROM. Usa una direcci\xF3n de correo como remitente.");
  let origin;
  try {
    origin = new URL(env2.PUBLIC_URL);
  } catch {
    throw new Error("PUBLIC_URL debe ser una direcci\xF3n v\xE1lida.");
  }
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || !(origin.protocol === "https:" || origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)))
    throw new Error(
      "PUBLIC_URL debe ser el origen HTTPS del sitio, sin ruta, consulta ni credenciales. HTTP solo se permite en loopback."
    );
  return {
    host: env2.SMTP_HOST,
    port: port2,
    secure: port2 === 465,
    user: env2.SMTP_USER,
    password: env2.SMTP_PASSWORD,
    from: env2.SMTP_FROM,
    origin: origin.origin
  };
}
function smtpSender(config) {
  const nodemailer = createRequire(import.meta.url)("nodemailer");
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 1e4,
    greetingTimeout: 1e4,
    socketTimeout: 15e3,
    logger: false,
    debug: false
  });
}
function smtpTransport(config, sender = smtpSender(config)) {
  return {
    async send(to, purpose, token, expiresAt) {
      const link2 = new URL(purpose === "reset" ? "/recuperar" : "/verificar-correo", config.origin);
      link2.searchParams.set("token", token);
      const subject = purpose === "reset" ? "Recupera tu contrase\xF1a de SucreIA" : "Verifica tu correo en SucreIA";
      try {
        const result = await sender.sendMail({
          from: config.from,
          to,
          subject,
          text: `${subject}

Abre este enlace para continuar:
${link2.href}

El enlace vence el ${new Date(expiresAt).toISOString()} y solo se puede usar una vez. Si no solicitaste este mensaje, puedes ignorarlo.`,
          disableFileAccess: true,
          disableUrlAccess: true
        });
        if (!result.accepted.length) throw new Error("Destinatario rechazado");
      } catch (error) {
        const e = error;
        console.warn(
          `SMTP fall\xF3: code=${e.code ?? "-"} responseCode=${e.responseCode ?? "-"} command=${e.command ?? "-"}`
        );
        throw new HttpError(
          503,
          "No pudimos entregar el correo. Int\xE9ntalo de nuevo en unos minutos."
        );
      }
    }
  };
}
function resendConfig(env2) {
  if (!env2.RESEND_API_KEY) return;
  const from = env2.MAIL_FROM ?? env2.SMTP_FROM;
  if (!from)
    throw new Error(
      "Falta MAIL_FROM (remitente verificado en Resend, por ejemplo \xABSucreIA <cuentas@tu-dominio>\xBB)."
    );
  if (!env2.PUBLIC_URL) throw new Error("Falta configurar PUBLIC_URL para enviar correos.");
  if (!/^[^\r\n]*<?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(from))
    throw new Error("MAIL_FROM debe ser una direcci\xF3n de correo (\xABNombre <correo@dominio>\xBB).");
  return { apiKey: env2.RESEND_API_KEY, from, origin: new URL(env2.PUBLIC_URL).origin };
}
function accountEmail(origin, purpose, token, expiresAt) {
  const link2 = new URL(purpose === "reset" ? "/recuperar" : "/verificar-correo", origin);
  link2.searchParams.set("token", token);
  const subject = purpose === "reset" ? "Recupera tu contrase\xF1a de SucreIA" : "Verifica tu correo en SucreIA";
  const action = purpose === "reset" ? "Crear una contrase\xF1a nueva" : "Verificar mi correo";
  const until = new Date(expiresAt).toLocaleString("es-CO", { timeZone: "America/Bogota" });
  const text2 = `${subject}

Abre este enlace para continuar:
${link2.href}

El enlace vence el ${until} y solo se puede usar una vez. Si no solicitaste este mensaje, puedes ignorarlo.`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#eef4fb;font-family:Arial,sans-serif;color:#0f1f3d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td><p style="margin:0 0 6px;font-size:22px;font-weight:bold;color:#0a2357">Sucre<span style="color:#22b14c">IA</span></p>
<h1 style="font-size:20px;margin:16px 0 8px">${subject}</h1>
<p style="margin:0 0 20px;line-height:1.5">Toca el bot\xF3n para continuar. El enlace vence el ${until} y solo se puede usar una vez.</p>
<p style="margin:0 0 24px"><a href="${link2.href}" style="display:inline-block;background:#22b14c;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${action}</a></p>
<p style="margin:0;font-size:12px;color:#64748b;line-height:1.5">Si el bot\xF3n no abre, copia este enlace:<br>${link2.href}<br><br>Si no solicitaste este mensaje, puedes ignorarlo.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text: text2, html };
}
function resendTransport(config, fetchImpl = fetch) {
  return {
    async send(to, purpose, token, expiresAt) {
      const mail2 = accountEmail(config.origin, purpose, token, expiresAt);
      try {
        const res = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ from: config.from, to: [to], ...mail2 })
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detail = `${body.name ?? ""}: ${body.message ?? ""}`;
          console.warn(`Resend rechaz\xF3 el correo (${res.status}) ${detail.slice(0, 200)}`);
          throw new Error(`Resend ${res.status}`);
        }
      } catch (error) {
        if (!(error instanceof Error && error.message.startsWith("Resend ")))
          console.warn(`Resend no respondi\xF3: ${error?.name ?? "error"}`);
        throw new HttpError(
          503,
          "No pudimos entregar el correo. Int\xE9ntalo de nuevo en unos minutos."
        );
      }
    }
  };
}
function mailFromEnv(env2) {
  const resend = resendConfig(env2);
  if (resend) return resendTransport(resend);
  const smtp = smtpConfig(env2);
  return smtp ? smtpTransport(smtp) : void 0;
}
