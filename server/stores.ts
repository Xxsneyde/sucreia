// Repositorio de tiendas: traduce entre la base de datos y los tipos de src/domain.
import { randomUUID } from 'node:crypto';
import type { Db } from './db.ts';
import type { StoreDesign, StoreProject, StoreVersion } from '../src/domain/studio.ts';

const MAX_VERSIONS = 8;

interface StoreRow {
  id: string;
  owner_id: string;
  draft: string;
  published_version_id: string | null;
  created_at: string;
  updated_at: string;
}
interface VersionRow {
  id: string;
  design: string;
  published_at: string;
}

function versions(db: Db, storeId: string): StoreVersion[] {
  const rows = db
    .prepare(
      'SELECT id, design, published_at FROM store_versions WHERE store_id = ? ORDER BY published_at DESC, rowid DESC',
    )
    .all(storeId) as unknown as VersionRow[];
  return rows.map((v) => ({ id: v.id, at: v.published_at, design: JSON.parse(v.design) }));
}
function toProject(db: Db, row: StoreRow): StoreProject & { ownerId: string } {
  const all = versions(db, row.id);
  return {
    id: row.id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    draft: JSON.parse(row.draft),
    published: all.find((v) => v.id === row.published_version_id) ?? null,
    versions: all,
  };
}

export function getStore(db: Db, id: string) {
  const row = db.prepare('SELECT * FROM stores WHERE id = ?').get(id) as StoreRow | undefined;
  return row ? toProject(db, row) : undefined;
}
export function listStoresByOwner(db: Db, ownerId: string) {
  const rows = db
    .prepare('SELECT * FROM stores WHERE owner_id = ? ORDER BY updated_at DESC')
    .all(ownerId) as unknown as StoreRow[];
  return rows.map((r) => toProject(db, r));
}
export function listPublishedStores(db: Db) {
  const rows = db
    .prepare('SELECT * FROM stores WHERE published_version_id IS NOT NULL ORDER BY updated_at DESC')
    .all() as unknown as StoreRow[];
  return rows.map((r) => toProject(db, r));
}
export function countStoresByOwner(db: Db, ownerId: string): number {
  return (
    db.prepare('SELECT COUNT(*) AS n FROM stores WHERE owner_id = ?').get(ownerId) as { n: number }
  ).n;
}

export function createStore(db: Db, ownerId: string, design: StoreDesign) {
  const id = `tienda-${randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO stores (id, owner_id, draft, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, ownerId, JSON.stringify(design), now, now);
  return getStore(db, id)!;
}
export function updateDraft(db: Db, id: string, design: StoreDesign) {
  db.prepare('UPDATE stores SET draft = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(design),
    new Date().toISOString(),
    id,
  );
  return getStore(db, id)!;
}
/** Guarda la versión publicada (calculada por publishProject) y conserva solo las últimas 8. */
export function savePublication(db: Db, id: string, version: StoreVersion) {
  db.exec('BEGIN');
  try {
    db.prepare(
      'INSERT INTO store_versions (id, store_id, design, published_at) VALUES (?, ?, ?, ?)',
    ).run(version.id, id, JSON.stringify(version.design), version.at);
    db.prepare('UPDATE stores SET published_version_id = ?, updated_at = ? WHERE id = ?').run(
      version.id,
      version.at,
      id,
    );
    db.prepare(
      `DELETE FROM store_versions WHERE store_id = ? AND id NOT IN (
         SELECT id FROM store_versions WHERE store_id = ? ORDER BY published_at DESC, rowid DESC LIMIT ?)`,
    ).run(id, id, MAX_VERSIONS);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return getStore(db, id)!;
}
export function unpublish(db: Db, id: string) {
  db.prepare('UPDATE stores SET published_version_id = NULL, updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    id,
  );
  return getStore(db, id)!;
}
export function deleteStore(db: Db, id: string) {
  db.prepare('DELETE FROM stores WHERE id = ?').run(id);
}
