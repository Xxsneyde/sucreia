import test from 'node:test';
import assert from 'node:assert/strict';
import { addToCart, cartTotal, nextStatus, actionLabel, whatsappUrl } from '../src/domain/rules.ts';
const line = { businessId: 'a', productId: 'p', name: 'Bolso', price: 85000 };
test('agrega cantidades y calcula el total en COP sin mezclar negocios', () => {
  const cart = addToCart(addToCart([], line), line);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);
  assert.equal(cartTotal(cart), 170000);
  assert.throws(() => addToCart(cart, { ...line, businessId: 'b' }), /otro negocio/);
  assert.equal(cart[0].quantity, 2);
});
test('el recorrido termina en entregado', () => {
  assert.equal(nextStatus('received'), 'preparing');
  assert.equal(nextStatus('preparing'), 'dispatched');
  assert.equal(nextStatus('dispatched'), 'delivered');
  assert.equal(nextStatus('delivered'), 'delivered');
});
test('cada modalidad tiene su acción principal', () => {
  assert.equal(actionLabel('products'), 'Finalizar pedido');
  assert.equal(actionLabel('booking'), 'Agendar cita / reservar');
  assert.equal(actionLabel('quote'), 'Solicitar cotización');
});
test('WhatsApp usa el número del negocio y rechaza contactos inválidos', () => {
  assert.equal(whatsappUrl(null, 'Demo'), null);
  assert.equal(whatsappUrl('abc', 'Demo'), null);
  assert.match(whatsappUrl('+573001234567', 'Raíces')!, /^https:\/\/wa.me\/573001234567\?text=/);
  assert.ok(whatsappUrl('+573001234567', 'Raíces')!.includes('Ra%C3%ADces'));
});
