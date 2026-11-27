import test from 'node:test';
import assert from 'node:assert/strict';
import { joinPhone, normalizePhone, phoneProblem, splitPhone } from '../src/domain/phone.ts';

test('teléfonos de cualquier país: separar, unir y validar', () => {
  // Lo guardado antes (con o sin +57) se sigue leyendo como Colombia.
  assert.deepEqual(splitPhone('+573001234567'), { iso: 'CO', national: '3001234567' });
  assert.deepEqual(splitPhone('3001234567'), { iso: 'CO', national: '3001234567' });
  assert.deepEqual(splitPhone(''), { iso: 'CO', national: '' });
  // Indicativos de varias cifras y el +1 (Estados Unidos por defecto).
  assert.deepEqual(splitPhone('+50761234567'), { iso: 'PA', national: '61234567' });
  assert.deepEqual(splitPhone('+593991234567'), { iso: 'EC', national: '991234567' });
  assert.deepEqual(splitPhone('+13055551234'), { iso: 'US', national: '3055551234' });
  assert.equal(joinPhone('VE', '412 123 4567'), '+584121234567');
  assert.equal(joinPhone('CO', ''), '');
  // Largo del número según el país.
  assert.equal(phoneProblem('CO', '3001234567'), '');
  assert.equal(phoneProblem('CO', '6012345678'), '');
  assert.match(phoneProblem('CO', '1234567890'), /empieza por 3/);
  assert.match(phoneProblem('VE', '41212'), /10 dígitos/);
  assert.match(phoneProblem('EC', '1234'), /de 8 a 9 dígitos/);
  assert.equal(phoneProblem('ES', '612345678'), '');
  // Normalizar lo que escribe una persona.
  assert.equal(normalizePhone('300 123 4567'), '+573001234567');
  assert.equal(normalizePhone('+58 (412) 123-4567'), '+584121234567');
  assert.equal(normalizePhone('+34 612 345 678'), '+34612345678');
  assert.equal(normalizePhone('+58 412'), null);
  assert.equal(normalizePhone(''), null);
});
