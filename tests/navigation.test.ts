import test from 'node:test';
import assert from 'node:assert/strict';
import { internalReturn, returnTarget } from '../src/domain/navigation.ts';
test('el retorno de ingreso conserva destinos internos con sus parámetros', () => {
  for (const path of [
    '/estudio',
    '/estudio/gestionar?id=tienda-123',
    '/registro/negocio',
    '/buscar?q=arte',
    '/perfil#cuenta',
  ])
    assert.equal(internalReturn(path), path);
});
test('el retorno rechaza redirecciones externas, controles y bucles de autenticación', () => {
  for (const value of [
    undefined,
    ['/estudio'],
    '',
    'https://ajeno.example',
    '//ajeno.example',
    '/\\ajeno.example',
    '/%5cajeno.example',
    '/%2fajeno.example',
    '/%09/ajeno.example',
    '/\najeno.example',
    '/ingresar?volver=/ingresar',
    '/recuperar/',
    '/verificar-correo?token=x',
    '/%zz',
  ])
    assert.equal(internalReturn(value), '');
});

test('el destino de regreso conserva la consulta real y quita la barra final', () => {
  const loc = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });
  // Primera carga: Nuxt no conoce «?id=…», el navegador sí.
  assert.equal(
    returnTarget('/estudio/gestionar', '/estudio/gestionar', loc('/estudio/gestionar/', '?id=t1')),
    '/estudio/gestionar?id=t1',
  );
  assert.equal(returnTarget('/inicio/', '/inicio/', loc('/inicio/')), '/inicio');
  // Navegación interna hacia otra ruta: se usa la de Nuxt.
  assert.equal(returnTarget('/pedidos', '/pedidos/?x=1#a', loc('/inicio/')), '/pedidos?x=1#a');
  assert.equal(returnTarget('/', '/', loc('/')), '/');
});
