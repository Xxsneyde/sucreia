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
async function fixture(mode: 'products' | 'booking' | 'quote' = 'products') {
  const db = await openDb(':memory:');
  const make = (name: string, role: 'cliente' | 'emprendedor' = 'cliente') =>
    createUser(db, { email: name + '@example.co', name, passwordHash: 'no-usado', role });
  const owner = await make('negocio', 'emprendedor'),
    client = await make('cliente'),
    other = await make('otro'),
    courier = await make('domiciliario');
  const design = createDesign(
    mode === 'products' ? 'Artesanías' : mode === 'booking' ? 'Belleza' : 'Servicios',
    'Negocio real',
  );
  design.mode = mode;
  design.products = design.products.map((p) => ({ ...p, price: 10000 }));
  const store = await createStore(db, owner.id, design);
  await savePublication(db, store.id, publishProject(store).published!);
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
  assert.rejects(
    async () => fn(),
    (e: unknown) => !!e && typeof e === 'object' && 'status' in e && e.status === status,
  );
test('pedido: precio en servidor, idempotencia, inventario y permisos', async () => {
  const f = await fixture();
  try {
    const product = f.design.products[0].id;
    await f.db.prepare('INSERT INTO inventory VALUES (?,?,?)').run(f.store.id, product, 2);
    const body = f.request({ expectedSubtotal: 10000 });
    const order = await createOperation(f.db, f.client, body);
    assert.equal(order.amount, 10000);
    assert.equal((await commerceStore(f.db, f.store.id)).stock[product], 1);
    assert.equal((await createOperation(f.db, f.client, body)).id, order.id);
    assert.equal((await commerceStore(f.db, f.store.id)).stock[product], 1);
    await fails(() => createOperation(f.db, f.client, { ...body, phone: '+573009999999' }), 409);
    await fails(() => createOperation(f.db, f.client, f.request({ expectedSubtotal: 1 })), 409);
    assert.equal((await commerceStore(f.db, f.store.id)).stock[product], 1);
    await fails(() => createOperation(f.db, f.owner, f.request()), 400);
    await fails(() => actOperation(f.db, f.other, order.id, 'prepare'), 404);
    await fails(() => actOperation(f.db, f.client, order.id, 'prepare'), 409);
    assert.equal(serialize(await operation(f.db, order.id), f.owner.id).pin, undefined);
    assert.ok(order.pin);
    await actOperation(f.db, f.owner, order.id, 'prepare');
    await actOperation(f.db, f.owner, order.id, 'ready');
    await fails(() => actOperation(f.db, f.owner, order.id, 'complete', { pin: order.pin }), 409);
    await actOperation(f.db, f.owner, order.id, 'payment');
    await actOperation(f.db, f.owner, order.id, 'complete', { pin: order.pin });
    assert.equal(await balance(f.db, f.client.id), 10);
    await fails(() => actOperation(f.db, f.owner, order.id, 'complete', { pin: order.pin }), 409);
    assert.equal(await balance(f.db, f.client.id), 10);
  } finally {
    f.close();
  }
});
test('cancelar restaura stock una vez; falta de unidades no deja pedido parcial', async () => {
  const f = await fixture();
  try {
    const id = f.design.products[0].id;
    await f.db.prepare('INSERT INTO inventory VALUES (?,?,1)').run(f.store.id, id);
    const order = await createOperation(f.db, f.client, f.request());
    await fails(() => createOperation(f.db, f.other, f.request()), 409);
    await actOperation(f.db, f.client, order.id, 'cancel');
    assert.equal((await commerceStore(f.db, f.store.id)).stock[id], 1);
    await fails(() => actOperation(f.db, f.client, order.id, 'cancel'), 409);
    assert.equal((await commerceStore(f.db, f.store.id)).stock[id], 1);
    const fail = f.request({
      items: [
        { productId: id, quantity: 1 },
        { productId: 'no-existe', quantity: 1 },
      ],
    });
    await fails(() => createOperation(f.db, f.other, fail), 400);
    assert.equal((await commerceStore(f.db, f.store.id)).stock[id], 1);
  } finally {
    f.close();
  }
});
test('entrega requiere domiciliario aprobado y PIN, limita intentos y protege los datos por participante', async () => {
  const f = await fixture();
  try {
    await setSettings(f.db, f.store.id, {
      ...(await settings(f.db, f.store.id)),
      delivery: true,
      deliveryFee: 3000,
    });
    await f.db
      .prepare('INSERT INTO couriers (user_id,phone,municipality,approved) VALUES (?,?,?,0)')
      .run(f.courier.id, '+573001112233', 'Sincelejo');
    const order = await createOperation(
      f.db,
      f.client,
      f.request({ fulfillment: 'delivery', address: 'Dirección de prueba' }),
    );
    assert.equal(order.amount, 13000);
    await actOperation(f.db, f.owner, order.id, 'prepare');
    await actOperation(f.db, f.owner, order.id, 'ready');
    await fails(
      () =>
        actOperation(f.db, f.owner, order.id, 'dispatch', {
          courierId: f.courier.id,
          etaMinutes: 20,
        }),
      400,
    );
    await f.db.prepare('UPDATE couriers SET approved=1').run();
    await actOperation(f.db, f.owner, order.id, 'dispatch', {
      courierId: f.courier.id,
      etaMinutes: 20,
    });
    await actOperation(f.db, f.owner, order.id, 'payment');
    assert.equal((await state(f.db, f.other)).operations.length, 0);
    assert.equal((await state(f.db, f.other)).sales.length, 0);
    assert.equal((await state(f.db, f.other)).deliveries.length, 0);
    assert.equal((await state(f.db, f.courier)).deliveries[0].pin, undefined);
    assert.equal((await state(f.db, f.client)).operations[0].pin, order.pin);
    for (let i = 0; i < 5; i++)
      await fails(
        () => actOperation(f.db, f.courier, order.id, 'complete', { pin: 'incorrecto' }),
        400,
      );
    await fails(() => actOperation(f.db, f.courier, order.id, 'complete', { pin: order.pin }), 429);
    const unlocked = await operation(f.db, order.id);
    unlocked.pinLockedUntil = 0;
    await f.db
      .prepare('UPDATE operations SET payload=? WHERE id=?')
      .run(JSON.stringify(unlocked), order.id);
    await actOperation(f.db, f.courier, order.id, 'complete', { pin: order.pin });
    assert.equal(await balance(f.db, f.client.id), 10);
  } finally {
    f.close();
  }
});
test('agenda evita doble reserva, libera al cancelar y limita el cierre de citas futuras', async () => {
  const f = await fixture('booking');
  try {
    const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      available = await slots(f.db, f.store.id, day);
    assert.ok(available.length);
    const order = await createOperation(
      f.db,
      f.client,
      f.request({ slot: available[0], detail: 'Servicio de prueba' }),
    );
    await fails(
      () =>
        createOperation(f.db, f.other, f.request({ slot: available[0], detail: 'Otro servicio' })),
      409,
    );
    await actOperation(f.db, f.owner, order.id, 'confirm');
    await actOperation(f.db, f.owner, order.id, 'payment');
    await fails(() => actOperation(f.db, f.owner, order.id, 'complete'), 409);
    // Una hora que no se cruza con la primera cita (los horarios van cada 30 minutos).
    const later = available.find((s) => Date.parse(s) >= Date.parse(available[0]) + 3600_000)!;
    const second = await createOperation(
      f.db,
      f.other,
      f.request({ slot: later, detail: 'Otra hora' }),
    );
    await actOperation(f.db, f.other, second.id, 'cancel');
    assert.ok((await slots(f.db, f.store.id, day)).includes(later));
  } finally {
    f.close();
  }
});
test('cotización exige precio válido, aceptación del cliente y pago antes de completar', async () => {
  const f = await fixture('quote');
  try {
    const op = await createOperation(
      f.db,
      f.client,
      f.request({ detail: 'Necesito instalar un equipo' }),
    );
    await fails(() => actOperation(f.db, f.owner, op.id, 'quote', { amount: -1 }), 400);
    await fails(() => actOperation(f.db, f.owner, op.id, 'payment'), 409);
    await actOperation(f.db, f.owner, op.id, 'quote', { amount: 50000 });
    await fails(() => actOperation(f.db, f.owner, op.id, 'accept'), 409);
    await actOperation(f.db, f.client, op.id, 'accept');
    await actOperation(f.db, f.owner, op.id, 'payment');
    await actOperation(f.db, f.owner, op.id, 'complete');
    assert.equal(await balance(f.db, f.client.id), 50);
    assert.equal((await commerceStore(f.db, f.store.id)).completed365, 1);
  } finally {
    f.close();
  }
});
test('canje y descuento son atómicos, de una cuenta y negocio; cancelar restaura el bono', async () => {
  const f = await fixture();
  try {
    await f.db
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
    await f.db
      .prepare('INSERT INTO promotions VALUES (?,?,?)')
      .run(promo.id, f.store.id, JSON.stringify(promo));
    await fails(() => redeem(f.db, f.other, promo.id), 409);
    const coupon = await redeem(f.db, f.client, promo.id);
    assert.equal(await balance(f.db, f.client.id), 10);
    await fails(() => redeem(f.db, f.client, promo.id), 409);
    assert.equal(await balance(f.db, f.client.id), 10);
    await fails(() => createOperation(f.db, f.other, f.request({ couponId: coupon.id })), 409);
    const order = await createOperation(f.db, f.client, f.request({ couponId: coupon.id }));
    assert.equal(order.amount, 9000);
    await fails(() => createOperation(f.db, f.client, f.request({ couponId: coupon.id })), 409);
    await actOperation(f.db, f.client, order.id, 'cancel');
    assert.equal((await state(f.db, f.client)).coupons[0].used, false);
  } finally {
    f.close();
  }
});
test('el progreso escolar persiste solo con respuesta correcta y es idempotente', async () => {
  const f = await fixture();
  try {
    await fails(() => lessonAnswer(f.db, f.client, 'historia', 1), 400);
    assert.equal((await state(f.db, f.client)).lessons.length, 0);
    await lessonAnswer(f.db, f.client, 'historia', 0);
    await lessonAnswer(f.db, f.client, 'historia', 0);
    assert.deepEqual((await state(f.db, f.client)).lessons, ['historia']);
  } finally {
    f.close();
  }
});

test('devolución manual revierte puntos e inventario de forma única', async () => {
  const f = await fixture();
  try {
    const id = f.design.products[0].id;
    await f.db.prepare('INSERT INTO inventory VALUES (?,?,1)').run(f.store.id, id);
    const op = await createOperation(f.db, f.client, f.request());
    for (const action of ['prepare', 'ready', 'payment'])
      await actOperation(f.db, f.owner, op.id, action);
    await actOperation(f.db, f.owner, op.id, 'complete', { pin: op.pin });
    assert.equal(await balance(f.db, f.client.id), 10);
    await fails(() => actOperation(f.db, f.client, op.id, 'refund', { note: 'Sin permiso' }), 409);
    await actOperation(f.db, f.owner, op.id, 'refund', {
      note: 'Dinero devuelto por el negocio',
      returned: true,
    });
    assert.equal(await balance(f.db, f.client.id), 0);
    assert.equal((await commerceStore(f.db, f.store.id)).stock[id], 1);
    await fails(() => actOperation(f.db, f.owner, op.id, 'refund', { note: 'Repetida' }), 409);
    assert.equal((await commerceStore(f.db, f.store.id)).stock[id], 1);
  } finally {
    f.close();
  }
});

test('cambiar duración de agenda no permite solapar una cita existente', async () => {
  const f = await fixture('booking');
  try {
    const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const old = (await slots(f.db, f.store.id, date))[0];
    await createOperation(f.db, f.client, f.request({ slot: old, detail: 'Cita de una hora' }));
    await setSettings(f.db, f.store.id, { ...(await settings(f.db, f.store.id)), duration: 30 });
    const half = new Date(Date.parse(old) + 30 * 60000).toISOString();
    assert.ok(
      !(await slots(f.db, f.store.id, date)).some((slot) => Date.parse(slot) === Date.parse(half)),
    );
    await fails(() => slots(f.db, f.store.id, '2026-02-31'), 400);
  } finally {
    f.close();
  }
});
