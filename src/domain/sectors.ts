// Sectores y subregiones de Sucre tal como aparecen en la presentación de SucreIA.
// El sector se guarda en `design.category`; las categorías anteriores (Artesanías,
// Gastronomía…) se traducen con sectorFor para no romper tiendas ya creadas.

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

export const sectors: Sector[] = [
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
    id: 'Otros Sectores',
    lines: ['Otros', 'Sectores'],
    icon: 'more',
    color: '#475569',
    area: 'Otro',
  },
];

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

/** Sector de una categoría guardada (incluye los nombres anteriores). */
export function sectorFor(category: string): Sector {
  const id = legacy[category] ?? category;
  return sectors.find((s) => s.id === id) ?? sectors[sectors.length - 1];
}

export interface Subregion {
  id: string;
  color: string;
  municipalities: string[];
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
      'Sincelejo',
    ],
  },
  {
    id: 'Montes de María',
    color: '#3b82f6',
    municipalities: ['Chalán', 'Colosó', 'Morroa', 'Ovejas'],
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
  Tolú: 'Santiago de Tolú',
  'San Benito': 'San Benito Abad',
};

/** Subregión de un municipio (null si no es de Sucre o está mal escrito). */
export function subregionFor(municipality: string): Subregion | null {
  const name = aliases[municipality.trim()] ?? municipality.trim();
  return subregions.find((s) => s.municipalities.includes(name)) ?? null;
}
