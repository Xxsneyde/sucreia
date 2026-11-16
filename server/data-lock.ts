// Servidor y herramientas de mantenimiento comparten estos bloqueos. No se borran por PID:
// tras una caída, un operador comprueba que no haya procesos antes de quitar un bloqueo viejo.
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
export function acquireDataLock(databasePath: string, imagesDir: string): () => void {
  const paths = [
    ...new Set([
      ...(databasePath === ':memory:' ? [] : [resolve(databasePath) + '.lock']),
      join(resolve(imagesDir), '.sucreia.lock'),
    ]),
  ].sort();
  const acquired: string[] = [];
  const marker = JSON.stringify({
    pid: process.pid,
    id: randomUUID(),
    at: new Date().toISOString(),
  });
  function release() {
    for (const path of acquired.splice(0).reverse()) {
      try {
        if (readFileSync(path, 'utf8') === marker) unlinkSync(path);
      } catch {
        /* No borrar bloqueos de otro proceso. */
      }
    }
  }
  try {
    for (const path of paths) {
      mkdirSync(dirname(path), { recursive: true });
      try {
        writeFileSync(path, marker, { flag: 'wx', mode: 0o600 });
      } catch {
        throw new Error(
          `Los datos están en uso o no se pueden bloquear: ${path}. Detén la API antes del mantenimiento. Si hubo una caída, verifica que no siga ejecutándose antes de retirar el bloqueo.`,
        );
      }
      acquired.push(path);
    }
    return release;
  } catch (error) {
    release();
    throw error;
  }
}
