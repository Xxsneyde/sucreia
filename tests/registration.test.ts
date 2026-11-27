// Funciones del servidor recuperadas de Hostinger: registro del negocio con revisión, documentos,
// PQRS, compras por WhatsApp, valoración de productos, asistente, confirmación por SMS y
// cabeceras de seguridad.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { openDb } from '../server/db.ts';
import { createApp } from '../server/app.ts';
import { httpClient } from './http.ts';
import { createDesign, type StoreDesign } from '../src/domain/studio.ts';
import { colombianMobile, maskPhone } from '../server/sms.ts';
import { sslFor } from '../server/db-ssl.ts';
import { approveRegistration, TERMS_VERSION } from './registration.ts';

async function fixture() {
  const db = await openDb(':memory:'),
    dir = mkdtempSync(join(tmpdir(), 'sucreia-registro-')),
    sent: { phone: string; text: string }[] = [];
  const sms = {
    async send(phone: string, text: string) {
      sent.push({ phone, text });
    },
  };
  const http = httpClient(createApp({ db, imagesDir: dir, localMail: true, sms }));
  function client() {
    let cookie = '';
    return async (method: string, path: string, body?: unknown) => {
      const response = await http(method, '/api' + path, body, cookie ? { Cookie: cookie } : {});
      const set = response.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      const type = response.headers.get('content-type') ?? '';
      return {
        status: response.status,
        headers: response.headers,
        json: response.status === 204 || !type.includes('json') ? null : await response.json(),
      };
    };
  }
  async function account(role = 'cliente', extra: Record<string, unknown> = {}) {
    const call = client(),
      email = randomUUID() + '@example.co';
    const result = await call('POST', '/auth/registro', {
      name: role,
      email,
      password: 'clave-segura-1',
      role,
      ...extra,
    });
    assert.equal(result.status, 201);
    return { call, user: result.json.user, email };
  }
  async function admin() {
    const a = await account();
    await db.prepare("UPDATE users SET role='admin' WHERE id=?").run(a.user.id);
    return a;
  }
  return {
    db,
    http,
    sent,
    account,
    admin,
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
const pngData = async () =>
  `data:image/png;base64,${(
    await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 30, g: 120, b: 200 } },
    })
      .png()
      .toBuffer()
  ).toString('base64')}`;
const pdf = `data:application/pdf;base64,${Buffer.from('%PDF-1.4\n%prueba\n').toString('base64')}`;

/** Diseño que cumple el registro: fotos propias, dirección, WhatsApp y tres productos. */
async function completeDesign(
  call: (m: string, p: string, b?: unknown) => Promise<{ json: { image: { url: string } } }>,
) {
  const photo = async () =>
    (await call('POST', '/imagenes', { data: await pngData() })).json.image.url;
  const design: StoreDesign = createDesign('Gastronomía y Alimentos', 'Dulces de Sampués');
  design.mode = 'products';
  design.address = 'Calle 10 # 5-20';
  design.whatsapp = '+573001234567';
  design.logo = await photo();
  design.content.heroImage = await photo();
  const productPhoto = await photo();
  design.products = [0, 1, 2].map((i) => ({
    ...(design.products[i] ?? design.products[0]),
    id: `p${i}`,
    name: `Producto ${i + 1}`,
    description: 'Hecho a mano.',
    price: 5000 * (i + 1),
    image: productPhoto,
  }));
  return design;
}

test('registro del negocio: términos, documentos, revisión y aprobación que publica', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor'),
      boss = await f.admin();
    const design = await completeDesign(owner.call);
    assert.equal(
      (await owner.call('POST', '/mis-tiendas', { design })).status,
      400,
      'sin aceptar los términos no se crea',
    );
    const store = (
      await owner.call('POST', '/mis-tiendas', { termsVersion: TERMS_VERSION, design })
    ).json.store;
    assert.equal(store.registration, 'pending');
    assert.equal(store.publicationRequested, false);
    // Sin documentos no se puede enviar.
    const early = await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    assert.equal(early.status, 422);
    assert.match(early.json.error, /Adjunta: Documento de identidad, RUT, Certificado bancario/);
    // Documentos: tipo de persona, formatos y acceso solo del dueño y la administración.
    assert.equal(
      (
        await owner.call('PUT', `/plataforma/negocios/${store.id}/documentos/identidad`, {
          name: 'cedula.txt',
          data: 'data:text/plain;base64,aG9sYQ==',
        })
      ).status,
      400,
    );
    for (const kind of ['identidad', 'rut', 'bancario'])
      assert.equal(
        (
          await owner.call('PUT', `/plataforma/negocios/${store.id}/documentos/${kind}`, {
            name: `${kind}.pdf`,
            data: pdf,
          })
        ).status,
        200,
      );
    const juridica = await owner.call('PUT', `/plataforma/negocios/${store.id}/tipo-legal`, {
      legalType: 'juridica',
    });
    assert.deepEqual(juridica.json.missing, ['camara']);
    await owner.call('PUT', `/plataforma/negocios/${store.id}/tipo-legal`, {
      legalType: 'natural',
    });
    const stranger = await f.account('emprendedor');
    assert.equal(
      (await stranger.call('GET', `/plataforma/negocios/${store.id}/documentos`)).status,
      404,
    );
    const file = await boss.call('GET', `/plataforma/negocios/${store.id}/documentos/rut/archivo`);
    assert.equal(file.status, 200);
    assert.match(file.headers.get('content-security-policy')!, /default-src 'none'/);
    // Enviar a revisión: no se publica todavía.
    const sentToReview = await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    assert.equal(sentToReview.status, 202);
    assert.equal(sentToReview.json.store.publicationRequested, true);
    assert.equal(sentToReview.json.store.published, null);
    // La administración ve el registro con los datos enviados y el titular.
    const panel = (await boss.call('GET', '/plataforma/admin')).json;
    const row = panel.stores.find((s: { id: string }) => s.id === store.id);
    assert.equal(row.registration, 'pending');
    assert.equal(row.details.name, 'Dulces de Sampués');
    assert.equal(row.owner.email, owner.email);
    assert.deepEqual(row.missing, []);
    // Aprobar publica la versión enviada.
    assert.equal(
      (
        await boss.call('POST', `/plataforma/admin/registro/${store.id}`, {
          approved: true,
          note: 'Todo en orden.',
        })
      ).status,
      204,
    );
    const after = (await owner.call('GET', `/mis-tiendas/${store.id}`)).json.store;
    assert.equal(after.registration, 'approved');
    assert.equal(after.published.design.name, 'Dulces de Sampués');
    assert.equal(
      (
        await boss.call('POST', `/plataforma/admin/registro/${store.id}`, {
          approved: true,
          note: 'Otra vez.',
        })
      ).status,
      409,
    );
    // Ya aprobado, publicar los cambios es inmediato.
    assert.equal((await owner.call('POST', `/mis-tiendas/${store.id}/publicar`)).status, 200);
  } finally {
    f.close();
  }
});

test('PQRS: radicar con adjunto, conversación con la administración y cierre', async () => {
  const f = await fixture();
  try {
    const person = await f.account(),
      boss = await f.admin(),
      other = await f.account();
    assert.equal(
      (await person.call('POST', '/plataforma/pqrs', { kind: 'Otro', message: 'Hola' })).status,
      400,
    );
    // Un archivo que dice ser PDF pero no lo es se rechaza.
    assert.equal(
      (
        await person.call('POST', '/plataforma/pqrs', {
          kind: 'Queja',
          message: 'El pedido no llegó.',
          file: { name: 'falso.pdf', data: 'data:application/pdf;base64,aG9sYQ==' },
        })
      ).status,
      400,
    );
    const created = await person.call('POST', '/plataforma/pqrs', {
      kind: 'Queja',
      message: 'El pedido no llegó.',
      file: { name: 'factura.pdf', data: pdf },
    });
    assert.equal(created.status, 201);
    const id = created.json.id;
    const mine = (await person.call('GET', '/plataforma/pqrs')).json.pqrs;
    assert.equal(mine.length, 1);
    assert.equal(mine[0].status, 'pending');
    assert.equal(mine[0].user, undefined, 'la persona no recibe datos de la vista del admin');
    const fileId = mine[0].files[0].id;
    assert.equal((await other.call('GET', `/plataforma/pqrs/archivos/${fileId}`)).status, 404);
    assert.equal((await boss.call('GET', `/plataforma/pqrs/archivos/${fileId}`)).status, 200);
    assert.equal(
      (await other.call('POST', `/plataforma/pqrs/${id}/mensajes`, { message: 'x' })).status,
      404,
    );
    assert.equal((await person.call('GET', '/plataforma/admin/pqrs')).status, 403);
    // Respuesta, réplica y cierre.
    assert.equal(
      (await boss.call('POST', `/plataforma/admin/pqrs/${id}`, { response: 'Lo revisamos.' }))
        .status,
      204,
    );
    let state = (await person.call('GET', '/plataforma/pqrs')).json.pqrs[0];
    assert.equal(state.status, 'answered');
    assert.equal(state.messages.at(-1).author, 'Administración de SucreIA');
    await person.call('POST', `/plataforma/pqrs/${id}/mensajes`, {
      message: 'Gracias, sigo esperando.',
    });
    state = (await boss.call('GET', '/plataforma/admin/pqrs')).json.pqrs[0];
    assert.equal(state.status, 'pending');
    assert.equal(state.user.email, person.email);
    assert.equal(
      (await boss.call('POST', `/plataforma/admin/pqrs/${id}/cerrar`, { note: 'Resuelto.' }))
        .status,
      204,
    );
    assert.equal(
      (await person.call('POST', `/plataforma/pqrs/${id}/mensajes`, { message: 'Otra cosa' }))
        .status,
      409,
    );
    const notes = await f.db
      .prepare('SELECT title FROM notifications WHERE user_id=? ORDER BY rowid')
      .all(person.user.id);
    assert.ok(notes.some((n) => /quedó resuelta y cerrada/.test(String(n.title))));
  } finally {
    f.close();
  }
});

test('compras por WhatsApp: precios del servidor, registro y valoración solo de quien compró', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor'),
      buyer = await f.account(),
      curious = await f.account(),
      boss = await f.admin();
    const design = await completeDesign(owner.call);
    const store = (
      await owner.call('POST', '/mis-tiendas', { termsVersion: TERMS_VERSION, design })
    ).json.store;
    await approveRegistration(f.db, store.id);
    await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    // La administración no compra; el dueño no compra en su negocio.
    const items = [{ productId: 'p1', quantity: 2, price: 1 }];
    assert.equal(
      (await boss.call('POST', '/plataforma/compras-whatsapp', { storeId: store.id, items }))
        .status,
      403,
    );
    assert.equal(
      (await owner.call('POST', '/plataforma/compras-whatsapp', { storeId: store.id, items }))
        .status,
      400,
    );
    const bought = await buyer.call('POST', '/plataforma/compras-whatsapp', {
      storeId: store.id,
      items,
      note: 'Sin azúcar',
    });
    assert.equal(bought.status, 201);
    assert.equal(bought.json.order.total, 20000, 'el precio sale del catálogo publicado');
    assert.match(bought.json.url, /^https:\/\/wa\.me\/573001234567\?text=/);
    assert.match(bought.json.message, /Nota: Sin azúcar/);
    assert.equal((await buyer.call('GET', '/plataforma/compras-whatsapp')).json.mine.length, 1);
    assert.equal((await owner.call('GET', '/plataforma/compras-whatsapp')).json.received.length, 1);
    // Valorar el producto: solo quien lo compró, una vez (la nueva reemplaza la anterior).
    const path = `/plataforma/negocios/${store.id}/productos/p1/resenas`;
    assert.equal((await curious.call('POST', path, { rating: 5 })).status, 403);
    assert.equal((await buyer.call('GET', path)).json.canReview, true);
    assert.equal((await buyer.call('POST', path, { rating: 2, comment: 'Regular' })).status, 201);
    assert.equal((await buyer.call('POST', path, { rating: 4, comment: 'Mejoró' })).status, 201);
    const reviews = (await curious.call('GET', path)).json;
    assert.equal(reviews.reviews.length, 1);
    assert.equal(reviews.canReview, false);
    const meta = (await curious.call('GET', `/plataforma/negocios/${store.id}`)).json;
    assert.deepEqual(meta.productRatings.p1, { rating: 4, count: 1 });
    // Reseña directa del negocio: solo clientes, una por persona.
    const direct = `/plataforma/negocios/${store.id}/resenas`;
    assert.equal((await owner.call('POST', direct, { rating: 5, comment: 'Mío' })).status, 403);
    assert.equal(
      (await curious.call('POST', direct, { rating: 5, comment: 'Muy bueno' })).status,
      201,
    );
    const again = await curious.call('POST', direct, { rating: 3, comment: 'Cambié de opinión' });
    assert.equal(again.status, 200);
    assert.equal(again.json.updated, true);
  } finally {
    f.close();
  }
});

test('asistente: responde con los negocios publicados y limita preguntas', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor'),
      visitor = await f.account();
    const design = await completeDesign(owner.call);
    const store = (
      await owner.call('POST', '/mis-tiendas', { termsVersion: TERMS_VERSION, design })
    ).json.store;
    await approveRegistration(f.db, store.id);
    await owner.call('POST', `/mis-tiendas/${store.id}/publicar`);
    const reply = await visitor.call('POST', '/asistente', {
      question: 'dulces en Sampués',
      context: { results: ['x'.repeat(500)], query: { sort: 'raro', terms: 'no-es-lista' } },
    });
    assert.equal(reply.status, 200);
    assert.equal(typeof reply.json.reply.text, 'string');
    assert.ok(Array.isArray(reply.json.context.results));
    assert.ok(
      JSON.stringify(reply.json).includes(store.id),
      'el negocio publicado aparece en la respuesta',
    );
    assert.equal((await visitor.call('POST', '/asistente', { question: '' })).status, 400);
    const mine = await owner.call('POST', '/asistente', { question: '¿cómo va mi negocio?' });
    assert.equal(mine.status, 200);
  } finally {
    f.close();
  }
});

test('confirmar la cuenta por SMS: código de un solo uso, intentos limitados y celular colombiano', async () => {
  assert.equal(colombianMobile('300 123 4567'), '573001234567');
  assert.equal(colombianMobile('+57 300-123-4567'), '573001234567');
  assert.equal(colombianMobile('6012345678'), null);
  assert.equal(maskPhone('573001234567'), '300 *** 4567');
  const f = await fixture();
  try {
    const person = await f.account('cliente', { verifyBy: 'sms', phone: '3001234567' });
    assert.equal(person.user.verifyChannel, 'sms');
    assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].phone, '573001234567');
    const code = /es (\d{6})/.exec(f.sent[0].text)![1];
    const wrong = code === '000000' ? '111111' : '000000';
    assert.equal((await person.call('POST', '/auth/verificar-sms', { code: wrong })).status, 400);
    // Pedir otro código antes de un minuto no se permite.
    assert.equal((await person.call('POST', '/auth/verificacion', { channel: 'sms' })).status, 429);
    const ok = await person.call('POST', '/auth/verificar-sms', { code });
    assert.equal(ok.status, 200);
    assert.ok((await person.call('GET', '/auth/yo')).json.user.emailVerifiedAt);
    assert.equal((await person.call('POST', '/auth/verificar-sms', { code })).status, 410);
    // Completar el perfil después de confirmar.
    const profile = await person.call('PUT', '/auth/perfil/datos', {
      name: 'Ana Pérez',
      documentNumber: '1102345678',
      address: 'Carrera 20 # 15-30, Sincelejo',
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.json.user.profileComplete, true);
  } finally {
    f.close();
  }
});

test('cabeceras de seguridad, SSL verificado con Postgres y pasar a emprendedor con aceptación', async () => {
  const f = await fixture();
  try {
    const res = await f.http('GET', '/api/salud');
    assert.match(res.headers.get('content-security-policy')!, /frame-ancestors 'self'/);
    assert.match(res.headers.get('permissions-policy')!, /geolocation=\(self\)/);
    assert.equal(res.headers.get('strict-transport-security'), null, 'HSTS solo con HTTPS');
    const person = await f.account();
    assert.equal((await person.call('POST', '/auth/emprender', {})).status, 400);
    assert.equal(
      (await person.call('POST', '/auth/emprender', { aceptoDejarDeSerCliente: true })).status,
      204,
    );
    assert.equal((await person.call('GET', '/auth/yo')).json.user.role, 'emprendedor');
  } finally {
    f.close();
  }
  assert.equal(sslFor('postgres://u:p@localhost:5432/db'), undefined);
  assert.equal(sslFor('postgres://u:p@db.abc.supabase.co:5432/db')?.rejectUnauthorized, true);
  assert.match(sslFor('postgres://u:p@db.abc.supabase.co:5432/db')!.ca!, /BEGIN CERTIFICATE/);
  assert.deepEqual(sslFor('postgres://u:p@example.com/db', { DATABASE_SSL: 'no-verify' }), {
    rejectUnauthorized: false,
  });
});
