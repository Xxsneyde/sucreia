import { backup, DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { acquireDataLock } from './data-lock.ts';

interface BackupManifest {
  version: 1;
  createdAt: string;
  files: Record<string, string>;
}
const digest = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
function inside(parent: string, child: string) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}
function checkDb(path: string) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const check = db.prepare('PRAGMA integrity_check').all();
    if (
      check.length !== 1 ||
      check[0].integrity_check !== 'ok' ||
      db.prepare('PRAGMA foreign_key_check').all().length
    )
      throw new Error('La base de datos no supera la comprobación de integridad.');
  } finally {
    db.close();
  }
}
function safeFile(root: string, name: string) {
  if (!(name === 'sucreia.db' || /^images\/[a-f0-9]{64}\.webp$/.test(name)))
    throw new Error('El manifiesto contiene una ruta no permitida.');
  const path = join(root, name);
  if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())
    throw new Error('La copia contiene un archivo no válido.');
  return path;
}
/** Copia coherente: servidor detenido; bloqueo compartido, snapshot SQLite y archivos verificados. */
export async function createBackup(databasePath: string, imagesDir: string, destination: string) {
  if (databasePath === ':memory:' || !existsSync(databasePath))
    throw new Error('No existe una base de datos persistente para copiar.');
  const target = resolve(destination);
  if (
    existsSync(target) ||
    inside(imagesDir, target) ||
    inside(target, databasePath) ||
    inside(target, imagesDir)
  )
    throw new Error('Usa un destino nuevo fuera de los datos e imágenes originales.');
  const release = acquireDataLock(databasePath, imagesDir);
  const staging = `${target}.partial-${randomUUID()}`;
  try {
    mkdirSync(dirname(target), { recursive: true });
    mkdirSync(join(staging, 'images'), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(databasePath, { readOnly: true });
    let images: { id: string }[];
    try {
      await backup(db, join(staging, 'sucreia.db'));
      images = db.prepare('SELECT id FROM images ORDER BY id').all() as { id: string }[];
    } finally {
      db.close();
    }
    for (const { id } of images) {
      if (!/^[a-f0-9]{64}$/.test(id))
        throw new Error('Identificador de imagen no válido en la base de datos.');
      const file = join(imagesDir, `${id}.webp`);
      if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
        throw new Error('Falta un archivo de imagen o no es válido.');
      copyFileSync(file, join(staging, 'images', `${id}.webp`));
    }
    const files: Record<string, string> = { 'sucreia.db': digest(join(staging, 'sucreia.db')) };
    for (const { id } of images)
      files[`images/${id}.webp`] = digest(join(staging, 'images', `${id}.webp`));
    checkDb(join(staging, 'sucreia.db'));
    writeFileSync(
      join(staging, 'manifest.json'),
      JSON.stringify(
        { version: 1, createdAt: new Date().toISOString(), files } satisfies BackupManifest,
        null,
        2,
      ),
      { mode: 0o600 },
    );
    renameSync(staging, target);
    return { path: target, images: images.length };
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  } finally {
    release();
  }
}

/** Restaura en un directorio NUEVO. Nunca sobrescribe datos existentes ni arranca la API. */
export function restoreBackup(source: string, destination: string) {
  const root = resolve(source),
    target = resolve(destination);
  if (existsSync(target) || inside(root, target) || inside(target, root))
    throw new Error('La restauración necesita un directorio nuevo y separado de la copia.');
  for (const name of ['manifest.json', 'sucreia.db', 'images']) {
    if (lstatSync(join(root, name)).isSymbolicLink())
      throw new Error('La copia no puede contener enlaces simbólicos.');
  }
  const raw: unknown = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('version' in raw) ||
    raw.version !== 1 ||
    !('files' in raw) ||
    !raw.files ||
    typeof raw.files !== 'object' ||
    Array.isArray(raw.files)
  )
    throw new Error('El manifiesto de la copia no es válido.');
  const entries = Object.entries(raw.files);
  if (!entries.some(([name]) => name === 'sucreia.db'))
    throw new Error('La copia no contiene la base de datos.');
  for (const [name, hash] of entries) {
    if (
      typeof hash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(hash) ||
      digest(safeFile(root, name)) !== hash
    )
      throw new Error('La copia está incompleta o un archivo cambió. No se restauró.');
  }
  checkDb(join(root, 'sucreia.db'));
  const verify = new DatabaseSync(join(root, 'sucreia.db'), { readOnly: true });
  try {
    const images = verify.prepare('SELECT id FROM images').all() as { id: string }[];
    for (const { id } of images)
      if (!entries.some(([name]) => name === `images/${id}.webp`))
        throw new Error('Falta una imagen de la biblioteca en la copia.');
  } finally {
    verify.close();
  }
  const staging = `${target}.partial-${randomUUID()}`;
  try {
    mkdirSync(dirname(target), { recursive: true });
    mkdirSync(join(staging, 'images'), { recursive: true, mode: 0o700 });
    for (const [name] of entries) copyFileSync(safeFile(root, name), join(staging, name));
    // No trasladar sesiones activas al servidor restaurado.
    const restored = new DatabaseSync(join(staging, 'sucreia.db'));
    try {
      restored.exec('DELETE FROM sessions; DELETE FROM account_tokens;');
    } finally {
      restored.close();
    }
    renameSync(staging, target);
    return { path: target, images: readdirSync(join(target, 'images')).length };
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}
