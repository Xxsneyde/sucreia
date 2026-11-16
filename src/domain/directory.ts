import type { Business } from './types.ts';
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
/** La fuente debe ser exclusivamente GET /api/tiendas (publicaciones actuales). */
export function filterDirectory(
  stores: Business[],
  query: string,
  category: string,
  municipality: string,
): Business[] {
  const term = normalize(query);
  return stores.filter(
    (b) =>
      (!category || b.category === category) &&
      (!municipality || b.municipality === municipality) &&
      normalize(
        [b.name, b.description, b.category, b.municipality, ...b.products.map((p) => p.name)].join(
          ' ',
        ),
      ).includes(term),
  );
}
