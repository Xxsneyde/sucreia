// Base de datos de SucreIA con dos motores y la misma interfaz asíncrona:
// - SQLite incluido en Node (node:sqlite): desarrollo, pruebas y servidores con disco.
// - Postgres (DATABASE_URL, por ejemplo Supabase): Vercel y otros servicios sin disco.
// El código escribe SQL de SQLite; `toPostgres` traduce las pocas diferencias (marcadores ?,
// INSERT OR IGNORE, json_extract, nombres camelCase y BLOB).
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { sslFor } from './db-ssl.ts';

export type Row = Record<string, unknown>;
export interface Statement {
  get<T = Row>(...params: unknown[]): Promise<T | undefined>;
  all<T = Row>(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<{ changes: number }>;
}
export interface Db {
  dialect: 'sqlite' | 'postgres';
  prepare(sql: string): Statement;
  exec(sql: string): Promise<void>;
  /** Transacción exclusiva: dentro de `fn` usa siempre `tx`, no la base original. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
type Migration = string | { sqlite: string; postgres: string };

// Cada migración se aplica una sola vez, en orden. Para cambiar el esquema, agrega una nueva
// al final; nunca edites una que ya se publicó.
export const migrations: Migration[] = [
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
  `CREATE TABLE referral_codes (user_id TEXT PRIMARY KEY REFERENCES users(id), code TEXT NOT NULL UNIQUE);
  CREATE TABLE referrals (user_id TEXT PRIMARY KEY REFERENCES users(id), inviter_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
  CREATE INDEX referrals_inviter ON referrals(inviter_id);
  CREATE TABLE events (id TEXT PRIMARY KEY, title TEXT NOT NULL, place TEXT NOT NULL, municipality TEXT NOT NULL, date TEXT NOT NULL, points INTEGER NOT NULL CHECK(points BETWEEN 1 AND 100), code_hash TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
  CREATE TABLE event_attendance (event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, PRIMARY KEY(event_id, user_id));`,
  // Fotos dentro de la base (Vercel no conserva archivos). En disco siguen funcionando.
  `CREATE TABLE image_data (id TEXT PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE, data BLOB NOT NULL);`,
  // Postgres no tiene «rowid»: se agrega una columna con ese nombre al final de las tablas que
  // se ordenan por orden de inserción (los INSERT por posición siguen funcionando).
  {
    sqlite: 'SELECT 1;',
    postgres: [
      'store_versions',
      'admin_audit',
      'operations',
      'points_ledger',
      'notifications',
      'reviews',
    ]
      .map((t) => `ALTER TABLE ${t} ADD COLUMN rowid BIGSERIAL;`)
      .join('\n'),
  },
  // Logística estilo Uber: vehículo, disponibilidad y última ubicación del domiciliario.
  `ALTER TABLE couriers ADD COLUMN vehicle TEXT NOT NULL DEFAULT '';
  ALTER TABLE couriers ADD COLUMN available INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE couriers ADD COLUMN lat REAL;
  ALTER TABLE couriers ADD COLUMN lng REAL;
  ALTER TABLE couriers ADD COLUMN location_at TEXT;`,
  // Varias citas a la misma hora (cupo del negocio): la comprobación se hace en la transacción.
  `DROP INDEX unique_booking;
  CREATE INDEX booking_slots ON operations(store_id, slot);`,
  `ALTER TABLE users ADD COLUMN document_number TEXT;
   ALTER TABLE users ADD COLUMN home_address TEXT;
   ALTER TABLE stores ADD COLUMN registration TEXT NOT NULL DEFAULT 'pending';
   UPDATE stores SET registration='approved' WHERE published_version_id IS NOT NULL;
   ALTER TABLE stores ADD COLUMN review_design TEXT;
   ALTER TABLE stores ADD COLUMN terms_version TEXT;
   ALTER TABLE stores ADD COLUMN terms_at TEXT;
   CREATE TABLE pqrs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), message TEXT NOT NULL, created_at TEXT NOT NULL);`,
  // Documentos del registro previo (revisados por la administración) y respuesta a las PQRS.
  `CREATE TABLE store_documents (store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, kind TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, data TEXT NOT NULL, uploaded_at TEXT NOT NULL, PRIMARY KEY(store_id, kind));
   ALTER TABLE stores ADD COLUMN legal_type TEXT NOT NULL DEFAULT 'natural';
   ALTER TABLE pqrs ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
   ALTER TABLE pqrs ADD COLUMN response TEXT;
   ALTER TABLE pqrs ADD COLUMN responded_at TEXT;`,
  // Compras que se cierran por WhatsApp: queda el registro para el cliente y el negocio.
  `CREATE TABLE whatsapp_orders (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, client_id TEXT NOT NULL REFERENCES users(id), payload TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE INDEX whatsapp_orders_client ON whatsapp_orders(client_id, created_at);
   CREATE INDEX whatsapp_orders_store ON whatsapp_orders(store_id, created_at);`,
  // Estados temporales del ingreso con Google (anti-CSRF y cuenta nueva por completar).
  `CREATE TABLE oauth_states (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, expires_at TEXT NOT NULL);`,
  // Flujo de cuenta: correo confirmado → datos personales. Las cuentas que ya existían quedan
  // como confirmadas y completas (se crearon con el flujo anterior).
  `ALTER TABLE users ADD COLUMN profile_completed_at TEXT;
   UPDATE users SET profile_completed_at = created_at;
   UPDATE users SET emailVerifiedAt = created_at WHERE emailVerifiedAt IS NULL;
   DELETE FROM oauth_states WHERE kind = 'google-pending';`,
  // Valoración de cada producto: una por persona y producto (la puede cambiar), solo de quien
  // lo compró o lo contrató.
  `CREATE TABLE product_reviews (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, product_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(store_id, product_id, user_id));
   CREATE INDEX product_reviews_product ON product_reviews(store_id, product_id);`,
  // PQRS como conversación: cada caso tiene mensajes de la persona y de la administración.
  // Estados: pending (espera a la administración), answered (caso abierto: respondido y la
  // persona puede contestar) y closed (resuelto y cerrado por la administración).
  `CREATE TABLE pqrs_messages (id TEXT PRIMARY KEY, pqrs_id TEXT NOT NULL REFERENCES pqrs(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id), from_admin INTEGER NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE INDEX pqrs_messages_case ON pqrs_messages(pqrs_id, created_at);
   ALTER TABLE pqrs ADD COLUMN closed_at TEXT;
   ALTER TABLE pqrs ADD COLUMN updated_at TEXT;
   UPDATE pqrs SET updated_at = COALESCE(responded_at, created_at);
   UPDATE pqrs SET status = 'pending' WHERE status = 'open';
   INSERT INTO pqrs_messages (id, pqrs_id, author_id, from_admin, body, created_at)
     SELECT id || '-r', id, user_id, 1, response, responded_at FROM pqrs WHERE response IS NOT NULL AND responded_at IS NOT NULL;
   CREATE INDEX pqrs_user ON pqrs(user_id, created_at);`,
  // Miniaturas (480 px) de las fotos guardadas en la base: tarjetas y listas cargan mucho menos.
  `CREATE TABLE image_thumbs (id TEXT PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE, data BLOB NOT NULL);`,
  // Reseña directa del negocio (botón «Añadir reseña»): la escribe un cliente sin operación de
  // por medio. operation_id pasa a ser opcional y cada cliente tiene una sola directa por negocio.
  {
    sqlite: `CREATE TABLE reviews_new (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE REFERENCES operations(id), store_id TEXT NOT NULL REFERENCES stores(id), user_id TEXT NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL, created_at TEXT NOT NULL, courier_rating INTEGER CHECK(courier_rating BETWEEN 1 AND 5));
      INSERT INTO reviews_new (id, operation_id, store_id, user_id, rating, comment, created_at, courier_rating)
        SELECT id, operation_id, store_id, user_id, rating, comment, created_at, courier_rating FROM reviews ORDER BY rowid;
      DROP TABLE reviews;
      ALTER TABLE reviews_new RENAME TO reviews;
      CREATE INDEX reviews_store ON reviews(store_id);
      CREATE UNIQUE INDEX reviews_direct ON reviews(store_id, user_id) WHERE operation_id IS NULL;`,
    postgres: `ALTER TABLE reviews ALTER COLUMN operation_id DROP NOT NULL;
      CREATE UNIQUE INDEX reviews_direct ON reviews(store_id, user_id) WHERE operation_id IS NULL;`,
  },
  // Confirmar la cuenta por mensaje de texto (Onurix) además de por correo. emailVerifiedAt sigue
  // siendo «cuenta confirmada»; verify_channel dice por dónde se confirma. El código de 6 dígitos
  // se guarda solo como hash, vence a los 10 minutos y admite pocos intentos.
  `ALTER TABLE users ADD COLUMN phone TEXT;
   ALTER TABLE users ADD COLUMN verify_channel TEXT NOT NULL DEFAULT 'email';
   CREATE TABLE sms_codes (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, phone TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent_at TEXT NOT NULL);`,
  // Archivo adjunto de las PQRS (foto o PDF, máx. 5 MB), solo visible para su autor y la
  // administración.
  `CREATE TABLE pqrs_files (id TEXT PRIMARY KEY, pqrs_id TEXT NOT NULL REFERENCES pqrs(id) ON DELETE CASCADE, message_id TEXT, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE INDEX pqrs_files_case ON pqrs_files(pqrs_id);`,
  // Política de uso y condiciones generales: cuándo y qué versión aceptó cada cuenta al
  // registrarse (o al completar su perfil, si entró con Google). Solo agrega columnas.
  `ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
   ALTER TABLE users ADD COLUMN terms_version TEXT;`,
];

const sqlOf = (m: Migration, dialect: Db['dialect']) => (typeof m === 'string' ? m : m[dialect]);

async function migrate(db: Db) {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = await db.prepare('SELECT version FROM schema_version').get<{ version: number }>();
  if (!row) await db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  for (let version = row?.version ?? 0; version < migrations.length; version++)
    await db.transaction(async (tx) => {
      await tx.exec(sqlOf(migrations[version], tx.dialect));
      await tx.prepare('UPDATE schema_version SET version = ?').run(version + 1);
    });
}

/**
 * Abre la base: una URL postgres:// usa Postgres; cualquier otra cosa es un archivo SQLite
 * (':memory:' para pruebas). Aplica las migraciones pendientes.
 */
export async function openDb(target: string): Promise<Db> {
  // Pruebas: SUCREIA_TEST_DB=pglite corre las bases ':memory:' en Postgres embebido.
  if (target === 'pglite:' || (target === ':memory:' && process.env.SUCREIA_TEST_DB === 'pglite'))
    return openPglite();
  const db = /^postgres(ql)?:\/\//.test(target)
    ? await openPostgres(target)
    : await openSqlite(target);
  await migrate(db);
  return db;
}

// --- SQLite ---------------------------------------------------------------------------------
async function openSqlite(path: string): Promise<Db> {
  const { DatabaseSync } = await import('node:sqlite');
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const raw = new DatabaseSync(path);
  raw.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  // Una sola conexión: las transacciones se ponen en fila para no mezclarse entre peticiones.
  let queue: Promise<unknown> = Promise.resolve();
  const values = (params: unknown[]) =>
    params as (null | number | bigint | string | NodeJS.ArrayBufferView)[];
  const db: Db = {
    dialect: 'sqlite',
    prepare(sql) {
      const statement = raw.prepare(sql);
      return {
        get: async <T>(...p: unknown[]) => statement.get(...values(p)) as T | undefined,
        all: async <T>(...p: unknown[]) => statement.all(...values(p)) as T[],
        run: async (...p: unknown[]) => ({ changes: Number(statement.run(...values(p)).changes) }),
      };
    },
    async exec(sql) {
      raw.exec(sql);
    },
    transaction<T>(fn: (tx: Db) => Promise<T>) {
      const run = queue.then(async () => {
        raw.exec('BEGIN IMMEDIATE');
        try {
          const result = await fn(db);
          raw.exec('COMMIT');
          return result;
        } catch (error) {
          raw.exec('ROLLBACK');
          throw error;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    },
    async close() {
      raw.close();
    },
  };
  return db;
}

// --- Postgres -------------------------------------------------------------------------------
/** Traduce SQL escrito para SQLite al dialecto de Postgres (fuera de los textos entre comillas). */
export function toPostgres(sql: string): string {
  let text = sql
    .replace(/json_extract\(\s*([\w.]+)\s*,\s*'\$\.(\w+)'\s*\)/g, "($1::jsonb->>'$2')")
    .replace(/\bBEGIN IMMEDIATE\b/g, 'BEGIN');
  const ignore = /\bINSERT OR IGNORE INTO\b/i.test(text);
  if (ignore) text = text.replace(/\bINSERT OR IGNORE INTO\b/gi, 'INSERT INTO');
  let out = '';
  let n = 0;
  // Recorre fuera de los literales '...': marcadores ?, BLOB y nombres camelCase entre comillas.
  for (const part of text.split(/('(?:[^']|'')*')/)) {
    if (part.startsWith("'")) {
      out += part;
      continue;
    }
    out += part
      .replace(/\?/g, () => `$${++n}`)
      .replace(/\bBLOB\b/g, 'BYTEA')
      .replace(/\bREAL\b/g, 'DOUBLE PRECISION')
      .replace(/(?<!["\w$])([a-z][a-z0-9]*[A-Z][A-Za-z0-9]*)\b/g, '"$1"');
  }
  if (ignore) out = out.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING');
  return out;
}

/** Conexión mínima que necesita el adaptador de Postgres. */
interface PgConn {
  query(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount: number }>;
  exec(sql: string): Promise<void>;
}
interface PgDriver extends PgConn {
  /** Ejecuta `fn` con una conexión exclusiva dentro de BEGIN…COMMIT. */
  withTransaction<T>(fn: (conn: PgConn) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

function postgresDb(driver: PgDriver): Db {
  const cache = new Map<string, string>();
  const sqlFor = (sql: string) => {
    let t = cache.get(sql);
    if (!t) cache.set(sql, (t = toPostgres(sql)));
    return t;
  };
  const make = (conn: PgConn, inTransaction: boolean): Db => ({
    dialect: 'postgres',
    prepare(sql) {
      const text = sqlFor(sql);
      return {
        get: async <T>(...p: unknown[]) => (await conn.query(text, p)).rows[0] as T | undefined,
        all: async <T>(...p: unknown[]) => (await conn.query(text, p)).rows as T[],
        run: async (...p: unknown[]) => ({ changes: (await conn.query(text, p)).rowCount }),
      };
    },
    exec: (sql) => conn.exec(toPostgres(sql)),
    transaction<T>(fn: (tx: Db) => Promise<T>) {
      if (inTransaction) return fn(make(conn, true));
      return driver.withTransaction(async (c) => {
        // Una escritura a la vez (como BEGIN IMMEDIATE en SQLite): evita ventas dobles de stock.
        await c.query('SELECT pg_advisory_xact_lock(4242)');
        return fn(make(c, true));
      });
    },
    close: async () => {
      if (!inTransaction) await driver.end();
    },
  });
  return make(driver, false);
}

/** Quita sslmode y compañía de la URL: la conexión cifrada la define `sslFor`. */
function withoutSslParams(url: string) {
  return url
    .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert|uselibpqcompat)=[^&]*/g, '$1')
    .replace(/&{2,}/g, '&')
    .replace(/\?&/, '?')
    .replace(/[?&]+$/, '');
}

async function openPostgres(url: string): Promise<Db> {
  const pg = (await import('pg')).default;
  // COUNT/SUM devuelven bigint/numeric como texto: aquí se leen como números (como en SQLite).
  pg.types.setTypeParser(20, (v: string) => Number.parseInt(v, 10));
  pg.types.setTypeParser(1700, (v: string) => Number.parseFloat(v));
  const pool = new pg.Pool({
    // Los parámetros ssl* de la URL reemplazarían la verificación de abajo: se quitan.
    connectionString: withoutSslParams(url),
    max: Number(process.env.DATABASE_POOL ?? 3),
    // Cifrada y verificada con el certificado de Supabase (ver db-ssl.ts).
    ssl: sslFor(url),
    // Conexiones inactivas se cierran pronto: Supabase admite pocos clientes a la vez.
    idleTimeoutMillis: 5_000,
  });
  const wrap = (q: {
    query: (t: string, v?: unknown[]) => Promise<{ rows: Row[]; rowCount: number | null }>;
  }): PgConn => ({
    query: async (text, values) => {
      const r = await q.query(text, values);
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    },
    exec: async (sql) => {
      await q.query(sql);
    },
  });
  return postgresDb({
    ...wrap(pool),
    async withTransaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  });
}

/** Postgres embebido (PGlite) para probar el dialecto sin servidor: openDb('pglite:'). */
export async function openPglite(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pgl = new PGlite({
    parsers: {
      20: (v: string) => Number.parseInt(v, 10),
      1700: (v: string) => Number.parseFloat(v),
    },
  });
  let queue: Promise<unknown> = Promise.resolve();
  const conn: PgConn = {
    query: async (text, values) => {
      const r = await pgl.query<Row>(text, values as unknown[]);
      return { rows: r.rows, rowCount: r.affectedRows ?? 0 };
    },
    exec: async (sql) => {
      await pgl.exec(sql);
    },
  };
  const db = postgresDb({
    ...conn,
    withTransaction<T>(fn: (c: PgConn) => Promise<T>) {
      const run = queue.then(async () => {
        await pgl.exec('BEGIN');
        try {
          const result = await fn(conn);
          await pgl.exec('COMMIT');
          return result;
        } catch (error) {
          await pgl.exec('ROLLBACK');
          throw error;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    },
    end: () => pgl.close(),
  });
  await migrate(db);
  return db;
}
