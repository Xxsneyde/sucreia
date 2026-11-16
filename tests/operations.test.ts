import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { openDb } from '../server/db.ts';
import { createUser, createSession } from '../server/auth.ts';
import { issueToken } from '../server/account-tokens.ts';
import { ImageStorage } from '../server/images.ts';
import { createDesign, publishProject } from '../src/domain/studio.ts';
import { createStore, getStore, savePublication } from '../server/stores.ts';
import { acquireDataLock } from '../server/data-lock.ts';
import { createBackup, restoreBackup } from '../server/backups.ts';
import { smtpConfig, smtpSender, smtpTransport, type MailMessage } from '../server/mail.ts';
const env = {
  SMTP_HOST: 'smtp.example.co',
  SMTP_USER: 'cuentas',
  SMTP_PASSWORD: 'solo-prueba',
  SMTP_FROM: 'cuentas@example.co',
  PUBLIC_URL: 'https://sucreia.example',
};

test('SMTP valida configuración y exige HTTPS o loopback sin usar datos de las peticiones', async () => {
  assert.equal(smtpConfig({}), undefined);
  assert.throws(() => smtpConfig({ SMTP_HOST: 'smtp.example.co' }), /Falta configurar/);
  for (const PUBLIC_URL of [
    'javascript:alert(1)',
    'http://sitio.example',
    'https://user:pass@example.co',
    'https://example.co/ruta',
    'https://example.co?token=x',
  ])
    assert.throws(() => smtpConfig({ ...env, PUBLIC_URL }));
  assert.throws(() => smtpConfig({ ...env, SMTP_PORT: '25' }));
  assert.equal(smtpConfig({ ...env, SMTP_PORT: '465' })!.secure, true);
  assert.equal(
    smtpConfig({ ...env, PUBLIC_URL: 'http://127.0.0.1:3000' })!.origin,
    'http://127.0.0.1:3000',
  );
  const sender = smtpSender(smtpConfig(env)!);
  assert.equal(typeof sender.sendMail, 'function');
  assert.equal(typeof sender.verify, 'function');
});

test('SMTP genera el enlace del sitio y oculta errores sensibles, sin abrir conexiones', async () => {
  const messages: MailMessage[] = [];
  const mail = smtpTransport(smtpConfig(env)!, {
    async sendMail(message) {
      messages.push(message);
      return { accepted: [message.to] };
    },
    async verify() {},
  });
  await mail.send('cliente@example.co', 'reset', 'token-de-prueba', '2099-01-01T00:00:00.000Z');
  assert.match(messages[0].text, /https:\/\/sucreia\.example\/recuperar\?token=token-de-prueba/);
  assert.ok(messages[0].disableFileAccess && messages[0].disableUrlAccess);
  await mail.send('cliente@example.co', 'verify', 'verificar', '2099-01-01T00:00:00.000Z');
  assert.match(messages[1].text, /verificar-correo/);
  const failed = smtpTransport(smtpConfig(env)!, {
    async sendMail() {
      throw new Error('SMTP_PASSWORD=secreto');
    },
    async verify() {},
  });
  await assert.rejects(
    async () => await failed.send('cliente@example.co', 'reset', 'token', '2099-01-01'),
    (e: unknown) =>
      e instanceof Error &&
      !e.message.includes('secreto') &&
      e.message.includes('No pudimos entregar'),
  );
});

test('bloqueo exclusivo protege datos y libera bloqueos adquiridos parcialmente', () => {
  const root = mkdtempSync(join(tmpdir(), 'sucreia-lock-'));
  try {
    const db = join(root, 'db.sqlite'),
      images = join(root, 'images');
    const release = acquireDataLock(db, images);
    assert.throws(() => acquireDataLock(db, images), /datos están en uso/);
    release();
    release();
    const releaseAgain = acquireDataLock(db, images);
    releaseAgain();
    const lock = join(images, '.sucreia.lock');
    writeFileSync(lock, 'otro proceso');
    assert.throws(() => acquireDataLock(db, images));
    assert.equal(existsSync(db + '.lock'), false);
    assert.equal(readFileSync(lock, 'utf8'), 'otro proceso');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('backup y restauración conservan tiendas, versiones e imágenes; revocan sesiones y no sobrescriben', async () => {
  const root = mkdtempSync(join(tmpdir(), 'sucreia-backup-'));
  const path = join(root, 'live', 'sucreia.db'),
    images = join(root, 'live', 'images');
  const db = openDb(path);
  try {
    const user = createUser(db, {
      name: 'Persona',
      email: 'persona@example.co',
      passwordHash: 'no-usado',
      role: 'emprendedor',
    });
    createSession(db, user.id);
    issueToken(db, user.id, 'reset');
    const data =
      'data:image/png;base64,' +
      (
        await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ee3333' } })
          .png()
          .toBuffer()
      ).toString('base64');
    const storage = new ImageStorage(db, images);
    const image = await storage.upload(user.id, data);
    const store = createStore(db, user.id, { ...createDesign(), logo: image.url });
    savePublication(db, store.id, publishProject(store).published!);
    const before = JSON.stringify(getStore(db, store.id));
    const release = acquireDataLock(path, images);
    await assert.rejects(createBackup(path, images, join(root, 'locked')), /datos están en uso/);
    release();
    const copy = join(root, 'backup');
    assert.equal((await createBackup(path, images, copy)).images, 1);
    await assert.rejects(createBackup(path, images, copy), /destino nuevo/);
    const restored = join(root, 'restored');
    assert.equal(restoreBackup(copy, restored).images, 1);
    assert.throws(() => restoreBackup(copy, restored), /directorio nuevo/);
    const other = openDb(join(restored, 'sucreia.db'));
    try {
      assert.equal(JSON.stringify(getStore(other, store.id)), before);
      assert.equal(other.prepare('SELECT COUNT(*) AS n FROM sessions').get()!.n, 0);
      assert.equal(other.prepare('SELECT COUNT(*) AS n FROM account_tokens').get()!.n, 0);
      assert.ok(new ImageStorage(other, join(restored, 'images')).read(image.id).length);
    } finally {
      other.close();
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()!.n, 1);
    writeFileSync(join(copy, 'images', `${image.id}.webp`), 'alterado');
    assert.throws(() => restoreBackup(copy, join(root, 'corrupt')), /incompleta|cambió/);
    assert.equal(existsSync(join(root, 'corrupt')), false);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('restauración rechaza rutas del manifiesto que escapan del respaldo', () => {
  const root = mkdtempSync(join(tmpdir(), 'sucreia-manifest-'));
  try {
    mkdirSync(join(root, 'images'));
    writeFileSync(join(root, 'sucreia.db'), 'no-usado');
    writeFileSync(
      join(root, 'manifest.json'),
      JSON.stringify({
        version: 1,
        files: { '../escape': '0'.repeat(64), 'sucreia.db': '0'.repeat(64) },
      }),
    );
    assert.throws(() => restoreBackup(root, root + '-restored'), /ruta no permitida/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
