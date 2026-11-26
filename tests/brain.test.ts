import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledge } from '../src/domain/brain/knowledge.ts';
import { answer } from '../src/domain/brain/respond.ts';
import { understand } from '../src/domain/brain/understand.ts';
import { parseHours, openAt } from '../src/domain/brain/schedule.ts';
import type { BrainStore } from '../src/domain/brain/types.ts';

const store = (over: Partial<BrainStore>): BrainStore => ({
  id: 'a',
  name: 'Dulce Tentación',
  category: 'Gastronomía y alimentos',
  subcategory: 'Pastelerías',
  municipality: 'Sincelejo',
  region: 'Montes de María',
  mode: 'products',
  description: 'Tortas y postres',
  address: 'Calle 1',
  whatsapp: '3001234567',
  phone: '',
  email: '',
  hours: 'Lunes a sábado 8 a. m. a 6 p. m.',
  week: null,
  delivery: true,
  deliveryFee: 3000,
  rating: 4.8,
  reviewCount: 5,
  verified: true,
  discount: 0,
  promotions: [],
  lat: null,
  lng: null,
  logo: '',
  cover: '',
  social: {},
  reviews: [],
  products: [
    {
      id: 'p1',
      name: 'Torta de chocolate',
      description: 'Para 20 porciones',
      price: 60000,
      group: 'Tortas',
      details: [],
      image: '',
      rating: null,
      ratingCount: 0,
      serves: 20,
    },
  ],
  ...over,
});

test('el asistente entiende producto, cantidad de personas, municipio y presupuesto', () => {
  const u = understand('torta para 20 personas en Corozal de menos de 50 mil');
  assert.equal(u.query.town, 'Corozal');
  assert.equal(u.query.people, 20);
  assert.equal(u.query.maxPrice, 50000);
  assert.deepEqual(u.query.terms, ['torta']);
});

test('el asistente busca en los negocios publicados y suelta condiciones si no hay resultados', () => {
  const k = buildKnowledge([
    store({}),
    store({ id: 'b', name: 'Barbería El Corte', mode: 'booking', products: [] }),
  ]);
  const found = answer('torta para 20 personas en Sincelejo', {}, k, { role: 'visitante' });
  assert.equal(found.reply.links?.[0].href, '/tienda?id=a&producto=p1');
  assert.deepEqual(found.context.results, ['a']);
  const relaxed = answer('torta en Corozal', {}, k, { role: 'visitante' });
  assert.match(relaxed.reply.text, /No encontré en Corozal/);
  const none = answer('alquiler de lanchas', {}, k, { role: 'cliente' });
  assert.equal(none.reply.cta?.href, '/emprender');
});

test('el horario escrito se convierte en semana y se consulta en hora de Colombia', () => {
  const week = parseHours('Lunes a sábado 8 a. m. a 6 p. m.');
  assert.ok(week);
  assert.deepEqual(week[1], { closed: false, opens: 8, closes: 18 });
  assert.equal(week[0], null);
  // Jueves 26 de noviembre de 2026, 10:00 a. m. en Colombia = 15:00 UTC.
  assert.equal(openAt(week, new Date('2026-11-26T15:00:00Z')), true);
  assert.equal(openAt(week, new Date('2026-11-27T02:00:00Z')), false);
});
