import test from 'node:test';
import assert from 'node:assert/strict';
import { canOpen, modeFor, navFor, requiredRole, roleHome } from '../src/domain/roles.ts';

const ids = (v: Parameters<typeof navFor>[0], mode: 'negocio' | 'comprar' = 'comprar') =>
  navFor(v, mode).sections.map((s) => s.id);
const hrefs = (v: Parameters<typeof navFor>[0], mode: 'negocio' | 'comprar' = 'comprar') =>
  navFor(v, mode).sections.flatMap((s) => s.items.map((i) => i.href));

// Menú del cliente (diagrama del equipo): descubrir, comprar, reservar y sus puntos.
// La Escuela es del emprendedor y la logística tiene su propia sección.
const principal = [
  '/inicio',
  '/buscar',
  '/sectores',
  '/mapa',
  '/puntos',
  '/recomendaciones',
  '/pedidos',
  '/solicitudes',
  '/favoritos',
  '/notificaciones',
];

test('visitantes y clientes ven el menú de la presentación; nada del negocio ni de administración', () => {
  assert.deepEqual(hrefs(null), principal);
  const v = { role: 'cliente', courier: 'none' } as const;
  assert.deepEqual(ids(v), ['principal']);
  for (const href of ['/panel', '/admin', '/equipo', '/domiciliario', '/escuela'])
    assert.ok(!hrefs(v).includes(href), href);
  assert.equal(roleHome('cliente'), '/inicio');
});

test('el emprendedor ve su negocio primero en las páginas del negocio y también el menú principal', () => {
  const v = { role: 'emprendedor', courier: 'none' } as const;
  assert.deepEqual(ids(v, 'negocio'), ['negocio', 'principal']);
  assert.deepEqual(ids(v, 'comprar'), ['principal', 'negocio']);
  // Sin negocio todavía: primero la configuración previa.
  assert.equal(navFor(v, 'negocio').mobile[0].href, '/panel/configurar');
  assert.equal(navFor(v, 'negocio', 'products').mobile[0].href, '/panel');
  assert.equal(navFor(v, 'comprar').mobile[0].href, '/inicio');
  assert.ok(!hrefs(v).includes('/admin'));
  assert.equal(roleHome('emprendedor'), '/panel');
});

test('el menú del negocio cambia según venda productos, reservas o cotizaciones', () => {
  const v = { role: 'emprendedor', courier: 'none' } as const;
  const menu = (kind: 'products' | 'booking' | 'quote') =>
    navFor(v, 'negocio', kind).sections[0].items.map((i) => i.label);
  assert.deepEqual(menu('products').slice(0, 3), ['Pedidos', 'Ventas', 'Mis productos']);
  assert.deepEqual(menu('booking').slice(0, 4), [
    'Reservas de hoy',
    'Agenda',
    'Mis servicios',
    'Dashboard',
  ]);
  assert.ok(!menu('quote').includes('Agenda'));
  for (const kind of ['products', 'booking', 'quote'] as const)
    assert.ok(menu(kind).includes('Escuela del Emprendedor IA'), kind);
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
  assert.equal(modeFor('/domiciliario'), 'entregas');
  assert.equal(modeFor('/escuela'), 'negocio');
});
