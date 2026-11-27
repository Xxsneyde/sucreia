import test from 'node:test';
import assert from 'node:assert/strict';
import { profileGate } from '../src/domain/access.ts';
import {
  canOpen,
  defaultMode,
  isRetired,
  modesFor,
  navFor,
  requiredRole,
  roleHome,
} from '../src/domain/roles.ts';

const hrefs = (sections: ReturnType<typeof navFor>['sections']) =>
  sections.flatMap((s) => s.items.map((i) => i.href));
const cliente = { role: 'cliente', courier: 'none' } as const;
const emprendedor = { role: 'emprendedor', courier: 'none' } as const;
const admin = { role: 'admin', courier: 'none' } as const;

test('cada rol tiene una sola vista y todos empiezan buscando negocios', () => {
  assert.deepEqual(modesFor('cliente'), ['comprar']);
  assert.deepEqual(modesFor('emprendedor'), ['negocio']);
  assert.deepEqual(modesFor('admin'), ['admin']);
  assert.equal(defaultMode('admin'), 'admin');
  for (const role of ['cliente', 'emprendedor', 'admin'] as const)
    assert.equal(roleHome(role), '/buscar');
});

test('visitantes y clientes ven el menú principal; el cliente además la invitación a emprender', () => {
  const principal = ['/buscar', '/mapa', '/pedidos', '/solicitudes', '/favoritos'];
  // Las notificaciones no están en el menú: se abren desde la campana de arriba.
  assert.deepEqual(hrefs(navFor(null).sections), principal);
  assert.deepEqual(hrefs(navFor(cliente).sections), [...principal, '/emprender']);
  // Una vista que no es del rol se ignora.
  assert.deepEqual(
    navFor(cliente, 'admin').sections.map((s) => s.id),
    ['principal'],
  );
  assert.deepEqual(
    navFor(cliente).mobile.map((i) => i.label),
    ['Buscar', 'Mapa', 'Compras', 'Reservas'],
  );
});

test('el menú del emprendedor cambia según tenga negocio y su modalidad', () => {
  const menu = (kind: 'none' | 'products' | 'booking' | 'quote') =>
    navFor(emprendedor, 'negocio', kind).sections[0].items.map((i) => i.label);
  assert.deepEqual(menu('none'), ['Registra tu emprendimiento', 'PQRS']);
  assert.deepEqual(menu('products'), [
    'Mis negocios',
    'Registrar emprendimiento',
    'Promociones y reseñas',
    'PQRS',
  ]);
  // Reservas y solicitudes se abren desde cada negocio en «Mis negocios», no desde el menú.
  assert.deepEqual(menu('booking'), menu('products'));
  assert.deepEqual(menu('quote'), menu('products'));
  const nav = navFor(emprendedor, 'negocio', 'products');
  assert.deepEqual(
    nav.sections.map((s) => s.id),
    ['negocio', 'explorar'],
  );
  assert.equal(nav.sections[1].title, 'Explorar y comprar');
  // En el celular: cuatro accesos del negocio (sin avisos), con nombres cortos.
  assert.deepEqual(
    nav.mobile.map((i) => i.label),
    ['Negocios', 'Registrar', 'Promos', 'PQRS'],
  );
});

test('el administrador ve aprobación, negocios aprobados y PQRS', () => {
  const nav = navFor(admin, 'admin');
  assert.deepEqual(
    nav.sections.map((s) => s.id),
    ['admin', 'explorar'],
  );
  assert.ok(hrefs(nav.sections).includes('/admin/pqrs'));
  assert.deepEqual(
    nav.mobile.map((i) => i.label),
    ['Aprobar', 'Aprobados', 'Negocios', 'Registrar'],
  );
});

test('las páginas exclusivas se reconocen con o sin barra final', () => {
  assert.equal(requiredRole('/admin/'), 'admin');
  assert.equal(requiredRole('/equipo'), 'admin');
  assert.equal(requiredRole('/panel/pedidos/'), 'emprendedor');
  assert.equal(requiredRole('/registro-negocio'), 'emprendedor');
  assert.equal(requiredRole('/favoritos/'), 'cliente');
  assert.equal(requiredRole('/panelito'), null);
  assert.equal(canOpen('/admin', 'emprendedor'), false);
  assert.equal(canOpen('/panel', 'cliente'), false);
  assert.equal(canOpen('/panel', 'admin'), true);
  assert.equal(canOpen('/carrito', 'admin'), false);
  assert.equal(canOpen('/carrito', 'emprendedor'), true);
});

test('las páginas retiradas del menú se reconocen', () => {
  for (const path of ['/inicio', '/puntos/', '/escuela', '/panel/ventas', '/equipo'])
    assert.ok(isRetired(path), path);
  for (const path of ['/buscar', '/panel', '/panel/negocios']) assert.ok(!isRetired(path), path);
});

test('antes de usar la plataforma se verifica el correo y se completa el perfil', () => {
  const base = { role: 'cliente', emailVerifiedAt: null, profileComplete: false };
  assert.equal(profileGate(null, '/buscar'), null);
  assert.equal(profileGate(base, '/buscar'), '/verificar-correo');
  assert.equal(
    profileGate({ ...base, emailVerifiedAt: '2026-11-26' }, '/buscar'),
    '/completar-perfil',
  );
  assert.equal(
    profileGate({ ...base, emailVerifiedAt: '2026-11-26', profileComplete: true }, '/buscar'),
    null,
  );
  // Las páginas de acceso e informativas se pueden abrir siempre; el administrador no pasa por esto.
  assert.equal(profileGate(base, '/terminos/'), null);
  assert.equal(profileGate({ ...base, role: 'admin' }, '/buscar'), null);
});
