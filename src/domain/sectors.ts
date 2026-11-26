// Sectores y subregiones de Sucre. El sector se guarda en `design.category`; las
// categorías anteriores (Artesanías, Gastronomía…) se traducen con sectorFor para no romper
// tiendas ya creadas.
import { catalog } from './subcategories.ts';

export interface Sector {
  /** Nombre completo; es el valor que se guarda en la tienda. */
  id: string;
  /** Nombre en dos líneas para los botones de sector. */
  lines: [string, string];
  /** Nombre del ícono de @lucide/vue (ver components/SectorIcon.vue). */
  icon: string;
  color: string;
  /** Área de designs.ts que da los textos y productos iniciales. */
  area: string;
}

export interface Subregion {
  id: string;
  color: string;
  municipalities: string[];
}

const definitions: Sector[] = [
  {
    id: 'Gastronomía y Alimentos',
    lines: ['Gastronomía', 'y Alimentos'],
    icon: 'utensils',
    color: '#16a34a',
    area: 'Gastronomía',
  },
  {
    id: 'Turismo y Hospedaje',
    lines: ['Turismo', 'y Hospedaje'],
    icon: 'bed',
    color: '#2563eb',
    area: 'Turismo',
  },
  {
    id: 'Moda y Confección',
    lines: ['Moda', 'y Confección'],
    icon: 'shirt',
    color: '#9333ea',
    area: 'Moda',
  },
  {
    id: 'Belleza y Bienestar',
    lines: ['Belleza', 'y Bienestar'],
    icon: 'flower',
    color: '#db2777',
    area: 'Belleza',
  },
  {
    id: 'Salud y Farmacia',
    lines: ['Salud', 'y Farmacia'],
    icon: 'cross',
    color: '#16a34a',
    area: 'Salud',
  },
  {
    id: 'Tecnología y Digital',
    lines: ['Tecnología', 'y Digital'],
    icon: 'laptop',
    color: '#2563eb',
    area: 'Servicios',
  },
  {
    id: 'Construcción y Ferretería',
    lines: ['Construcción', 'y Ferretería'],
    icon: 'hardhat',
    color: '#ea580c',
    area: 'Servicios',
  },
  {
    id: 'Agro y Agroindustria',
    lines: ['Agro y', 'Agroindustria'],
    icon: 'sprout',
    color: '#16a34a',
    area: 'Otro',
  },
  {
    id: 'Servicios Profesionales',
    lines: ['Servicios', 'Profesionales'],
    icon: 'briefcase',
    color: '#9333ea',
    area: 'Servicios',
  },
  {
    id: 'Comercio y tiendas',
    lines: ['Comercio', 'y tiendas'],
    icon: 'store',
    color: '#0891b2',
    area: 'Otro',
  },
  {
    id: 'Transporte y logística',
    lines: ['Transporte', 'y logística'],
    icon: 'truck',
    color: '#475569',
    area: 'Servicios',
  },
  {
    id: 'Fotografía y producción audiovisual',
    lines: ['Fotografía', 'y producción audiovisual'],
    icon: 'camera',
    color: '#7c3aed',
    area: 'Servicios',
  },
  {
    id: 'Floristerías y regalos',
    lines: ['Floristerías', 'y regalos'],
    icon: 'gift',
    color: '#db2777',
    area: 'Artesanías',
  },
  {
    id: 'Mascotas y animales',
    lines: ['Mascotas', 'y animales'],
    icon: 'paw',
    color: '#b45309',
    area: 'Otro',
  },
  {
    id: 'Bebidas y licorerías',
    lines: ['Bebidas', 'y licorerías'],
    icon: 'wine',
    color: '#be123c',
    area: 'Gastronomía',
  },
  {
    id: 'Decoración y artículos para el hogar',
    lines: ['Decoración', 'y artículos para el hogar'],
    icon: 'sofa',
    color: '#0d9488',
    area: 'Artesanías',
  },
  {
    id: 'Eventos y entretenimiento',
    lines: ['Eventos', 'y entretenimiento'],
    icon: 'party',
    color: '#ea580c',
    area: 'Servicios',
  },
  {
    id: 'Educación y formación',
    lines: ['Educación', 'y formación'],
    icon: 'graduation',
    color: '#1d4ed8',
    area: 'Servicios',
  },
  {
    id: 'Servicios personales y domésticos',
    lines: ['Servicios', 'personales y domésticos'],
    icon: 'spray',
    color: '#4d7c0f',
    area: 'Servicios',
  },
  {
    id: 'Otros Sectores',
    lines: ['Otros', 'Sectores'],
    icon: 'more',
    color: '#475569',
    area: 'Otro',
  },
];
/** Sectores con el nombre en mayúscula inicial, que es el valor que se guarda en la tienda. */
export const sectors: Sector[] = definitions.map((s) => ({
  ...s,
  id: sentenceCase(s.id),
  lines: [s.lines[0], s.lines[1].toLocaleLowerCase('es')] as [string, string],
}));
const legacy: Record<string, string> = {
  Gastronomía: 'Gastronomía y Alimentos',
  Turismo: 'Turismo y Hospedaje',
  Moda: 'Moda y Confección',
  Artesanías: 'Moda y Confección',
  Belleza: 'Belleza y Bienestar',
  Salud: 'Salud y Farmacia',
  Servicios: 'Servicios Profesionales',
  Otro: 'Otros Sectores',
};
/** Sector de una categoría guardada (incluye los nombres anteriores y otras mayúsculas). */
export function sectorFor(category: string): Sector {
  const id = Object.hasOwn(legacy, category) ? legacy[category] : category;
  return (
    sectors.find((s) => sentenceCase(s.id) === sentenceCase(id)) ?? sectors[sectors.length - 1]
  );
}
/** Las cinco subregiones de Sucre y sus 26 municipios. */
export const subregions: Subregion[] = [
  {
    id: 'Golfo de Morrosquillo',
    color: '#8b5cf6',
    municipalities: ['Coveñas', 'Palmito', 'San Onofre', 'Santiago de Tolú', 'Tolú Viejo'],
  },
  {
    id: 'Sabanas',
    color: '#f59e0b',
    municipalities: [
      'Buenavista',
      'Corozal',
      'El Roble',
      'Galeras',
      'Los Palmitos',
      'Sampués',
      'San Juan de Betulia',
      'San Pedro',
      'Sincé',
    ],
  },
  {
    id: 'Montes de María',
    color: '#3b82f6',
    municipalities: ['Chalán', 'Colosó', 'Morroa', 'Ovejas', 'Sincelejo'],
  },
  {
    id: 'Mojana',
    color: '#22c55e',
    municipalities: ['Guaranda', 'Majagual', 'Sucre'],
  },
  {
    id: 'San Jorge',
    color: '#ec4899',
    municipalities: ['Caimito', 'La Unión', 'San Benito Abad', 'San Marcos'],
  },
];
export const municipalities = subregions
  .flatMap((s) => s.municipalities)
  .sort((a, b) => a.localeCompare(b, 'es'));
const aliases: Record<string, string> = {
  Toluviejo: 'Tolú Viejo',
  'San Antonio de Palmito': 'Palmito',
  Tolú: 'Santiago de Tolú',
  'San Benito': 'San Benito Abad',
};
/** Subregión de un municipio (null si no es de Sucre o está mal escrito). */
export function subregionFor(municipality: string): Subregion | null {
  const name = aliases[municipality.trim()] ?? municipality.trim();
  return subregions.find((s) => s.municipalities.includes(name)) ?? null;
}
/** «Gastronomía Y Alimentos» → «Gastronomía y alimentos». */
export function sentenceCase(value: string): string {
  const text = value.trim().toLocaleLowerCase('es');
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1);
}
/** Ilustración del sector en /art/sectores (o la genérica de servicios). */
export function sectorArtwork(category: string): string {
  const key = sentenceCase(sectorFor(category).id);
  if (!Object.hasOwn(catalog, key)) return '/art/service.svg';
  const slug = key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replaceAll(' ', '-');
  return '/art/sectores/' + slug + '.svg';
}
/** Subcategorías sugeridas para el sector de una categoría guardada. */
export function subcategoriesFor(category: string): string[] {
  return catalog[sentenceCase(sectorFor(category).id)] ?? [];
}
