import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresSession } from '../src/domain/access.ts';
import { filterDirectory } from '../src/domain/directory.ts';
import { openDb } from '../server/db.ts';
import { createUser } from '../server/auth.ts';
import {
  createStore,
  listPublishedStores,
  savePublication,
  updateDraft,
  unpublish,
} from '../server/stores.ts';
import { createDesign, publishProject, toBusiness } from '../src/domain/studio.ts';
test('vitrina, acceso y tiendas públicas no requieren sesión; todas las herramientas sí', async () => {
  for (const path of [
    '/',
    '/buscar/',
    '/ingresar',
    '/recuperar',
    '/tienda',
    '/sectores',
    '/mapa/',
    '/verificar-correo',
    '/correo-local',
  ])
    assert.equal(requiresSession(path), false, path);
  for (const path of [
    '/inicio',
    '/panel/',
    '/panel/pedidos',
    '/carrito',
    '/solicitudes',
    '/logistica',
    '/recomendaciones',
    '/perfil',
    '/pedidos',
    '/favoritos',
    '/puntos',
    '/escuela',
    '/domiciliario',
    '/admin',
    '/equipo',
  ])
    assert.equal(requiresSession(path), true, path);
});
test('el directorio usa publicaciones, conserva el nombre público y no expone borradores', async () => {
  const db = await openDb(':memory:');
  try {
    const user = await createUser(db, {
      email: 'persona@example.co',
      name: 'Persona',
      role: 'emprendedor',
      passwordHash: 'no-usado',
    });
    const design = createDesign('Artesanías', 'Raíces en línea');
    const draft = await createStore(db, user.id, design);
    assert.equal((await listPublishedStores(db)).length, 0);
    await savePublication(db, draft.id, publishProject(draft).published!);
    await updateDraft(db, draft.id, { ...design, name: 'Cambio privado' });
    await createStore(db, user.id, { ...design, name: 'Sin publicar' });
    const stores = (await listPublishedStores(db)).map((store) => {
      const business = toBusiness(store);
      assert.ok(business);
      return business;
    });
    assert.deepEqual(
      stores.map((b) => b.name),
      ['Raíces en línea'],
    );
    assert.equal(filterDirectory(stores, 'raices', '', '').length, 1);
    assert.equal(filterDirectory(stores, 'privado', '', '').length, 0);
    assert.equal(filterDirectory(stores, '', 'Gastronomía', '').length, 0);
    assert.equal(filterDirectory(stores, '', '', 'Municipio inexistente').length, 0);
    await unpublish(db, draft.id);
    assert.equal((await listPublishedStores(db)).length, 0);
  } finally {
    db.close();
  }
});
