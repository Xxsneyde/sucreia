// Pedido armado en SucreIA que se envía al WhatsApp del negocio.
import { currency } from './rules.ts';

/** Dígitos para wa.me: un celular colombiano sin indicativo se completa con el 57. */
export function whatsappDigits(phone: string | null | undefined): string | null {
  if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone)) return null;
  return /^3\d{9}$/.test(phone) ? '57' + phone : phone.replace('+', '');
}

export const orderCode = (id: string) => id.slice(0, 6).toUpperCase();

export interface WhatsappOrder {
  id: string;
  storeName: string;
  lines: { name: string; price: number; quantity: number }[];
  total: number;
  note: string;
}

export function orderMessage(order: WhatsappOrder): string {
  const lines = order.lines.map(
    (l) => `• ${l.quantity} × ${l.name} — ${currency(l.price * l.quantity)}`,
  );
  return [
    `Hola, ${order.storeName} 👋`,
    'Quiero hacer este pedido que armé en SucreIA:',
    '',
    ...lines,
    '',
    `*Total: ${currency(order.total)}*`,
    ...(order.note.trim() ? ['', `Nota: ${order.note.trim()}`] : []),
    '',
    `Pedido ${orderCode(order.id)}. ¿Me confirmas disponibilidad, forma de pago y entrega?`,
  ].join('\n');
}

export function orderLink(phone: string | null | undefined, message: string): string | null {
  const digits = whatsappDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
