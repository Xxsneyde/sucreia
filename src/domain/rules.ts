import type { BusinessMode, CartLine, OrderStatus } from './types.ts';
export const currency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
export const actionLabel = (mode: BusinessMode) =>
  ({
    products: 'Finalizar pedido',
    booking: 'Agendar cita / reservar',
    quote: 'Solicitar cotización',
  })[mode];
export function addToCart(cart: CartLine[], line: Omit<CartLine, 'quantity'>): CartLine[] {
  if (cart.some((item) => item.businessId !== line.businessId))
    throw new Error('Finaliza o vacía tu carrito antes de comprar en otro negocio.');
  const existing = cart.find((item) => item.productId === line.productId);
  return existing
    ? cart.map((item) =>
        item.productId === line.productId ? { ...item, quantity: item.quantity + 1 } : item,
      )
    : [...cart, { ...line, quantity: 1 }];
}
export const cartTotal = (cart: CartLine[]) =>
  cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
export const orderSteps: { status: OrderStatus; label: string }[] = [
  { status: 'received', label: 'Pedido recibido' },
  { status: 'preparing', label: 'En preparación' },
  { status: 'dispatched', label: 'Despachado' },
  { status: 'delivered', label: 'Entregado' },
];
export function nextStatus(status: OrderStatus): OrderStatus {
  return orderSteps[Math.min(orderSteps.findIndex((step) => step.status === status) + 1, 3)].status;
}
export function whatsappUrl(phone: string | null, businessName: string): string | null {
  if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone)) return null;
  // Un celular colombiano escrito sin indicativo (3001234567) se completa con el 57.
  const digits = /^3\d{9}$/.test(phone) ? '57' + phone : phone.replace('+', '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Hola, quiero información de ${businessName} en SucreIA.`)}`;
}
