// Datos de DEMOSTRACIÓN para presentar SucreIA igual que en la presentación.
// Crea, a través de la API (con todas sus reglas), los negocios de la presentación con sus
// fotos, productos y descuentos, y unas compras completadas con reseñas de clientes de prueba.
//
//   npm run demo -- --confirmar                  (API local en http://127.0.0.1:4000)
//   npm run demo -- --confirmar --api http://127.0.0.1:4173
//
// Por defecto solo acepta APIs en 127.0.0.1/localhost. El sitio compartido de demostración
// (https://sucreia.vercel.app, decisión del propietario para que el equipo pruebe la plataforma)
// se llena con --sitio-demo y su URL https. Nunca usarlo en un sitio con clientes reales.
// Las cuentas usan el dominio @demo.sucreia.local y los contactos son ficticios.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { createDesign, type StoreDesign } from '../../src/domain/studio.ts';
import type { BusinessMode } from '../../src/domain/types.ts';
import { centers } from '../../src/domain/geo.ts';

const args = process.argv.slice(2);
const apiIndex = args.indexOf('--api');
const api = (apiIndex >= 0 ? (args[apiIndex + 1] ?? '') : 'http://127.0.0.1:4000').replace(
  /\/$/,
  '',
);
const host = URL.canParse(api) ? new URL(api).hostname : '';
const local = ['127.0.0.1', 'localhost'].includes(host);
const shared = args.includes('--sitio-demo') && api.startsWith('https://');
if (!args.includes('--confirmar') || !(local || shared)) {
  console.error(
    'Carga datos de demostración en una API local (o en el sitio compartido de demostración).\nUso: npm run demo -- --confirmar [--api http://127.0.0.1:4000]\n     npm run demo -- --confirmar --sitio-demo --api https://sucreia.vercel.app',
  );
  process.exit(1);
}
const password = process.env.DEMO_PASSWORD ?? `demo-${randomBytes(6).toString('hex')}`;
const art = (name: string) => resolve('public/sucre', `${name}.webp`);

/** Cliente HTTP con su propia cookie de sesión. */
function account() {
  let cookie = '';
  return async <T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const res = await fetch(`${api}/api${path}`, {
      method,
      headers: {
        Origin: api,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
    const text = await res.text();
    const json = text
      ? (JSON.parse(text) as T & { error?: string })
      : ({} as T & { error?: string });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${json.error ?? text}`);
    return json;
  };
}
type Call = ReturnType<typeof account>;
async function register(
  name: string,
  email: string,
  role: 'cliente' | 'emprendedor',
  referido?: string,
) {
  const call = account();
  try {
    await call('POST', '/auth/registro', { name, email, password, role, referido });
  } catch (e) {
    if (!String((e as Error).message).includes('409')) throw e;
    await call('POST', '/auth/ingresar', { email, password }).catch(() => {
      throw new Error(
        `La cuenta ${email} ya existe con otra contraseña. Usa la misma DEMO_PASSWORD de la primera carga.`,
      );
    });
  }
  return call;
}
async function upload(call: Call, name: string) {
  const data = `data:image/webp;base64,${readFileSync(art(name)).toString('base64')}`;
  return (await call<{ image: { url: string } }>('POST', '/imagenes', { data })).image.url;
}

interface Demo {
  slug: string;
  name: string;
  sector: string;
  municipality: string;
  mode: BusinessMode;
  description: string;
  story: string;
  highlights: string[];
  cover: string;
  logo: string;
  story_image?: string;
  address: string;
  products: { name: string; price: number; group?: string; image?: string; description?: string }[];
  delivery?: number;
  promo?: { title: string; percent: number; cost: number };
}
const demos: Demo[] = [
  {
    slug: 'delicias',
    name: 'Delicias de Sucre',
    sector: 'Gastronomía y Alimentos',
    municipality: 'Sincelejo',
    mode: 'products',
    description: 'Repostería artesanal, pasabocas y tortas personalizadas en Sincelejo.',
    story:
      'Somos un emprendimiento sucreño dedicado a la elaboración de repostería artesanal, pasabocas y tortas para toda ocasión. Usamos ingredientes de calidad y recetas caseras que conservan el sabor tradicional de nuestra región.',
    highlights: [
      'Desde 2022',
      'Emprendimiento local',
      'Ingredientes de calidad',
      'Domicilio en Sincelejo',
    ],
    cover: 'demo-delicias',
    logo: 'demo-delicias-logo',
    story_image: 'demo-torta-chocolate',
    address: 'Cra. 19 # 24-56',
    delivery: 8000,
    products: [
      {
        name: 'Torta de chocolate (10 porciones)',
        price: 85000,
        group: 'Tortas',
        image: 'demo-torta-chocolate',
      },
      { name: 'Torta personalizada', price: 85000, group: 'Personalizados', image: 'demo-torta' },
      {
        name: 'Pasabocas surtidos (25 und)',
        price: 25000,
        group: 'Pasabocas',
        image: 'demo-pasabocas',
      },
      { name: 'Cupcakes (6 und)', price: 20000, group: 'Postres', image: 'demo-cupcakes' },
      { name: 'Postre de leche', price: 8000, group: 'Postres', image: 'demo-postre' },
      { name: 'Ponqué tradicional', price: 18000, group: 'Tortas', image: 'demo-ponque' },
    ],
  },
  {
    slug: 'arepas',
    name: 'Arepas de Sucre',
    sector: 'Gastronomía y Alimentos',
    municipality: 'Sincelejo',
    mode: 'products',
    description: 'Arepas tradicionales, comidas típicas y repostería artesanal.',
    story: 'Arepas hechas a mano todos los días con maíz de la región.',
    highlights: [
      'Hecho a mano',
      'Emprendimiento local',
      'Maíz de la región',
      'Domicilio en Sincelejo',
    ],
    cover: 'demo-arepas',
    logo: 'demo-arepas-logo',
    address: 'Calle 22 # 18-30',
    delivery: 5000,
    products: [
      { name: 'Arepa de queso', price: 4000, group: 'Arepas', image: 'demo-arepas' },
      { name: 'Arepa de huevo', price: 5000, group: 'Arepas' },
      { name: 'Combo típico', price: 15000, group: 'Combos' },
    ],
  },
  {
    slug: 'moda',
    name: 'Moda Caribe',
    sector: 'Moda y Confección',
    municipality: 'Corozal',
    mode: 'products',
    description: 'Ropa casual, formal y tropical con estilo sucreño.',
    story:
      'Confeccionamos prendas frescas para el clima del Caribe, con telas livianas y colores de nuestra tierra.',
    highlights: ['Confección local', 'Telas frescas', 'Tallas S a XL', 'Envíos en Sucre'],
    cover: 'demo-moda',
    logo: 'demo-moda-logo',
    address: 'Calle 28 # 26-14',
    products: [
      { name: 'Camisa de lino', price: 85000, group: 'Camisas', image: 'demo-moda' },
      { name: 'Vestido tropical', price: 120000, group: 'Vestidos' },
      { name: 'Guayabera clásica', price: 95000, group: 'Camisas' },
    ],
    promo: { title: '15% de descuento en toda la tienda', percent: 15, cost: 600 },
  },
  {
    slug: 'cabanas',
    name: 'Cabañas San Onofre',
    sector: 'Turismo y Hospedaje',
    municipality: 'San Onofre',
    mode: 'booking',
    description: 'Hospedaje campestre, naturaleza y descanso en la costa sucreña.',
    story: 'Cabañas frente al mar para descansar en familia, rodeados de naturaleza.',
    highlights: ['Frente al mar', 'Plan familiar', 'Desayuno incluido', 'Parqueadero'],
    cover: 'demo-cabanas',
    logo: 'demo-cabanas-logo',
    address: 'Vía a Rincón del Mar',
    products: [
      { name: 'Noche en cabaña doble', price: 180000, image: 'demo-cabanas' },
      { name: 'Plan fin de semana', price: 450000 },
      { name: 'Pasadía', price: 60000 },
    ],
  },
  {
    slug: 'sabor',
    name: 'Sabor Sucreño',
    sector: 'Gastronomía y Alimentos',
    municipality: 'Santiago de Tolú',
    mode: 'products',
    description: 'Platos típicos de la costa: pescado frito, arroz con coco y patacón.',
    story: 'Cocina costeña tradicional con pescado fresco del Golfo de Morrosquillo.',
    highlights: ['Pescado fresco', 'Cocina tradicional', 'Frente al Golfo', 'Para llevar'],
    cover: 'demo-pescado',
    logo: 'demo-sabor-logo',
    address: 'Malecón de Tolú',
    products: [
      { name: 'Mojarra frita con patacón', price: 32000, group: 'Platos', image: 'demo-pescado' },
      { name: 'Arroz con coco', price: 9000, group: 'Acompañantes' },
      { name: 'Jugo natural', price: 6000, group: 'Bebidas' },
    ],
    promo: { title: '20% de descuento en platos típicos seleccionados', percent: 20, cost: 400 },
  },
  {
    slug: 'spa',
    name: 'Armonía Spa',
    sector: 'Belleza y Bienestar',
    municipality: 'Sincelejo',
    mode: 'booking',
    description: 'Masajes relajantes, faciales y bienestar en Sincelejo.',
    story: 'Un espacio de calma para cuidar tu cuerpo y tu mente.',
    highlights: [
      'Con cita previa',
      'Productos naturales',
      'Terapeutas certificadas',
      'Parqueadero',
    ],
    cover: 'demo-spa',
    logo: 'demo-spa-logo',
    address: 'Calle 25 # 17-40',
    products: [
      { name: 'Masaje relajante (60 min)', price: 90000, image: 'demo-spa' },
      { name: 'Limpieza facial', price: 70000 },
      { name: 'Día de spa', price: 220000 },
    ],
  },
  {
    slug: 'sabanero',
    name: 'Sabor Sabanero',
    sector: 'Gastronomía y Alimentos',
    municipality: 'Sincelejo',
    mode: 'products',
    description: 'Comida típica de la sabana sucreña.',
    story: 'Recetas de la sabana preparadas al momento.',
    highlights: ['Comida típica', 'Porciones generosas', 'Emprendimiento local', 'Domicilio'],
    cover: 'demo-sabanero',
    logo: '',
    address: 'Calle 23 # 20-11',
    products: [
      { name: 'Bandeja sabanera', price: 28000, image: 'demo-sabanero' },
      { name: 'Mote de queso', price: 15000 },
      { name: 'Bollo limpio', price: 3000 },
    ],
  },
  {
    slug: 'artesanias',
    name: 'Artesanías Sucre',
    sector: 'Moda y Confección',
    municipality: 'Santiago de Tolú',
    mode: 'products',
    description: 'Bolsos y accesorios tejidos a mano por artesanos sucreños.',
    story: 'Tejemos a mano con fibras naturales y colores de nuestra tierra.',
    highlights: ['Tejido a mano', 'Fibras naturales', 'Piezas únicas', 'Envíos en Sucre'],
    cover: 'demo-artesanias',
    logo: '',
    address: 'Plaza principal de Tolú',
    products: [
      { name: 'Bolso tejido grande', price: 75000, image: 'demo-artesanias' },
      { name: 'Bolso tejido pequeño', price: 45000 },
      { name: 'Mochila de colores', price: 90000 },
    ],
  },
  {
    slug: 'ensenada',
    name: 'Cabañas La Ensenada',
    sector: 'Turismo y Hospedaje',
    municipality: 'Coveñas',
    mode: 'booking',
    description: 'Cabañas y pasadías en las playas de Coveñas.',
    story: 'Descanso junto al mar en el Golfo de Morrosquillo.',
    highlights: ['Playa privada', 'Plan familiar', 'Restaurante', 'Parqueadero'],
    cover: 'demo-ensenada',
    logo: '',
    address: 'Primera Ensenada, Coveñas',
    products: [
      { name: 'Noche en cabaña', price: 200000, image: 'demo-ensenada' },
      { name: 'Pasadía con almuerzo', price: 80000 },
      { name: 'Plan pareja', price: 380000 },
    ],
  },
];

/** Más emprendimientos de demostración en los 10 sectores y las 5 subregiones. */
type Extra = [
  slug: string,
  name: string,
  sector: string,
  municipality: string,
  mode: BusinessMode,
  description: string,
  cover: string,
  products: [string, number, string?][],
];
const extras: Extra[] = [
  [
    'bollos',
    'Bollos de la Abuela',
    'Gastronomía y Alimentos',
    'Corozal',
    'products',
    'Bollos limpios, de mazorca y de yuca hechos en leña.',
    'demo-pasabocas',
    [
      ['Bollo limpio (6 und)', 9000, 'Bollos'],
      ['Bollo de mazorca (6 und)', 12000, 'Bollos'],
      ['Bollo de yuca (6 und)', 10000, 'Bollos'],
    ],
  ],
  [
    'quesos',
    'Quesos El Sabanero',
    'Gastronomía y Alimentos',
    'Sampués',
    'products',
    'Queso costeño, suero atollabuey y mantequilla de la sabana.',
    'demo-ponque',
    [
      ['Queso costeño (libra)', 14000, 'Quesos'],
      ['Suero atollabuey', 8000, 'Lácteos'],
      ['Mantequilla de vaca', 9000, 'Lácteos'],
    ],
  ],
  [
    'dulces',
    'Dulces de Morroa',
    'Gastronomía y Alimentos',
    'Morroa',
    'products',
    'Dulces típicos: de coco, de leche, de papaya y alegrías.',
    'demo-postre',
    [
      ['Dulce de coco', 6000, 'Dulces'],
      ['Dulce de leche', 7000, 'Dulces'],
      ['Alegrías (10 und)', 10000, 'Dulces'],
    ],
  ],
  [
    'marisqueria',
    'Marisquería Bahía de Coveñas',
    'Gastronomía y Alimentos',
    'Coveñas',
    'products',
    'Cazuela de mariscos, arroz con camarón y pescado frito.',
    'demo-pescado',
    [
      ['Cazuela de mariscos', 38000, 'Platos'],
      ['Arroz con camarón', 30000, 'Platos'],
      ['Limonada de coco', 8000, 'Bebidas'],
    ],
  ],
  [
    'mote',
    'Mote y Sabor Mojanero',
    'Gastronomía y Alimentos',
    'Majagual',
    'products',
    'Mote de queso, pescado de río y comida típica de La Mojana.',
    'demo-sabanero',
    [
      ['Mote de queso', 12000],
      ['Bocachico frito', 22000],
      ['Arroz de coco', 7000],
    ],
  ],
  [
    'hostal-tolu',
    'Hostal Mar de Tolú',
    'Turismo y Hospedaje',
    'Santiago de Tolú',
    'booking',
    'Habitaciones frente al malecón y tours a las islas.',
    'fondo-tolu',
    [
      ['Habitación doble (noche)', 160000],
      ['Tour islas de San Bernardo', 120000],
      ['Habitación familiar (noche)', 240000],
    ],
  ],
  [
    'rincon',
    'Ecotours Rincón del Mar',
    'Turismo y Hospedaje',
    'San Onofre',
    'booking',
    'Kayak, manglares y avistamiento de aves con guías locales.',
    'demo-ensenada',
    [
      ['Recorrido en kayak', 50000],
      ['Manglares al amanecer', 60000],
      ['Pasadía en isla', 140000],
    ],
  ],
  [
    'colonial',
    'Recorridos Sincelejo Colonial',
    'Turismo y Hospedaje',
    'Sincelejo',
    'booking',
    'Caminatas guiadas por la catedral, el centro y la historia de la ciudad.',
    'fondo-catedral',
    [
      ['Recorrido histórico (2 h)', 30000],
      ['Ruta gastronómica', 55000],
      ['Recorrido nocturno', 35000],
    ],
  ],
  [
    'finca',
    'Finca Agroturística Los Montes',
    'Turismo y Hospedaje',
    'Colosó',
    'booking',
    'Senderos, cascadas y café de los Montes de María.',
    'demo-cabanas',
    [
      ['Pasadía en la finca', 70000],
      ['Sendero a la cascada', 40000],
      ['Noche en la finca', 150000],
    ],
  ],
  [
    'vueltiao',
    'Sombreros Vueltiaos de Sampués',
    'Moda y Confección',
    'Sampués',
    'products',
    'Sombreros vueltiaos 15, 19 y 21 vueltas tejidos a mano.',
    'demo-artesanias',
    [
      ['Vueltiao 15 vueltas', 90000, 'Sombreros'],
      ['Vueltiao 19 vueltas', 180000, 'Sombreros'],
      ['Manilla en caña flecha', 15000, 'Accesorios'],
    ],
  ],
  [
    'hamacas',
    'Hamacas de Morroa',
    'Moda y Confección',
    'Morroa',
    'products',
    'Hamacas y chinchorros tejidos en telar por artesanas.',
    'demo-moda',
    [
      ['Hamaca sencilla', 120000, 'Hamacas'],
      ['Hamaca doble', 180000, 'Hamacas'],
      ['Chinchorro', 150000, 'Hamacas'],
    ],
  ],
  [
    'confecciones',
    'Confecciones La Unión',
    'Moda y Confección',
    'La Unión',
    'quote',
    'Uniformes escolares y de empresa a la medida.',
    '',
    [
      ['Uniforme escolar', 0],
      ['Dotación de empresa', 0],
      ['Arreglos y ajustes', 0],
    ],
  ],
  [
    'barberia',
    'Barbería Estilo Sabanero',
    'Belleza y Bienestar',
    'Sincelejo',
    'booking',
    'Cortes clásicos y modernos, barba y cejas.',
    '',
    [
      ['Corte de cabello', 20000],
      ['Corte y barba', 30000],
      ['Diseño de cejas', 10000],
    ],
  ],
  [
    'unas',
    'Uñas y Color Corozal',
    'Belleza y Bienestar',
    'Corozal',
    'booking',
    'Manicure, pedicure y uñas en gel.',
    'demo-spa',
    [
      ['Manicure tradicional', 18000],
      ['Uñas en gel', 45000],
      ['Pedicure spa', 30000],
    ],
  ],
  [
    'natural',
    'Cosmética Natural del Golfo',
    'Belleza y Bienestar',
    'Tolú Viejo',
    'products',
    'Jabones artesanales y aceites con coco y aloe.',
    '',
    [
      ['Jabón de coco', 9000, 'Jabones'],
      ['Aceite de coco (250 ml)', 18000, 'Aceites'],
      ['Gel de aloe', 15000, 'Cuidado'],
    ],
  ],
  [
    'drogueria',
    'Droguería San Marcos',
    'Salud y Farmacia',
    'San Marcos',
    'products',
    'Medicamentos de venta libre, cuidado personal y domicilios.',
    '',
    [
      ['Botiquín básico', 45000, 'Botiquín'],
      ['Protector solar', 38000, 'Cuidado'],
      ['Suero oral (3 und)', 9000, 'Hidratación'],
    ],
  ],
  [
    'fisio',
    'Fisioterapia Integral Sincé',
    'Salud y Farmacia',
    'Sincé',
    'booking',
    'Terapia física, masajes terapéuticos y rehabilitación.',
    '',
    [
      ['Sesión de fisioterapia', 50000],
      ['Masaje terapéutico', 60000],
      ['Valoración inicial', 40000],
    ],
  ],
  [
    'optica',
    'Óptica Visión Sucre',
    'Salud y Farmacia',
    'Sincelejo',
    'booking',
    'Examen visual y monturas con garantía.',
    '',
    [
      ['Examen de optometría', 35000],
      ['Montura y lentes', 180000],
      ['Ajuste de gafas', 10000],
    ],
  ],
  [
    'tecno',
    'TecnoSucre Reparaciones',
    'Tecnología y Digital',
    'Sincelejo',
    'quote',
    'Reparación de celulares y computadores con garantía.',
    'curso-ia',
    [
      ['Cambio de pantalla', 0],
      ['Mantenimiento de computador', 0],
      ['Recuperación de datos', 0],
    ],
  ],
  [
    'web',
    'Páginas Web Sabana Digital',
    'Tecnología y Digital',
    'Corozal',
    'quote',
    'Páginas web, tiendas en línea y redes para emprendedores.',
    'curso-marketing',
    [
      ['Página para tu negocio', 0],
      ['Tienda en línea', 0],
      ['Manejo de redes sociales', 0],
    ],
  ],
  [
    'ferreteria',
    'Ferretería El Constructor',
    'Construcción y Ferretería',
    'Sincelejo',
    'products',
    'Herramientas, materiales y pinturas con domicilio.',
    '',
    [
      ['Cemento (bulto)', 34000, 'Materiales'],
      ['Pintura (galón)', 65000, 'Pinturas'],
      ['Juego de destornilladores', 28000, 'Herramientas'],
    ],
  ],
  [
    'obras',
    'Obras y Remodelaciones Ovejas',
    'Construcción y Ferretería',
    'Ovejas',
    'quote',
    'Remodelaciones, enchapes y obra blanca.',
    '',
    [
      ['Remodelación de baño', 0],
      ['Enchape de pisos', 0],
      ['Pintura de vivienda', 0],
    ],
  ],
  [
    'tabaco',
    'Tabaco y Cacao Montes de María',
    'Agro y Agroindustria',
    'Ovejas',
    'products',
    'Cacao, café y productos del campo de los Montes de María.',
    '',
    [
      ['Cacao en grano (libra)', 18000, 'Cacao'],
      ['Café molido (libra)', 22000, 'Café'],
      ['Chocolate de mesa', 12000, 'Cacao'],
    ],
  ],
  [
    'miel',
    'Miel de la Mojana',
    'Agro y Agroindustria',
    'Guaranda',
    'products',
    'Miel de abejas pura y derivados de apicultores locales.',
    '',
    [
      ['Miel pura (500 g)', 25000, 'Miel'],
      ['Polen (250 g)', 20000, 'Derivados'],
      ['Propóleo', 15000, 'Derivados'],
    ],
  ],
  [
    'vivero',
    'Vivero San Benito',
    'Agro y Agroindustria',
    'San Benito Abad',
    'products',
    'Plantas frutales, ornamentales y abono orgánico.',
    '',
    [
      ['Plántula de mango', 12000, 'Frutales'],
      ['Abono orgánico (bulto)', 25000, 'Abonos'],
      ['Planta ornamental', 18000, 'Ornamentales'],
    ],
  ],
  [
    'contable',
    'Asesorías Contables Sucre',
    'Servicios Profesionales',
    'Sincelejo',
    'quote',
    'Contabilidad, RUT y declaración de renta para emprendedores.',
    'curso-formalizacion',
    [
      ['Inscripción en el RUT', 0],
      ['Contabilidad mensual', 0],
      ['Declaración de renta', 0],
    ],
  ],
  [
    'legal',
    'Consultorio Jurídico Galeras',
    'Servicios Profesionales',
    'Galeras',
    'quote',
    'Asesoría legal, contratos y trámites.',
    'curso-costos',
    [
      ['Revisión de contrato', 0],
      ['Asesoría laboral', 0],
      ['Constitución de empresa', 0],
    ],
  ],
  [
    'eventos',
    'Eventos y Decoración Buenavista',
    'Servicios Profesionales',
    'Buenavista',
    'quote',
    'Decoración de fiestas, bodas y eventos empresariales.',
    'curso-atencion',
    [
      ['Decoración de cumpleaños', 0],
      ['Boda completa', 0],
      ['Evento empresarial', 0],
    ],
  ],
  [
    'mensajeria',
    'Mensajería Rápida Sucre',
    'Otros Sectores',
    'Sincelejo',
    'quote',
    'Domicilios y envíos dentro de Sincelejo y Corozal.',
    'repartidor',
    [
      ['Envío urbano', 0],
      ['Envío intermunicipal', 0],
      ['Mensajería empresarial', 0],
    ],
  ],
  [
    'tienda',
    'Tienda La Esquina de Caimito',
    'Otros Sectores',
    'Caimito',
    'products',
    'Víveres, aseo y productos de la canasta familiar.',
    'curso-ventas',
    [
      ['Mercado básico', 85000, 'Víveres'],
      ['Kit de aseo', 32000, 'Aseo'],
      ['Arroz (5 libras)', 14000, 'Víveres'],
    ],
  ],
];
for (const [slug, name, sector, municipality, mode, description, cover, products] of extras)
  demos.push({
    slug,
    name,
    sector,
    municipality,
    mode,
    description,
    story: `${description} Un emprendimiento de ${municipality}, Sucre.`,
    highlights: [
      'Emprendimiento local',
      municipality,
      mode === 'products'
        ? 'Pedidos por SucreIA'
        : mode === 'booking'
          ? 'Con reserva'
          : 'Cotización gratis',
      'Atención cercana',
    ],
    cover,
    logo: '',
    address: `${municipality}, Sucre`,
    products: products.map(([n, price, group], i) => ({
      name: n,
      price,
      group,
      image: i === 0 && cover ? cover : undefined,
    })),
    delivery: mode === 'products' ? 5000 : undefined,
  });

const reviews: Record<string, { client: number; rating: number; comment: string }[]> = {
  delicias: [
    {
      client: 1,
      rating: 5,
      comment:
        'La torta quedó hermosa y deliciosa. Excelente atención y entrega puntual. ¡Recomendados!',
    },
    { client: 2, rating: 5, comment: 'Los pasabocas llegaron frescos y a tiempo para la reunión.' },
    { client: 0, rating: 4, comment: 'Muy buenos cupcakes, volveré a pedir.' },
  ],
  arepas: [
    { client: 2, rating: 5, comment: 'Las mejores arepas de queso de Sincelejo.' },
    { client: 1, rating: 5, comment: 'Sabor de casa, recomendadas.' },
  ],
  moda: [{ client: 1, rating: 5, comment: 'La camisa de lino es fresca y de muy buena calidad.' }],
  sabor: [{ client: 2, rating: 5, comment: 'La mojarra frita, espectacular.' }],
  sabanero: [{ client: 0, rating: 5, comment: 'Porciones generosas y buen sabor.' }],
  artesanias: [{ client: 1, rating: 5, comment: 'Bolsos preciosos, hechos con mucho cuidado.' }],
  bollos: [
    { client: 3, rating: 5, comment: 'Como los de la casa de mi abuela.' },
    { client: 0, rating: 4, comment: 'Muy ricos, llegaron calienticos.' },
  ],
  quesos: [{ client: 4, rating: 5, comment: 'El mejor queso costeño que he probado.' }],
  dulces: [{ client: 2, rating: 5, comment: 'Las alegrías son una delicia.' }],
  marisqueria: [{ client: 3, rating: 4, comment: 'Buena cazuela, porción grande.' }],
  vueltiao: [
    { client: 4, rating: 5, comment: 'Un vueltiao fino y bien tejido.' },
    { client: 0, rating: 5, comment: 'Excelente trabajo artesanal.' },
  ],
  hamacas: [{ client: 1, rating: 5, comment: 'La hamaca es grande y muy fuerte.' }],
  natural: [{ client: 2, rating: 4, comment: 'El jabón de coco huele delicioso.' }],
  drogueria: [{ client: 3, rating: 5, comment: 'Domicilio rapidísimo.' }],
  ferreteria: [{ client: 4, rating: 4, comment: 'Tienen de todo y buenos precios.' }],
  tabaco: [{ client: 0, rating: 5, comment: 'El chocolate de mesa es buenísimo.' }],
  miel: [{ client: 1, rating: 5, comment: 'Miel pura de verdad.' }],
  vivero: [{ client: 2, rating: 4, comment: 'Plantas sanas y bien empacadas.' }],
  tienda: [{ client: 3, rating: 4, comment: 'Atención amable y entrega puntual.' }],
};

async function main() {
  console.log(`Cargando datos de demostración en ${api} …`);
  const ana = await register('Ana Demo', 'ana@demo.sucreia.local', 'cliente');
  // María se registra con el código de referidos de Ana: Ana gana puntos con su primera compra.
  const code = (await ana<{ referral: { code: string } }>('GET', '/plataforma/estado')).referral
    .code;
  const clients = [
    ana,
    await register('María P. (demo)', 'maria@demo.sucreia.local', 'cliente', code),
    await register('Carlos R. (demo)', 'carlos@demo.sucreia.local', 'cliente'),
    await register('Luis M. (demo)', 'luis@demo.sucreia.local', 'cliente'),
    await register('Sofía G. (demo)', 'sofia@demo.sucreia.local', 'cliente'),
  ];
  // Logística y agenda de cada negocio (también para los que ya existían): ubicación cerca del
  // centro de su municipio, horario por día, cupo de citas y duración de cada servicio.
  async function agenda(owner: Call, storeId: string, demo: Demo, index: number) {
    const [lat, lng] = centers[demo.municipality] ?? centers.Sincelejo;
    const angle = index * 2.399,
      radius = 0.002 + (index % 5) * 0.0012;
    const settings = (
      await owner<{ settings: Record<string, unknown> }>('GET', `/plataforma/negocios/${storeId}`)
    ).settings;
    const booking = demo.mode === 'booking';
    await owner('PUT', `/plataforma/negocios/${storeId}/configuracion`, {
      ...settings,
      delivery: !!demo.delivery,
      deliveryFee: demo.delivery ?? 0,
      opens: 8,
      closes: booking ? 19 : 18,
      latitude: +(lat + Math.sin(angle) * radius).toFixed(6),
      longitude: +(lng + Math.cos(angle) * radius).toFixed(6),
      ...(booking
        ? {
            duration: 30,
            capacity: index % 2 ? 2 : 1,
            week: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
              closed: d === 0,
              opens: d === 6 ? 8 : 9,
              closes: d === 6 ? 14 : 19,
            })),
          }
        : {}),
    });
    if (!booking) return;
    const { store } = await owner<{ store: { draft: StoreDesign } }>(
      'GET',
      `/mis-tiendas/${storeId}`,
    );
    if (store.draft.products.every((x) => x.duration)) return;
    const draft = {
      ...store.draft,
      products: store.draft.products.map((x, i) => ({
        ...x,
        duration: x.duration ?? [30, 45, 60, 90][i % 4],
      })),
    };
    await owner('PUT', `/mis-tiendas/${storeId}`, { design: draft });
    await owner('POST', `/mis-tiendas/${storeId}/publicar`);
  }

  const existing = (await account()<{ stores: { name: string }[] }>('GET', '/tiendas')).stores.map(
    (s) => s.name,
  );
  const made: Record<
    string,
    { owner: Call; id: string; products: { id: string; name: string }[] }
  > = {};
  for (const demo of demos) {
    if (existing.includes(demo.name)) {
      const owner = await register(
        `${demo.name} (demo)`,
        `${demo.slug}@demo.sucreia.local`,
        'emprendedor',
      );
      const mine = (
        await owner<{ stores: { id: string; draft: { name: string } }[] }>('GET', '/mis-tiendas')
      ).stores.find((x) => x.draft.name === demo.name);
      if (mine) {
        await agenda(owner, mine.id, demo, demos.indexOf(demo));
        const { store } = await owner<{ store: { draft: StoreDesign } }>(
          'GET',
          `/mis-tiendas/${mine.id}`,
        );
        made[demo.slug] = { owner, id: mine.id, products: store.draft.products };
      }
      console.log(`· ${demo.name}: ya existe, se actualizó su ubicación y agenda.`);
      continue;
    }
    const owner = await register(
      `${demo.name} (demo)`,
      `${demo.slug}@demo.sucreia.local`,
      'emprendedor',
    );
    const design: StoreDesign = createDesign(demo.sector, demo.name);
    design.municipality = demo.municipality;
    design.mode = demo.mode;
    design.description = demo.description;
    design.address = demo.address;
    design.whatsapp = '+573000000000';
    design.phone = '(605) 000 0000';
    design.email = `${demo.slug}@demo.sucreia.local`;
    design.logo = demo.logo ? await upload(owner, demo.logo) : '';
    design.content.heroTitle = demo.name;
    design.content.heroImage = demo.cover
      ? await upload(owner, demo.cover)
      : design.content.heroImage;
    design.content.storyText = demo.story;
    design.content.storyImage =
      demo.story_image || demo.cover
        ? await upload(owner, demo.story_image ?? demo.cover)
        : design.content.storyImage;
    design.content.promises = demo.highlights;
    design.products = [];
    for (const x of demo.products)
      design.products.push({
        id: randomUUID(),
        name: x.name,
        description: x.description ?? '',
        price: x.price,
        image: x.image ? await upload(owner, x.image) : '',
        category: x.group ?? '',
      });
    const { store } = await owner<{ store: { id: string } }>('POST', '/mis-tiendas', { design });
    await owner('POST', `/mis-tiendas/${store.id}/publicar`);
    await agenda(owner, store.id, demo, demos.indexOf(demo));
    made[demo.slug] = { owner, id: store.id, products: design.products };
    if (demo.promo) {
      const expires = new Date(Date.now() + 60 * 86_400_000).toISOString();
      await owner('POST', `/plataforma/negocios/${store.id}/promociones`, {
        ...demo.promo,
        expires,
      });
    }
    // Compras completadas con reseña (solo negocios de productos: el flujo real lo exige).
    for (const r of demo.mode === 'products' ? (reviews[demo.slug] ?? []) : []) {
      const buyer = clients[r.client];
      const product = design.products[0];
      const { operation } = await buyer<{ operation: { id: string; pin: string } }>(
        'POST',
        '/plataforma/operaciones',
        {
          storeId: store.id,
          key: randomUUID(),
          kind: 'products',
          items: [{ productId: product.id, quantity: demo.slug === 'delicias' ? 3 : 2 }],
          phone: '+573000000000',
          fulfillment: 'pickup',
          paymentMethod: 'cash',
        },
      );
      for (const action of ['prepare', 'ready', 'payment'])
        await owner('POST', `/plataforma/operaciones/${operation.id}/${action}`);
      await owner('POST', `/plataforma/operaciones/${operation.id}/complete`, {
        pin: operation.pin,
      });
      await buyer('POST', '/plataforma/resenas', {
        operationId: operation.id,
        rating: r.rating,
        comment: r.comment,
      });
    }
    // Un pedido de Ana en preparación para ver el seguimiento de la entrega.
    if (demo.slug === 'delicias') {
      const { operation } = await clients[0]<{ operation: { id: string } }>(
        'POST',
        '/plataforma/operaciones',
        {
          storeId: store.id,
          key: randomUUID(),
          kind: 'products',
          items: [{ productId: design.products[3].id, quantity: 1 }],
          phone: '+573000000000',
          fulfillment: 'delivery',
          address: 'Cra. 20 # 25-10, Sincelejo',
          paymentMethod: 'cash',
        },
      );
      await owner('POST', `/plataforma/operaciones/${operation.id}/prepare`);
    }
    console.log(`✓ ${demo.name}`);
  }
  // Ferias, eventos y domiciliarios necesitan una cuenta administradora: la primera vez se crea
  // como cliente; se habilita con `npm run admin` (o SQL en Supabase) y se vuelve a ejecutar.
  const admin = await register('Administración (demo)', 'admin@demo.sucreia.local', 'cliente');
  // Domiciliario de prueba (Sincelejo): la administración lo aprueba para las entregas a domicilio.
  const courier = await register(
    'Pedro Domiciliario (demo)',
    'pedro@demo.sucreia.local',
    'cliente',
  );
  // Registrar de nuevo lo devolvería a revisión: solo se envía si falta el perfil o el vehículo.
  const profile = (
    await courier<{ courier: { vehicle?: string } | null }>('GET', '/plataforma/estado')
  ).courier;
  if (!profile?.vehicle)
    await courier('PUT', '/plataforma/domiciliario', {
      phone: '+573000000000',
      municipality: 'Sincelejo',
      vehicle: 'Moto',
      avatar: '',
    });
  try {
    const me = (
      await courier<{ courier: { id: string; approved: boolean } }>('GET', '/plataforma/estado')
    ).courier;
    if (!me.approved)
      await admin('POST', `/plataforma/admin/domiciliarios/${me.id}`, {
        approved: true,
        note: 'Domiciliario de demostración',
      });
    console.log('✓ Domiciliario aprobado (pedro@demo.sucreia.local)');
  } catch {
    console.log('· Domiciliario: pendiente de aprobación (falta la cuenta administradora).');
  }
  await movimiento();
  const day = (offset: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
      new Date(Date.now() + offset * 86_400_000),
    );
  const events = [
    {
      title: 'Feria del Emprendimiento Sucreño',
      place: 'Plaza Majagual',
      municipality: 'Sincelejo',
      date: day(0),
      points: 100,
      code: 'FERIA2026',
    },
    {
      title: 'Festival del Vueltiao',
      place: 'Parque principal',
      municipality: 'Sampués',
      date: day(12),
      points: 80,
      code: 'VUELTIAO',
    },
    {
      title: 'Mercado Campesino de los Montes',
      place: 'Plaza de Ovejas',
      municipality: 'Ovejas',
      date: day(25),
      points: 60,
      code: 'CAMPESINO',
    },
  ];
  try {
    const listed = (
      await admin<{ events: { title: string }[] }>('GET', '/plataforma/eventos')
    ).events.map((e) => e.title);
    for (const e of events.filter((x) => !listed.includes(x.title)))
      await admin('POST', '/plataforma/admin/eventos', e);
    console.log(`✓ Ferias y eventos (código de la feria de hoy: ${events[0].code})`);
  } catch {
    console.log(
      '· Ferias y eventos: falta la cuenta administradora. Con la API detenida ejecuta\n  npm run admin -- admin@demo.sucreia.local  y vuelve a correr este comando.',
    );
  }
  async function movimiento() {
    // Movimiento para probar los tableros: pedidos a domicilio esperando domiciliario en
    // Sincelejo y citas de los próximos días en el spa. Solo si no hay ya algo activo.
    const shop = made.delicias,
      spa = made.spa;
    type Op = { storeId: string; status: string; kind: string; slot: string };
    const active = async (x: typeof shop) =>
      (await x.owner<{ sales: Op[] }>('GET', '/plataforma/estado')).sales.filter(
        (o) =>
          o.storeId === x.id &&
          ['pending', 'preparing', 'ready'].includes(o.status) &&
          o.kind === 'products',
      ).length;
    if (shop && (await active(shop)) < 3) {
      const [lat, lng] = centers.Sincelejo;
      for (const [i, who] of [1, 2].entries()) {
        const { operation } = await clients[who]<{ operation: { id: string } }>(
          'POST',
          '/plataforma/operaciones',
          {
            storeId: shop.id,
            key: randomUUID(),
            kind: 'products',
            items: [{ productId: shop.products[i].id, quantity: 1 + i }],
            phone: '+573000000000',
            fulfillment: 'delivery',
            address: i
              ? 'Calle 28 # 16-40, barrio La Ford, Sincelejo'
              : 'Cra. 25 # 22-15, barrio Majagual, Sincelejo',
            addressLat: lat + (i ? 0.006 : -0.004),
            addressLng: lng + (i ? -0.005 : 0.007),
            paymentMethod: 'cash',
          },
        );
        if (i) await shop.owner('POST', `/plataforma/operaciones/${operation.id}/prepare`);
      }
      console.log('✓ Pedidos a domicilio en Sincelejo para el domiciliario de prueba');
    }
    if (spa) {
      const future = (await spa.owner<{ sales: Op[] }>('GET', '/plataforma/estado')).sales.filter(
        (o) =>
          o.storeId === spa.id &&
          o.kind === 'booking' &&
          Date.parse(o.slot) > Date.now() &&
          ['pending', 'accepted'].includes(o.status),
      ).length;
      if (future < 2)
        for (const [i, who] of [0, 2, 3].entries()) {
          const offer = spa.products[i % spa.products.length];
          const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
            new Date(Date.now() + (i + 1) * 86_400_000),
          );
          const { slots } = await clients[who]<{ slots: string[] }>(
            'GET',
            `/plataforma/negocios/${spa.id}/horarios?fecha=${date}&servicio=${offer.id}`,
          );
          if (!slots.length) continue;
          const { operation } = await clients[who]<{ operation: { id: string } }>(
            'POST',
            '/plataforma/operaciones',
            {
              storeId: spa.id,
              key: randomUUID(),
              kind: 'booking',
              items: [{ productId: offer.id, quantity: 1 }],
              detail: `${offer.name}: primera vez, por favor.`,
              phone: '+573000000000',
              slot: slots[Math.min(slots.length - 1, 2 + i * 3)],
              paymentMethod: 'cash',
            },
          );
          if (i !== 1) await spa.owner('POST', `/plataforma/operaciones/${operation.id}/confirm`);
        }
      console.log('✓ Citas de los próximos días en Armonía Spa');
    }
  }
  console.log(`\nListo. Cuentas de demostración (contraseña: ${password}):`);
  console.log('  Cliente: ana@demo.sucreia.local · Negocio: delicias@demo.sucreia.local');
  if (!process.env.DEMO_PASSWORD)
    console.log('  Para fijar la contraseña usa DEMO_PASSWORD=… npm run demo -- --confirmar');
}
main().catch((e) => {
  console.error(`No se completó la carga: ${(e as Error).message}`);
  process.exitCode = 1;
});
