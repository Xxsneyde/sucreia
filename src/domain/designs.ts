// Diseños de tienda generados según el área del emprendimiento.
// Cada área ofrece 3 opciones; cada opción combina un estilo visual, una paleta y una tipografía.
// Datos puros (sin Vue) para poder probarlos y reutilizarlos en el backend.
import type { BusinessMode } from './types.ts';

export const styleIds = [
  'minimalista',
  'brutalista',
  'editorial',
  'organico',
  'elegante',
  'moderno',
  'retro',
] as const;
export type StyleId = (typeof styleIds)[number];
export type ArtTheme = 'craft' | 'food' | 'beauty' | 'service';

export interface StyleDefinition {
  id: StyleId;
  name: string;
  /** Qué transmite el estilo; se muestra al emprendedor al elegir. */
  description: string;
  /** Tipografías: títulos y texto. Se cargan localmente (@fontsource). */
  fonts: { heading: string; body: string; label: string };
  radius: number;
  spacing: number;
}

const sans = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const serif = 'Georgia, "Times New Roman", serif';

export const styles: Record<StyleId, StyleDefinition> = {
  minimalista: {
    id: 'minimalista',
    name: 'Minimalista',
    description: 'Espacio, orden y nada que distraiga. Transmite claridad y seriedad.',
    fonts: {
      heading: `"DM Sans Variable", ${sans}`,
      body: `"DM Sans Variable", ${sans}`,
      label: 'DM Sans',
    },
    radius: 4,
    spacing: 1.15,
  },
  brutalista: {
    id: 'brutalista',
    name: 'Brutalista',
    description: 'Bordes gruesos, contraste alto y mucha personalidad. Imposible de ignorar.',
    fonts: {
      heading: `"Archivo Black", ${sans}`,
      body: `"Space Grotesk Variable", ${sans}`,
      label: 'Archivo Black + Space Grotesk',
    },
    radius: 0,
    spacing: 1,
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Como una revista: títulos con carácter y una historia bien contada.',
    fonts: {
      heading: `"Fraunces Variable", ${serif}`,
      body: `"Inter Variable", ${sans}`,
      label: 'Fraunces + Inter',
    },
    radius: 2,
    spacing: 1.1,
  },
  organico: {
    id: 'organico',
    name: 'Orgánico',
    description: 'Formas suaves y tonos de la tierra. Cercano, cálido y artesanal.',
    fonts: {
      heading: `"Young Serif", ${serif}`,
      body: `"Nunito Sans Variable", ${sans}`,
      label: 'Young Serif + Nunito Sans',
    },
    radius: 28,
    spacing: 1.05,
  },
  elegante: {
    id: 'elegante',
    name: 'Elegante',
    description: 'Detalles finos y mucho aire. Para marcas que cuidan cada detalle.',
    fonts: {
      heading: `"Cormorant Garamond Variable", ${serif}`,
      body: `"Jost Variable", ${sans}`,
      label: 'Cormorant Garamond + Jost',
    },
    radius: 0,
    spacing: 1.2,
  },
  moderno: {
    id: 'moderno',
    name: 'Moderno',
    description: 'Profesional y directo, con la información siempre a la vista.',
    fonts: {
      heading: `"Manrope Variable", ${sans}`,
      body: `"Manrope Variable", ${sans}`,
      label: 'Manrope',
    },
    radius: 14,
    spacing: 1,
  },
  retro: {
    id: 'retro',
    name: 'Retro',
    description: 'Con aire de tienda de barrio de toda la vida: alegre y memorable.',
    fonts: {
      heading: `"Abril Fatface", ${serif}`,
      body: `"Work Sans Variable", ${sans}`,
      label: 'Abril Fatface + Work Sans',
    },
    radius: 10,
    spacing: 1,
  },
};

export interface Palette {
  primary: string;
  background: string;
  text: string;
  accent: string;
}
export interface DesignChoice {
  style: StyleId;
  colors: Palette;
}
export interface AreaCopy {
  heroTitle: string;
  heroText: string;
  catalogTitle: string;
  catalogText: string;
  storyTitle: string;
  storyText: string;
  /** Tres compromisos verificables por el propio negocio (nada de reseñas ni sellos inventados). */
  promises: [string, string, string];
  contactTitle: string;
  contactText: string;
}
export interface AreaDefinition {
  id: string;
  theme: ArtTheme;
  mode: BusinessMode;
  products: { name: string; description: string; price: number }[];
  copy: AreaCopy;
  choices: [DesignChoice, DesignChoice, DesignChoice];
}

// Las frases usan {nombre} y {municipio}; se reemplazan al generar el diseño.
export const areas: AreaDefinition[] = [
  {
    id: 'Artesanías',
    theme: 'craft',
    mode: 'products',
    products: [
      { name: 'Bolso de caña flecha', description: 'Tejido a mano, color natural.', price: 85000 },
      { name: 'Sombrero vueltiao', description: 'Tradición que se lleva puesta.', price: 120000 },
      { name: 'Canasto de iraca', description: 'Una pieza única para tu hogar.', price: 45000 },
    ],
    copy: {
      heroTitle: 'Hecho a mano,\nhecho para durar.',
      heroText:
        'Piezas tejidas en {municipio} con fibras naturales y la paciencia de quien conoce su oficio.',
      catalogTitle: 'Piezas de la colección',
      catalogText: 'Cada pieza es única: puede variar un poco en color y forma.',
      storyTitle: 'Detrás de cada pieza',
      storyText:
        'En {nombre} trabajamos con técnicas que pasan de generación en generación. Comprarnos es apoyar el talento de Sucre.',
      promises: [
        'Hecho a mano en Sucre',
        'Precios claros en pesos',
        'Hablas directo con quien lo hace',
      ],
      contactTitle: 'Visítanos o escríbenos',
      contactText: 'Te contamos cómo se hace cada pieza y te ayudamos a elegir.',
    },
    choices: [
      {
        style: 'organico',
        colors: { primary: '#3d5a3c', background: '#f7f1e6', text: '#2b2a22', accent: '#e4d3b4' },
      },
      {
        style: 'editorial',
        colors: { primary: '#8a3b1f', background: '#fbf8f2', text: '#1f1b16', accent: '#efe3cf' },
      },
      {
        style: 'minimalista',
        colors: { primary: '#1d1d1b', background: '#ffffff', text: '#1d1d1b', accent: '#f2eee7' },
      },
    ],
  },
  {
    id: 'Gastronomía',
    theme: 'food',
    mode: 'products',
    products: [
      {
        name: 'Torta artesanal',
        description: 'Para celebrar, por porción o entera.',
        price: 45000,
      },
      { name: 'Caja de cupcakes', description: 'Seis unidades, sabores surtidos.', price: 35000 },
      { name: 'Pasabocas surtidos', description: 'Bandeja para compartir.', price: 60000 },
    ],
    copy: {
      heroTitle: 'Sabor de casa,\nhecho hoy.',
      heroText:
        'Preparamos todo al momento en {municipio}, con ingredientes frescos y recetas propias.',
      catalogTitle: 'Nuestro menú',
      catalogText: 'Haz tu pedido y te avisamos cuando esté listo.',
      storyTitle: 'Cocinamos como en casa',
      storyText:
        '{nombre} nació en una cocina familiar. Hoy seguimos cocinando igual: con calma, con cariño y sin atajos.',
      promises: ['Preparado el mismo día', 'Ingredientes frescos', 'Precios claros en pesos'],
      contactTitle: 'Haz tu pedido',
      contactText: 'Escríbenos para pedidos especiales, eventos y celebraciones.',
    },
    choices: [
      {
        style: 'retro',
        colors: { primary: '#b8321b', background: '#fff5e1', text: '#2a1a12', accent: '#f2b84b' },
      },
      {
        style: 'organico',
        colors: { primary: '#7a4b23', background: '#fbf3e8', text: '#2e2117', accent: '#ecd2ae' },
      },
      {
        style: 'brutalista',
        colors: { primary: '#c2410c', background: '#fffdf5', text: '#111111', accent: '#ffd23f' },
      },
    ],
  },
  {
    id: 'Belleza',
    theme: 'beauty',
    mode: 'booking',
    products: [
      { name: 'Corte y estilo', description: 'Asesoría, lavado y peinado.', price: 35000 },
      { name: 'Manicure y pedicure', description: 'Cuidado completo con esmaltado.', price: 40000 },
      { name: 'Peinado de ocasión', description: 'Para bodas, grados y eventos.', price: 70000 },
    ],
    copy: {
      heroTitle: 'Un momento\nsolo para ti.',
      heroText: 'Atención con cita en {municipio}, sin afanes y con productos de calidad.',
      catalogTitle: 'Servicios',
      catalogText: 'Elige tu servicio y reserva el día que prefieras.',
      storyTitle: 'Te cuidamos de verdad',
      storyText:
        'En {nombre} creemos que sentirse bien empieza por ser escuchado. Cada cita es a tu ritmo.',
      promises: [
        'Atención con cita',
        'Herramientas desinfectadas',
        'Precios claros antes de empezar',
      ],
      contactTitle: 'Reserva tu cita',
      contactText: 'Te confirmamos la disponibilidad y te esperamos.',
    },
    choices: [
      {
        style: 'elegante',
        colors: { primary: '#7d5a44', background: '#faf6f1', text: '#2a2320', accent: '#ebe0d3' },
      },
      {
        style: 'minimalista',
        colors: { primary: '#2b2b2b', background: '#ffffff', text: '#222222', accent: '#f6ebe8' },
      },
      {
        style: 'editorial',
        colors: { primary: '#963a58', background: '#fdf8f6', text: '#2a1d22', accent: '#f3e1e6' },
      },
    ],
  },
  {
    id: 'Servicios',
    theme: 'service',
    mode: 'quote',
    products: [
      { name: 'Mantenimiento', description: 'Revisión y ajuste preventivo.', price: 0 },
      { name: 'Instalación', description: 'Montaje con materiales garantizados.', price: 0 },
      { name: 'Diagnóstico', description: 'Revisamos y te explicamos qué hacer.', price: 0 },
    ],
    copy: {
      heroTitle: 'Trabajo bien hecho,\na la primera.',
      heroText:
        'Cuéntanos qué necesitas en {municipio} y te enviamos una propuesta clara, sin sorpresas.',
      catalogTitle: 'Lo que hacemos',
      catalogText: 'Cada trabajo empieza con una cotización sin compromiso.',
      storyTitle: 'Así trabajamos',
      storyText:
        'En {nombre} cumplimos lo que acordamos: precio, tiempo y limpieza. Si algo cambia, te avisamos antes.',
      promises: [
        'Cotización sin compromiso',
        'Precio acordado antes de empezar',
        'Respondemos el mismo día',
      ],
      contactTitle: 'Pide tu cotización',
      contactText: 'Describe el trabajo y te respondemos con una propuesta.',
    },
    choices: [
      {
        style: 'moderno',
        colors: { primary: '#1f5fbf', background: '#f6f8fb', text: '#142133', accent: '#dce8f8' },
      },
      {
        style: 'brutalista',
        colors: { primary: '#2341e6', background: '#f4f1ea', text: '#0f0f0f', accent: '#ffe14d' },
      },
      {
        style: 'minimalista',
        colors: { primary: '#0f3d3e', background: '#ffffff', text: '#121212', accent: '#edf3f2' },
      },
    ],
  },
  {
    id: 'Moda',
    theme: 'beauty',
    mode: 'products',
    products: [
      { name: 'Vestido de lino', description: 'Fresco, tallas S a XL.', price: 140000 },
      { name: 'Camisa bordada', description: 'Bordado a mano, algodón.', price: 95000 },
      {
        name: 'Sandalias de cuero',
        description: 'Hechas en Sucre, tallas 35 a 41.',
        price: 110000,
      },
    ],
    copy: {
      heroTitle: 'Ropa con\nidentidad propia.',
      heroText:
        'Diseñamos y confeccionamos en {municipio} prendas pensadas para el clima y para durar.',
      catalogTitle: 'Nueva colección',
      catalogText: 'Pregúntanos por tallas y colores disponibles.',
      storyTitle: 'Hecho aquí, con criterio',
      storyText:
        '{nombre} es moda local: telas escogidas, costuras cuidadas y piezas que no vas a ver en todas partes.',
      promises: ['Confección local', 'Asesoría de tallas', 'Precios claros en pesos'],
      contactTitle: 'Escríbenos',
      contactText: 'Te ayudamos con tallas, medidas y apartados.',
    },
    choices: [
      {
        style: 'editorial',
        colors: { primary: '#111111', background: '#f7f4ef', text: '#111111', accent: '#e8ded2' },
      },
      {
        style: 'brutalista',
        colors: { primary: '#d6002a', background: '#ffffff', text: '#0a0a0a', accent: '#ffc2d9' },
      },
      {
        style: 'elegante',
        colors: { primary: '#c9a46a', background: '#151413', text: '#f2ede4', accent: '#2a2724' },
      },
    ],
  },
  {
    id: 'Turismo',
    theme: 'service',
    mode: 'booking',
    products: [
      {
        name: 'Tour por el Golfo',
        description: 'Día completo, transporte incluido.',
        price: 180000,
      },
      { name: 'Ruta gastronómica', description: 'Medio día con degustaciones.', price: 90000 },
      { name: 'Paseo en lancha', description: 'Dos horas, chaleco incluido.', price: 75000 },
    ],
    copy: {
      heroTitle: 'Conoce Sucre\ncon quien lo vive.',
      heroText:
        'Recorridos desde {municipio} con guías locales, grupos pequeños y salidas confirmadas.',
      catalogTitle: 'Experiencias',
      catalogText: 'Reserva la fecha y te confirmamos cupo y punto de encuentro.',
      storyTitle: 'Guías de aquí',
      storyText:
        'En {nombre} te mostramos los lugares que nos gustan, con respeto por la comunidad y la naturaleza.',
      promises: ['Guías locales', 'Grupos pequeños', 'Confirmación antes de pagar'],
      contactTitle: 'Planea tu salida',
      contactText: 'Cuéntanos fecha y número de personas.',
    },
    choices: [
      {
        style: 'organico',
        colors: { primary: '#1f6f5c', background: '#f4f8f2', text: '#1c2b26', accent: '#d3e6d7' },
      },
      {
        style: 'editorial',
        colors: { primary: '#0d5c75', background: '#fbf8f1', text: '#13232a', accent: '#f2e3c4' },
      },
      {
        style: 'moderno',
        colors: { primary: '#00707f', background: '#f5fafb', text: '#10262b', accent: '#d2eef1' },
      },
    ],
  },
  {
    id: 'Salud',
    theme: 'service',
    mode: 'booking',
    products: [
      { name: 'Consulta general', description: 'Valoración y recomendaciones.', price: 60000 },
      { name: 'Terapia física', description: 'Sesión de 45 minutos.', price: 55000 },
      {
        name: 'Control de seguimiento',
        description: 'Para pacientes con tratamiento.',
        price: 40000,
      },
    ],
    copy: {
      heroTitle: 'Atención cercana\ny responsable.',
      heroText:
        'Consultas con cita en {municipio}. Te explicamos todo con calma y en palabras claras.',
      catalogTitle: 'Servicios',
      catalogText: 'Reserva tu cita; te confirmamos el horario.',
      storyTitle: 'Tu bienestar primero',
      storyText:
        'En {nombre} atendemos con tiempo, escuchamos y te acompañamos durante todo el proceso.',
      promises: ['Atención con cita', 'Información clara', 'Precios claros antes de la consulta'],
      contactTitle: 'Agenda tu cita',
      contactText: 'Escríbenos y te ayudamos a encontrar un horario.',
    },
    choices: [
      {
        style: 'moderno',
        colors: { primary: '#11796b', background: '#f6faf9', text: '#12302b', accent: '#d6eee9' },
      },
      {
        style: 'minimalista',
        colors: { primary: '#1e4f7a', background: '#ffffff', text: '#14202b', accent: '#edf3f8' },
      },
      {
        style: 'organico',
        colors: { primary: '#4a7345', background: '#f6f8f1', text: '#222d20', accent: '#dde8cf' },
      },
    ],
  },
  {
    id: 'Otro',
    theme: 'craft',
    mode: 'products',
    products: [
      {
        name: 'Producto destacado',
        description: 'Describe aquí tu producto principal.',
        price: 50000,
      },
      { name: 'Segundo producto', description: 'Cuenta qué lo hace especial.', price: 35000 },
      { name: 'Tercer producto', description: 'Agrega una foto propia.', price: 25000 },
    ],
    copy: {
      heroTitle: 'Talento de Sucre,\ncerca de ti.',
      heroText: 'Un emprendimiento de {municipio} hecho con dedicación y atención personal.',
      catalogTitle: 'Lo que ofrecemos',
      catalogText: 'Pregúntanos lo que necesites antes de pedir.',
      storyTitle: 'Quiénes somos',
      storyText:
        '{nombre} es un emprendimiento local. Nos importa hacer bien las cosas y atenderte como te gustaría.',
      promises: ['Emprendimiento local', 'Atención personal', 'Precios claros en pesos'],
      contactTitle: 'Hablemos',
      contactText: 'Escríbenos y te respondemos lo antes posible.',
    },
    choices: [
      {
        style: 'minimalista',
        colors: { primary: '#222222', background: '#ffffff', text: '#1b1b1b', accent: '#f1f1ee' },
      },
      {
        style: 'moderno',
        colors: { primary: '#3949ab', background: '#f6f7fb', text: '#161a33', accent: '#dfe3f6' },
      },
      {
        style: 'editorial',
        colors: { primary: '#7a3e2a', background: '#fbf8f3', text: '#1e1a16', accent: '#ece2d2' },
      },
    ],
  },
];

export const areaNames = areas.map((a) => a.id);

/** Área del negocio; si la categoría no existe se usa «Otro». */
export function areaFor(category: string): AreaDefinition {
  return areas.find((a) => a.id === category) ?? areas[areas.length - 1];
}

/** Reemplaza {nombre} y {municipio} en los textos de un área. */
export function fill(text: string, name: string, municipality: string) {
  return text
    .replaceAll('{nombre}', name.trim() || 'nuestro negocio')
    .replaceAll('{municipio}', municipality.trim() || 'Sucre');
}

/** Pasos para comprar según la forma de atención; muestran un proceso claro y honesto. */
export function purchaseSteps(mode: BusinessMode): [string, string][] {
  if (mode === 'booking')
    return [
      ['Elige el servicio', 'Revisa precios y duración.'],
      ['Reserva tu fecha', 'Indica el día y la hora que prefieres.'],
      ['Te confirmamos', 'El negocio confirma la cita contigo.'],
    ];
  if (mode === 'quote')
    return [
      ['Cuéntanos qué necesitas', 'Describe el trabajo con detalle.'],
      ['Recibe la propuesta', 'Te enviamos precio y tiempo.'],
      ['Acepta y agenda', 'Solo pagas lo acordado.'],
    ];
  return [
    ['Elige tus productos', 'Precios claros, en pesos.'],
    ['Haz tu pedido', 'Desde esta página, en un minuto.'],
    ['Recoge o coordina', 'Te avisamos cuando esté listo.'],
  ];
}
