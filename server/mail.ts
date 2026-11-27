import { createRequire } from 'node:module';
import type { Purpose } from './account-tokens.ts';
import { HttpError } from './http.ts';
export interface MailTransport {
  send(to: string, purpose: Purpose, token: string, expiresAt: string): void | Promise<void>;
}
export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  disableFileAccess: boolean;
  disableUrlAccess: boolean;
}
export interface MailSender {
  sendMail(message: MailMessage): Promise<{ accepted: unknown[] }>;
  verify(): Promise<unknown>;
}
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  origin: string;
}
export function smtpConfig(env: NodeJS.ProcessEnv): SmtpConfig | undefined {
  if (!env.SMTP_HOST && !env.SMTP_USER && !env.SMTP_PASSWORD && !env.SMTP_FROM) return;
  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'PUBLIC_URL'])
    if (!env[key]) throw new Error(`Falta configurar ${key} para enviar correos.`);
  const port = Number(env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || ![465, 587].includes(port))
    throw new Error('SMTP_PORT debe ser 465 o 587.');
  if (/[\r\n]/.test(env.SMTP_HOST!) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.SMTP_FROM!))
    throw new Error('Revisa SMTP_HOST y SMTP_FROM. Usa una dirección de correo como remitente.');
  let origin: URL;
  try {
    origin = new URL(env.PUBLIC_URL!);
  } catch {
    throw new Error('PUBLIC_URL debe ser una dirección válida.');
  }
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    !(
      origin.protocol === 'https:' ||
      (origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))
    )
  )
    throw new Error(
      'PUBLIC_URL debe ser el origen HTTPS del sitio, sin ruta, consulta ni credenciales. HTTP solo se permite en loopback.',
    );
  return {
    host: env.SMTP_HOST!,
    port,
    secure: port === 465,
    user: env.SMTP_USER!,
    password: env.SMTP_PASSWORD!,
    from: env.SMTP_FROM!,
    origin: origin.origin,
  };
}

/** Adaptador tipado de las operaciones de Nodemailer usadas aquí, sin exponer su API al dominio. */
export function smtpSender(config: SmtpConfig): MailSender {
  const nodemailer = createRequire(import.meta.url)('nodemailer') as {
    createTransport(options: {
      host: string;
      port: number;
      secure: boolean;
      requireTLS: boolean;
      auth: { user: string; pass: string };
      connectionTimeout: number;
      greetingTimeout: number;
      socketTimeout: number;
      logger: boolean;
      debug: boolean;
    }): MailSender;
  };
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    logger: false,
    debug: false,
  });
}
export function smtpTransport(config: SmtpConfig, sender = smtpSender(config)): MailTransport {
  return {
    async send(to, purpose, token, expiresAt) {
      const mail = accountEmail(config.origin, purpose, token, expiresAt);
      try {
        const result = await sender.sendMail({
          from: config.from,
          to,
          ...mail,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        if (!result.accepted.length) throw new Error('Destinatario rechazado');
      } catch (error) {
        // Solo el código del error (nunca la contraseña ni el destinatario) para diagnosticar.
        const e = error as { code?: string; responseCode?: number; command?: string };
        console.warn(
          `SMTP falló: code=${e.code ?? '-'} responseCode=${e.responseCode ?? '-'} command=${e.command ?? '-'}`,
        );
        throw new HttpError(
          503,
          'No pudimos entregar el correo. Inténtalo de nuevo en unos minutos.',
        );
      }
    },
  };
}

export interface ResendConfig {
  apiKey: string;
  from: string;
  origin: string;
}
/** Envío por la API HTTPS de Resend (Hostinger bloquea a veces el SMTP saliente). */
export function resendConfig(env: NodeJS.ProcessEnv): ResendConfig | undefined {
  if (!env.RESEND_API_KEY) return;
  const from = env.MAIL_FROM ?? env.SMTP_FROM;
  if (!from)
    throw new Error(
      'Falta MAIL_FROM (remitente verificado en Resend, por ejemplo «SucreIA <cuentas@tu-dominio>»).',
    );
  if (!env.PUBLIC_URL) throw new Error('Falta configurar PUBLIC_URL para enviar correos.');
  if (!/^[^\r\n]*<?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(from))
    throw new Error('MAIL_FROM debe ser una dirección de correo («Nombre <correo@dominio>»).');
  return { apiKey: env.RESEND_API_KEY, from, origin: new URL(env.PUBLIC_URL).origin };
}
/** Textos de cada correo de cuenta. */
const accountCopy: Record<
  Purpose,
  { subject: string; badge: string; title: string; intro: string; action: string; extra: string }
> = {
  verify: {
    subject: 'Verifica tu correo en SucreIA',
    badge: 'Confirma tu cuenta',
    title: 'Confirma tu correo',
    intro:
      'Gracias por unirte a SucreIA. Confirma tu correo para activar tu cuenta y empezar a descubrir, comprar y publicar en los emprendimientos de Sucre.',
    action: 'Confirmar mi correo',
    extra: 'Después de confirmar, ingresa con tu correo y la contraseña que creaste.',
  },
  reset: {
    subject: 'Recupera tu contraseña de SucreIA',
    badge: 'Recupera tu acceso',
    title: 'Crea una contraseña nueva',
    intro:
      'Recibimos una solicitud para cambiar la contraseña de tu cuenta en SucreIA. Toca el botón para crear una nueva.',
    action: 'Crear contraseña nueva',
    extra:
      'Tu nueva contraseña debe tener mínimo 8 caracteres, una letra, un número y un carácter especial. Al guardarla, cerraremos las sesiones abiertas.',
  },
};
const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Asunto, texto y HTML del correo de cuenta (verificar o recuperar la contraseña). El HTML usa
 * tablas y estilos en línea para verse igual en Gmail, Outlook y el celular.
 */
export function accountEmail(origin: string, purpose: Purpose, token: string, expiresAt: string) {
  const link = new URL(purpose === 'reset' ? '/recuperar' : '/verificar-correo', origin);
  link.searchParams.set('token', token);
  const copy = accountCopy[purpose];
  const subject = copy.subject;
  const until = new Date(expiresAt).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const href = esc(link.href);
  const logo = esc(new URL('/marca/sucreia-icono.png', origin).href);
  const home = esc(new URL('/', origin).href);
  const text = `${copy.title}\n\n${copy.intro}\n\n${copy.action}: ${link.href}\n\nEl enlace vence el ${until} y solo se puede usar una vez. ${copy.extra}\n\nSi no solicitaste este mensaje, puedes ignorarlo: tu cuenta sigue segura.\n\nSucreIA · El ecosistema digital de emprendimientos de Sucre`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef4fb;font-family:'Poppins','Segoe UI',Arial,sans-serif;color:#0f1f3d;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(copy.intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4fb"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 10px 30px rgba(16,42,90,.10)">
<tr><td style="background:#0a2357;background-image:linear-gradient(120deg,#0a2357,#12408f);padding:26px 32px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px"><img src="${logo}" width="44" height="44" alt="" style="display:block;border-radius:12px;background:#ffffff"></td>
<td><p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.01em">Sucre<span style="color:#4ade80">IA</span></p>
<p style="margin:2px 0 0;font-size:12px;color:#c7d7f5">El ecosistema digital de emprendimientos de Sucre</p></td>
</tr></table></td></tr>
<tr><td style="padding:32px 32px 8px">
<p style="margin:0 0 14px"><span style="display:inline-block;background:#e8f8ed;color:#15803d;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:6px 12px;border-radius:999px">${esc(copy.badge)}</span></p>
<h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#0a2357">${esc(copy.title)}</h1>
<p style="margin:0 0 26px;font-size:15px;line-height:1.65;color:#334155">${esc(copy.intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:14px;background:#15803d">
<a href="${href}" style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px">${esc(copy.action)} &rarr;</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:22px 32px 6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fc;border-radius:14px"><tr><td style="padding:14px 16px;font-size:13.5px;line-height:1.6;color:#334155">
<strong style="color:#0a2357">El enlace vence el ${esc(until)}</strong> y solo se puede usar una vez. ${esc(copy.extra)}
</td></tr></table>
</td></tr>
<tr><td style="padding:18px 32px 30px;font-size:12.5px;line-height:1.6;color:#64748b">
Si el botón no abre, copia y pega este enlace en tu navegador:<br>
<a href="${href}" style="color:#1565c0;word-break:break-all">${href}</a><br><br>
¿No solicitaste este mensaje? Puedes ignorarlo: tu cuenta sigue segura.
</td></tr>
<tr><td style="border-top:1px solid #e2e9f3;padding:18px 32px;background:#fbfdff;font-size:12px;line-height:1.6;color:#64748b;text-align:center">
<a href="${home}" style="color:#0a2357;font-weight:700;text-decoration:none">SucreIA</a> · Conectamos a Sucre con sus emprendedores<br>
Este es un mensaje automático, no respondas a este correo.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}
export function resendTransport(
  config: ResendConfig,
  fetchImpl: typeof fetch = fetch,
): MailTransport {
  return {
    async send(to, purpose, token, expiresAt) {
      const mail = accountEmail(config.origin, purpose, token, expiresAt);
      try {
        const res = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: config.from, to: [to], ...mail }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { name?: string; message?: string };
          const detail = `${body.name ?? ''}: ${body.message ?? ''}`;
          console.warn(`Resend rechazó el correo (${res.status}) ${detail.slice(0, 200)}`);
          throw new Error(`Resend ${res.status}`);
        }
      } catch (error) {
        if (!(error instanceof Error && error.message.startsWith('Resend ')))
          console.warn(`Resend no respondió: ${(error as Error | undefined)?.name ?? 'error'}`);
        throw new HttpError(
          503,
          'No pudimos entregar el correo. Inténtalo de nuevo en unos minutos.',
        );
      }
    },
  };
}
/** Transporte según el entorno: Resend si hay RESEND_API_KEY, si no SMTP, si no ninguno. */
export function mailFromEnv(env: NodeJS.ProcessEnv): MailTransport | undefined {
  const resend = resendConfig(env);
  if (resend) return resendTransport(resend);
  const smtp = smtpConfig(env);
  return smtp ? smtpTransport(smtp) : undefined;
}
