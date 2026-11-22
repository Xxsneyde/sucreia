import test from 'node:test';
import assert from 'node:assert/strict';
import { canOpen, modeFor, navFor, requiredRole, roleHome } from '../src/domain/roles.ts';

const ids = (v: Parameters<typeof navFor>[0], mode: 'negocio' | 'comprar' = 'comprar') =>
  navFor(v, mode).sections.map((s) => s.id);
const hrefs = (v: Parameters<typeof navFor>[0], mode: 'negocio' | 'comprar' = 'comprar') =>
  navFor(v, mode).sections.flatMap((s) => s.items.map((i) => i.href));

// Menú de la presentación (diapositivas 3 a 8), igual para todos.
const principal = [
  '/inicio',
  '/buscar',
  '/sectores',
  '/mapa',
  '/puntos',
  '/logistica',
  '/escuela',
  '/recomendaciones',
  '/solicitudes',
  '/pedidos',
  '/favoritos',
  '/notificaciones',
];

test('visitantes y clientes ven el menú de la presentación; nada del negocio ni de administración', () => {
  assert.deepEqual(hrefs(null), principal);
  const v = { role: 'cliente', courier: 'none' } as const;
  assert.deepEqual(ids(v), ['principal']);
  for (const href of ['/panel', '/admin', '/equipo', '/domiciliario'])
    assert.ok(!hrefs(v).includes(href), href);
  assert.equal(roleHome('cliente'), '/inicio');
});

test('el emprendedor ve su negocio primero en las páginas del negocio y también el menú principal', () => {
  const v = { role: 'emprendedor', courier: 'none' } as const;
  assert.deepEqual(ids(v, 'negocio'), ['negocio', 'principal']);
  assert.deepEqual(ids(v, 'comprar'), ['principal', 'negocio']);
  assert.equal(navFor(v, 'negocio').mobile[0].href, '/panel');
  assert.equal(navFor(v, 'comprar').mobile[0].href, '/inicio');
  assert.ok(!hrefs(v).includes('/admin'));
  assert.equal(roleHome('emprendedor'), '/panel');
});

test('las entregas aparecen solo con solicitud de domiciliario', () => {
  assert.ok(!ids({ role: 'cliente', courier: 'none' }).includes('entregas'));
  assert.ok(ids({ role: 'cliente', courier: 'pending' }).includes('entregas'));
  assert.ok(ids({ role: 'emprendedor', courier: 'approved' }).includes('entregas'));
});

test('el administrador ve todo y su sección de administración', () => {
  const v = { role: 'admin', courier: 'none' } as const;
  assert.deepEqual(ids(v, 'negocio'), ['negocio', 'principal', 'admin']);
  assert.equal(roleHome('admin'), '/admin');
});

test('las páginas exclusivas se reconocen con o sin barra final', () => {
  assert.equal(requiredRole('/admin/'), 'admin');
  assert.equal(requiredRole('/equipo'), 'admin');
  assert.equal(requiredRole('/panel/pedidos/'), 'emprendedor');
  assert.equal(requiredRole('/panelito'), null);
  assert.equal(requiredRole('/inicio'), null);
  assert.equal(canOpen('/admin', 'emprendedor'), false);
  assert.equal(canOpen('/panel', 'cliente'), false);
  assert.equal(canOpen('/panel', 'admin'), true);
  assert.equal(modeFor('/panel/perfil'), 'negocio');
  assert.equal(modeFor('/pedidos'), 'comprar');
});
