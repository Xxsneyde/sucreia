import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { openDb } from '../server/db.ts';
import { createUser, hashPassword, verifyPassword } from '../server/auth.ts';
import { issueToken, consumeToken, localMailbox } from '../server/account-tokens.ts';

async function fixture() {
  const db = await openDb(':memory:');
  const user = await createUser(db, {
    email: 'persona@example.co',
    name: 'Persona',
    role: 'cliente',
    passwordHash: 'no-usado',
  });
  return { db, user };
}

test('los tokens se guardan como hash y solo se consumen con el propósito correcto una vez', async () => {
  const { db, user } = await fixture();
  try {
    const { token } = await issueToken(db, user.id, 'reset');
    const stored = (await db.prepare('SELECT token_hash FROM account_tokens').get())!;
    assert.equal(stored.token_hash, createHash('sha256').update(token).digest('hex'));
    await assert.rejects(async () => consumeToken(db, token, 'verify'), /ya se usó o venció/);
    assert.equal(await consumeToken(db, token, 'reset'), user.id);
    await assert.rejects(async () => consumeToken(db, token, 'reset'), /ya se usó o venció/);
  } finally {
    db.close();
  }
});

test('reenviar invalida el token anterior, conserva el otro propósito y rechaza caducados', async () => {
  const { db, user } = await fixture();
  try {
    const first = await issueToken(db, user.id, 'reset');
    const verification = await issueToken(db, user.id, 'verify');
    const second = await issueToken(db, user.id, 'reset');
    await assert.rejects(async () => consumeToken(db, first.token, 'reset'));
    assert.equal(await consumeToken(db, verification.token, 'verify'), user.id);
    await db.prepare("UPDATE account_tokens SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    await assert.rejects(async () => consumeToken(db, second.token, 'reset'));
  } finally {
    db.close();
  }
});

test('rollback conserva el token si falla la operación protegida', async () => {
  const { db, user } = await fixture();
  try {
    const { token } = await issueToken(db, user.id, 'reset');
    db.exec('BEGIN');
    await consumeToken(db, token, 'reset');
    db.exec('ROLLBACK');
    assert.equal(await consumeToken(db, token, 'reset'), user.id);
  } finally {
    db.close();
  }
});

test('la bandeja local es efímera, limita mensajes y oculta los vencidos', async () => {
  const mailbox = localMailbox();
  for (let i = 0; i < 110; i++)
    mailbox.send('persona@example.co', 'reset', `token-${i}`, '2099-01-01T00:00:00.000Z');
  assert.equal(mailbox.list().length, 100);
  assert.ok(mailbox.list().every((m) => m.path.startsWith('/recuperar?token=')));
  mailbox.send('persona@example.co', 'verify', 'caducado', '2000-01-01T00:00:00.000Z');
  assert.ok(!mailbox.list().some((m) => m.path.includes('caducado')));
  assert.equal(localMailbox().list().length, 0);
});

test('scrypt verifica la nueva contraseña y rechaza la anterior', async () => {
  const stored = await hashPassword('contraseña-nueva-123');
  assert.equal(await verifyPassword('contraseña-nueva-123', stored), true);
  assert.equal(await verifyPassword('contraseña-anterior-456', stored), false);
});
