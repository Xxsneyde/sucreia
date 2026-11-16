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

/** Archivos WebP inmutables; SQLite solo almacena referencias y metadatos. */
export class ImageStorage {
  db: Db;
  dir: string;
  constructor(db: Db, dir: string) {
    this.db = db;
    this.dir = dir;
  }
  row(id: string) {
    return this.db.prepare('SELECT * FROM images WHERE id = ?').get(id) as ImageRow | undefined;
  }
  path(id: string) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(404, 'Imagen no encontrada.');
    return join(this.dir, `${id}.webp`);
  }
  /** Busca referencias exactas; incluye versiones para poder restaurarlas sin perder fotos. */
  references(url: string, publishedOnly = false): number {
    const rows = publishedOnly
      ? this.db
          .prepare(
            'SELECT v.design AS design FROM stores s JOIN store_versions v ON v.id = s.published_version_id',
          )
          .all()
      : this.db
          .prepare('SELECT draft AS design FROM stores UNION ALL SELECT design FROM store_versions')
          .all();
    const avatarCount = (
      this.db
        .prepare(
          `SELECT COUNT(*) AS n FROM couriers WHERE avatar=? ${publishedOnly ? 'AND approved=1' : ''}`,
        )
        .get(url) as { n: number }
    ).n;
    const historical = publishedOnly
      ? 0
      : Number(
          this.db
            .prepare(
              "SELECT COUNT(*) AS n FROM operations WHERE json_extract(payload,'$.courierAvatar')=?",
            )
            .get(url)!.n,
        );
    return (
      historical +
      avatarCount +
      rows.reduce(
        (n, row) =>
          n + (designImages(JSON.parse(row.design as string) as StoreDesign).includes(url) ? 1 : 0),
        0,
      )
    );
  }
  list(owner: string) {
    const counts = new Map<string, number>();
    for (const row of this.db
      .prepare('SELECT draft AS design FROM stores UNION ALL SELECT design FROM store_versions')
      .all())
      for (const url of new Set(designImages(JSON.parse(row.design as string))))
        counts.set(url, (counts.get(url) ?? 0) + 1);
    for (const row of this.db.prepare("SELECT avatar FROM couriers WHERE avatar != ''").all())
      counts.set(row.avatar as string, (counts.get(row.avatar as string) ?? 0) + 1);
    for (const row of this.db
      .prepare(
        "SELECT json_extract(payload,'$.courierAvatar') AS avatar FROM operations WHERE json_extract(payload,'$.courierAvatar') != ''",
      )
      .all())
      counts.set(row.avatar as string, (counts.get(row.avatar as string) ?? 0) + 1);
    return (
      this.db
        .prepare('SELECT * FROM images WHERE owner_id = ? ORDER BY created_at DESC')
        .all(owner) as unknown as ImageRow[]
    ).map((row) => ({
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
    if (!this.row(id)) {
      const quota = this.db
        .prepare(
          'SELECT COUNT(*) AS count, COALESCE(SUM(bytes), 0) AS bytes FROM images WHERE owner_id = ?',
        )
        .get(owner) as { count: number; bytes: number };
      if (quota.count >= 500 || quota.bytes + output.data.length > MAX_ACCOUNT_BYTES)
        throw new HttpError(
          409,
          'Tu biblioteca está llena. Elimina imágenes que ya no uses (máximo 500 imágenes o 128 MB).',
        );
    }
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
    this.db
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
      if (id && this.row(id)?.owner_id !== owner)
        throw new HttpError(400, 'Esta imagen no pertenece a tu cuenta. Súbela a tu biblioteca.');
      if (id && !existsSync(this.path(id)))
        throw new HttpError(400, 'Falta el archivo de una imagen. Vuelve a subirla.');
      return url;
    };
    copy.logo = await convert(copy.logo);
    copy.content.heroImage = await convert(copy.content.heroImage);
    copy.content.storyImage = await convert(copy.content.storyImage);
    for (const product of copy.products) product.image = await convert(product.image);
    // Revalidar de forma síncrona tras la conversión: no guardar rutas borradas durante una subida.
    for (const url of designImages(copy)) {
      const id = imageId(url);
      if (id && (this.row(id)?.owner_id !== owner || !existsSync(this.path(id))))
        throw new HttpError(400, 'Una imagen ya no está disponible. Vuelve a subirla.');
    }
    return copy;
  }
  remove(owner: string, id: string) {
    if (this.row(id)?.owner_id !== owner) throw new HttpError(404, 'Imagen no encontrada.');
    if (this.references(`/api/imagenes/${id}.webp`))
      throw new HttpError(
        409,
        'Esta imagen está en un borrador, publicación o versión guardada. Quitarla de la biblioteca rompería esa tienda.',
      );
    if (existsSync(this.path(id))) unlinkSync(this.path(id));
    this.db.prepare('DELETE FROM images WHERE id = ?').run(id);
  }
  read(id: string, userId?: string) {
    const row = this.row(id);
    const reviewer =
      userId &&
      this.db
        .prepare(
          "SELECT 1 FROM users WHERE id=? AND role='admin' AND EXISTS(SELECT 1 FROM couriers WHERE avatar=?)",
        )
        .get(userId, `/api/imagenes/${id}.webp`);
    const participant =
      userId &&
      this.db
        .prepare(
          "SELECT 1 FROM operations WHERE json_extract(payload,'$.courierAvatar')=? AND (client_id=? OR json_extract(payload,'$.ownerId')=? OR json_extract(payload,'$.courierId')=?) LIMIT 1",
        )
        .get(`/api/imagenes/${id}.webp`, userId, userId, userId);
    if (
      !row ||
      (row.owner_id !== userId &&
        !participant &&
        !reviewer &&
        !this.references(`/api/imagenes/${id}.webp`, true))
    )
      throw new HttpError(404, 'Imagen no encontrada.');
    if (!existsSync(this.path(id))) throw new HttpError(404, 'Imagen no encontrada.');
    return readFileSync(this.path(id));
  }
}

/** Al arrancar: migración por tienda. Si algo falla, conserva TODO el JSON original de esa tienda. */
export async function migrateImages(storage: ImageStorage) {
  const rows = storage.db.prepare('SELECT id, owner_id, draft FROM stores').all();
  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    const versions = storage.db
      .prepare('SELECT id, design FROM store_versions WHERE store_id = ?')
      .all(row.id);
    if (
      ![row.draft, ...versions.map((v) => v.design)].some((json) =>
        String(json).includes('data:image/'),
      )
    )
      continue;
    try {
      const draft = await storage.externalize(
        row.owner_id as string,
        JSON.parse(row.draft as string),
      );
      const converted = [];
      for (const version of versions)
        converted.push({
          id: version.id,
          design: await storage.externalize(
            row.owner_id as string,
            JSON.parse(version.design as string),
          ),
        });
      storage.db.exec('BEGIN');
      try {
        storage.db
          .prepare('UPDATE stores SET draft = ? WHERE id = ?')
          .run(JSON.stringify(draft), row.id);
        for (const version of converted)
          storage.db
            .prepare('UPDATE store_versions SET design = ? WHERE id = ?')
            .run(JSON.stringify(version.design), version.id);
        storage.db.exec('COMMIT');
      } catch (error) {
        storage.db.exec('ROLLBACK');
        throw error;
      }
      migrated++;
    } catch {
      skipped++;
    }
  }
  return { migrated, skipped };
}
