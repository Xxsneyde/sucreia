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
  /** Revisión del registro por la administración: pending, approved o rejected. */
  registration: NonNullable<StoreProject['registration']>;
  /** Diseño enviado a revisión (se publica cuando la administración aprueba el registro). */
  review_design: string | null;
  created_at: string;
  updated_at: string;
}
interface VersionRow {
  id: string;
  design: string;
  published_at: string;
}

function toVersion(v: VersionRow): StoreVersion {
  return { id: v.id, at: v.published_at, design: JSON.parse(v.design) };
}
function toProject(row: StoreRow, all: StoreVersion[]): StoreProject & { ownerId: string } {
  return {
    id: row.id,
    ownerId: row.owner_id,
    registration: row.registration,
    publicationRequested: !!row.review_design,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    draft: JSON.parse(row.draft),
    published: all.find((v) => v.id === row.published_version_id) ?? null,
    versions: all,
  };
}
/** Convierte filas de tiendas en proyectos con UNA consulta para todas sus versiones. */
async function withVersions(db: Db, rows: StoreRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const found = await db
    .prepare(
      `SELECT id, store_id, design, published_at FROM store_versions WHERE store_id IN (${ids.map(() => '?').join(',')}) ORDER BY published_at DESC, rowid DESC`,
    )
    .all<VersionRow & { store_id: string }>(...ids);
  const byStore = new Map<string, StoreVersion[]>();
  for (const v of found) {
    const list = byStore.get(v.store_id) ?? [];
    list.push(toVersion(v));
    byStore.set(v.store_id, list);
  }
  return rows.map((r) => toProject(r, byStore.get(r.id) ?? []));
}

export async function getStore(db: Db, id: string) {
  const row = await db.prepare('SELECT * FROM stores WHERE id = ?').get<StoreRow>(id);
  return row ? (await withVersions(db, [row]))[0] : undefined;
}
export async function listStoresByOwner(db: Db, ownerId: string) {
  const rows = await db
    .prepare('SELECT * FROM stores WHERE owner_id = ? ORDER BY updated_at DESC')
    .all<StoreRow>(ownerId);
  return withVersions(db, rows);
}
export async function listPublishedStores(db: Db) {
  const rows = await db
    .prepare('SELECT * FROM stores WHERE published_version_id IS NOT NULL ORDER BY updated_at DESC')
    .all<StoreRow>();
  return withVersions(db, rows);
}
export async function countStoresByOwner(db: Db, ownerId: string): Promise<number> {
  return (
    (
      await db
        .prepare('SELECT COUNT(*) AS n FROM stores WHERE owner_id = ?')
        .get<{ n: number }>(ownerId)
    )?.n ?? 0
  );
}

/** Crea el negocio; `termsVersion` registra qué términos aceptó el dueño y cuándo. */
export async function createStore(
  db: Db,
  ownerId: string,
  design: StoreDesign,
  termsVersion?: string,
) {
  const id = `tienda-${randomUUID()}`;
  const now = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO stores (id, owner_id, draft, created_at, updated_at, terms_version, terms_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      id,
      ownerId,
      JSON.stringify(design),
      now,
      now,
      termsVersion ?? null,
      termsVersion ? now : null,
    );
  return (await getStore(db, id))!;
}
export async function updateDraft(db: Db, id: string, design: StoreDesign) {
  await db
    .prepare('UPDATE stores SET draft = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(design), new Date().toISOString(), id);
  return (await getStore(db, id))!;
}
/** Guarda la versión publicada (calculada por publishProject) y conserva solo las últimas 8. */
export async function savePublication(db: Db, id: string, version: StoreVersion) {
  await db.transaction((tx) => writePublication(tx, id, version));
  return (await getStore(db, id))!;
}
/** Escribe la versión publicada dentro de una transacción ya abierta (también al aprobar). */
export async function writePublication(tx: Db, id: string, version: StoreVersion) {
  await tx
    .prepare('INSERT INTO store_versions (id, store_id, design, published_at) VALUES (?, ?, ?, ?)')
    .run(version.id, id, JSON.stringify(version.design), version.at);
  await tx
    .prepare('UPDATE stores SET published_version_id = ?, updated_at = ? WHERE id = ?')
    .run(version.id, version.at, id);
  await tx
    .prepare(
      `DELETE FROM store_versions WHERE store_id = ? AND id NOT IN (
         SELECT id FROM store_versions WHERE store_id = ? ORDER BY published_at DESC, rowid DESC LIMIT ?)`,
    )
    .run(id, id, MAX_VERSIONS);
}
export async function unpublish(db: Db, id: string) {
  await db
    .prepare(
      'UPDATE stores SET published_version_id = NULL, review_design=NULL, updated_at = ? WHERE id = ?',
    )
    .run(new Date().toISOString(), id);
  return (await getStore(db, id))!;
}
export async function deleteStore(db: Db, id: string) {
  await db.prepare('DELETE FROM stores WHERE id = ?').run(id);
}
