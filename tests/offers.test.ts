// Promociones y reseñas: descuento para todo el negocio, cupones con código y reseñas del panel.
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
import {
  couponState,
  discounted,
  discountFor,
  storeOffer,
  type StoreCoupon,
} from '../src/domain/offers.ts';
import { approveRegistration, TERMS_VERSION } from './registration.ts';

type Call = (m: string, p: string, b?: unknown) => Promise<{ status: number; json: any }>;

async function fixture() {
  const db = await openDb(':memory:'),
    dir = mkdtempSync(join(tmpdir(), 'sucreia-ofertas-')),
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
      acceptTerms: true,
      role,
    });
    assert.equal(r.status, 201);
    return { call, user: r.json.user as { id: string; name: string } };
  };
  const business = async (owner: Awaited<ReturnType<typeof account>>, mode: BusinessMode) => {
    const design = createDesign(
      mode === 'booking' ? 'Belleza y Bienestar' : 'Gastronomía y Alimentos',
      `Negocio ${mode}`,
    );
    design.mode = mode;
    design.whatsapp = '+573001234567';
    design.products = design.products.map((p) => ({
      ...p,
      price: 20000,
      ...(mode === 'booking' ? { duration: 30 } : {}),
    }));
    const store = (
      await owner.call('POST', '/mis-tiendas', { termsVersion: TERMS_VERSION, design })
    ).json.store;
    await approveRegistration(db, store.id);
    assert.equal((await owner.call('POST', `/mis-tiendas/${store.id}/publicar`)).status, 200);
    return { id: store.id as string, design };
  };
  return {
    db,
    account,
    business,
    close: () => (void db.close(), rmSync(dir, { recursive: true, force: true })),
  };
}
const inDays = (n: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
    new Date(Date.now() + n * 86_400_000),
  );

test('reglas de los descuentos: precio con descuento y estado de cada cupón', () => {
  assert.equal(discounted(20000, 15), 17000);
  assert.equal(discounted(9990, 0), 9990);
  const base: StoreCoupon = {
    id: 'c',
    storeId: 's',
    code: 'HOLA',
    percent: 10,
    expires: null,
    maxUses: 2,
    uses: 0,
    active: true,
    createdAt: '',
  };
  assert.equal(couponState(base), 'active');
  assert.equal(couponState({ ...base, uses: 2 }), 'exhausted');
  assert.equal(couponState({ ...base, expires: '2000-01-01T00:00:00Z' }), 'expired');
  assert.equal(couponState({ ...base, active: false }), 'inactive');
  // Descuento propio de cada producto: a cada uno, el mayor entre el suyo y el del negocio.
  const own = { a: { percent: 20, until: null }, b: { percent: 10, until: null } };
  assert.equal(discountFor(null, own, 'a'), 20);
  assert.equal(discountFor(null, own, 'b'), 10);
  assert.equal(discountFor(null, own, 'c'), 0);
  assert.equal(discountFor({ percent: 15, until: null }, own, 'b'), 15);
  assert.equal(discountFor({ percent: 15, until: null }, own, 'c'), 15);
  const lines = [
    { productId: 'a', amount: 10000 },
    { productId: 'b', amount: 30000 },
    { productId: 'c', amount: 5000 },
  ];
  assert.deepEqual(storeOffer(null, own, lines), {
    amount: 5000,
    percent: 20,
    label: 'Descuento en productos seleccionados',
  });
  // Formato anterior (un descuento con lista de productos): se lee como descuento por producto.
  assert.equal(discountFor({ percent: 20, until: null, products: ['a'] }, {}, 'a'), 20);
  assert.equal(discountFor({ percent: 20, until: null, products: ['a'] }, {}, 'b'), 0);
});

test('descuento del negocio y cupón: se aplica el mayor, el servidor calcula el total', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor');
    const { id, design } = await f.business(owner, 'products');
    const client = await f.account();
    const stranger = await f.account('emprendedor');
    const product = design.products[0];

    // Solo el dueño administra sus promociones.
    assert.equal(
      (await stranger.call('PUT', `/plataforma/negocios/${id}/descuento`, { percent: 10 })).status,
      404,
    );
    assert.equal(
      (await owner.call('PUT', `/plataforma/negocios/${id}/descuento`, { percent: 90 })).status,
      400,
    );
    const set = await owner.call('PUT', `/plataforma/negocios/${id}/descuento`, {
      percent: 15,
      until: inDays(10),
    });
    assert.equal(set.status, 200, JSON.stringify(set.json));
    assert.equal(set.json.discount.percent, 15);
    // El público ve el descuento vigente del negocio.
    assert.equal(
      (await client.call('GET', `/plataforma/negocios/${id}`)).json.discount.percent,
      15,
    );

    // Cupones: código único por negocio, en mayúsculas.
    const coupon = await owner.call('POST', `/plataforma/negocios/${id}/cupones`, {
      code: ' bienvenida ',
      percent: 25,
      maxUses: 1,
      expires: inDays(5),
    });
    assert.equal(coupon.status, 201, JSON.stringify(coupon.json));
    assert.equal(coupon.json.coupon.code, 'BIENVENIDA');
    assert.equal(
      (
        await owner.call('POST', `/plataforma/negocios/${id}/cupones`, {
          code: 'BIENVENIDA',
          percent: 5,
        })
      ).status,
      409,
    );
    assert.equal(
      (await owner.call('POST', `/plataforma/negocios/${id}/cupones`, { code: 'a b', percent: 5 }))
        .status,
      400,
    );
    const small = await owner.call('POST', `/plataforma/negocios/${id}/cupones`, {
      code: 'POQUITO',
      percent: 5,
    });
    assert.equal(small.status, 201);

    // El carrito comprueba el código antes de enviar.
    const check = await client.call('POST', '/plataforma/cupones/validar', {
      storeId: id,
      code: 'bienvenida',
    });
    assert.equal(check.json.code, 'BIENVENIDA');
    assert.equal(check.json.percent, 25);
    assert.equal(check.json.storePercent, 15);
    assert.equal(check.json.storeDiscount.percent, 15);
    assert.equal(
      (await client.call('POST', '/plataforma/cupones/validar', { storeId: id, code: 'NOEXISTE' }))
        .status,
      404,
    );

    const buy = (code?: string) =>
      client.call('POST', '/plataforma/compras-whatsapp', {
        storeId: id,
        items: [{ productId: product.id, quantity: 2 }],
        ...(code ? { code } : {}),
      });
    // Sin cupón: descuento del negocio (15 % de 40.000).
    const plain = await buy();
    assert.equal(plain.status, 201, JSON.stringify(plain.json));
    assert.equal(plain.json.order.subtotal, 40000);
    assert.equal(plain.json.order.discount, 6000);
    assert.equal(plain.json.order.total, 34000);
    assert.match(plain.json.message, /Descuento del negocio \(15 %\)/);
    // Un cupón menor no se suma: sigue el del negocio.
    const lower = await buy('POQUITO');
    assert.equal(lower.json.order.discount, 6000);
    // El cupón mayor gana y cuenta su uso (máximo 1).
    const best = await buy('BIENVENIDA');
    assert.equal(best.json.order.discount, 10000);
    assert.equal(best.json.order.total, 30000);
    assert.match(best.json.message, /Cupón BIENVENIDA \(25 %\)/);
    const again = await buy('BIENVENIDA');
    assert.equal(again.status, 409);
    assert.match(again.json.error, /límite de usos/);

    // Panel: lista con usos; desactivar un cupón lo deja sin efecto.
    const panel = (await owner.call('GET', `/plataforma/negocios/${id}/promociones-panel`)).json;
    assert.equal(panel.discount.percent, 15);
    const used = panel.coupons.find((c: StoreCoupon) => c.code === 'BIENVENIDA');
    assert.equal(used.uses, 1);
    const off = await owner.call(
      'PUT',
      `/plataforma/negocios/${id}/cupones/${small.json.coupon.id}`,
      {
        active: false,
      },
    );
    assert.equal(off.status, 200);
    assert.equal(
      (await client.call('POST', '/plataforma/cupones/validar', { storeId: id, code: 'POQUITO' }))
        .status,
      409,
    );
    // Quitar el descuento del negocio (0 %).
    assert.equal(
      (await owner.call('PUT', `/plataforma/negocios/${id}/descuento`, { percent: 0 })).json
        .discount,
      null,
    );
    const full = await buy();
    assert.equal(full.json.order.discount, 0);
    assert.equal(full.json.order.total, 40000);

    // Descuento propio por producto: elegir otro producto no le quita el suyo al anterior.
    const other = design.products[1];
    const third = design.products[2];
    const own = (body: unknown) =>
      owner.call('PUT', `/plataforma/negocios/${id}/descuento-productos`, body);
    assert.equal((await own({ products: ['no-existe'], percent: 30 })).status, 400);
    assert.equal((await own({ products: [], percent: 30 })).status, 400);
    const first = await own({ products: [product.id], percent: 30 });
    assert.equal(first.status, 200, JSON.stringify(first.json));
    const second = await own({ products: [other.id], percent: 10 });
    assert.deepEqual(second.json.productDiscounts, {
      [product.id]: { percent: 30, until: null },
      [other.id]: { percent: 10, until: null },
    });
    const pub = (await client.call('GET', `/plataforma/negocios/${id}`)).json;
    assert.equal(pub.discount, null);
    assert.equal(pub.productDiscounts[product.id].percent, 30);
    assert.equal(pub.productDiscounts[other.id].percent, 10);
    const mixed = await client.call('POST', '/plataforma/compras-whatsapp', {
      storeId: id,
      items: [
        { productId: product.id, quantity: 1 },
        { productId: other.id, quantity: 1 },
        { productId: third.id, quantity: 1 },
      ],
    });
    assert.equal(mixed.status, 201, JSON.stringify(mixed.json));
    assert.equal(mixed.json.order.subtotal, 60000);
    assert.equal(mixed.json.order.discount, 8000, '30 % de uno y 10 % del otro; el tercero, nada');
    assert.match(mixed.json.message, /Descuento en productos seleccionados: −\$\s8\.000/);
    // El descuento de todo el negocio no borra los propios; cada producto usa el mayor.
    await owner.call('PUT', `/plataforma/negocios/${id}/descuento`, { percent: 20 });
    const withStore = await client.call('POST', '/plataforma/compras-whatsapp', {
      storeId: id,
      items: [
        { productId: product.id, quantity: 1 },
        { productId: other.id, quantity: 1 },
      ],
    });
    assert.equal(withStore.json.order.discount, 10000, '30 % de uno y 20 % (del negocio) del otro');
    // Quitar el descuento de un producto no toca los demás.
    const removed = await own({ products: [product.id], percent: 0 });
    assert.deepEqual(Object.keys(removed.json.productDiscounts), [other.id]);
    // Un cupón del 25 % para todo el pedido gana si descuenta más.
    await owner.call('PUT', `/plataforma/negocios/${id}/descuento`, { percent: 0 });
    await owner.call('POST', `/plataforma/negocios/${id}/cupones`, { code: 'TODO25', percent: 25 });
    const coupon25 = await client.call('POST', '/plataforma/compras-whatsapp', {
      storeId: id,
      items: [
        { productId: product.id, quantity: 1 },
        { productId: other.id, quantity: 1 },
      ],
      code: 'TODO25',
    });
    assert.equal(coupon25.json.order.discount, 10000);
  } finally {
    f.close();
  }
});

test('reservas con cupón y reseñas del negocio y de productos en el panel', async () => {
  const f = await fixture();
  try {
    const owner = await f.account('emprendedor');
    const { id, design } = await f.business(owner, 'booking');
    const client = await f.account();
    await owner.call('POST', `/plataforma/negocios/${id}/cupones`, { code: 'CITA20', percent: 20 });
    const date = inDays(2);
    const free = (await client.call('GET', `/plataforma/negocios/${id}/horarios?fecha=${date}`))
      .json.slots as string[];
    assert.ok(free.length, 'hay horarios libres');
    const booked = await client.call('POST', '/plataforma/operaciones', {
      storeId: id,
      key: randomUUID(),
      kind: 'booking',
      items: [{ productId: design.products[0].id, quantity: 1 }],
      detail: 'Primera vez',
      phone: '+573001234567',
      slot: free[0],
      code: 'cita20',
    });
    assert.equal(booked.status, 201, JSON.stringify(booked.json));
    assert.equal(booked.json.operation.discount, 4000);
    assert.equal(booked.json.operation.amount, 16000);
    assert.equal(booked.json.operation.discountLabel, 'Cupón CITA20 (20 %)');

    // Reseñas: del negocio y de un producto; el panel las trae con el nombre del producto.
    assert.equal(
      (
        await client.call('POST', `/plataforma/negocios/${id}/resenas`, {
          rating: 2,
          comment: 'Tuve que esperar bastante.',
        })
      ).status,
      201,
    );
    await f.db
      .prepare(
        'INSERT INTO product_reviews (id,store_id,product_id,user_id,rating,comment,created_at) VALUES (?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        id,
        design.products[0].id,
        client.user.id,
        5,
        'Excelente servicio.',
        new Date().toISOString(),
      );
    const reviews = await owner.call('GET', `/plataforma/negocios/${id}/resenas`);
    assert.equal(reviews.status, 200);
    assert.equal(reviews.json.store[0].rating, 2);
    assert.equal(reviews.json.products[0].productName, design.products[0].name);
    assert.equal(reviews.json.products[0].rating, 5);
    assert.equal((await client.call('GET', `/plataforma/negocios/${id}/resenas`)).status, 404);
  } finally {
    f.close();
  }
});
