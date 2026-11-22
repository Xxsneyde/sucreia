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
async function fixture() {
  const db = await openDb(':memory:'),
    dir = mkdtempSync(join(tmpdir(), 'sucreia-platform-api-')),
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
  async function account(role = 'cliente') {
    const call = client(),
      email = randomUUID() + '@example.co';
    const result = await call('POST', '/auth/registro', {
      name: role,
      email,
      password: 'clave-segura-1',
      role,
    });
    assert.equal(result.status, 201);
    return { call, user: result.json.user };
  }
  return {
    db,
    account,
    client,
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test('API: compra entre cuentas, gestión, pago, PIN, reseña, puntos, favoritos y aislamiento', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor'),
      buyer = await f.account(),
      other = await f.account();
    const design = createDesign('Artesanías', 'Tienda de prueba');
    design.products[0].price = 12000;
    const store = (await owner.call('POST', '/mis-tiendas', { design })).json.store;
    assert.equal((await owner.call('POST', `/mis-tiendas/${store.id}/publicar`)).status, 200);
    const body = {
      storeId: store.id,
      key: randomUUID(),
      kind: 'products',
      items: [{ productId: design.products[0].id, quantity: 2 }],
      phone: '+573001234567',
      expectedSubtotal: 24000,
    };
    assert.equal((await f.client()('POST', '/plataforma/operaciones', body)).status, 401);
    const created = await buyer.call('POST', '/plataforma/operaciones', body);
    assert.equal(created.status, 201);
    const op = created.json.operation;
    assert.equal(op.amount, 24000);
    assert.equal(
      (await buyer.call('POST', '/plataforma/operaciones', body)).json.operation.id,
      op.id,
    );
    assert.equal((await other.call('GET', '/plataforma/estado')).json.operations.length, 0);
    const sales = (await owner.call('GET', '/plataforma/estado')).json.sales;
    assert.equal(sales.length, 1);
    assert.equal(sales[0].pin, undefined);
    assert.equal(
      (await other.call('POST', `/plataforma/operaciones/${op.id}/prepare`)).status,
      404,
    );
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
    assert.equal((await buyer.call('GET', '/plataforma/estado')).json.points, 24);
    assert.equal(
      (
        await buyer.call('POST', '/plataforma/resenas', {
          operationId: op.id,
          rating: 5,
          comment: 'Una experiencia real de prueba',
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await buyer.call('POST', '/plataforma/resenas', {
          operationId: op.id,
          rating: 1,
          comment: 'Duplicada',
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await other.call('POST', '/plataforma/resenas', {
          operationId: op.id,
          rating: 1,
          comment: 'No compré',
        })
      ).status,
      403,
    );
    const info = await f.client()('GET', `/plataforma/negocios/${store.id}`);
    assert.equal(info.json.rating, 5);
    assert.equal(info.json.completed365, 1);
    assert.equal((await buyer.call('POST', `/plataforma/favoritos/${store.id}`)).status, 204);
    assert.deepEqual((await buyer.call('GET', '/plataforma/estado')).json.favorites, [store.id]);
    assert.equal((await owner.call('DELETE', `/mis-tiendas/${store.id}`)).status, 409);
    assert.equal((await buyer.call('POST', '/plataforma/notificaciones/leidas')).status, 204);
    assert.ok(
      (await buyer.call('GET', '/plataforma/estado')).json.notifications.every(
        (n: { read: boolean }) => n.read,
      ),
    );
    assert.equal((await other.call('GET', '/plataforma/admin')).status, 403);
  } finally {
    f.close();
  }
});
test('API: revisión administrativa, evidencia privada y aprobación de domiciliarios', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor'),
      driver = await f.account(),
      admin = await f.account();
    await f.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.user.id);
    const store = (await owner.call('POST', '/mis-tiendas', { design: createDesign() })).json.store;
    await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    assert.equal(
      (
        await owner.call('POST', `/plataforma/negocios/${store.id}/verificacion`, {
          evidence: 'Referencia privada de prueba',
        })
      ).status,
      204,
    );
    assert.equal(
      (await f.client()('GET', `/plataforma/negocios/${store.id}`)).json.settings.verificationNote,
      '',
    );
    assert.equal(
      (
        await admin.call('POST', `/plataforma/admin/negocios/${store.id}`, {
          approved: true,
          note: 'Revisión completada',
        })
      ).status,
      204,
    );
    assert.equal(
      (await f.client()('GET', `/plataforma/negocios/${store.id}`)).json.settings.verification,
      'approved',
    );
    assert.equal(
      (
        await driver.call('PUT', '/plataforma/domiciliario', {
          phone: '+573001112233',
          municipality: 'Sincelejo',
        })
      ).status,
      204,
    );
    assert.equal((await driver.call('GET', '/plataforma/estado')).json.courier.approved, false);
    assert.equal(
      (
        await owner.call('POST', `/plataforma/admin/domiciliarios/${driver.user.id}`, {
          approved: true,
          note: 'Sin permiso',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await admin.call('POST', `/plataforma/admin/domiciliarios/${driver.user.id}`, {
          approved: true,
          note: 'Datos revisados',
        })
      ).status,
      204,
    );
    assert.equal((await owner.call('GET', '/plataforma/estado')).json.couriers.length, 1);
    assert.equal((await driver.call('GET', '/plataforma/estado')).json.couriers.length, 0);
  } finally {
    f.close();
  }
});

test('API: convertir cliente, constancia verificable y suspensión que impide republicar', async () => {
  const f = await fixture();
  try {
    const owner = await f.account(),
      admin = await f.account();
    assert.equal((await owner.call('POST', '/auth/emprender', { role: 'admin' })).status, 204);
    assert.equal((await owner.call('GET', '/auth/yo')).json.user.role, 'emprendedor');
    assert.equal(
      (await owner.call('PUT', '/auth/perfil', { name: 'Nombre actualizado' })).status,
      204,
    );
    assert.equal((await owner.call('GET', '/auth/yo')).json.user.name, 'Nombre actualizado');
    assert.equal((await owner.call('POST', '/plataforma/certificado')).status, 409);
    const { lessons } = await import('../src/features/community/lessons.ts');
    for (const lesson of lessons)
      assert.equal(
        (await owner.call('POST', `/plataforma/lecciones/${lesson.id}`, { answer: lesson.correct }))
          .status,
        204,
      );
    const certificate = await owner.call('POST', '/plataforma/certificado');
    assert.equal(certificate.status, 200);
    assert.equal(
      (await owner.call('POST', '/plataforma/certificado')).json.id,
      certificate.json.id,
    );
    assert.equal(
      (await f.client()('GET', `/plataforma/certificados/${certificate.json.id}`)).json.name,
      'Nombre actualizado',
    );
    await f.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.user.id);
    const store = (await owner.call('POST', '/mis-tiendas', { design: createDesign() })).json.store;
    await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    assert.equal(
      (
        await admin.call('POST', `/plataforma/admin/suspender/${store.id}`, {
          approved: false,
          note: 'Revisión de contenido',
        })
      ).status,
      204,
    );
    assert.equal((await f.client()('GET', `/tiendas/${store.id}`)).status, 404);
    assert.equal((await owner.call('POST', `/mis-tiendas/${store.id}/publicar`)).status, 403);
    assert.equal(
      (
        await admin.call('POST', `/plataforma/admin/reactivar/${store.id}`, {
          approved: true,
          note: 'Situación corregida',
        })
      ).status,
      204,
    );
    assert.equal((await owner.call('POST', `/mis-tiendas/${store.id}/publicar`)).status, 200);
  } finally {
    f.close();
  }
});

test('API: dos clientes simultáneos no venden dos veces la última unidad', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor'),
      first = await f.account(),
      second = await f.account();
    const design = createDesign();
    const store = (await owner.call('POST', '/mis-tiendas', { design })).json.store;
    await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    await owner.call('PUT', `/plataforma/negocios/${store.id}/inventario`, {
      productId: design.products[0].id,
      quantity: 1,
    });
    const body = {
      storeId: store.id,
      kind: 'products',
      phone: '+573001234567',
      items: [{ productId: design.products[0].id, quantity: 1 }],
    };
    const results = await Promise.all([
      first.call('POST', '/plataforma/operaciones', { ...body, key: randomUUID() }),
      second.call('POST', '/plataforma/operaciones', { ...body, key: randomUUID() }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    const info = await owner.call('GET', `/plataforma/negocios/${store.id}`);
    assert.equal(info.json.stock[design.products[0].id], 0);
    assert.equal((await owner.call('GET', '/plataforma/estado')).json.sales.length, 1);
    assert.equal((await first.call('POST', '/plataforma/operaciones', [])).status, 400);
  } finally {
    f.close();
  }
});
