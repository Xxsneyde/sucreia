// Mensajes de texto para confirmar la cuenta (Onurix). El código de 6 dígitos nunca se
// guarda tal cual: solo su hash, ligado a la cuenta.
import { createHash, randomInt } from 'node:crypto';
import { maskPhone, normalizePhone } from '../src/domain/phone.ts';

export interface SmsTransport {
  send(phone: string, text: string): Promise<void>;
}

/**
 * Celular de cualquier país como indicativo + número, solo dígitos («573001234567»,
 * «584121234567»): así se guarda y se envía a Onurix. null si no es válido. Un celular
 * colombiano sin indicativo se completa con 57 (ver src/domain/phone.ts).
 */
export function smsPhone(raw: unknown): string | null {
  return normalizePhone(raw)?.slice(1) ?? null;
}
/** «+57 *** 4567»: a dónde se envió el código sin mostrar el número completo. */
export { maskPhone };
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const hashCode = (userId: string, code: string) =>
  createHash('sha256').update(`${userId}:${code}`).digest('hex');

export function onurixSms(config: {
  client: string;
  key: string;
  fetch?: typeof fetch;
}): SmsTransport {
  const doFetch = config.fetch ?? fetch;
  return {
    async send(phone, text) {
      const body = new URLSearchParams({
        client: config.client,
        key: config.key,
        phone,
        sms: text,
        'is-transactional': '1',
      });
      const res = await doFetch('https://www.onurix.com/api/v1/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown; msg?: string };
      if (!res.ok || data.error) {
        console.warn(`Onurix rechazó el SMS: ${data.error ?? res.status} ${data.msg ?? ''}`.trim());
        throw new Error('onurix');
      }
    },
  };
}

/** Onurix si están ONURIX_CLIENT y ONURIX_KEY; sin ninguna de las dos, no hay SMS. */
export function smsFromEnv(env: NodeJS.ProcessEnv): SmsTransport | undefined {
  const client = env.ONURIX_CLIENT?.trim(),
    key = env.ONURIX_KEY?.trim();
  if (!client && !key) return undefined;
  if (!client || !key) throw new Error('Faltan ONURIX_CLIENT u ONURIX_KEY.');
  if (!/^\d+$/.test(client)) throw new Error('ONURIX_CLIENT debe ser el número de cliente.');
  return onurixSms({ client, key });
}

/** Buzón local de mensajes (desarrollo y pruebas): guarda los últimos 100 en memoria. */
export function localSmsbox() {
  const messages: { phone: string; text: string; at: string }[] = [];
  return {
    async send(phone: string, text: string) {
      messages.unshift({ phone, text, at: new Date().toISOString() });
      messages.splice(100);
    },
    list() {
      return messages;
    },
  };
}
export type Smsbox = ReturnType<typeof localSmsbox>;
