// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { createHash as createHash4, randomUUID as randomUUID4 } from "node:crypto";
import {
  existsSync,
  mkdirSync as mkdirSync2,
  readFileSync as readFileSync2,
  renameSync,
  unlinkSync as unlinkSync2,
  writeFileSync as writeFileSync2
} from "node:fs";
import { join as join2 } from "node:path";
import sharp from "sharp";
var MAX_IMAGE_BYTES = 8 * 1024 * 1024;
var MAX_ACCOUNT_BYTES = 128 * 1024 * 1024;
var imageId = (url) => /^\/api\/imagenes\/([a-f0-9]{64})\.webp$/.exec(url)?.[1];
function designImages(d) {
  return [
    d.logo,
    d.content.heroImage,
    d.content.storyImage,
    ...d.products.flatMap((p) => [p.image, ...p.gallery ?? []])
  ];
}
var THUMB_SIZE = 480;
var encodeMain = (s) => s.resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 75, effort: 6, smartSubsample: true });
var encodeThumb = (s) => s.resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: "inside", withoutEnlargement: true }).webp({ quality: 72, effort: 6, smartSubsample: true });
var PUBLIC_CACHE_MS = 2e4;
var ImageStorage = class {
  db;
  dir;
  constructor(db2, dir) {
    this.db = db2;
    this.dir = dir;
  }
  row(id) {
    return this.db.prepare("SELECT * FROM images WHERE id = ?").get(id);
  }
  path(id, thumb = false) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(404, "Imagen no encontrada.");
    return join2(this.dir ?? "", thumb ? `${id}-${THUMB_SIZE}.webp` : `${id}.webp`);
  }
  // Fotos públicas (las de negocios publicados y domiciliarios aprobados). Calcularlas exige leer
  // todos los diseños publicados: se guarda unos segundos para no hacerlo en CADA foto pedida.
  publicCache = null;
  /** Olvida la lista de fotos públicas (al publicar o retirar un negocio en este proceso). */
  invalidate() {
    this.publicCache = null;
  }
  async publicReferences(fresh = false) {
    const now3 = Date.now();
    if (fresh || !this.publicCache || now3 - this.publicCache.at > PUBLIC_CACHE_MS)
      this.publicCache = { at: now3, counts: await this.allReferences(true) };
    return this.publicCache.counts;
  }
  /** ¿La foto es pública? Un «no» se confirma con datos frescos (pudo publicarse hace un momento). */
  async isPublic(id) {
    const url = `/api/imagenes/${id}.webp`;
    if (((await this.publicReferences()).get(url) ?? 0) > 0) return true;
    return ((await this.publicReferences(true)).get(url) ?? 0) > 0;
  }
  /** Miniatura guardada; si la foto es anterior a las miniaturas, se crea ahora y se guarda. */
  async readThumb(id) {
    if (this.dir) {
      if (existsSync(this.path(id, true))) return readFileSync2(this.path(id, true));
    } else {
      const row = await this.db.prepare("SELECT data FROM image_thumbs WHERE id = ?").get(id);
      if (row) return Buffer.from(row.data);
    }
    const main = await this.readFile(id);
    if (!main) return void 0;
    const thumb = await encodeThumb(sharp(main)).toBuffer();
    await this.saveThumb(id, thumb);
    return thumb;
  }
  async saveThumb(id, data) {
    if (this.dir) {
      mkdirSync2(this.dir, { recursive: true });
      if (!existsSync(this.path(id, true))) {
        const temporary = join2(this.dir, `${id}-${randomUUID4()}.tmp`);
        try {
          writeFileSync2(temporary, data, { flag: "wx", mode: 384 });
          renameSync(temporary, this.path(id, true));
        } finally {
          if (existsSync(temporary)) unlinkSync2(temporary);
        }
      }
    } else
      await this.db.prepare("INSERT OR IGNORE INTO image_thumbs (id, data) VALUES (?, ?)").run(id, data);
  }
  async hasFile(id) {
    if (this.dir) return existsSync(this.path(id));
    return !!await this.db.prepare("SELECT 1 AS ok FROM image_data WHERE id = ?").get(id);
  }
  async readFile(id) {
    if (this.dir) return existsSync(this.path(id)) ? readFileSync2(this.path(id)) : void 0;
    const row = await this.db.prepare("SELECT data FROM image_data WHERE id = ?").get(id);
    return row ? Buffer.from(row.data) : void 0;
  }
  /** Todas las fotos usadas por tiendas (borradores y versiones), domiciliarios y entregas. */
  async allReferences(publishedOnly) {
    const [designs, avatars, historical] = await Promise.all([
      publishedOnly ? this.db.prepare(
        "SELECT v.design AS design FROM stores s JOIN store_versions v ON v.id = s.published_version_id"
      ).all() : this.db.prepare(
        "SELECT draft AS design FROM stores UNION ALL SELECT review_design AS design FROM stores WHERE review_design IS NOT NULL UNION ALL SELECT design FROM store_versions"
      ).all(),
      this.db.prepare(
        `SELECT avatar FROM couriers WHERE avatar != '' ${publishedOnly ? "AND approved=1" : ""}`
      ).all(),
      publishedOnly ? Promise.resolve([]) : this.db.prepare(
        "SELECT json_extract(payload,'$.courierAvatar') AS avatar FROM operations WHERE json_extract(payload,'$.courierAvatar') != ''"
      ).all()
    ]);
    const counts = /* @__PURE__ */ new Map();
    const add = (url) => counts.set(url, (counts.get(url) ?? 0) + 1);
    for (const row of designs)
      for (const url of new Set(designImages(JSON.parse(row.design))))
        add(url);
    for (const row of [...avatars, ...historical]) add(row.avatar);
    return counts;
  }
  /** Busca referencias exactas; incluye versiones para poder restaurarlas sin perder fotos. */
  async references(url, publishedOnly = false) {
    return (await this.allReferences(publishedOnly)).get(url) ?? 0;
  }
  async list(owner) {
    const [counts, rows] = await Promise.all([
      this.allReferences(false),
      this.db.prepare("SELECT * FROM images WHERE owner_id = ? ORDER BY created_at DESC").all(owner)
    ]);
    return rows.map((row) => ({
      id: row.id,
      url: `/api/imagenes/${row.id}.webp`,
      bytes: row.bytes,
      width: row.width,
      height: row.height,
      createdAt: row.created_at,
      references: counts.get(`/api/imagenes/${row.id}.webp`) ?? 0
    }));
  }
  async upload(owner, data) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    if (!match) throw new HttpError(400, "Elige una imagen JPG, PNG o WebP v\xE1lida.");
    if (match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4)
      throw new HttpError(413, "La imagen debe pesar como m\xE1ximo 8 MB.");
    const input = Buffer.from(match[2], "base64");
    if (!input.length || input.length > MAX_IMAGE_BYTES || input.toString("base64") !== match[2])
      throw new HttpError(400, "La imagen no es v\xE1lida.");
    let output;
    try {
      const pipeline = sharp(input, { limitInputPixels: 4e7, failOn: "warning" });
      const metadata = await pipeline.metadata();
      if (metadata.format !== match[1] || (metadata.pages ?? 1) > 1)
        throw new Error("Formato inv\xE1lido");
      output = await encodeMain(pipeline.rotate()).toBuffer({ resolveWithObject: true });
    } catch {
      throw new HttpError(
        400,
        "No se pudo leer la imagen. Usa un JPG, PNG o WebP est\xE1tico de hasta 40 megap\xEDxeles."
      );
    }
    const id = createHash4("sha256").update(owner).update("\0").update(output.data).digest("hex");
    if (!await this.row(id)) {
      const quota = await this.db.prepare(
        "SELECT COUNT(*) AS count, COALESCE(SUM(bytes), 0) AS bytes FROM images WHERE owner_id = ?"
      ).get(owner);
      if ((quota?.count ?? 0) >= 500 || (quota?.bytes ?? 0) + output.data.length > MAX_ACCOUNT_BYTES)
        throw new HttpError(
          409,
          "Tu biblioteca est\xE1 llena. Elimina im\xE1genes que ya no uses (m\xE1ximo 500 im\xE1genes o 128 MB)."
        );
    }
    const insertRow = (db2) => db2.prepare(
      "INSERT OR IGNORE INTO images (id, owner_id, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      id,
      owner,
      output.data.length,
      output.info.width,
      output.info.height,
      (/* @__PURE__ */ new Date()).toISOString()
    );
    if (this.dir) {
      mkdirSync2(this.dir, { recursive: true });
      if (!existsSync(this.path(id))) {
        const temporary = join2(this.dir, `${id}-${randomUUID4()}.tmp`);
        try {
          writeFileSync2(temporary, output.data, { flag: "wx", mode: 384 });
          renameSync(temporary, this.path(id));
        } finally {
          if (existsSync(temporary)) unlinkSync2(temporary);
        }
      }
      await insertRow(this.db);
    } else
      await this.db.transaction(async (tx) => {
        await insertRow(tx);
        await tx.prepare("INSERT OR IGNORE INTO image_data (id, data) VALUES (?, ?)").run(id, output.data);
      });
    try {
      await this.saveThumb(id, await encodeThumb(sharp(output.data)).toBuffer());
    } catch {
    }
    return {
      id,
      url: `/api/imagenes/${id}.webp`,
      bytes: output.data.length,
      width: output.info.width,
      height: output.info.height
    };
  }
  async externalize(owner, design) {
    const copy = structuredClone(design);
    const convert = async (url) => {
      if (url.startsWith("data:")) return (await this.upload(owner, url)).url;
      const id = imageId(url);
      if (id && (await this.row(id))?.owner_id !== owner)
        throw new HttpError(400, "Esta imagen no pertenece a tu cuenta. S\xFAbela a tu biblioteca.");
      if (id && !await this.hasFile(id))
        throw new HttpError(400, "Falta el archivo de una imagen. Vuelve a subirla.");
      return url;
    };
    copy.logo = await convert(copy.logo);
    copy.content.heroImage = await convert(copy.content.heroImage);
    copy.content.storyImage = await convert(copy.content.storyImage);
    for (const product of copy.products) product.image = await convert(product.image);
    for (const url of designImages(copy)) {
      const id = imageId(url);
      if (id && ((await this.row(id))?.owner_id !== owner || !await this.hasFile(id)))
        throw new HttpError(400, "Una imagen ya no est\xE1 disponible. Vuelve a subirla.");
    }
    return copy;
  }
  async remove(owner, id) {
    if ((await this.row(id))?.owner_id !== owner) throw new HttpError(404, "Imagen no encontrada.");
    if (await this.references(`/api/imagenes/${id}.webp`))
      throw new HttpError(
        409,
        "Esta imagen est\xE1 en un borrador, publicaci\xF3n o versi\xF3n guardada. Quitarla de la biblioteca romper\xEDa esa tienda."
      );
    if (this.dir && existsSync(this.path(id))) unlinkSync2(this.path(id));
    if (this.dir && existsSync(this.path(id, true))) unlinkSync2(this.path(id, true));
    await this.db.prepare("DELETE FROM images WHERE id = ?").run(id);
  }
  /** Devuelve la foto y si es pública (publicada): las públicas se pueden guardar en caché. */
  async read(id, userId, thumb = false) {
    const row = await this.row(id);
    if (!row) throw new HttpError(404, "Imagen no encontrada.");
    const isPublic = row.owner_id === userId ? ((await this.publicReferences()).get(`/api/imagenes/${id}.webp`) ?? 0) > 0 : await this.isPublic(id);
    let allowed = isPublic || row.owner_id === userId;
    if (!allowed && userId) {
      const [reviewer, participant] = await Promise.all([
        this.db.prepare(
          "SELECT 1 AS ok FROM users WHERE id=? AND role='admin' AND EXISTS(SELECT 1 FROM couriers WHERE avatar=?)"
        ).get(userId, `/api/imagenes/${id}.webp`),
        this.db.prepare(
          "SELECT 1 AS ok FROM operations WHERE json_extract(payload,'$.courierAvatar')=? AND (client_id=? OR json_extract(payload,'$.ownerId')=? OR json_extract(payload,'$.courierId')=?) LIMIT 1"
        ).get(`/api/imagenes/${id}.webp`, userId, userId, userId)
      ]);
      allowed = !!reviewer || !!participant;
    }
    const data = allowed ? await (thumb ? this.readThumb(id) : this.readFile(id)) : void 0;
    if (!data) throw new HttpError(404, "Imagen no encontrada.");
    return { data, isPublic };
  }
};
async function migrateImages(storage) {
  const rows = await storage.db.prepare(
    "SELECT id, owner_id, draft FROM stores WHERE draft LIKE '%data:image/%' OR id IN (SELECT store_id FROM store_versions WHERE design LIKE '%data:image/%')"
  ).all();
  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    const versions = await storage.db.prepare("SELECT id, design FROM store_versions WHERE store_id = ?").all(row.id);
    try {
      const draft = await storage.externalize(
        row.owner_id,
        JSON.parse(row.draft)
      );
      const converted = [];
      for (const version of versions)
        converted.push({
          id: version.id,
          design: await storage.externalize(
            row.owner_id,
            JSON.parse(version.design)
          )
        });
      await storage.db.transaction(async (tx) => {
        await tx.prepare("UPDATE stores SET draft = ? WHERE id = ?").run(JSON.stringify(draft), row.id);
        for (const version of converted)
          await tx.prepare("UPDATE store_versions SET design = ? WHERE id = ?").run(JSON.stringify(version.design), version.id);
      });
      migrated++;
    } catch {
      skipped++;
    }
  }
  return { migrated, skipped };
}
