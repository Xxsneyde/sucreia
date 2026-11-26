// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
function acquireDataLock(databasePath, imagesDir2) {
  const paths = [
    .../* @__PURE__ */ new Set([
      ...databasePath === ":memory:" ? [] : [resolve(databasePath) + ".lock"],
      join(resolve(imagesDir2), ".sucreia.lock")
    ])
  ].sort();
  const acquired = [];
  const marker = JSON.stringify({
    pid: process.pid,
    id: randomUUID(),
    at: (/* @__PURE__ */ new Date()).toISOString()
  });
  function release2() {
    for (const path of acquired.splice(0).reverse()) {
      try {
        if (readFileSync(path, "utf8") === marker) unlinkSync(path);
      } catch {
      }
    }
  }
  try {
    for (const path of paths) {
      mkdirSync(dirname(path), { recursive: true });
      try {
        writeFileSync(path, marker, { flag: "wx", mode: 384 });
      } catch {
        throw new Error(
          `Los datos est\xE1n en uso o no se pueden bloquear: ${path}. Det\xE9n la API antes del mantenimiento. Si hubo una ca\xEDda, verifica que no siga ejecut\xE1ndose antes de retirar el bloqueo.`
        );
      }
      acquired.push(path);
    }
    return release2;
  } catch (error) {
    release2();
    throw error;
  }
}
