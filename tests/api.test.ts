import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { openDb, type Db } from '../server/db.ts';
import { createApp } from '../server/app.ts';
import { createDesign } from '../src/domain/studio.ts';

// Servidor real en un puerto libre con base de datos en memoria.
let server: Server;
let db: Db;
let base = '';
before(async () => {
  db = openDb(':memory:');
  server = createApp({ db }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
after(() => {
  server.close();
  db.close();
});

/** Cliente HTTP con su propia cookie de sesión (como un navegador distinto). */
function client() {
  let cookie = '';
  return async (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = res.status === 204 ? null : await res.json();
    return { status: res.status, json, setCookie: set };
  };
}
let n = 0;
async function account(role: 'cliente' | 'emprendedor') {
  const call = client();
  const email = `persona${++n}@ejemplo.co`;
  const res = await call('POST', '/auth/registro', {
    email,
    name: `Persona ${n}`,
    password: 'clave-segura-1',
    role,
  });
  assert.equal(res.status, 201);
  return { call, email, user: res.json.user };
}

test('registro, sesión con cookie httpOnly, ingreso y salida', async () => {
  const call = client();
  const reg = await call('POST', '/auth/registro', {
    email: 'Ana@Ejemplo.co',
    name: 'Ana',
    password: 'clave-segura-1',
    role: 'emprendedor',
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.user.email, 'ana@ejemplo.co');
  assert.match(reg.setCookie!, /HttpOnly/i);
  assert.match(reg.setCookie!, /SameSite=Lax/i);
  assert.equal((await call('GET', '/auth/yo')).json.user.name, 'Ana');
  assert.equal((await call('POST', '/auth/salir')).status, 204);
  assert.equal((await call('GET', '/auth/yo')).json.user, null);

  const wrong = await call('POST', '/auth/ingresar', {
    email: 'ana@ejemplo.co',
    password: 'otra-clave',
  });
  assert.equal(wrong.status, 401);
  const unknown = await call('POST', '/auth/ingresar', {
    email: 'nadie@ejemplo.co',
    password: 'x',
  });
  assert.equal(unknown.json.error, wrong.json.error, 'el mensaje no revela si el correo existe');
  assert.equal(
    (await call('POST', '/auth/ingresar', { email: 'ANA@ejemplo.co', password: 'clave-segura-1' }))
      .status,
    200,
  );
  assert.equal((await call('GET', '/auth/yo')).json.user.role, 'emprendedor');
});

test('el registro valida datos y no permite crear administradores', async () => {
  const call = client();
  const base = { email: 'luis@ejemplo.co', name: 'Luis', password: 'clave-segura-1' };
  assert.equal(
    (await call('POST', '/auth/registro', { ...base, email: 'no-es-correo' })).status,
    400,
  );
  assert.equal((await call('POST', '/auth/registro', { ...base, password: 'corta' })).status, 400);
  const admin = await call('POST', '/auth/registro', { ...base, role: 'admin' });
  assert.equal(admin.json.user.role, 'cliente');
  assert.equal((await client()('POST', '/auth/registro', base)).status, 409);
  const stored = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(base.email) as {
    password_hash: string;
  };
  assert.match(stored.password_hash, /^scrypt\$/);
  assert.ok(!stored.password_hash.includes(base.password));
});

test('solo emprendedores con sesión gestionan tiendas', async () => {
  const anon = client();
  assert.equal((await anon('GET', '/mis-tiendas')).status, 401);
  const { call } = await account('cliente');
  const res = await call('POST', '/mis-tiendas', { design: createDesign('Artesanías', 'X') });
  assert.equal(res.status, 403);
});

test('crear, editar, publicar y retirar una tienda', async () => {
  const { call } = await account('emprendedor');
  const design = createDesign('Gastronomía', 'Sabor de Corozal', 1);
  const created = await call('POST', '/mis-tiendas', { design });
  assert.equal(created.status, 201);
  const id = created.json.store.id as string;
  assert.match(id, /^tienda-/);
  assert.equal(created.json.store.published, null);
  assert.equal((await call('GET', '/mis-tiendas')).json.stores.length, 1);

  // Aún no es pública.
  assert.equal((await client()('GET', `/tiendas/${id}`)).status, 404);
  const published = await call('POST', `/mis-tiendas/${id}/publicar`);
  assert.equal(published.status, 200);
  assert.equal(published.json.store.versions.length, 1);

  const visitor = client();
  const pub = await visitor('GET', `/tiendas/${id}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.json.design.name, 'Sabor de Corozal');
  assert.equal(pub.json.design.style, design.style);
  const list = await visitor('GET', '/tiendas');
  assert.ok(list.json.stores.some((s: { id: string }) => s.id === id));

  // Los cambios del borrador no se ven hasta volver a publicar.
  const edited = await call('PUT', `/mis-tiendas/${id}`, {
    design: { ...design, name: 'Nuevo nombre' },
  });
  assert.equal(edited.json.store.draft.name, 'Nuevo nombre');
  assert.equal((await visitor('GET', `/tiendas/${id}`)).json.design.name, 'Sabor de Corozal');
  await call('POST', `/mis-tiendas/${id}/publicar`);
  assert.equal((await visitor('GET', `/tiendas/${id}`)).json.design.name, 'Nuevo nombre');

  assert.equal((await call('DELETE', `/mis-tiendas/${id}/publicacion`)).json.store.published, null);
  assert.equal((await visitor('GET', `/tiendas/${id}`)).status, 404);
  assert.equal((await call('DELETE', `/mis-tiendas/${id}`)).status, 204);
  assert.equal((await call('GET', `/mis-tiendas/${id}`)).status, 404);
});

test('una persona no puede ver ni cambiar la tienda de otra', async () => {
  const owner = await account('emprendedor');
  const other = await account('emprendedor');
  const id = (await owner.call('POST', '/mis-tiendas', { design: createDesign() })).json.store.id;
  assert.equal((await other.call('GET', `/mis-tiendas/${id}`)).status, 404);
  assert.equal(
    (await other.call('PUT', `/mis-tiendas/${id}`, { design: createDesign() })).status,
    404,
  );
  assert.equal((await other.call('POST', `/mis-tiendas/${id}/publicar`)).status, 404);
  assert.equal((await other.call('DELETE', `/mis-tiendas/${id}`)).status, 404);
  assert.equal((await other.call('GET', '/mis-tiendas')).json.stores.length, 0);
});

test('el servidor aplica las mismas validaciones que el navegador', async () => {
  const { call } = await account('emprendedor');
  const design = createDesign();
  for (const bad of [
    { ...design, logo: 'javascript:alert(1)' },
    { ...design, style: 'comic-sans' },
    { ...design, products: [{ ...design.products[0], price: -1 }] },
    null,
  ])
    assert.equal((await call('POST', '/mis-tiendas', { design: bad })).status, 400);
  // Sin nombre se guarda como borrador, pero no se puede publicar.
  const id = (await call('POST', '/mis-tiendas', { design: { ...design, name: '' } })).json.store
    .id;
  const res = await call('POST', `/mis-tiendas/${id}/publicar`);
  assert.equal(res.status, 422);
  assert.match(res.json.error, /nombre/);
});

test('se conservan las últimas ocho publicaciones', async () => {
  const { call } = await account('emprendedor');
  const design = createDesign('Belleza', 'Alma');
  const id = (await call('POST', '/mis-tiendas', { design })).json.store.id;
  for (let i = 0; i < 10; i++) {
    await call('PUT', `/mis-tiendas/${id}`, { design: { ...design, name: `Alma ${i}` } });
    await call('POST', `/mis-tiendas/${id}/publicar`);
  }
  const store = (await call('GET', `/mis-tiendas/${id}`)).json.store;
  assert.equal(store.versions.length, 8);
  assert.equal(store.published.design.name, 'Alma 9');
});

test('rechaza peticiones desde otro sitio y limita los intentos de ingreso', async () => {
  const { call, email } = await account('emprendedor');
  const forged = await call(
    'POST',
    '/mis-tiendas',
    { design: createDesign() },
    { Origin: 'https://sitio-malicioso.example' },
  );
  assert.equal(forged.status, 403);

  const attacker = client();
  let last = 0;
  for (let i = 0; i < 11; i++)
    last = (await attacker('POST', '/auth/ingresar', { email, password: `mala-${i}` })).status;
  assert.equal(last, 429);
});
