import type { Business } from '@/domain/types';
import type { StoreDesign } from '@/domain/studio';

/** Diapositiva del carrusel de la portada: una tienda publicada o un diseño de ejemplo. */
export type Slide =
  | { kind: 'store'; business: Business }
  | { kind: 'example'; design: StoreDesign; style: string; area: string };
