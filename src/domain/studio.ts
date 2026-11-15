import type { Business, BusinessMode } from './types.ts';
export const blockKinds = [
  'hero',
  'catalog',
  'story',
  'benefits',
  'gallery',
  'banner',
  'faq',
  'contact',
] as const;
export type BlockKind = (typeof blockKinds)[number];
export type FontName = 'editorial' | 'modern' | 'humanist' | 'classic';
export interface StoreBlock {
  id: string;
  kind: BlockKind;
  title: string;
  text: string;
  image: string;
  visible: boolean;
  layout: 'split' | 'center' | 'wide';
  tone: 'paper' | 'soft' | 'brand';
  padding: number;
}
export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}
export interface StoreDesign {
  name: string;
  category: string;
  municipality: string;
  description: string;
  whatsapp: string;
  address: string;
  hours: string;
  logo: string;
  mode: BusinessMode;
  template: string;
  colors: { primary: string; background: string; text: string; accent: string };
  font: FontName;
  radius: number;
  spacing: number;
  products: StoreProduct[];
  blocks: StoreBlock[];
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
  schema: 1;
  projects: StoreProject[];
  selectedId: string;
  visits: Record<string, number>;
}
export const fonts: Record<FontName, { label: string; family: string }> = {
  editorial: { label: 'Editorial · Georgia', family: 'Georgia, "Times New Roman", serif' },
  modern: { label: 'Moderna · Arial', family: 'Arial, Helvetica, sans-serif' },
  humanist: { label: 'Cercana · Trebuchet', family: '"Trebuchet MS", Arial, sans-serif' },
  classic: { label: 'Clásica · Palatino', family: '"Palatino Linotype", Palatino, Georgia, serif' },
};
export const blockLabels: Record<BlockKind, string> = {
  hero: 'Portada',
  catalog: 'Catálogo',
  story: 'Nuestra historia',
  benefits: 'Beneficios',
  gallery: 'Galería',
  banner: 'Anuncio',
  faq: 'Preguntas frecuentes',
  contact: 'Contacto',
};
export const templates = [
  {
    id: 'raices',
    name: 'Raíces',
    category: 'Artesanías',
    mode: 'products' as BusinessMode,
    theme: 'craft',
    description: 'Cálido, artesanal y lleno de historia.',
    colors: { primary: '#385c40', background: '#faf7ef', text: '#2d382a', accent: '#e6dbbd' },
    font: 'editorial' as FontName,
  },
  {
    id: 'sabor',
    name: 'A fuego lento',
    category: 'Gastronomía',
    mode: 'products' as BusinessMode,
    theme: 'food',
    description: 'El sabor entra por los ojos.',
    colors: { primary: '#ab432f', background: '#fff9ef', text: '#412c23', accent: '#f4cf8b' },
    font: 'classic' as FontName,
  },
  {
    id: 'alma',
    name: 'Alma',
    category: 'Belleza',
    mode: 'booking' as BusinessMode,
    theme: 'beauty',
    description: 'Un espacio delicado para cuidarse.',
    colors: { primary: '#755063', background: '#fcf6f7', text: '#3f3039', accent: '#e8cbd6' },
    font: 'editorial' as FontName,
  },
  {
    id: 'pulso',
    name: 'Pulso',
    category: 'Servicios',
    mode: 'quote' as BusinessMode,
    theme: 'service',
    description: 'Claro, profesional y al punto.',
    colors: { primary: '#235c91', background: '#f5f8fc', text: '#203449', accent: '#c5dcf3' },
    font: 'modern' as FontName,
  },
] as const;
export function createBlock(kind: BlockKind, id = crypto.randomUUID()): StoreBlock {
  const content: Record<BlockKind, [string, string]> = {
    hero: [
      'Hecho con corazón.\nPensado para ti.',
      'Descubre una selección de nuestra tierra, creada con dedicación y mucho amor.',
    ],
    catalog: ['Encuentra tu favorito', 'Piezas especiales para tus días de siempre.'],
    story: [
      'Una historia que se teje contigo',
      'Somos un emprendimiento de Sucre. Creemos en el talento local, en los detalles y en hacer las cosas con el corazón.',
    ],
    benefits: [
      'Lo que nos hace especiales',
      'Hecho en Sucre\nAtención cercana\nDetalles que importan',
    ],
    gallery: ['Así se ve lo que amamos', 'Un vistazo a nuestro universo.'],
    banner: [
      'Algo especial te espera',
      'Conoce nuestras novedades y encuentra tu próximo favorito.',
    ],
    faq: [
      '¿Tienes alguna pregunta?',
      '¿Cómo puedo comprar?|Elige tus productos y finaliza el pedido en SucreIA.\n¿Dónde están ubicados?|Encuentra nuestra ubicación en la sección de contacto.',
    ],
    contact: ['Hablemos', 'Nos encantará ayudarte a encontrar lo que buscas.'],
  };
  return {
    id,
    kind,
    title: content[kind][0],
    text: content[kind][1],
    image: '',
    visible: true,
    layout: kind === 'hero' ? 'split' : 'center',
    tone: kind === 'banner' ? 'brand' : kind === 'hero' || kind === 'story' ? 'soft' : 'paper',
    padding: 48,
  };
}
export function createDesign(templateId = 'raices', name = 'Mi emprendimiento'): StoreDesign {
  const t = templates.find((t) => t.id === templateId) ?? templates[0];
  const names =
    t.mode === 'booking'
      ? ['Corte y estilo', 'Tratamiento especial', 'Peinado de ocasión']
      : t.mode === 'quote'
        ? ['Mantenimiento', 'Instalación', 'Diagnóstico']
        : t.theme === 'food'
          ? ['Torta artesanal', 'Caja de cupcakes', 'Pasabocas surtidos']
          : ['Bolso de caña flecha', 'Sombrero artesanal', 'Canasto de iraca'];
  const blocks = (['hero', 'catalog', 'story', 'benefits', 'contact'] as BlockKind[]).map((k) =>
    createBlock(k),
  );
  blocks[0].image = `/art/${t.theme}.svg`;
  blocks[2].image = `/art/${t.theme}.svg`;
  if (t.mode === 'booking') {
    blocks[0].title = 'Un momento\nsolo para ti.';
    blocks[0].text = 'Bienestar, atención y pequeños rituales para sentirte bien.';
    blocks[1].title = 'Elige cómo quieres cuidarte';
  }
  if (t.mode === 'quote') {
    blocks[0].title = 'Tu tranquilidad,\nnuestro trabajo.';
    blocks[0].text = 'Cuéntanos qué necesitas. Preparamos una solución a tu medida.';
    blocks[1].title = 'Soluciones para tu día a día';
  }
  return {
    name,
    category: t.category,
    municipality: 'Sincelejo',
    description: blocks[0].text,
    whatsapp: '',
    address: '',
    hours: 'Lunes a sábado · 9:00 a. m. a 6:00 p. m.',
    logo: '',
    mode: t.mode,
    template: t.id,
    colors: { ...t.colors },
    font: t.font,
    radius: 16,
    spacing: 1,
    products: names.map((n, i) => ({
      id: crypto.randomUUID(),
      name: n,
      description: 'Personaliza esta descripción y agrega tu propia fotografía.',
      price: t.mode === 'quote' ? 0 : [85000, 45000, 35000][i],
      image: `/art/${t.theme}.svg`,
    })),
    blocks,
  };
}
export function moveBlock(blocks: StoreBlock[], id: string, targetId: string): StoreBlock[] {
  const from = blocks.findIndex((b) => b.id === id);
  const to = blocks.findIndex((b) => b.id === targetId);
  if (from < 0 || to < 0 || from === to) return blocks;
  const result = [...blocks];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
export function publicationErrors(d: StoreDesign): string[] {
  const errors: string[] = [];
  if (!d.name.trim()) errors.push('Escribe el nombre de tu negocio.');
  if (!d.municipality.trim()) errors.push('Indica tu municipio.');
  if (d.products.length < 3) errors.push('Agrega al menos tres productos o servicios.');
  if (d.products.some((p) => !p.name.trim() || !Number.isFinite(p.price) || p.price < 0))
    errors.push('Revisa los nombres y precios del catálogo.');
  if (!d.blocks.some((b) => b.kind === 'hero' && b.visible))
    errors.push('Incluye una portada visible.');
  if (!d.blocks.some((b) => b.kind === 'catalog' && b.visible))
    errors.push('Incluye un catálogo visible.');
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
    description: d.description,
    mode: d.mode,
    theme: templates.find((t) => t.id === d.template)?.theme ?? 'craft',
    verified: false,
    completed365: 0,
    rating: 0,
    whatsapp: d.whatsapp || null,
    products: d.products,
    local: true,
    cover: d.blocks.find((b) => b.kind === 'hero')?.image,
  };
}
export function businessHref(id: string) {
  return id.startsWith('local-') ? `/tienda?id=${encodeURIComponent(id)}` : `/negocios/${id}`;
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
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
  );
}
function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function short(v: unknown, max = 5000): v is string {
  return typeof v === 'string' && v.length <= max;
}
export function isDesign(v: unknown): v is StoreDesign {
  if (
    !record(v) ||
    !['products', 'booking', 'quote'].includes(String(v.mode)) ||
    !Object.keys(fonts).includes(String(v.font)) ||
    !record(v.colors)
  )
    return false;
  if (
    ![
      'name',
      'category',
      'municipality',
      'description',
      'whatsapp',
      'address',
      'hours',
      'template',
    ].every((k) => short(v[k]))
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
  if (
    !validImage(v.logo) ||
    typeof v.radius !== 'number' ||
    v.radius < 0 ||
    v.radius > 40 ||
    typeof v.spacing !== 'number' ||
    v.spacing < 0.5 ||
    v.spacing > 2
  )
    return false;
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
        validImage(p.image),
    )
  )
    return false;
  if (
    !Array.isArray(v.blocks) ||
    v.blocks.length > 40 ||
    !v.blocks.every(
      (b) =>
        record(b) &&
        short(b.id, 100) &&
        blockKinds.includes(b.kind as BlockKind) &&
        short(b.title, 300) &&
        short(b.text) &&
        validImage(b.image) &&
        typeof b.visible === 'boolean' &&
        ['split', 'center', 'wide'].includes(String(b.layout)) &&
        ['paper', 'soft', 'brand'].includes(String(b.tone)) &&
        typeof b.padding === 'number' &&
        b.padding >= 16 &&
        b.padding <= 100,
    )
  )
    return false;
  return (
    new Set(v.blocks.map((b) => b.id)).size === v.blocks.length &&
    new Set(v.products.map((p) => p.id)).size === v.products.length
  );
}
export function parseDesignFile(raw: string): StoreDesign {
  if (raw.length > 12_000_000) throw new Error('El archivo supera el tamaño permitido.');
  const data: unknown = JSON.parse(raw);
  if (
    !record(data) ||
    data.format !== 'sucreia-design' ||
    data.version !== 1 ||
    !isDesign(data.design)
  )
    throw new Error('Este archivo no es un diseño válido de SucreIA.');
  return data.design;
}
export function designFile(d: StoreDesign) {
  return JSON.stringify({ format: 'sucreia-design', version: 1, design: d }, null, 2);
}
export function isWorkspace(v: unknown): v is StudioWorkspace {
  if (
    !record(v) ||
    v.schema !== 1 ||
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
