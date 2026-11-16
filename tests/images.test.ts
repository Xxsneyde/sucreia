import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { openDb } from '../server/db.ts';
import { createUser } from '../server/auth.ts';
import { ImageStorage, migrateImages } from '../server/images.ts';
import { createDesign, isDesign, validImage, publishProject } from '../src/domain/studio.ts';
import {
  createStore,
  getStore,
  updateDraft,
  savePublication,
  deleteStore,
} from '../server/stores.ts';
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'sucreia-images-'));
  const db = openDb(':memory:');
  const user = createUser(db, {
    email: 'propietario@example.co',
    name: 'Propietario',
    role: 'emprendedor',
    passwordHash: 'no-usado',
  });
  const other = createUser(db, {
    email: 'otro@example.co',
    name: 'Otro',
    role: 'emprendedor',
    passwordHash: 'no-usado',
  });
  return {
    db,
    dir,
    user,
    other,
    storage: new ImageStorage(db, dir),
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
async function png(width = 10, height = 10) {
  return (
    'data:image/png;base64,' +
    (
      await sharp({ create: { width, height, channels: 4, background: '#e15b31' } })
        .png()
        .toBuffer()
    ).toString('base64')
  );
}

test('subir normaliza, reduce, guarda fuera de SQLite y deduplica por propietario', async () => {
  const f = fixture();
  try {
    const data = await png(2400, 1200);
    const image = await f.storage.upload(f.user.id, data);
    assert.equal(image.width, 1200);
    assert.equal(image.height, 600);
    assert.equal(validImage(image.url), true);
    assert.equal(existsSync(f.storage.path(image.id)), true);
    assert.equal((await sharp(f.storage.read(image.id, f.user.id)).metadata()).format, 'webp');
    assert.equal((await f.storage.upload(f.user.id, data)).id, image.id);
    assert.notEqual((await f.storage.upload(f.other.id, data)).id, image.id);
    assert.equal(f.storage.list(f.user.id).length, 1);
    assert.throws(() => f.storage.read(image.id), /no encontrada/);
    assert.throws(() => f.storage.remove(f.other.id, image.id), /no encontrada/);
    f.storage.remove(f.user.id, image.id);
    assert.equal(existsSync(f.storage.path(image.id)), false);
  } finally {
    f.close();
  }
});

test('rechaza archivos falsos, formato declarado incorrecto, SVG, exceso de tamaño y rutas ajenas', async () => {
  const f = fixture();
  try {
    for (const data of [
      'data:image/png;base64,YmFzdXJh',
      'data:image/svg+xml;base64,PHN2Zy8+',
      (await png()).replace('image/png', 'image/jpeg'),
      'data:image/png;base64,' + 'A'.repeat(12_000_000),
    ])
      await assert.rejects(f.storage.upload(f.user.id, data));
    assert.equal(f.storage.list(f.user.id).length, 0);
    const image = await f.storage.upload(f.other.id, await png());
    await assert.rejects(
      f.storage.externalize(f.user.id, { ...createDesign(), logo: image.url }),
      /no pertenece/,
    );
    for (const url of [
      '/api/imagenes/../../archivo.webp',
      'https://externo.co/foto.png',
      '/api/imagenes/no.webp',
      'javascript:alert(1)',
    ])
      assert.equal(validImage(url), false);
    assert.throws(() => f.storage.path('../escape'), /no encontrada/);
  } finally {
    f.close();
  }
});

test('las fotos de borradores son privadas; publicar permite leer; retirar y versiones protegen el archivo', async () => {
  const f = fixture();
  try {
    const image = await f.storage.upload(f.user.id, await png());
    const design = { ...createDesign('Artesanías', 'Tejidos'), logo: image.url };
    const store = createStore(f.db, f.user.id, design);
    assert.throws(() => f.storage.remove(f.user.id, image.id), /borrador/);
    assert.throws(() => f.storage.read(image.id, f.other.id));
    const publication = publishProject(store).published!;
    savePublication(f.db, store.id, publication);
    assert.ok(f.storage.read(image.id).length);
    updateDraft(f.db, store.id, { ...design, logo: '' });
    assert.throws(() => f.storage.remove(f.user.id, image.id), /versión/);
    savePublication(f.db, store.id, publishProject(getStore(f.db, store.id)!).published!);
    assert.throws(() => f.storage.read(image.id));
    assert.throws(() => f.storage.remove(f.user.id, image.id), /versión/);
    deleteStore(f.db, store.id);
    f.storage.remove(f.user.id, image.id);
    assert.equal(f.storage.list(f.user.id).length, 0);
  } finally {
    f.close();
  }
});

test('migración conserva borrador, publicación, versiones y contenido; es idempotente', async () => {
  const f = fixture();
  try {
    const data = await png();
    const design = createDesign('Artesanías', 'Mi tienda');
    design.logo = data;
    design.products[0].image = data;
    design.content.heroImage = data;
    const store = createStore(f.db, f.user.id, design);
    savePublication(f.db, store.id, publishProject(store).published!);
    const before = getStore(f.db, store.id)!;
    assert.deepEqual(await migrateImages(f.storage), { migrated: 1, skipped: 0 });
    const after = getStore(f.db, store.id)!;
    assert.equal(after.id, before.id);
    assert.equal(after.published!.id, before.published!.id);
    assert.equal(after.updatedAt, before.updatedAt);
    assert.equal(after.draft.name, 'Mi tienda');
    assert.equal(after.versions.length, before.versions.length);
    assert.equal(isDesign(after.draft), true);
    assert.ok(after.draft.logo.startsWith('/api/imagenes/'));
    assert.equal(after.draft.logo, after.draft.products[0].image);
    assert.equal(after.draft.logo, after.published!.design.logo);
    assert.equal(JSON.stringify(after).includes('data:image/'), false);
    assert.deepEqual(await migrateImages(f.storage), { migrated: 0, skipped: 0 });
  } finally {
    f.close();
  }
});

test('migración fallida conserva íntegros el borrador y las versiones originales', async () => {
  const f = fixture();
  try {
    const design = { ...createDesign(), logo: await png() };
    const store = createStore(f.db, f.user.id, design);
    const version = publishProject(store).published!;
    version.design.logo = 'data:image/png;base64,YmFzdXJh';
    savePublication(f.db, store.id, version);
    const before = JSON.stringify(getStore(f.db, store.id));
    assert.deepEqual(await migrateImages(f.storage), { migrated: 0, skipped: 1 });
    assert.equal(JSON.stringify(getStore(f.db, store.id)), before);
  } finally {
    f.close();
  }
});
