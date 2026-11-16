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
      } catch {
        throw new HttpError(
          503,
          'No pudimos entregar el correo. Inténtalo de nuevo en unos minutos.',
        );
      }
    },
  };
}
