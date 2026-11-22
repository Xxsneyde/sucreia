import type { Business, BusinessMode } from './types.ts';
import { sectorFor } from './sectors.ts';
import {
  areaFor,
  designChoices,
  fill,
  styleIds,
  styles,
  type AreaDefinition,
  type Palette,
  type StyleId,
} from './designs.ts';

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  /** Grupo del catálogo («Tortas», «Postres»…); vacío o ausente = sin grupo. */
  category?: string;
}
/** Textos e imágenes de la página. Cada estilo los presenta a su manera. */
export interface StoreContent {
  heroTitle: string;
  heroText: string;
  heroImage: string;
  catalogTitle: string;
  catalogText: string;
  storyTitle: string;
  storyText: string;
  storyImage: string;
  promises: string[];
  contactTitle: string;
  contactText: string;
}
export interface StoreDesign {
  name: string;
  /** Área del emprendimiento (ver areas en designs.ts). */
  category: string;
  municipality: string;
  description: string;
  whatsapp: string;
  /** Teléfono fijo o celular para llamadas (opcional). */
  phone?: string;
  /** Correo de contacto del negocio (opcional). */
  email?: string;
  address: string;
  hours: string;
  logo: string;
  mode: BusinessMode;
  style: StyleId;
  colors: Palette;
  products: StoreProduct[];
  content: StoreContent;
}
export interface StoreVersion {
  id: string;
  at: string;
  design: StoreDesign;
}
export interface StoreProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  draft: StoreDesign;
  published: StoreVersion | null;
  versions: StoreVersion[];
}
export interface StudioWorkspace {
  schema: 2;
  projects: StoreProject[];
  selectedId: string;
  visits: Record<string, number>;
}

/** Textos iniciales de la página según el área, con el nombre y municipio del negocio. */
export function generateContent(
  area: AreaDefinition,
  name: string,
  municipality: string,
  description = '',
): StoreContent {
  const c = area.copy;
  const f = (t: string) => fill(t, name, municipality);
  const art = `/art/${area.theme}.svg`;
  return {
    heroTitle: f(c.heroTitle),
    heroText: f(c.heroText),
    heroImage: art,
    catalogTitle: f(c.catalogTitle),
    catalogText: f(c.catalogText),
    storyTitle: f(c.storyTitle),
    // La historia propia del emprendedor tiene prioridad sobre el texto de ejemplo.
    storyText: description.trim() || f(c.storyText),
    storyImage: art,
    promises: [...c.promises],
    contactTitle: f(c.contactTitle),
    contactText: f(c.contactText),
  };
}

/** Diseño inicial para un área: datos de ejemplo, primera opción de estilo y textos. */
export function createDesign(
  category = 'Artesanías',
  name = 'Mi emprendimiento',
  choice = 0,
): StoreDesign {
  const sector = sectorFor(category);
  const area = areaFor(category);
  const option = area.choices[choice] ?? area.choices[0];
  const municipality = 'Sincelejo';
  return {
    name,
    category: sector.id,
    municipality,
    description: '',
    whatsapp: '',
    address: '',
    hours: 'Lunes a sábado · 9:00 a. m. a 6:00 p. m.',
    logo: '',
    mode: area.mode,
    style: option.style,
    colors: { ...option.colors },
    products: area.products.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      description: p.description,
      price: area.mode === 'quote' ? 0 : p.price,
      image: `/art/${area.theme}.svg`,
    })),
    content: generateContent(area, name, municipality),
  };
}

/**
 * Las páginas propuestas para el negocio: los 7 estilos, primero los 3 recomendados para su
 * área. Conservan datos, catálogo y textos del diseño base; cambian estilo, paleta y tipografía.
 */
export function designOptions(base: StoreDesign): StoreDesign[] {
  return designChoices(base.category).map((c) => ({
    ...base,
    style: c.style,
    colors: { ...c.colors },
  }));
}

export function publicationErrors(d: StoreDesign): string[] {
  const errors: string[] = [];
  if (!d.name.trim()) errors.push('Escribe el nombre de tu negocio.');
  if (!d.municipality.trim()) errors.push('Indica tu municipio.');
  if (d.products.length < 3) errors.push('Agrega al menos tres productos o servicios.');
  if (d.products.some((p) => !p.name.trim() || !Number.isSafeInteger(p.price) || p.price < 0))
    errors.push('Revisa los nombres y precios del catálogo.');
  if (new Set(d.products.map((p) => p.id)).size !== d.products.length)
    errors.push('Los productos deben tener identificadores distintos.');
  if (!d.content.heroTitle.trim()) errors.push('Escribe el título principal de tu página.');
  if (d.whatsapp && !/^\+?[1-9]\d{9,14}$/.test(d.whatsapp))
    errors.push('El WhatsApp debe incluir código de país y solo números.');
  return errors;
}
export function publishProject(project: StoreProject, at = new Date().toISOString()): StoreProject {
  const errors = publicationErrors(project.draft);
  if (errors.length) throw new Error(errors.join(' '));
  const version: StoreVersion = {
    id: crypto.randomUUID(),
    at,
    design: structuredClone(project.draft),
  };
  return {
    ...project,
    published: version,
    versions: [version, ...project.versions].slice(0, 8),
    updatedAt: at,
  };
}
export function toBusiness(p: StoreProject): Business | null {
  if (!p.published) return null;
  const d = p.published.design;
  return {
    id: p.id,
    name: d.name,
    category: d.category,
    municipality: d.municipality,
    description: d.description || d.content.heroText,
    mode: d.mode,
    theme: areaFor(d.category).theme,
    verified: false,
    completed365: 0,
    rating: 0,
    whatsapp: d.whatsapp || null,
    products: d.products,
    local: true,
    cover: d.content.heroImage,
    logo: d.logo,
  };
}
/** Página pública de un negocio publicado en SucreIA. */
export function businessHref(id: string) {
  return `/tienda?id=${encodeURIComponent(id)}`;
}
export function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function onColor(background: string) {
  return contrast(background, '#ffffff') >= contrast(background, '#18251c') ? '#ffffff' : '#18251c';
}
export function validImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length < 1_500_000 &&
    (value === '' ||
      /^\/art\/(craft|food|beauty|service|hero)\.svg$/.test(value) ||
      /^\/api\/imagenes\/[a-f0-9]{64}\.webp$/.test(value) ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
  );
}
function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function short(v: unknown, max = 5000): v is string {
  return typeof v === 'string' && v.length <= max;
}
function isContent(v: unknown): v is StoreContent {
  if (!record(v)) return false;
  return (
    ['heroTitle', 'catalogTitle', 'storyTitle', 'contactTitle'].every((k) => short(v[k], 300)) &&
    ['heroText', 'catalogText', 'storyText', 'contactText'].every((k) => short(v[k])) &&
    validImage(v.heroImage) &&
    validImage(v.storyImage) &&
    Array.isArray(v.promises) &&
    v.promises.length <= 6 &&
    v.promises.every((p) => short(p, 120))
  );
}
export function isDesign(v: unknown): v is StoreDesign {
  if (
    !record(v) ||
    !['products', 'booking', 'quote'].includes(String(v.mode)) ||
    !styleIds.includes(v.style as StyleId) ||
    !record(v.colors)
  )
    return false;
  if (
    !['name', 'category', 'municipality', 'description', 'whatsapp', 'address', 'hours'].every(
      (k) => short(v[k]),
    ) ||
    !['phone', 'email'].every((k) => v[k] === undefined || short(v[k], 200))
  )
    return false;
  if (
    !['primary', 'background', 'text', 'accent'].every(
      (k) =>
        typeof (v.colors as Record<string, unknown>)[k] === 'string' &&
        /^#[a-f\d]{6}$/i.test(String((v.colors as Record<string, unknown>)[k])),
    )
  )
    return false;
  if (!validImage(v.logo) || !isContent(v.content)) return false;
  if (
    !Array.isArray(v.products) ||
    v.products.length > 60 ||
    !v.products.every(
      (p) =>
        record(p) &&
        short(p.id, 100) &&
        short(p.name, 160) &&
        short(p.description) &&
        typeof p.price === 'number' &&
        Number.isFinite(p.price) &&
        p.price >= 0 &&
        p.price <= 1e9 &&
        validImage(p.image) &&
        (p.category === undefined || short(p.category, 60)),
    )
  )
    return false;
  return new Set(v.products.map((p) => p.id)).size === v.products.length;
}

// --- Migración del formato anterior (editor por bloques, esquema 1) -----------------------

const legacyStyle: Record<string, StyleId> = {
  raices: 'organico',
  sabor: 'retro',
  alma: 'elegante',
  pulso: 'moderno',
};
/**
 * Convierte un diseño del editor por bloques al formato actual. Si ya está en el formato
 * actual o no se reconoce, lo devuelve sin cambios (isDesign decide si es válido).
 */
export function upgradeDesign(v: unknown): unknown {
  if (!record(v) || 'content' in v || !Array.isArray(v.blocks)) return v;
  const blocks = v.blocks.filter(record);
  const block = (kind: string) => blocks.find((b) => b.kind === kind);
  const area = areaFor(String(v.category ?? ''));
  const base = generateContent(area, String(v.name ?? ''), String(v.municipality ?? ''));
  const text = (b: Record<string, unknown> | undefined, key: string, fallback: string) =>
    b && typeof b[key] === 'string' && b[key] ? (b[key] as string) : fallback;
  const benefits = block('benefits');
  const promises = benefits
    ? String(benefits.text ?? '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const { blocks: _blocks, template, font: _font, radius: _radius, spacing: _spacing, ...rest } = v;
  return {
    ...rest,
    style: legacyStyle[String(template)] ?? area.choices[0].style,
    content: {
      heroTitle: text(block('hero'), 'title', base.heroTitle),
      heroText: text(block('hero'), 'text', base.heroText),
      heroImage: text(block('hero'), 'image', base.heroImage),
      catalogTitle: text(block('catalog'), 'title', base.catalogTitle),
      catalogText: text(block('catalog'), 'text', base.catalogText),
      storyTitle: text(block('story'), 'title', base.storyTitle),
      storyText: text(block('story'), 'text', base.storyText),
      storyImage: text(block('story'), 'image', base.storyImage),
      promises: promises.length === 3 ? promises : base.promises,
      contactTitle: text(block('contact'), 'title', base.contactTitle),
      contactText: text(block('contact'), 'text', base.contactText),
    },
  };
}
/** Actualiza un espacio guardado con el esquema 1 al esquema 2. */
export function upgradeWorkspace(v: unknown): unknown {
  if (!record(v) || v.schema !== 1 || !Array.isArray(v.projects)) return v;
  const version = (x: unknown) => (record(x) ? { ...x, design: upgradeDesign(x.design) } : x);
  return {
    ...v,
    schema: 2,
    projects: v.projects.map((p) =>
      record(p)
        ? {
            ...p,
            draft: upgradeDesign(p.draft),
            published: p.published === null ? null : version(p.published),
            versions: Array.isArray(p.versions) ? p.versions.map(version) : p.versions,
          }
        : p,
    ),
  };
}

export function parseDesignFile(raw: string): StoreDesign {
  if (raw.length > 12_000_000) throw new Error('El archivo supera el tamaño permitido.');
  const data: unknown = JSON.parse(raw);
  if (!record(data) || data.format !== 'sucreia-design' || ![1, 2].includes(Number(data.version)))
    throw new Error('Este archivo no es un diseño válido de SucreIA.');
  const design = upgradeDesign(data.design);
  if (!isDesign(design)) throw new Error('Este archivo no es un diseño válido de SucreIA.');
  return design;
}
export function designFile(d: StoreDesign) {
  return JSON.stringify({ format: 'sucreia-design', version: 2, design: d }, null, 2);
}
export function isWorkspace(v: unknown): v is StudioWorkspace {
  if (
    !record(v) ||
    v.schema !== 2 ||
    !short(v.selectedId) ||
    !record(v.visits) ||
    !Object.values(v.visits).every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0) ||
    !Array.isArray(v.projects) ||
    v.projects.length > 30
  )
    return false;
  return v.projects.every(
    (p) =>
      record(p) &&
      short(p.id, 100) &&
      p.id.startsWith('local-') &&
      short(p.createdAt) &&
      short(p.updatedAt) &&
      isDesign(p.draft) &&
      Array.isArray(p.versions) &&
      p.versions.length <= 8 &&
      p.versions.every(isVersion) &&
      (p.published === null || isVersion(p.published)),
  );
}
function isVersion(v: unknown): v is StoreVersion {
  return record(v) && short(v.id, 100) && short(v.at) && isDesign(v.design);
}

export { styles, type StyleId };
