import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { openDb, type Db } from '../server/db.ts';
import { httpClient } from './http.ts';
import { createApp } from '../server/app.ts';
import { createDesign } from '../src/domain/studio.ts';

// HTTP de Node y Express en memoria, con cookies y aislamiento por cliente, sin abrir puertos.
let db: Db;
let dispatch: ReturnType<typeof httpClient>;
const imagesDir = mkdtempSync(join(tmpdir(), 'sucreia-api-'));
before(() => {
  db = openDb(':memory:');
  dispatch = httpClient(createApp({ db, imagesDir, localMail: true }));
});
after(() => {
  db.close();
  rmSync(imagesDir, { recursive: true, force: true });
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
    const res = await dispatch(method, '/api' + path, body, {
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
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

async function mailFor(email: string, subject: string) {
  const inbox = await client()('GET', '/desarrollo/correos');
  return inbox.json.messages.find(
    (m: { to: string; subject: string }) => m.to === email && m.subject === subject,
  ) as { path: string };
}
const tokenFrom = (mail: { path: string }) =>
  new URL(mail.path, 'http://localhost').searchParams.get('token')!;

test('verificar correo: hash en base, propósito separado, un solo uso y reenvío', async () => {
  const { call, email } = await account('cliente');
  const first = tokenFrom(await mailFor(email, 'Verifica tu correo'));
  const stored = db
    .prepare(
      'SELECT token_hash FROM account_tokens WHERE user_id = (SELECT id FROM users WHERE email = ?)',
    )
    .get(email)!;
  assert.notEqual(stored.token_hash, first);
  assert.equal(
    (await call('POST', '/auth/restablecer', { token: first, password: 'otra-clave-2' })).status,
    400,
  );
  assert.equal((await call('POST', '/auth/solicitar-verificacion')).status, 200);
  const second = tokenFrom(await mailFor(email, 'Verifica tu correo'));
  assert.notEqual(second, first);
  assert.equal((await call('POST', '/auth/verificar-correo', { token: first })).status, 400);
  assert.equal((await call('POST', '/auth/verificar-correo', { token: second })).status, 200);
  assert.ok((await call('GET', '/auth/yo')).json.user.emailVerifiedAt);
  assert.equal((await call('POST', '/auth/verificar-correo', { token: second })).status, 400);
  assert.equal((await client()('POST', '/auth/solicitar-verificacion')).status, 401);
});

test('recuperación genérica, caducidad, validación y revocación de todas las sesiones', async () => {
  const { call, email } = await account('cliente');
  const other = client();
  await other('POST', '/auth/ingresar', { email, password: 'clave-segura-1' });
  const anon = client();
  const known = await anon('POST', '/auth/recuperar', { email });
  const unknown = await anon('POST', '/auth/recuperar', { email: 'no-registrado@example.co' });
  assert.deepEqual(unknown, known);
  const expired = tokenFrom(await mailFor(email, 'Recupera tu contraseña'));
  db.prepare(
    "UPDATE account_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE purpose = 'reset'",
  ).run();
  assert.equal(
    (await anon('POST', '/auth/restablecer', { token: expired, password: 'nueva-clave-2' })).status,
    400,
  );
  await anon('POST', '/auth/recuperar', { email });
  const token = tokenFrom(await mailFor(email, 'Recupera tu contraseña'));
  assert.equal((await anon('POST', '/auth/verificar-correo', { token })).status, 400);
  assert.equal((await anon('POST', '/auth/restablecer', { token, password: 'corta' })).status, 400);
  assert.equal(
    (await anon('POST', '/auth/restablecer', { token, password: 'nueva-clave-2' })).status,
    200,
  );
  assert.equal(
    (await anon('POST', '/auth/restablecer', { token, password: 'nueva-clave-3' })).status,
    400,
  );
  for (const c of [call, other]) assert.equal((await c('GET', '/auth/yo')).json.user, null);
  assert.equal(
    (await anon('POST', '/auth/ingresar', { email, password: 'clave-segura-1' })).status,
    401,
  );
  assert.equal(
    (await anon('POST', '/auth/ingresar', { email, password: 'nueva-clave-2' })).status,
    200,
  );
});

test('la bandeja local está apagada por defecto; no simula envíos sin proveedor', async () => {
  const isolated = openDb(':memory:');
  const call = httpClient(createApp({ db: isolated }));
  try {
    assert.equal((await call('GET', '/api/desarrollo/correos')).status, 404);
    assert.equal(
      (await call('POST', '/api/auth/recuperar', { email: 'alguien@ejemplo.co' })).status,
      503,
    );
  } finally {
    isolated.close();
  }
});

test('imágenes: permisos, subida, publicación, privacidad y borrado sin romper versiones', async () => {
  const owner = await account('emprendedor');
  const other = await account('emprendedor');
  const anon = client();
  assert.equal((await anon('GET', '/imagenes')).status, 401);
  const data =
    'data:image/png;base64,' +
    (
      await sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } })
        .png()
        .toBuffer()
    ).toString('base64');
  const uploaded = await owner.call('POST', '/imagenes', { data });
  assert.equal(uploaded.status, 201);
  const image = uploaded.json.image;
  assert.equal((await other.call('DELETE', `/imagenes/${image.id}`)).status, 404);
  assert.equal((await dispatch('GET', image.url)).status, 404);
  const store = await owner.call('POST', '/mis-tiendas', {
    design: { ...createDesign(), logo: image.url },
  });
  assert.equal(store.status, 201);
  assert.equal(
    (await other.call('POST', '/mis-tiendas', { design: { ...createDesign(), logo: image.url } }))
      .status,
    400,
  );
  assert.equal((await owner.call('DELETE', `/imagenes/${image.id}`)).status, 409);
  await owner.call('POST', `/mis-tiendas/${store.json.store.id}/publicar`);
  const publicImage = await dispatch('GET', image.url);
  assert.equal(publicImage.status, 200);
  assert.match(publicImage.headers.get('Content-Type')!, /image\/webp/);
  await owner.call('DELETE', `/mis-tiendas/${store.json.store.id}`);
  assert.equal((await owner.call('DELETE', `/imagenes/${image.id}`)).status, 204);
});
