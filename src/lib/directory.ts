// Negocios publicados (GET /api/tiendas), compartidos por buscar, sectores, mapa, inicio y
// recomendaciones. Se cargan una vez al montar y se pueden recargar.
import { ref, shallowRef } from 'vue';
import type { Business } from '@/domain/types';
import { api } from './api';
import { sectorFor } from '@/domain/sectors';

const stores = shallowRef<Business[]>([]);
const ready = ref(false);
const error = ref('');
let loading: Promise<void> | null = null;

function load(force = false) {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loading && !force) return loading;
  loading = api<{ stores: Business[] }>('GET', '/tiendas')
    .then((r) => {
      // Las categorías anteriores (Artesanías, Gastronomía…) se muestran como su sector.
      stores.value = r.stores.map((b) => ({ ...b, category: sectorFor(b.category).id }));
      error.value = '';
    })
    .catch((e: Error) => {
      error.value = e.message;
    })
    .finally(() => {
      ready.value = true;
    });
  return loading;
}

export function useDirectory() {
  return { stores, ready, error, load };
}

/**
 * Valoración para ordenar: el promedio se acerca a 4 cuando hay pocas reseñas, para que una sola
 * reseña de 5 no supere a un negocio con muchas reseñas muy buenas.
 */
export function score(b: Business) {
  const n = b.reviewCount ?? 0;
  return (b.rating * n + 4 * 3) / (n + 3) + (b.cover && !b.cover.startsWith('/art/') ? 0.01 : 0);
}

/** Texto sin tildes ni mayúsculas, para comparar búsquedas. */
export function plain(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** ¿El negocio coincide con lo que escribió la persona? (nombre, sector, municipio, oferta). */
export function matches(b: Business, query: string) {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = plain(
    [
      b.name,
      b.category,
      b.subcategory,
      b.municipality,
      b.description,
      ...b.products.map((p) => `${p.name} ${p.description}`),
    ].join(' '),
  );
  return words.every((w) => haystack.includes(w));
}
