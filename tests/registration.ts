// Ayudas de las pruebas para el registro de negocios. Desde el registro previo, la primera
// publicación pasa por la revisión de la administración (eso se prueba en registration.test.ts);
// las demás pruebas parten de un negocio con el registro ya aprobado.
import type { Db } from '../server/db.ts';

/** Versión de los términos que acepta quien crea un negocio (src/lib/studio-store.ts). */
export const TERMS_VERSION = '2026-11-23';

/** Deja el registro del negocio aprobado, como si la administración ya lo hubiera revisado. */
export async function approveRegistration(db: Db, storeId: string) {
  await db.prepare("UPDATE stores SET registration='approved' WHERE id=?").run(storeId);
}
