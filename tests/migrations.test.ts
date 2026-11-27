import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { migrations, openDb } from '../server/db.ts';

// Huella de cada migración que ya corrió producción (sucreia.site, recuperada el 26-11-2026).
// Producción no vuelve a correr una migración aplicada: si se edita una de estas, su base queda
// distinta a la de las pruebas. Para cambiar el esquema se agrega una nueva al final de la lista
// en server/db.ts y, cuando ya esté publicada, se agrega aquí su huella.
const published = [
  'd4996db7ef78b109',
  '5380fb52c077a536',
  '2eb60b50768fe2da',
  'abd5fc432590a455',
  '305550e5022f6a64',
  '75c8e6a6d3b134da',
  '19fa873ed7983299',
  '1a39618174e6542a',
  'f9f86c78d7fbb12d',
  '89b5934700e024c9',
  '45281b9ad4725497',
  'aabfdcacd1986aa1',
  '80662702a890ddd5',
  '30bf7c7c3de4534d',
  '1a432e57ec83e499',
  'a37d02be5932dc55',
  'a6ea420d40e28302',
  '794fc1f11f906aaa',
  '98e2edf2c8c2bb27',
  '99424a390f403c29',
  '10e7bdb59cbd38da',
  'd9e6f9925517e4da',
  'ceda0500aeea9d11',
];
const fingerprint = (m: unknown) =>
  createHash('sha256').update(JSON.stringify(m)).digest('hex').slice(0, 16);

test('las migraciones que ya corrió producción no se editan ni se borran', () => {
  assert.ok(
    migrations.length >= published.length,
    `Hay ${migrations.length} migraciones y producción ya corrió ${published.length}: no se borran.`,
  );
  published.forEach((expected, i) =>
    assert.equal(
      fingerprint(migrations[i]),
      expected,
      `La migración ${i + 1} ya corrió en producción: no la edites. Para cambiar el esquema, agrega una nueva al final de server/db.ts.`,
    ),
  );
});

test('una base nueva queda con todas las migraciones aplicadas', async () => {
  const db = await openDb(':memory:');
  try {
    const row = await db.prepare('SELECT version FROM schema_version').get<{ version: number }>();
    assert.equal(row?.version, migrations.length);
  } finally {
    await db.close();
  }
});
