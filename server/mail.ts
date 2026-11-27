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
      const link = new URL(purpose === 'reset' ? '/recuperar' : '/verificar-correo', config.origin);
      link.searchParams.set('token', token);
      const subject =
        purpose === 'reset' ? 'Recupera tu contraseña de SucreIA' : 'Verifica tu correo en SucreIA';
      try {
        const result = await sender.sendMail({
          from: config.from,
          to,
          subject,
          text: `${subject}\n\nAbre este enlace para continuar:\n${link.href}\n\nEl enlace vence el ${new Date(expiresAt).toISOString()} y solo se puede usar una vez. Si no solicitaste este mensaje, puedes ignorarlo.`,
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
/** Asunto, texto y HTML del correo de cuenta (verificar o recuperar la contraseña). */
export function accountEmail(origin: string, purpose: Purpose, token: string, expiresAt: string) {
  const link = new URL(purpose === 'reset' ? '/recuperar' : '/verificar-correo', origin);
  link.searchParams.set('token', token);
  const subject =
    purpose === 'reset' ? 'Recupera tu contraseña de SucreIA' : 'Verifica tu correo en SucreIA';
  const action = purpose === 'reset' ? 'Crear una contraseña nueva' : 'Verificar mi correo';
  const until = new Date(expiresAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const text = `${subject}\n\nAbre este enlace para continuar:\n${link.href}\n\nEl enlace vence el ${until} y solo se puede usar una vez. Si no solicitaste este mensaje, puedes ignorarlo.`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#eef4fb;font-family:Arial,sans-serif;color:#0f1f3d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td><p style="margin:0 0 6px;font-size:22px;font-weight:bold;color:#0a2357">Sucre<span style="color:#22b14c">IA</span></p>
<h1 style="font-size:20px;margin:16px 0 8px">${subject}</h1>
<p style="margin:0 0 20px;line-height:1.5">Toca el botón para continuar. El enlace vence el ${until} y solo se puede usar una vez.</p>
<p style="margin:0 0 24px"><a href="${link.href}" style="display:inline-block;background:#22b14c;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${action}</a></p>
<p style="margin:0;font-size:12px;color:#64748b;line-height:1.5">Si el botón no abre, copia este enlace:<br>${link.href}<br><br>Si no solicitaste este mensaje, puedes ignorarlo.</p>
</td></tr></table></td></tr></table></body></html>`;
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
