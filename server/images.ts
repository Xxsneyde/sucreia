import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import sharp, { type OutputInfo } from 'sharp';
import type { Db } from './db.ts';
import { HttpError } from './http.ts';
import type { StoreDesign } from '../src/domain/studio.ts';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ACCOUNT_BYTES = 128 * 1024 * 1024;
export const imageId = (url: string) => /^\/api\/imagenes\/([a-f0-9]{64})\.webp$/.exec(url)?.[1];
interface ImageRow {
  id: string;
  owner_id: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
}
export function designImages(d: StoreDesign): string[] {
  return [d.logo, d.content.heroImage, d.content.storyImage, ...d.products.map((p) => p.image)];
}

/**
 * Fotos WebP inmutables. Con `dir` se guardan como archivos; sin él (Vercel), dentro de la base
 * (tabla image_data). La base siempre guarda la propiedad y los metadatos.
 */
export class ImageStorage {
  db: Db;
  dir: string | null;
  constructor(db: Db, dir: string | null) {
    this.db = db;
    this.dir = dir;
  }
  row(id: string) {
    return this.db.prepare('SELECT * FROM images WHERE id = ?').get<ImageRow>(id);
  }
  path(id: string) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(404, 'Imagen no encontrada.');
    return join(this.dir ?? '', `${id}.webp`);
  }
  private async hasFile(id: string) {
    if (this.dir) return existsSync(this.path(id));
    return !!(await this.db.prepare('SELECT 1 AS ok FROM image_data WHERE id = ?').get(id));
  }
  private async readFile(id: string): Promise<Buffer | undefined> {
    if (this.dir) return existsSync(this.path(id)) ? readFileSync(this.path(id)) : undefined;
    const row = await this.db.prepare('SELECT data FROM image_data WHERE id = ?').get(id);
    return row ? Buffer.from(row.data as Uint8Array) : undefined;
  }
  /** Todas las fotos usadas por tiendas (borradores y versiones), domiciliarios y entregas. */
  private async allReferences(publishedOnly: boolean) {
    const [designs, avatars, historical] = await Promise.all([
      publishedOnly
        ? this.db
            .prepare(
              'SELECT v.design AS design FROM stores s JOIN store_versions v ON v.id = s.published_version_id',
            )
            .all()
        : this.db
            .prepare(
              'SELECT draft AS design FROM stores UNION ALL SELECT design FROM store_versions',
            )
            .all(),
      this.db
        .prepare(
          `SELECT avatar FROM couriers WHERE avatar != '' ${publishedOnly ? 'AND approved=1' : ''}`,
        )
        .all(),
      publishedOnly
        ? Promise.resolve([])
        : this.db
            .prepare(
              "SELECT json_extract(payload,'$.courierAvatar') AS avatar FROM operations WHERE json_extract(payload,'$.courierAvatar') != ''",
            )
            .all(),
    ]);
    const counts = new Map<string, number>();
    const add = (url: string) => counts.set(url, (counts.get(url) ?? 0) + 1);
    for (const row of designs)
      for (const url of new Set(designImages(JSON.parse(row.design as string) as StoreDesign)))
        add(url);
    for (const row of [...avatars, ...historical]) add(row.avatar as string);
    return counts;
  }
  /** Busca referencias exactas; incluye versiones para poder restaurarlas sin perder fotos. */
  async references(url: string, publishedOnly = false): Promise<number> {
    return (await this.allReferences(publishedOnly)).get(url) ?? 0;
  }
  async list(owner: string) {
    const [counts, rows] = await Promise.all([
      this.allReferences(false),
      this.db
        .prepare('SELECT * FROM images WHERE owner_id = ? ORDER BY created_at DESC')
        .all<ImageRow>(owner),
    ]);
    return rows.map((row) => ({
      id: row.id,
      url: `/api/imagenes/${row.id}.webp`,
      bytes: row.bytes,
      width: row.width,
      height: row.height,
      createdAt: row.created_at,
      references: counts.get(`/api/imagenes/${row.id}.webp`) ?? 0,
    }));
  }
  async upload(owner: string, data: string) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    if (!match) throw new HttpError(400, 'Elige una imagen JPG, PNG o WebP válida.');
    if (match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4)
      throw new HttpError(413, 'La imagen debe pesar como máximo 8 MB.');
    const input = Buffer.from(match[2], 'base64');
    if (!input.length || input.length > MAX_IMAGE_BYTES || input.toString('base64') !== match[2])
      throw new HttpError(400, 'La imagen no es válida.');
    let output: { data: Buffer; info: OutputInfo };
    try {
      const pipeline = sharp(input, { limitInputPixels: 40_000_000, failOn: 'warning' });
      const metadata = await pipeline.metadata();
      if (metadata.format !== match[1] || (metadata.pages ?? 1) > 1)
        throw new Error('Formato inválido');
      output = await pipeline
        .rotate()
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new HttpError(
        400,
        'No se pudo leer la imagen. Usa un JPG, PNG o WebP estático de hasta 40 megapíxeles.',
      );
    }
    const id = createHash('sha256').update(owner).update('\0').update(output.data).digest('hex');
    if (!(await this.row(id))) {
      const quota = await this.db
        .prepare(
          'SELECT COUNT(*) AS count, COALESCE(SUM(bytes), 0) AS bytes FROM images WHERE owner_id = ?',
        )
        .get<{ count: number; bytes: number }>(owner);
      if (
        (quota?.count ?? 0) >= 500 ||
        (quota?.bytes ?? 0) + output.data.length > MAX_ACCOUNT_BYTES
      )
        throw new HttpError(
          409,
          'Tu biblioteca está llena. Elimina imágenes que ya no uses (máximo 500 imágenes o 128 MB).',
        );
    }
    const insertRow = (db: Db) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO images (id, owner_id, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          id,
          owner,
          output.data.length,
          output.info.width,
          output.info.height,
          new Date().toISOString(),
        );
    if (this.dir) {
      mkdirSync(this.dir, { recursive: true });
      // Escribe antes de registrar la referencia: una caída no deja imágenes guardadas sin archivo.
      if (!existsSync(this.path(id))) {
        const temporary = join(this.dir, `${id}-${randomUUID()}.tmp`);
        try {
          writeFileSync(temporary, output.data, { flag: 'wx', mode: 0o600 });
          renameSync(temporary, this.path(id));
        } finally {
          if (existsSync(temporary)) unlinkSync(temporary);
        }
      }
      await insertRow(this.db);
    } else
      await this.db.transaction(async (tx) => {
        await insertRow(tx);
        await tx
          .prepare('INSERT OR IGNORE INTO image_data (id, data) VALUES (?, ?)')
          .run(id, output.data);
      });
    return {
      id,
      url: `/api/imagenes/${id}.webp`,
      bytes: output.data.length,
      width: output.info.width,
      height: output.info.height,
    };
  }
  async externalize(owner: string, design: StoreDesign): Promise<StoreDesign> {
    const copy = structuredClone(design);
    const convert = async (url: string) => {
      if (url.startsWith('data:')) return (await this.upload(owner, url)).url;
      const id = imageId(url);
      if (id && (await this.row(id))?.owner_id !== owner)
        throw new HttpError(400, 'Esta imagen no pertenece a tu cuenta. Súbela a tu biblioteca.');
      if (id && !(await this.hasFile(id)))
        throw new HttpError(400, 'Falta el archivo de una imagen. Vuelve a subirla.');
      return url;
    };
    copy.logo = await convert(copy.logo);
    copy.content.heroImage = await convert(copy.content.heroImage);
    copy.content.storyImage = await convert(copy.content.storyImage);
    for (const product of copy.products) product.image = await convert(product.image);
    // Revalidar tras la conversión: no guardar rutas borradas durante una subida.
    for (const url of designImages(copy)) {
      const id = imageId(url);
      if (id && ((await this.row(id))?.owner_id !== owner || !(await this.hasFile(id))))
        throw new HttpError(400, 'Una imagen ya no está disponible. Vuelve a subirla.');
    }
    return copy;
  }
  async remove(owner: string, id: string) {
    if ((await this.row(id))?.owner_id !== owner) throw new HttpError(404, 'Imagen no encontrada.');
    if (await this.references(`/api/imagenes/${id}.webp`))
      throw new HttpError(
        409,
        'Esta imagen está en un borrador, publicación o versión guardada. Quitarla de la biblioteca rompería esa tienda.',
      );
    if (this.dir && existsSync(this.path(id))) unlinkSync(this.path(id));
    await this.db.prepare('DELETE FROM images WHERE id = ?').run(id);
  }
  /** Devuelve la foto y si es pública (publicada): las públicas se pueden guardar en caché. */
  async read(id: string, userId?: string): Promise<{ data: Buffer; isPublic: boolean }> {
    const row = await this.row(id);
    if (!row) throw new HttpError(404, 'Imagen no encontrada.');
    const isPublic = (await this.references(`/api/imagenes/${id}.webp`, true)) > 0;
    let allowed = isPublic || row.owner_id === userId;
    if (!allowed && userId) {
      const [reviewer, participant] = await Promise.all([
        this.db
          .prepare(
            "SELECT 1 AS ok FROM users WHERE id=? AND role='admin' AND EXISTS(SELECT 1 FROM couriers WHERE avatar=?)",
          )
          .get(userId, `/api/imagenes/${id}.webp`),
        this.db
          .prepare(
            "SELECT 1 AS ok FROM operations WHERE json_extract(payload,'$.courierAvatar')=? AND (client_id=? OR json_extract(payload,'$.ownerId')=? OR json_extract(payload,'$.courierId')=?) LIMIT 1",
          )
          .get(`/api/imagenes/${id}.webp`, userId, userId, userId),
      ]);
      allowed = !!reviewer || !!participant;
    }
    const data = allowed ? await this.readFile(id) : undefined;
    if (!data) throw new HttpError(404, 'Imagen no encontrada.');
    return { data, isPublic };
  }
}

/** Al arrancar: migración por tienda. Si algo falla, conserva TODO el JSON original de esa tienda. */
export async function migrateImages(storage: ImageStorage) {
  const rows = await storage.db
    .prepare(
      "SELECT id, owner_id, draft FROM stores WHERE draft LIKE '%data:image/%' OR id IN (SELECT store_id FROM store_versions WHERE design LIKE '%data:image/%')",
    )
    .all();
  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    const versions = await storage.db
      .prepare('SELECT id, design FROM store_versions WHERE store_id = ?')
      .all(row.id);
    try {
      const draft = await storage.externalize(
        row.owner_id as string,
        JSON.parse(row.draft as string),
      );
      const converted: { id: unknown; design: StoreDesign }[] = [];
      for (const version of versions)
        converted.push({
          id: version.id,
          design: await storage.externalize(
            row.owner_id as string,
            JSON.parse(version.design as string),
          ),
        });
      await storage.db.transaction(async (tx) => {
        await tx
          .prepare('UPDATE stores SET draft = ? WHERE id = ?')
          .run(JSON.stringify(draft), row.id);
        for (const version of converted)
          await tx
            .prepare('UPDATE store_versions SET design = ? WHERE id = ?')
            .run(JSON.stringify(version.design), version.id);
      });
      migrated++;
    } catch {
      skipped++;
    }
  }
  return { migrated, skipped };
}
