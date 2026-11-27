// PQRS (peticiones, quejas, reclamos y sugerencias) como conversación entre la persona y la
// administración. Se montan dentro de /api/plataforma.
import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import type { Db } from '../db.ts';
import { HttpError } from '../http.ts';
import { requireUser, type User } from '../auth.ts';
import { notify, string } from '../platform.ts';
import {
  pqrsFileMaxBytes,
  pqrsFileMimes,
  pqrsKinds,
  radicado,
  type PqrsCase,
  type PqrsFile,
  type PqrsKind,
  type PqrsMessage,
  type PqrsStatus,
} from '../../src/domain/platform.ts';

const ADMIN_NAME = 'Administración de SucreIA';

/** Firma de los primeros bytes: el archivo debe ser de verdad lo que dice su tipo. */
const signatures: Record<(typeof pqrsFileMimes)[number], (b: Buffer) => boolean> = {
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/jpeg': (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  'image/webp': (b) =>
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP',
};
interface Upload {
  name: string;
  mime: string;
  base64: string;
  size: number;
}
/** Adjunto opcional ({ name, data: data URL }); null si no viene. */
function readFile(raw: unknown): Upload | null {
  if (!raw) return null;
  const f = raw as { name?: unknown; data?: unknown };
  const name = string(f.name, 160, 'el nombre del archivo');
  const match = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(f.data ?? ''));
  if (!match || !(pqrsFileMimes as readonly string[]).includes(match[1]))
    throw new HttpError(400, 'Adjunta una foto (JPG, PNG o WEBP) o un PDF.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > pqrsFileMaxBytes) throw new HttpError(413, 'El archivo supera los 5 MB.');
  if (!signatures[match[1] as keyof typeof signatures](bytes))
    throw new HttpError(400, 'El archivo no es una foto o un PDF válido.');
  return { name, mime: match[1], base64: match[2], size: bytes.length };
}

export function pqrsRoutes(db: Db) {
  const r = Router();
  const now = () => new Date().toISOString();

  /** Casos con sus mensajes y adjuntos (tres consultas en total). */
  async function casesWhere(where: string, ...args: unknown[]): Promise<PqrsCase[]> {
    const rows = await db
      .prepare(
        `SELECT p.id,p.kind,p.message,p.status,p.created_at,p.updated_at,p.closed_at,p.user_id,u.name,u.email,u.role FROM pqrs p JOIN users u ON u.id=p.user_id ${where} ORDER BY p.created_at DESC LIMIT 500`,
      )
      .all(...args);
    if (!rows.length) return [];
    const ids = rows.map((row) => String(row.id));
    const marks = ids.map(() => '?').join(',');
    const messages = await db
      .prepare(
        `SELECT m.id,m.pqrs_id,m.from_admin,m.body,m.created_at,u.name FROM pqrs_messages m JOIN users u ON u.id=m.author_id WHERE m.pqrs_id IN (${marks}) ORDER BY m.created_at`,
      )
      .all(...ids);
    const fileRows = await db
      .prepare(
        `SELECT id,pqrs_id,message_id,name,mime,size FROM pqrs_files WHERE pqrs_id IN (${marks}) ORDER BY created_at`,
      )
      .all(...ids);
    const filesByCase = new Map<string, PqrsFile[]>();
    for (const f of fileRows) {
      const list = filesByCase.get(String(f.pqrs_id)) ?? [];
      list.push({
        id: String(f.id),
        name: String(f.name),
        mime: String(f.mime),
        size: Number(f.size),
        messageId: f.message_id ? String(f.message_id) : null,
      });
      filesByCase.set(String(f.pqrs_id), list);
    }
    const byCase = new Map<string, PqrsMessage[]>();
    for (const m of messages) {
      const list = byCase.get(String(m.pqrs_id)) ?? [];
      const fromAdmin = Number(m.from_admin) === 1;
      list.push({
        id: String(m.id),
        fromAdmin,
        // Quien responde por la administración no se identifica con su nombre.
        author: fromAdmin ? ADMIN_NAME : String(m.name),
        body: String(m.body),
        createdAt: String(m.created_at),
      });
      byCase.set(String(m.pqrs_id), list);
    }
    return rows.map((row) => ({
      id: String(row.id),
      kind: String(row.kind) as PqrsKind,
      message: String(row.message),
      status: String(row.status) as PqrsStatus,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at ?? row.created_at),
      closedAt: row.closed_at ? String(row.closed_at) : null,
      messages: byCase.get(String(row.id)) ?? [],
      files: filesByCase.get(String(row.id)) ?? [],
      user: {
        id: String(row.user_id),
        name: String(row.name),
        email: String(row.email),
        role: String(row.role),
      },
    }));
  }
  async function getCase(id: string) {
    const row = await db.prepare('SELECT id,user_id,kind,status FROM pqrs WHERE id=?').get(id);
    if (!row) throw new HttpError(404, 'PQRS no encontrada.');
    return {
      id: String(row.id),
      userId: String(row.user_id),
      kind: String(row.kind),
      status: String(row.status) as PqrsStatus,
    };
  }
  async function notifyAdmins(title: string, link: string) {
    const admins = await db.prepare("SELECT id FROM users WHERE role='admin'").all();
    for (const a of admins) await notify(db, String(a.id), title, link);
  }
  async function addMessage(
    caseId: string,
    authorId: string,
    fromAdmin: boolean,
    body: string,
    file?: Upload | null,
  ) {
    const at = now();
    const id = randomUUID();
    await db
      .prepare(
        'INSERT INTO pqrs_messages (id,pqrs_id,author_id,from_admin,body,created_at) VALUES (?,?,?,?,?,?)',
      )
      .run(id, caseId, authorId, fromAdmin ? 1 : 0, body, at);
    if (file) await saveFile(caseId, id, file);
    return at;
  }
  async function saveFile(caseId: string, messageId: string | null, file: Upload) {
    await db
      .prepare(
        'INSERT INTO pqrs_files (id,pqrs_id,message_id,name,mime,size,data,created_at) VALUES (?,?,?,?,?,?,?,?)',
      )
      .run(randomUUID(), caseId, messageId, file.name, file.mime, file.size, file.base64, now());
  }
  /** Solo su autor y la administración pueden abrir el adjunto. */
  async function sendFile(user: User, fileId: string, res: Response) {
    const f = await db
      .prepare(
        'SELECT f.name,f.mime,f.data,p.user_id FROM pqrs_files f JOIN pqrs p ON p.id=f.pqrs_id WHERE f.id=?',
      )
      .get(fileId);
    if (!f || (user.role !== 'admin' && String(f.user_id) !== user.id))
      throw new HttpError(404, 'Archivo no encontrado.');
    res.setHeader('Content-Type', String(f.mime));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Un PDF o una imagen no deben poder ejecutar código en el dominio de SucreIA.
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${String(f.name).replace(/[^\w.-]+/g, '_')}"`,
    );
    res.send(Buffer.from(String(f.data), 'base64'));
  }

  r.get('/pqrs/archivos/:id', async (req, res) => {
    await sendFile(requireUser(res), req.params.id, res);
  });
  r.post('/pqrs', async (req, res) => {
    const user = requireUser(res);
    const kind = string(req.body.kind, 20, 'el tipo de solicitud');
    if (!(pqrsKinds as readonly string[]).includes(kind))
      throw new HttpError(400, 'Selecciona un tipo de solicitud.');
    const message = string(req.body.message, 2500, 'el mensaje');
    const file = readFile(req.body.file);
    const id = randomUUID();
    const at = now();
    await db
      .prepare(
        "INSERT INTO pqrs (id,kind,user_id,message,created_at,updated_at,status) VALUES (?,?,?,?,?,?,'pending')",
      )
      .run(id, kind, user.id, message, at, at);
    if (file) await saveFile(id, null, file);
    await notifyAdmins(
      `Nueva ${kind.toLowerCase()} de ${user.name} (radicado ${radicado(id)}).`,
      `/admin/pqrs?caso=${id}`,
    );
    res.status(201).json({ id });
  });
  r.get('/pqrs', async (_req, res) => {
    const user = requireUser(res);
    const cases = await casesWhere('WHERE p.user_id=?', user.id);
    res.json({ pqrs: cases.map(({ user: _u, ...c }) => c) });
  });
  r.post('/pqrs/:id/mensajes', async (req, res) => {
    const user = requireUser(res);
    const c = await getCase(req.params.id);
    if (c.userId !== user.id) throw new HttpError(404, 'PQRS no encontrada.');
    if (c.status === 'closed')
      throw new HttpError(
        409,
        'Este caso ya está cerrado. Si necesitas algo más, abre una nueva solicitud.',
      );
    const body = string(req.body.message, 2500, 'tu mensaje');
    const at = await addMessage(c.id, user.id, false, body, readFile(req.body.file));
    await db.prepare("UPDATE pqrs SET status='pending', updated_at=? WHERE id=?").run(at, c.id);
    await notifyAdmins(
      `${user.name} respondió en su ${c.kind.toLowerCase()} (radicado ${radicado(c.id)}).`,
      `/admin/pqrs?caso=${c.id}`,
    );
    res.status(201).json({ ok: true });
  });
  r.get('/admin/pqrs', async (_req, res) => {
    requireUser(res, 'admin');
    res.json({ pqrs: await casesWhere('') });
  });
  r.post('/admin/pqrs/:id', async (req, res) => {
    const actor = requireUser(res, 'admin');
    const c = await getCase(req.params.id);
    if (c.status === 'closed') throw new HttpError(409, 'El caso está cerrado.');
    const response = string(req.body.response, 2500, 'la respuesta');
    const at = await addMessage(c.id, actor.id, true, response);
    await db
      .prepare(
        "UPDATE pqrs SET status='answered', response=?, responded_at=?, updated_at=? WHERE id=?",
      )
      .run(response, at, at, c.id);
    await notify(
      db,
      c.userId,
      `Respuesta a tu ${c.kind.toLowerCase()} (radicado ${radicado(c.id)}): ${response.slice(0, 140)}`,
      `/pqrs?caso=${c.id}`,
    );
    await db
      .prepare('INSERT INTO admin_audit VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), actor.id, 'pqrs:respuesta', c.id, response.slice(0, 500), at);
    res.status(204).end();
  });
  r.post('/admin/pqrs/:id/cerrar', async (req, res) => {
    const actor = requireUser(res, 'admin');
    const c = await getCase(req.params.id);
    if (c.status === 'closed') throw new HttpError(409, 'El caso ya está cerrado.');
    const note = string(req.body?.note ?? '', 2500, 'el mensaje de cierre', false);
    let at = now();
    if (note) at = await addMessage(c.id, actor.id, true, note);
    await db
      .prepare("UPDATE pqrs SET status='closed', closed_at=?, updated_at=? WHERE id=?")
      .run(at, at, c.id);
    await notify(
      db,
      c.userId,
      `Tu ${c.kind.toLowerCase()} (radicado ${radicado(c.id)}) quedó resuelta y cerrada.${note ? ` ${note.slice(0, 120)}` : ''}`,
      `/pqrs?caso=${c.id}`,
    );
    await db
      .prepare('INSERT INTO admin_audit VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), actor.id, 'pqrs:cierre', c.id, note.slice(0, 500), at);
    res.status(204).end();
  });
  return r;
}
