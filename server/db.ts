// Base de datos SQLite incluida en Node (node:sqlite): un solo archivo, sin instalar nada.
// Toda la lectura/escritura pasa por los repositorios de este servidor; para cambiar a
// PostgreSQL más adelante basta con reemplazar esta capa.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = DatabaseSync;

// Cada migración se aplica una sola vez, en orden. Para cambiar el esquema, agrega una nueva
// al final; nunca edites una que ya se publicó.
const migrations: string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cliente', 'emprendedor', 'admin')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);
  CREATE TABLE stores (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    draft TEXT NOT NULL,
    published_version_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX stores_owner ON stores(owner_id);
  CREATE TABLE store_versions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    design TEXT NOT NULL,
    published_at TEXT NOT NULL
  );
  CREATE INDEX versions_store ON store_versions(store_id, published_at);
  `,
];

/** Abre (o crea) la base de datos y aplica las migraciones pendientes. ':memory:' para pruebas. */
export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT version FROM schema_version').get() as
    { version: number } | undefined;
  let version = row?.version ?? 0;
  if (!row) db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  for (; version < migrations.length; version++) {
    db.exec('BEGIN');
    try {
      db.exec(migrations[version]);
      db.prepare('UPDATE schema_version SET version = ?').run(version + 1);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return db;
}
