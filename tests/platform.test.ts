import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDb } from '../server/db.ts';
import { createUser, type User } from '../server/auth.ts';
import { createStore, savePublication } from '../server/stores.ts';
import { createDesign, publishProject } from '../src/domain/studio.ts';
import {
  actOperation,
  balance,
  commerceStore,
  createOperation,
  operation,
  redeem,
  serialize,
  setSettings,
  settings,
  slots,
  state,
  lessonAnswer,
  type CreateOperation,
} from '../server/platform.ts';
import type { Promotion } from '../src/domain/platform.ts';
function fixture(mode: 'products' | 'booking' | 'quote' = 'products') {
  const db = openDb(':memory:');
  const make = (name: string, role: 'cliente' | 'emprendedor' = 'cliente') =>
    createUser(db, { email: name + '@example.co', name, passwordHash: 'no-usado', role });
  const owner = make('negocio', 'emprendedor'),
    client = make('cliente'),
    other = make('otro'),
    courier = make('domiciliario');
  const design = createDesign(
    mode === 'products' ? 'Artesanías' : mode === 'booking' ? 'Belleza' : 'Servicios',
    'Negocio real',
  );
  design.mode = mode;
  design.products = design.products.map((p) => ({ ...p, price: 10000 }));
  const store = createStore(db, owner.id, design);
  savePublication(db, store.id, publishProject(store).published!);
  const request = (extra: Partial<CreateOperation> = {}): CreateOperation => ({
    storeId: store.id,
    key: randomUUID(),
    kind: mode,
    phone: '+573001234567',
    items: [{ productId: design.products[0].id, quantity: 1 }],
    ...extra,
  });
  return {
    db,
    owner,
    client,
    other,
    courier,
    store,
    design,
    request,
    close() {
      db.close();
    },
  };
}
const fails = (fn: () => unknown, status: number) =>
  assert.throws(
    fn,
    (e: unknown) => !!e && typeof e === 'object' && 'status' in e && e.status === status,
  );
test('pedido: precio en servidor, idempotencia, inventario y permisos', () => {
  const f = fixture();
  try {
    const product = f.design.products[0].id;
    f.db.prepare('INSERT INTO inventory VALUES (?,?,?)').run(f.store.id, product, 2);
    const body = f.request({ expectedSubtotal: 10000 });
    const order = createOperation(f.db, f.client, body);
    assert.equal(order.amount, 10000);
    assert.equal(commerceStore(f.db, f.store.id).stock[product], 1);
    assert.equal(createOperation(f.db, f.client, body).id, order.id);
    assert.equal(commerceStore(f.db, f.store.id).stock[product], 1);
    fails(() => createOperation(f.db, f.client, { ...body, phone: '+573009999999' }), 409);
    fails(() => createOperation(f.db, f.client, f.request({ expectedSubtotal: 1 })), 409);
    assert.equal(commerceStore(f.db, f.store.id).stock[product], 1);
    fails(() => createOperation(f.db, f.owner, f.request()), 400);
    fails(() => actOperation(f.db, f.other, order.id, 'prepare'), 404);
    fails(() => actOperation(f.db, f.client, order.id, 'prepare'), 409);
    assert.equal(serialize(operation(f.db, order.id), f.owner.id).pin, undefined);
    assert.ok(order.pin);
    actOperation(f.db, f.owner, order.id, 'prepare');
    actOperation(f.db, f.owner, order.id, 'ready');
    fails(() => actOperation(f.db, f.owner, order.id, 'complete', { pin: order.pin }), 409);
    actOperation(f.db, f.owner, order.id, 'payment');
    actOperation(f.db, f.owner, order.id, 'complete', { pin: order.pin });
    assert.equal(balance(f.db, f.client.id), 10);
    fails(() => actOperation(f.db, f.owner, order.id, 'complete', { pin: order.pin }), 409);
    assert.equal(balance(f.db, f.client.id), 10);
  } finally {
    f.close();
  }
});
test('cancelar restaura stock una vez; falta de unidades no deja pedido parcial', () => {
  const f = fixture();
  try {
    const id = f.design.products[0].id;
    f.db.prepare('INSERT INTO inventory VALUES (?,?,1)').run(f.store.id, id);
    const order = createOperation(f.db, f.client, f.request());
    fails(() => createOperation(f.db, f.other, f.request()), 409);
    actOperation(f.db, f.client, order.id, 'cancel');
    assert.equal(commerceStore(f.db, f.store.id).stock[id], 1);
    fails(() => actOperation(f.db, f.client, order.id, 'cancel'), 409);
    assert.equal(commerceStore(f.db, f.store.id).stock[id], 1);
    const fail = f.request({
      items: [
        { productId: id, quantity: 1 },
        { productId: 'no-existe', quantity: 1 },
      ],
    });
    fails(() => createOperation(f.db, f.other, fail), 400);
    assert.equal(commerceStore(f.db, f.store.id).stock[id], 1);
  } finally {
    f.close();
  }
});
test('entrega requiere domiciliario aprobado y PIN, limita intentos y protege los datos por participante', () => {
  const f = fixture();
  try {
    setSettings(f.db, f.store.id, {
      ...settings(f.db, f.store.id),
      delivery: true,
      deliveryFee: 3000,
    });
    f.db
      .prepare('INSERT INTO couriers (user_id,phone,municipality,approved) VALUES (?,?,?,0)')
      .run(f.courier.id, '+573001112233', 'Sincelejo');
    const order = createOperation(
      f.db,
      f.client,
      f.request({ fulfillment: 'delivery', address: 'Dirección de prueba' }),
    );
    assert.equal(order.amount, 13000);
    actOperation(f.db, f.owner, order.id, 'prepare');
    actOperation(f.db, f.owner, order.id, 'ready');
    fails(
      () =>
        actOperation(f.db, f.owner, order.id, 'dispatch', {
          courierId: f.courier.id,
          etaMinutes: 20,
        }),
      400,
    );
    f.db.prepare('UPDATE couriers SET approved=1').run();
    actOperation(f.db, f.owner, order.id, 'dispatch', { courierId: f.courier.id, etaMinutes: 20 });
    actOperation(f.db, f.owner, order.id, 'payment');
    assert.equal(state(f.db, f.other).operations.length, 0);
    assert.equal(state(f.db, f.other).sales.length, 0);
    assert.equal(state(f.db, f.other).deliveries.length, 0);
    assert.equal(state(f.db, f.courier).deliveries[0].pin, undefined);
    assert.equal(state(f.db, f.client).operations[0].pin, order.pin);
    for (let i = 0; i < 5; i++)
      fails(() => actOperation(f.db, f.courier, order.id, 'complete', { pin: 'incorrecto' }), 400);
    fails(() => actOperation(f.db, f.courier, order.id, 'complete', { pin: order.pin }), 429);
    const unlocked = operation(f.db, order.id);
    unlocked.pinLockedUntil = 0;
    f.db
      .prepare('UPDATE operations SET payload=? WHERE id=?')
      .run(JSON.stringify(unlocked), order.id);
    actOperation(f.db, f.courier, order.id, 'complete', { pin: order.pin });
    assert.equal(balance(f.db, f.client.id), 10);
  } finally {
    f.close();
  }
});
test('agenda evita doble reserva, libera al cancelar y limita el cierre de citas futuras', () => {
  const f = fixture('booking');
  try {
    const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      available = slots(f.db, f.store.id, day);
    assert.ok(available.length);
    const order = createOperation(
      f.db,
      f.client,
      f.request({ slot: available[0], detail: 'Servicio de prueba' }),
    );
    fails(
      () =>
        createOperation(f.db, f.other, f.request({ slot: available[0], detail: 'Otro servicio' })),
      409,
    );
    actOperation(f.db, f.owner, order.id, 'confirm');
    actOperation(f.db, f.owner, order.id, 'payment');
    fails(() => actOperation(f.db, f.owner, order.id, 'complete'), 409);
    const second = createOperation(
      f.db,
      f.other,
      f.request({ slot: available[1], detail: 'Otra hora' }),
    );
    actOperation(f.db, f.other, second.id, 'cancel');
    assert.ok(slots(f.db, f.store.id, day).includes(available[1]));
  } finally {
    f.close();
  }
});
test('cotización exige precio válido, aceptación del cliente y pago antes de completar', () => {
  const f = fixture('quote');
  try {
    const op = createOperation(
      f.db,
      f.client,
      f.request({ detail: 'Necesito instalar un equipo' }),
    );
    fails(() => actOperation(f.db, f.owner, op.id, 'quote', { amount: -1 }), 400);
    fails(() => actOperation(f.db, f.owner, op.id, 'payment'), 409);
    actOperation(f.db, f.owner, op.id, 'quote', { amount: 50000 });
    fails(() => actOperation(f.db, f.owner, op.id, 'accept'), 409);
    actOperation(f.db, f.client, op.id, 'accept');
    actOperation(f.db, f.owner, op.id, 'payment');
    actOperation(f.db, f.owner, op.id, 'complete');
    assert.equal(balance(f.db, f.client.id), 50);
    assert.equal(commerceStore(f.db, f.store.id).completed365, 1);
  } finally {
    f.close();
  }
});
test('canje y descuento son atómicos, de una cuenta y negocio; cancelar restaura el bono', () => {
  const f = fixture();
  try {
    f.db
      .prepare('INSERT INTO points_ledger VALUES (?,?,?,?,?)')
      .run('fixture', f.client.id, 20, 'saldo de prueba', new Date().toISOString());
    const promo: Promotion = {
      id: randomUUID(),
      storeId: f.store.id,
      storeName: 'Negocio',
      title: 'Bono',
      percent: 10,
      cost: 10,
      expires: new Date(Date.now() + 86400000).toISOString(),
      active: true,
    };
    f.db
      .prepare('INSERT INTO promotions VALUES (?,?,?)')
      .run(promo.id, f.store.id, JSON.stringify(promo));
    fails(() => redeem(f.db, f.other, promo.id), 409);
    const coupon = redeem(f.db, f.client, promo.id);
    assert.equal(balance(f.db, f.client.id), 10);
    fails(() => redeem(f.db, f.client, promo.id), 409);
    assert.equal(balance(f.db, f.client.id), 10);
    fails(() => createOperation(f.db, f.other, f.request({ couponId: coupon.id })), 409);
    const order = createOperation(f.db, f.client, f.request({ couponId: coupon.id }));
    assert.equal(order.amount, 9000);
    fails(() => createOperation(f.db, f.client, f.request({ couponId: coupon.id })), 409);
    actOperation(f.db, f.client, order.id, 'cancel');
    assert.equal(state(f.db, f.client).coupons[0].used, false);
  } finally {
    f.close();
  }
});
test('el progreso escolar persiste solo con respuesta correcta y es idempotente', () => {
  const f = fixture();
  try {
    fails(() => lessonAnswer(f.db, f.client, 'historia', 1), 400);
    assert.equal(state(f.db, f.client).lessons.length, 0);
    lessonAnswer(f.db, f.client, 'historia', 0);
    lessonAnswer(f.db, f.client, 'historia', 0);
    assert.deepEqual(state(f.db, f.client).lessons, ['historia']);
  } finally {
    f.close();
  }
});

test('devolución manual revierte puntos e inventario de forma única', () => {
  const f = fixture();
  try {
    const id = f.design.products[0].id;
    f.db.prepare('INSERT INTO inventory VALUES (?,?,1)').run(f.store.id, id);
    const op = createOperation(f.db, f.client, f.request());
    for (const action of ['prepare', 'ready', 'payment'])
      actOperation(f.db, f.owner, op.id, action);
    actOperation(f.db, f.owner, op.id, 'complete', { pin: op.pin });
    assert.equal(balance(f.db, f.client.id), 10);
    fails(() => actOperation(f.db, f.client, op.id, 'refund', { note: 'Sin permiso' }), 409);
    actOperation(f.db, f.owner, op.id, 'refund', {
      note: 'Dinero devuelto por el negocio',
      returned: true,
    });
    assert.equal(balance(f.db, f.client.id), 0);
    assert.equal(commerceStore(f.db, f.store.id).stock[id], 1);
    fails(() => actOperation(f.db, f.owner, op.id, 'refund', { note: 'Repetida' }), 409);
    assert.equal(commerceStore(f.db, f.store.id).stock[id], 1);
  } finally {
    f.close();
  }
});

test('cambiar duración de agenda no permite solapar una cita existente', () => {
  const f = fixture('booking');
  try {
    const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const old = slots(f.db, f.store.id, date)[0];
    createOperation(f.db, f.client, f.request({ slot: old, detail: 'Cita de una hora' }));
    setSettings(f.db, f.store.id, { ...settings(f.db, f.store.id), duration: 30 });
    const half = new Date(Date.parse(old) + 30 * 60000).toISOString();
    assert.ok(!slots(f.db, f.store.id, date).some((slot) => Date.parse(slot) === Date.parse(half)));
    fails(() => slots(f.db, f.store.id, '2026-02-31'), 400);
  } finally {
    f.close();
  }
});
