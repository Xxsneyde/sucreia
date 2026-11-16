import { createHash, randomBytes } from 'node:crypto';
import type { Db } from './db.ts';
import { HttpError } from './http.ts';

export type Purpose = 'reset' | 'verify';
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export function issueToken(db: Db, userId: string, purpose: Purpose) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Date.now() + (purpose === 'reset' ? 30 : 24 * 60) * 60_000,
  ).toISOString();
  db.exec('BEGIN');
  try {
    db.prepare(
      'DELETE FROM account_tokens WHERE expires_at <= ? OR (user_id = ? AND purpose = ?)',
    ).run(new Date().toISOString(), userId, purpose);
    db.prepare(
      'INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)',
    ).run(hash(token), userId, purpose, expiresAt);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { token, expiresAt };
}

/** Ejecutar dentro de la transacción que realiza el cambio, sin await intermedio. */
export function consumeToken(db: Db, token: string, purpose: Purpose) {
  const row = db
    .prepare(
      'DELETE FROM account_tokens WHERE token_hash = ? AND purpose = ? AND expires_at > ? RETURNING user_id',
    )
    .get(hash(token), purpose, new Date().toISOString()) as { user_id: string } | undefined;
  if (!row) throw new HttpError(400, 'Este enlace ya se usó o venció. Solicita uno nuevo.');
  return row.user_id;
}

export interface LocalMail {
  id: number;
  to: string;
  subject: string;
  path: string;
  expiresAt: string;
}
/** Bandeja efímera de desarrollo. Nunca escribe enlaces de acceso en archivos ni logs. */
export function localMailbox() {
  const messages: LocalMail[] = [];
  let sequence = 0;
  return {
    send(to: string, purpose: Purpose, token: string, expiresAt: string) {
      messages.unshift({
        id: ++sequence,
        to,
        expiresAt,
        subject: purpose === 'reset' ? 'Recupera tu contraseña' : 'Verifica tu correo',
        path: `${purpose === 'reset' ? '/recuperar' : '/verificar-correo'}?token=${encodeURIComponent(token)}`,
      });
      messages.splice(100);
    },
    list() {
      return messages.filter((m) => m.expiresAt > new Date().toISOString());
    },
  };
}
export type Mailbox = ReturnType<typeof localMailbox>;
