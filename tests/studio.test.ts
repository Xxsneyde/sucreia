import test from 'node:test';
import { sectors } from '../src/domain/sectors.ts';
import assert from 'node:assert/strict';
import {
  createDesign,
  designOptions,
  generateContent,
  publishProject,
  publicationErrors,
  isDesign,
  isWorkspace,
  parseDesignFile,
  designFile,
  contrast,
  onColor,
  toBusiness,
  businessHref,
  upgradeDesign,
  upgradeWorkspace,
  type StoreProject,
} from '../src/domain/studio.ts';
import {
  areas,
  areaFor,
  choiceFor,
  designChoices,
  styles,
  styleIds,
} from '../src/domain/designs.ts';

function project(): StoreProject {
  return {
    id: 'local-test',
    createdAt: '2026-11-14',
    updatedAt: '2026-11-14',
    draft: createDesign('Artesanías', 'Tejidos del Caribe'),
    published: null,
    versions: [],
  };
}

test('cada sector genera un documento válido, publicable y con su forma de atención', () => {
  for (const sector of sectors) {
    const d = createDesign(sector.id, 'Mi negocio');
    assert.ok(isDesign(d), sector.id);
    assert.equal(d.category, sector.id);
    assert.equal(d.products.length, 3);
    assert.deepEqual(publicationErrors(d), [], sector.id);
    assert.equal(d.mode, areaFor(sector.area).mode);
  }
  // Las categorías anteriores se guardan con el sector equivalente.
  assert.equal(createDesign('Belleza').category, 'Belleza y bienestar');
  assert.equal(createDesign('Belleza').mode, 'booking');
  assert.equal(createDesign('Servicios').mode, 'quote');
  assert.equal(createDesign('Área inexistente').category, 'Otros sectores');
});

test('cada área ofrece los siete estilos, con sus tres recomendados primero', () => {
  for (const area of areas) {
    const options = designOptions({ ...createDesign(area.id, 'Mi negocio'), category: area.id });
    assert.equal(options.length, styleIds.length, area.id);
    assert.equal(new Set(options.map((o) => o.style)).size, styleIds.length, area.id);
    assert.deepEqual(
      options.slice(0, 3).map((o) => o.style),
      area.choices.map((c) => c.style),
      area.id,
    );
    for (const o of options) assert.ok(isDesign(o), `${area.id} · ${o.style}`);
    const choices = designChoices(area.id);
    assert.deepEqual(
      choices.map((c) => c.recommended),
      [true, true, true, false, false, false, false],
    );
  }
  // Entre todas las áreas se recomiendan los siete estilos.
  const used = new Set(areas.flatMap((a) => a.choices.map((c) => c.style)));
  assert.deepEqual([...used].sort(), [...styleIds].sort());
  // Un estilo no recomendado se aplica con una paleta válida.
  assert.equal(choiceFor('Belleza', 'brutalista').style, 'brutalista');
  assert.equal(choiceFor('Belleza', 'brutalista').recommended, false);
});

test('las propuestas conservan datos, catálogo y textos del emprendedor', () => {
  const base = createDesign('Gastronomía', 'Sabor de Sucre');
  base.products[0].name = 'Mote de queso';
  base.content.heroTitle = 'El mejor mote';
  for (const o of designOptions(base)) {
    assert.equal(o.name, 'Sabor de Sucre');
    assert.equal(o.products[0].name, 'Mote de queso');
    assert.equal(o.content.heroTitle, 'El mejor mote');
  }
});

test('todas las paletas tienen texto legible (contraste 4,5 o más)', () => {
  for (const area of areas)
    for (const c of area.choices) {
      const where = `${area.id} · ${c.style}`;
      assert.ok(contrast(c.colors.text, c.colors.background) >= 4.5, `texto/fondo ${where}`);
      assert.ok(contrast(c.colors.primary, onColor(c.colors.primary)) >= 4.5, `botón ${where}`);
      assert.ok(contrast(c.colors.accent, onColor(c.colors.accent)) >= 4.5, `acento ${where}`);
    }
});

test('cada estilo define dos tipografías como máximo', () => {
  for (const id of styleIds) {
    const { heading, body } = styles[id].fonts;
    const families = new Set([heading.split(',')[0], body.split(',')[0]]);
    assert.ok(families.size <= 2, id);
  }
});

test('los textos se generan con el nombre, el municipio y la historia propia', () => {
  const area = areaFor('Artesanías');
  const c = generateContent(area, 'Tejidos del Caribe', 'Morroa');
  assert.match(c.heroText, /Morroa/);
  assert.match(c.storyText, /Tejidos del Caribe/);
  assert.equal(c.promises.length, 3);
  const own = generateContent(area, 'Tejidos', 'Morroa', 'Tejemos desde 1990.');
  assert.equal(own.storyText, 'Tejemos desde 1990.');
  assert.doesNotMatch(generateContent(area, '', '').heroText, /\{municipio\}/);
});

test('publicar crea una instantánea independiente del borrador', () => {
  const original = project();
  const result = publishProject(original, '2026-11-14T12:00:00Z');
  assert.equal(original.published, null);
  result.draft.name = 'Otro nombre';
  result.draft.products[0].price = 1;
  assert.equal(result.published?.design.name, 'Tejidos del Caribe');
  assert.equal(result.published?.design.products[0].price, 85000);
  assert.equal(result.versions.length, 1);
});

test('publicación exige identidad, título y catálogo', () => {
  const p = project();
  p.draft.content.heroTitle = ' ';
  assert.throws(() => publishProject(p), /título principal/);
  p.draft.content.heroTitle = 'Hecho a mano';
  p.draft.products = [];
  assert.throws(() => publishProject(p), /tres productos/);
  p.draft = createDesign('Belleza', '');
  assert.ok(publicationErrors(p.draft).some((e) => e.includes('nombre')));
  p.draft.name = 'Alma';
  p.draft.whatsapp = 'no es un teléfono';
  assert.ok(publicationErrors(p.draft).some((e) => e.includes('WhatsApp')));
});

test('las últimas ocho publicaciones se conservan con contenido propio', () => {
  let p = project();
  for (let i = 0; i < 12; i++) {
    p = { ...p, draft: { ...p.draft, name: `Versión ${i}` } };
    p = publishProject(p);
  }
  assert.equal(p.versions.length, 8);
  assert.equal(p.versions[0].design.name, 'Versión 11');
  assert.equal(p.versions[7].design.name, 'Versión 4');
});

test('exportación e importación conservan el diseño completo', () => {
  const d = createDesign('Gastronomía', 'Sabor de Sucre', 2);
  d.colors.primary = '#123456';
  const parsed = parseDesignFile(designFile(d));
  assert.deepEqual(parsed, d);
  parsed.name = 'Modificado';
  assert.notEqual(parsed.name, d.name);
});

test('importación rechaza scripts, imágenes externas, estilos y formas inválidas', () => {
  const d = createDesign();
  assert.throws(() => parseDesignFile('{malformed'));
  assert.throws(() => parseDesignFile(JSON.stringify({ version: 3, design: d })));
  for (const image of [
    'javascript:alert(1)',
    'https://example.com/tracker.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
  ]) {
    assert.equal(isDesign({ ...d, logo: image }), false);
    assert.equal(isDesign({ ...d, content: { ...d.content, heroImage: image } }), false);
  }
  assert.equal(isDesign({ ...d, products: [{ ...d.products[0], price: -5 }] }), false);
  assert.equal(isDesign({ ...d, products: [d.products[0], d.products[0]] }), false);
  assert.equal(isDesign({ ...d, colors: { ...d.colors, primary: 'url(evil)' } }), false);
  assert.equal(isDesign({ ...d, style: 'comic-sans' }), false);
  assert.equal(isDesign({ ...d, content: null }), false);
});

// Formato del editor por bloques (esquema 1), como lo guardaban los navegadores.
function legacyDesign() {
  return {
    name: 'Sabor viejo',
    category: 'Gastronomía',
    municipality: 'Corozal',
    description: '',
    whatsapp: '',
    address: '',
    hours: 'Todos los días',
    logo: '',
    mode: 'products',
    template: 'sabor',
    colors: { primary: '#ab432f', background: '#fff9ef', text: '#412c23', accent: '#f4cf8b' },
    font: 'classic',
    radius: 16,
    spacing: 1,
    products: createDesign('Gastronomía').products,
    blocks: [
      {
        id: 'h',
        kind: 'hero',
        title: 'Título viejo',
        text: 'Texto viejo',
        image: '/art/food.svg',
        visible: true,
        layout: 'split',
        tone: 'soft',
        padding: 48,
      },
      {
        id: 'b',
        kind: 'benefits',
        title: 'Beneficios',
        text: 'Uno\nDos\nTres',
        image: '',
        visible: true,
        layout: 'center',
        tone: 'paper',
        padding: 48,
      },
    ],
  };
}

test('los diseños del editor anterior se convierten sin perder textos', () => {
  const upgraded = upgradeDesign(legacyDesign());
  assert.ok(isDesign(upgraded));
  assert.equal(upgraded.style, 'retro');
  assert.equal(upgraded.content.heroTitle, 'Título viejo');
  assert.deepEqual(upgraded.content.promises, ['Uno', 'Dos', 'Tres']);
  assert.equal(upgraded.colors.primary, '#ab432f');
  assert.ok(!('blocks' in upgraded) && !('template' in upgraded));
  const file = JSON.stringify({ format: 'sucreia-design', version: 1, design: legacyDesign() });
  assert.equal(parseDesignFile(file).content.heroText, 'Texto viejo');
});

test('el espacio guardado con el esquema anterior se actualiza y valida', () => {
  const old = {
    schema: 1,
    projects: [
      {
        id: 'local-viejo',
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
        draft: legacyDesign(),
        published: { id: 'v1', at: '2026-11-01', design: legacyDesign() },
        versions: [{ id: 'v1', at: '2026-11-01', design: legacyDesign() }],
      },
    ],
    selectedId: 'local-viejo',
    visits: {},
  };
  assert.equal(isWorkspace(old), false);
  assert.ok(isWorkspace(upgradeWorkspace(old)));
});

test('solo las publicaciones se muestran en el catálogo local', () => {
  const p = project();
  assert.equal(toBusiness(p), null);
  const published = publishProject(p);
  published.draft.name = 'Cambio sin publicar';
  const business = toBusiness(published)!;
  assert.equal(business.name, 'Tejidos del Caribe');
  assert.equal(business.local, true);
  assert.equal(business.verified, false);
  assert.equal(business.rating, 0);
  // «Artesanías» se guarda en el sector Moda y confección y usa su ilustración.
  assert.equal(business.category, 'Moda y confección');
  assert.equal(business.theme, 'beauty');
  assert.equal(businessHref(business.id), '/tienda?id=local-test');
  assert.equal(businessHref('tienda-1'), '/tienda?id=tienda-1');
});

test('el espacio persistido valida versiones y los datos anidados', () => {
  const workspace = {
    schema: 2,
    projects: [publishProject(project())],
    selectedId: 'local-test',
    visits: { 'local-test': 2 },
  };
  assert.ok(isWorkspace(workspace));
  assert.equal(
    isWorkspace({
      ...workspace,
      projects: [{ ...workspace.projects[0], published: { design: null } }],
    }),
    false,
  );
  assert.equal(isWorkspace({ ...workspace, visits: { x: -1 } }), false);
});

test('el color del texto de botones elige el mejor contraste', () => {
  assert.ok(contrast('#000000', '#ffffff') > 20);
  assert.equal(onColor('#ffffff'), '#18251c');
  assert.equal(onColor('#111111'), '#ffffff');
  assert.ok(contrast('#6c4de6', onColor('#6c4de6')) >= 4.5);
});

test('no se publican precios fraccionarios en COP ni productos con el mismo identificador', () => {
  const design = createDesign();
  design.products[0].price = 0.5;
  assert.ok(publicationErrors(design).some((message) => message.includes('precios')));
  design.products[0].price = 1000;
  design.products[1].id = design.products[0].id;
  assert.ok(publicationErrors(design).some((message) => message.includes('identificadores')));
});
