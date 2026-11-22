import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { openDb } from '../server/db.ts';
import { createApp } from '../server/app.ts';
import { httpClient } from './http.ts';
import { createDesign } from '../src/domain/studio.ts';
import type { BusinessMode } from '../src/domain/types.ts';

type Call = (m: string, p: string, b?: unknown) => Promise<{ status: number; json: any }>;

async function fixture() {
  const db = await openDb(':memory:'),
    dir = mkdtempSync(join(tmpdir(), 'sucreia-logistica-')),
    http = httpClient(createApp({ db, imagesDir: dir, localMail: true, registrationLimit: 1000 }));
  const account = async (role = 'cliente') => {
    let cookie = '';
    const call: Call = async (method, path, body) => {
      const response = await http(method, '/api' + path, body, cookie ? { Cookie: cookie } : {});
      const set = response.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return {
        status: response.status,
        json: response.status === 204 ? null : await response.json(),
      };
    };
    const r = await call('POST', '/auth/registro', {
      name: `Persona ${role}`,
      email: randomUUID() + '@example.co',
      password: 'clave-segura-1',
      role,
    });
    assert.equal(r.status, 201);
    return { call, user: r.json.user as { id: string } };
  };
  /** Negocio publicado; `config` se aplica a su configuración. */
  const business = async (
    owner: Awaited<ReturnType<typeof account>>,
    mode: BusinessMode,
    municipality = 'Sincelejo',
    config: Record<string, unknown> = {},
  ) => {
    const design = createDesign(
      mode === 'booking' ? 'Belleza y Bienestar' : 'Gastronomía y Alimentos',
      `Negocio ${mode}`,
    );
    design.mode = mode;
    design.municipality = municipality;
    design.products = design.products.map((p, i) => ({
      ...p,
      price: 10000,
      ...(mode === 'booking' ? { duration: i === 0 ? 30 : 60 } : {}),
    }));
    const store = (await owner.call('POST', '/mis-tiendas', { design })).json.store;
    assert.equal((await owner.call('POST', `/mis-tiendas/${store.id}/publicar`)).status, 200);
    const cfg = (await owner.call('GET', `/plataforma/negocios/${store.id}`)).json.settings;
    const put = await owner.call('PUT', `/plataforma/negocios/${store.id}/configuracion`, {
      ...cfg,
      ...config,
    });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    return { id: store.id as string, design };
  };
  return {
    db,
    account,
    business,
    close: () => (void db.close(), rmSync(dir, { recursive: true, force: true })),
  };
}
const day = (offset: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
    new Date(Date.now() + offset * 86_400_000),
  );
/** Próxima fecha (desde mañana) que cae en el día de la semana indicado (0 = domingo). */
function nextWeekday(target: number) {
  for (let i = 1; i < 9; i++) {
    const d = day(i);
    if (new Date(d + 'T12:00:00Z').getUTCDay() === target) return d;
  }
  throw new Error('sin fecha');
}

test('agenda: horario por día, duración por servicio, cupo simultáneo y bloqueos', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor');
    const week = Array.from({ length: 7 }, (_, i) => ({ closed: i === 0, opens: 9, closes: 12 }));
    const store = await f.business(owner, 'booking', 'Sincelejo', {
      week,
      capacity: 2,
      duration: 30,
    });
    const client = await f.account();
    const sunday = nextWeekday(0),
      monday = nextWeekday(1);
    const slots = async (date: string, servicio = store.design.products[0].id) =>
      (
        await client.call(
          'GET',
          `/plataforma/negocios/${store.id}/horarios?fecha=${date}&servicio=${servicio}`,
        )
      ).json.slots as string[];
    assert.deepEqual(await slots(sunday), [], 'el domingo está cerrado');
    const morning = await slots(monday);
    assert.equal(morning[0], `${monday}T09:00:00-05:00`);
    // Servicio de 60 min: la última hora posible es las 11:00 (cierra a las 12).
    const long = await slots(monday, store.design.products[1].id);
    assert.equal(long.at(-1), `${monday}T11:00:00-05:00`);
    const book = (who: typeof client) =>
      who.call('POST', '/plataforma/operaciones', {
        storeId: store.id,
        key: randomUUID(),
        kind: 'booking',
        items: [{ productId: store.design.products[0].id, quantity: 1 }],
        detail: 'Corte',
        phone: '+573001234567',
        slot: `${monday}T09:00:00-05:00`,
      });
    assert.equal((await book(client)).status, 201);
    assert.equal(
      (await book(await f.account())).status,
      201,
      'cupo 2: segunda cita a la misma hora',
    );
    assert.equal((await book(await f.account())).status, 409, 'el cupo se llenó');
    assert.ok(!(await slots(monday)).includes(`${monday}T09:00:00-05:00`));
    // Bloqueo de 10:00 a 11:00 y día completo.
    const cfg = (await owner.call('GET', `/plataforma/negocios/${store.id}`)).json.settings;
    await owner.call('PUT', `/plataforma/negocios/${store.id}/configuracion`, {
      ...cfg,
      blocks: [
        { date: monday, from: '10:00', to: '11:00', note: 'Almuerzo' },
        { date: nextWeekday(2), from: '', to: '', note: 'Vacaciones' },
      ],
    });
    const blocked = await slots(monday);
    assert.ok(!blocked.includes(`${monday}T10:00:00-05:00`));
    assert.ok(blocked.includes(`${monday}T11:00:00-05:00`));
    assert.deepEqual(await slots(nextWeekday(2)), []);
    const bad = await owner.call('PUT', `/plataforma/negocios/${store.id}/configuracion`, {
      ...cfg,
      blocks: [{ date: monday, from: '12:00', to: '10:00', note: '' }],
    });
    assert.equal(bad.status, 400);
  } finally {
    f.close();
  }
});

test('logística: bolsa por zona sin datos privados, tomar, recoger, rastreo y entrega con PIN', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor');
    const store = await f.business(owner, 'products', 'Corozal', {
      delivery: true,
      deliveryFee: 6000,
      latitude: 9.318,
      longitude: -75.293,
    });
    const client = await f.account();
    const rider = await f.account(),
      other = await f.account(),
      far = await f.account();
    for (const [who, town] of [
      [rider, 'Corozal'],
      [other, 'Corozal'],
      [far, 'Sincelejo'],
    ] as const) {
      await who.call('PUT', '/plataforma/domiciliario', {
        phone: '+573009998877',
        municipality: town,
        vehicle: 'Moto',
      });
      assert.equal(
        (await who.call('PUT', '/plataforma/domiciliario/disponible', { available: true })).status,
        403,
        'sin aprobación no puede activarse',
      );
    }
    await f.db.prepare('UPDATE couriers SET approved=1').run();
    for (const who of [rider, other, far])
      assert.equal(
        (await who.call('PUT', '/plataforma/domiciliario/disponible', { available: true })).status,
        204,
      );
    const op = (
      await client.call('POST', '/plataforma/operaciones', {
        storeId: store.id,
        key: randomUUID(),
        kind: 'products',
        items: [{ productId: store.design.products[0].id, quantity: 1 }],
        phone: '+573001234567',
        fulfillment: 'delivery',
        address: 'Calle 10 # 5-20',
        addressLat: 9.32,
        addressLng: -75.29,
        paymentMethod: 'cash',
      })
    ).json.operation;
    // Entra a la bolsa cuando el negocio acepta el pedido.
    assert.equal((await rider.call('GET', '/plataforma/estado')).json.pool.length, 0);
    await owner.call('POST', `/plataforma/operaciones/${op.id}/prepare`);
    const pool = async (who: typeof rider) =>
      (await who.call('GET', '/plataforma/estado')).json.pool;
    const seen = (await pool(rider))[0];
    assert.equal(seen.id, op.id, 'aparece en la zona del pedido');
    assert.equal(seen.phone, '', 'sin teléfono del cliente antes de aceptar');
    assert.equal(seen.address, '', 'sin dirección antes de aceptar');
    assert.equal(seen.addressLat, null, 'ni sus coordenadas');
    assert.equal(seen.pin, undefined);
    assert.equal((await pool(far)).length, 0, 'otra zona no lo ve');
    assert.equal((await far.call('POST', `/plataforma/operaciones/${op.id}/claim`)).status, 403);
    assert.equal((await rider.call('POST', `/plataforma/operaciones/${op.id}/claim`)).status, 200);
    assert.equal(
      (await other.call('POST', `/plataforma/operaciones/${op.id}/claim`)).status,
      409,
      'el primero que acepta se lo queda',
    );
    assert.equal((await pool(other)).length, 0);
    // Antes de recoger, el pedido debe estar listo.
    assert.equal((await rider.call('POST', `/plataforma/operaciones/${op.id}/pickup`)).status, 409);
    await owner.call('POST', `/plataforma/operaciones/${op.id}/ready`);
    assert.equal(
      (await owner.call('POST', `/plataforma/operaciones/${op.id}/dispatch`)).status,
      409,
      'ya lo tomó un domiciliario',
    );
    assert.equal((await rider.call('POST', `/plataforma/operaciones/${op.id}/pickup`)).status, 200);
    await rider.call('PUT', '/plataforma/domiciliario/ubicacion', { lat: 9.319, lng: -75.291 });
    const track = (await client.call('GET', `/plataforma/operaciones/${op.id}/rastreo`)).json;
    assert.equal(track.status, 'dispatched');
    assert.equal(track.stage, 'to_client');
    assert.deepEqual([track.courier.lat, track.courier.lng], [9.319, -75.291]);
    assert.deepEqual([track.client.lat, track.store.lat], [9.32, 9.318]);
    assert.equal((await far.call('GET', `/plataforma/operaciones/${op.id}/rastreo`)).status, 404);
    // El domiciliario ve la dirección ya asignada, cobra el efectivo y entrega con el PIN.
    const mine = (await rider.call('GET', '/plataforma/estado')).json.deliveries[0];
    assert.equal(mine.address, 'Calle 10 # 5-20');
    assert.equal(
      (await rider.call('POST', `/plataforma/operaciones/${op.id}/payment`)).status,
      200,
    );
    const pin = (await client.call('GET', '/plataforma/estado')).json.operations[0].pin;
    assert.equal(
      (await rider.call('POST', `/plataforma/operaciones/${op.id}/complete`, { pin })).status,
      200,
    );
    const done = (await rider.call('GET', '/plataforma/estado')).json.deliveries[0];
    assert.equal(done.status, 'completed');
    assert.equal(done.fee, 6000, 'la tarifa del domicilio es la ganancia del domiciliario');
  } finally {
    f.close();
  }
});

test('logística: soltar un pedido, aviso a los 15 minutos y entrega propia del negocio', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor');
    const store = await f.business(owner, 'products', 'Sincelejo', {
      delivery: true,
      deliveryFee: 5000,
    });
    const client = await f.account();
    const rider = await f.account();
    await rider.call('PUT', '/plataforma/domiciliario', {
      phone: '+573009998877',
      municipality: 'Sincelejo',
      vehicle: 'Bicicleta',
    });
    await f.db.prepare('UPDATE couriers SET approved=1').run();
    await rider.call('PUT', '/plataforma/domiciliario/disponible', { available: true });
    const op = (
      await client.call('POST', '/plataforma/operaciones', {
        storeId: store.id,
        key: randomUUID(),
        kind: 'products',
        items: [{ productId: store.design.products[0].id, quantity: 1 }],
        phone: '+573001234567',
        fulfillment: 'delivery',
        address: 'Calle 1',
      })
    ).json.operation;
    await owner.call('POST', `/plataforma/operaciones/${op.id}/prepare`);
    await rider.call('POST', `/plataforma/operaciones/${op.id}/claim`);
    assert.equal(
      (await rider.call('POST', `/plataforma/operaciones/${op.id}/release`)).status,
      200,
    );
    assert.equal(
      (await rider.call('GET', '/plataforma/estado')).json.pool.length,
      1,
      'vuelve a la bolsa',
    );
    await owner.call('POST', `/plataforma/operaciones/${op.id}/ready`);
    // Simula que pasaron 20 minutos sin que nadie lo tomara.
    const row = await f.db.prepare('SELECT payload FROM operations WHERE id=?').get(op.id);
    const payload = JSON.parse(row!.payload as string);
    payload.readyAt = new Date(Date.now() - 20 * 60_000).toISOString();
    await f.db
      .prepare('UPDATE operations SET payload=? WHERE id=?')
      .run(JSON.stringify(payload), op.id);
    const notices = async () =>
      (
        (await owner.call('GET', '/plataforma/estado')).json.notifications as { title: string }[]
      ).filter((n) => n.title.includes('Ningún domiciliario')).length;
    assert.equal(await notices(), 1);
    assert.equal(await notices(), 1, 'el aviso se envía una sola vez');
    // El negocio sale a entregar y confirma con el PIN.
    assert.equal(
      (await owner.call('POST', `/plataforma/operaciones/${op.id}/dispatch`)).status,
      200,
    );
    assert.equal(
      (await owner.call('POST', `/plataforma/operaciones/${op.id}/payment`)).status,
      200,
    );
    const pin = (await client.call('GET', '/plataforma/estado')).json.operations[0].pin;
    assert.equal(
      (await owner.call('POST', `/plataforma/operaciones/${op.id}/complete`, { pin })).status,
      200,
    );
  } finally {
    f.close();
  }
});

test('citas: recordatorio el día antes, «llegó» e inasistencia', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor');
    const store = await f.business(owner, 'booking', 'Sincelejo', {
      opens: 6,
      closes: 22,
      duration: 30,
    });
    const client = await f.account();
    const tomorrow = day(1);
    const free = (
      await client.call('GET', `/plataforma/negocios/${store.id}/horarios?fecha=${tomorrow}`)
    ).json.slots as string[];
    const slot = free.find((s) => Date.parse(s) - Date.now() < 24 * 3600_000) ?? free[0];
    const op = (
      await client.call('POST', '/plataforma/operaciones', {
        storeId: store.id,
        key: randomUUID(),
        kind: 'booking',
        items: [{ productId: store.design.products[0].id, quantity: 1 }],
        detail: 'Manicure',
        phone: '+573001234567',
        slot,
      })
    ).json.operation;
    await owner.call('POST', `/plataforma/operaciones/${op.id}/confirm`);
    const reminders = async () =>
      (
        (await client.call('GET', '/plataforma/estado')).json.notifications as { title: string }[]
      ).filter((n) => n.title.startsWith('Recordatorio')).length;
    if (Date.parse(slot) - Date.now() < 24 * 3600_000) {
      assert.equal(await reminders(), 1);
      assert.equal(await reminders(), 1, 'una sola vez');
    }
    assert.equal((await owner.call('POST', `/plataforma/operaciones/${op.id}/arrive`)).status, 200);
    assert.ok((await client.call('GET', '/plataforma/estado')).json.operations[0].arrivedAt);
    assert.equal(
      (await owner.call('POST', `/plataforma/operaciones/${op.id}/noshow`)).status,
      409,
      'la cita todavía no ha pasado',
    );
    // Simula que la cita ya pasó.
    const row = await f.db.prepare('SELECT payload FROM operations WHERE id=?').get(op.id);
    const payload = JSON.parse(row!.payload as string);
    payload.slot = new Date(Date.now() - 3600_000).toISOString();
    await f.db
      .prepare('UPDATE operations SET payload=? WHERE id=?')
      .run(JSON.stringify(payload), op.id);
    assert.equal((await owner.call('POST', `/plataforma/operaciones/${op.id}/noshow`)).status, 200);
    assert.equal(
      (await client.call('GET', '/plataforma/estado')).json.operations[0].status,
      'no_show',
    );
  } finally {
    f.close();
  }
});
