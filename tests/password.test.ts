import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem, passwordRules } from '../src/domain/password.ts';

test('contraseñas nuevas: 8 caracteres, una letra, un número y un carácter especial', () => {
  const ok = (p: string) => passwordProblem(p) === '';
  assert.ok(ok('clave-segura-1'));
  assert.ok(ok('Sucre#2026'));
  assert.ok(ok('mañana.9x'));
  assert.ok(ok('niño@campo7'));
  assert.equal(ok('corta-1'), false, 'menos de 8');
  assert.equal(ok('clavesegura'), false, 'sin número ni carácter especial');
  assert.equal(ok('clavesegura1'), false, 'sin carácter especial');
  assert.equal(ok('12345678!'), false, 'sin letra');
  assert.equal(ok('clave segura 1'), false, 'un espacio no cuenta como carácter especial');
  assert.match(passwordProblem('clavesegura'), /al menos un número, al menos un carácter especial/);
  assert.deepEqual(
    passwordRules.filter((r) => r.test('abc')).map((r) => r.id),
    ['letter'],
  );
});
