// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { randomUUID as randomUUID5 } from "node:crypto";
var MAX_VERSIONS = 8;
function toVersion(v) {
  return { id: v.id, at: v.published_at, design: JSON.parse(v.design) };
}
function toProject(row, all) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    registration: row.registration,
    publicationRequested: !!row.review_design,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    draft: JSON.parse(row.draft),
    published: all.find((v) => v.id === row.published_version_id) ?? null,
    versions: all
  };
}
async function withVersions(db2, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const found = await db2.prepare(
    `SELECT id, store_id, design, published_at FROM store_versions WHERE store_id IN (${ids.map(() => "?").join(",")}) ORDER BY published_at DESC, rowid DESC`
  ).all(...ids);
  const byStore = /* @__PURE__ */ new Map();
  for (const v of found) {
    const list = byStore.get(v.store_id) ?? [];
    list.push(toVersion(v));
    byStore.set(v.store_id, list);
  }
  return rows.map((r) => toProject(r, byStore.get(r.id) ?? []));
}
async function getStore(db2, id) {
  const row = await db2.prepare("SELECT * FROM stores WHERE id = ?").get(id);
  return row ? (await withVersions(db2, [row]))[0] : void 0;
}
async function listStoresByOwner(db2, ownerId) {
  const rows = await db2.prepare("SELECT * FROM stores WHERE owner_id = ? ORDER BY updated_at DESC").all(ownerId);
  return withVersions(db2, rows);
}
async function listPublishedStores(db2) {
  const rows = await db2.prepare("SELECT * FROM stores WHERE published_version_id IS NOT NULL ORDER BY updated_at DESC").all();
  return withVersions(db2, rows);
}
async function countStoresByOwner(db2, ownerId) {
  return (await db2.prepare("SELECT COUNT(*) AS n FROM stores WHERE owner_id = ?").get(ownerId))?.n ?? 0;
}
async function createStore(db2, ownerId, design, termsVersion) {
  const id = `tienda-${randomUUID5()}`;
  const now3 = (/* @__PURE__ */ new Date()).toISOString();
  await db2.prepare(
    "INSERT INTO stores (id, owner_id, draft, created_at, updated_at, terms_version, terms_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    ownerId,
    JSON.stringify(design),
    now3,
    now3,
    termsVersion ?? null,
    termsVersion ? now3 : null
  );
  return await getStore(db2, id);
}
async function updateDraft(db2, id, design) {
  await db2.prepare("UPDATE stores SET draft = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(design), (/* @__PURE__ */ new Date()).toISOString(), id);
  return await getStore(db2, id);
}
async function savePublication(db2, id, version) {
  await db2.transaction((tx) => writePublication(tx, id, version));
  return await getStore(db2, id);
}
async function writePublication(tx, id, version) {
  await tx.prepare("INSERT INTO store_versions (id, store_id, design, published_at) VALUES (?, ?, ?, ?)").run(version.id, id, JSON.stringify(version.design), version.at);
  await tx.prepare("UPDATE stores SET published_version_id = ?, updated_at = ? WHERE id = ?").run(version.id, version.at, id);
  await tx.prepare(
    `DELETE FROM store_versions WHERE store_id = ? AND id NOT IN (
         SELECT id FROM store_versions WHERE store_id = ? ORDER BY published_at DESC, rowid DESC LIMIT ?)`
  ).run(id, id, MAX_VERSIONS);
}
async function unpublish(db2, id) {
  await db2.prepare(
    "UPDATE stores SET published_version_id = NULL, review_design=NULL, updated_at = ? WHERE id = ?"
  ).run((/* @__PURE__ */ new Date()).toISOString(), id);
  return await getStore(db2, id);
}
async function deleteStore(db2, id) {
  await db2.prepare("DELETE FROM stores WHERE id = ?").run(id);
}
