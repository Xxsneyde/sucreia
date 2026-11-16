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
  `
  ALTER TABLE users ADD COLUMN emailVerifiedAt TEXT;
  CREATE TABLE account_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('reset', 'verify')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX account_tokens_user ON account_tokens(user_id, purpose);
  `,
  `
  CREATE TABLE images (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bytes INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX images_owner ON images(owner_id);
  `,
  `
  CREATE TABLE store_settings (store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE, payload TEXT NOT NULL);
  CREATE TABLE inventory (store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, product_id TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity >= 0), PRIMARY KEY(store_id, product_id));
  CREATE TABLE operations (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), client_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, status TEXT NOT NULL, slot TEXT, idempotency TEXT NOT NULL, request_hash TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(client_id, idempotency));
  CREATE INDEX operations_store ON operations(store_id, status);
  CREATE INDEX operations_client ON operations(client_id);
  CREATE UNIQUE INDEX unique_booking ON operations(store_id, slot) WHERE kind = 'booking' AND status IN ('pending', 'accepted');
  CREATE TABLE favorites (user_id TEXT NOT NULL REFERENCES users(id), store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, PRIMARY KEY(user_id,store_id));
  CREATE TABLE points_ledger (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE promotions (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), payload TEXT NOT NULL);
  CREATE TABLE coupons (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), store_id TEXT NOT NULL REFERENCES stores(id), used INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL);
  CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, link TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
  CREATE INDEX notifications_user ON notifications(user_id,created_at);
  CREATE TABLE learning (user_id TEXT NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id, lesson_id));
  CREATE TABLE couriers (user_id TEXT PRIMARY KEY REFERENCES users(id), phone TEXT NOT NULL, municipality TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE reviews (id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE REFERENCES operations(id), store_id TEXT NOT NULL REFERENCES stores(id), user_id TEXT NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE store_views (store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, product_id TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(store_id,product_id));
  CREATE TABLE admin_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, target TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL);
  `,
  `
  ALTER TABLE couriers ADD COLUMN avatar TEXT NOT NULL DEFAULT '';
  ALTER TABLE reviews ADD COLUMN courier_rating INTEGER CHECK(courier_rating BETWEEN 1 AND 5);
  `,
  `CREATE TABLE certificates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id), name TEXT NOT NULL, lessons INTEGER NOT NULL, created_at TEXT NOT NULL);`,
  `CREATE INDEX points_user ON points_ledger(user_id);
  CREATE INDEX coupons_user ON coupons(user_id);
  CREATE INDEX reviews_store ON reviews(store_id);
  CREATE INDEX operations_courier ON operations(json_extract(payload,'$.courierId'),status);`,
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
