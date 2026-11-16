import { resolve } from 'node:path';
import { createBackup, restoreBackup } from '../backups.ts';
const [command, first, second] = process.argv.slice(2);
try {
  if (command === 'create') {
    const destination = first ?? `server/backups/${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const result = await createBackup(
      resolve(process.env.DATABASE_PATH ?? 'server/data/sucreia.db'),
      resolve(process.env.IMAGES_PATH ?? 'server/data/images'),
      destination,
    );
    console.log(`Copia creada: ${result.path} (${result.images} imágenes).`);
  } else if (command === 'restore' && first && second) {
    const result = restoreBackup(first, second);
    console.log(
      `Restauración creada: ${result.path} (${result.images} imágenes). Configura DATABASE_PATH e IMAGES_PATH para revisarla; los originales siguen intactos.`,
    );
  } else
    throw new Error(
      'Uso: npm run backup -- [destino nuevo] | npm run restore -- <copia> <destino nuevo>',
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo completar la operación.');
  process.exitCode = 1;
}
