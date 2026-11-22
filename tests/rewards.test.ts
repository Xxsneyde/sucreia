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
import { levelFor, REWARDS } from '../src/domain/rewards.ts';

function fixture() {
  const db = openDb(':memory:'),
    dir = mkdtempSync(join(tmpdir(), 'sucreia-rewards-')),
    http = httpClient(createApp({ db, imagesDir: dir, localMail: true }));
  function client() {
    let cookie = '';
    return async (method: string, path: string, body?: unknown) => {
      const response = await http(method, '/api' + path, body, cookie ? { Cookie: cookie } : {});
      const set = response.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return {
        status: response.status,
        json: response.status === 204 ? null : await response.json(),
      };
    };
  }
  async function account(role = 'cliente', referido?: string) {
    const call = client();
    const result = await call('POST', '/auth/registro', {
      name: `Persona ${role}`,
      email: randomUUID() + '@example.co',
      password: 'clave-segura-1',
      role,
      referido,
    });
    assert.equal(result.status, 201);
    return { call, user: result.json.user };
  }
  /** Negocio publicado de productos y una compra completada (con su PIN) de `buyer`. */
  async function purchase(
    owner: Awaited<ReturnType<typeof account>>,
    buyer: Awaited<ReturnType<typeof account>>,
    sector: string,
  ) {
    const design = createDesign(sector, `Negocio ${randomUUID().slice(0, 6)}`);
    design.mode = 'products';
    design.products[0].price = 10000;
    const store = (await owner.call('POST', '/mis-tiendas', { design })).json.store;
    await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    const op = (
      await buyer.call('POST', '/plataforma/operaciones', {
        storeId: store.id,
        key: randomUUID(),
        kind: 'products',
        items: [{ productId: design.products[0].id, quantity: 1 }],
        phone: '+573001234567',
      })
    ).json.operation;
    for (const action of ['prepare', 'ready', 'payment'])
      assert.equal(
        (await owner.call('POST', `/plataforma/operaciones/${op.id}/${action}`)).status,
        200,
      );
    assert.equal(
      (await owner.call('POST', `/plataforma/operaciones/${op.id}/complete`, { pin: op.pin }))
        .status,
      200,
    );
    return op.id as string;
  }
  return {
    db,
    account,
    purchase,
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
const state = async (a: { call: (m: string, p: string) => Promise<{ json: any }> }) =>
  (await a.call('GET', '/plataforma/estado')).json;

test('SucrePuntos: reseña +20 una sola vez, referido +30 en la primera compra y retos +50', async () => {
  const f = fixture();
  try {
    const owner = await f.account('emprendedor');
    const ana = await f.account();
    const code = (await state(ana)).referral.code as string;
    assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.equal((await state(ana)).referral.code, code, 'el código es estable');
    // Un código inválido no bloquea el registro; el propio código no se puede usar.
    await f.account('cliente', 'XXXXXX');
    const maria = await f.account('cliente', code);
    assert.equal((await state(ana)).referral.invited, 1);

    const first = await f.purchase(owner, maria, 'Gastronomía y Alimentos');
    assert.equal((await state(ana)).points, REWARDS.referral);
    assert.equal((await state(ana)).referral.rewarded, 1);
    await f.purchase(owner, maria, 'Moda y Confección');
    assert.equal((await state(ana)).points, REWARDS.referral, 'solo la primera compra cuenta');

    const before = (await state(maria)).points;
    assert.equal(
      (
        await maria.call('POST', '/plataforma/resenas', {
          operationId: first,
          rating: 5,
          comment: 'Muy bien',
        })
      ).status,
      201,
    );
    assert.equal((await state(maria)).points, before + REWARDS.review);

    // Tercer sector distinto → reto cumplido (+50) una sola vez.
    await f.purchase(owner, maria, 'Turismo y Hospedaje');
    const s = await state(maria);
    assert.ok(s.challenges.find((c: { id: string }) => c.id === 'tres-sectores').done);
    assert.equal(
      s.ledger.filter((e: { id: string }) => e.id === 'challenge:tres-sectores').length,
      1,
    );
    assert.ok(s.notifications.some((n: { title: string }) => n.title.includes('Reto cumplido')));
  } finally {
    f.close();
  }
});

test('ferias y eventos: solo la administración los crea; el código correcto suma puntos una vez', async () => {
  const f = fixture();
  try {
    const admin = await f.account();
    f.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.user.id);
    const ana = await f.account();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
      new Date(),
    );
    const event = {
      title: 'Feria de prueba',
      place: 'Plaza',
      municipality: 'Sincelejo',
      date: today,
      points: 70,
      code: 'FERIA1',
    };
    assert.equal((await ana.call('POST', '/plataforma/admin/eventos', event)).status, 403);
    assert.equal(
      (await admin.call('POST', '/plataforma/admin/eventos', { ...event, points: 500 })).status,
      400,
    );
    assert.equal(
      (
        await admin.call('POST', '/plataforma/admin/eventos', {
          ...event,
          municipality: 'Medellín',
        })
      ).status,
      400,
    );
    const { id } = (await admin.call('POST', '/plataforma/admin/eventos', event)).json;
    const listed = (await ana.call('GET', '/plataforma/eventos')).json.events;
    assert.equal(listed.length, 1);
    assert.equal(listed[0].code_hash, undefined, 'el código nunca se expone');
    assert.equal(
      (await ana.call('POST', `/plataforma/eventos/${id}/asistencia`, { code: 'otro' })).status,
      400,
    );
    assert.equal(
      (await ana.call('POST', `/plataforma/eventos/${id}/asistencia`, { code: 'feria1' })).status,
      201,
    );
    assert.equal(
      (await ana.call('POST', `/plataforma/eventos/${id}/asistencia`, { code: 'FERIA1' })).status,
      201,
    );
    const s = await state(ana);
    assert.equal(s.points, 70);
    assert.ok(s.events[0].attended);
    // Un evento futuro todavía no acepta asistencia.
    const later = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    const future = (
      await admin.call('POST', '/plataforma/admin/eventos', {
        ...event,
        title: 'Futuro',
        date: later,
      })
    ).json.id;
    assert.equal(
      (await ana.call('POST', `/plataforma/eventos/${future}/asistencia`, { code: 'FERIA1' }))
        .status,
      409,
    );
    assert.equal((await admin.call('DELETE', `/plataforma/admin/eventos/${future}`)).status, 204);
  } finally {
    f.close();
  }
});

test('niveles de SucrePuntos según el saldo', () => {
  assert.equal(levelFor(0).level.name, 'Explorador');
  assert.equal(levelFor(3999).next?.name, 'Emprendedor');
  assert.equal(levelFor(4000).level.name, 'Emprendedor');
  assert.equal(levelFor(12000).level.name, 'Embajador');
  assert.equal(levelFor(12000).next, null);
});
