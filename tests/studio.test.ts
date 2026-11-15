import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDesign,
  createBlock,
  moveBlock,
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
  type StoreProject,
} from '../src/domain/studio.ts';
function project(): StoreProject {
  return {
    id: 'local-test',
    createdAt: '2026-11-14',
    updatedAt: '2026-11-14',
    draft: createDesign('raices', 'Tejidos del Caribe'),
    published: null,
    versions: [],
  };
}
test('todas las plantillas generan documentos válidos y una acción comercial', () => {
  for (const id of ['raices', 'sabor', 'alma', 'pulso']) {
    const d = createDesign(id, 'Mi negocio');
    assert.ok(isDesign(d));
    assert.equal(d.products.length, 3);
    assert.deepEqual(publicationErrors(d), []);
  }
  assert.equal(createDesign('alma').mode, 'booking');
  assert.equal(createDesign('pulso').mode, 'quote');
});
test('mover bloques no pierde contenido ni modifica el original', () => {
  const blocks = createDesign().blocks;
  const ids = blocks.map((b) => b.id);
  const moved = moveBlock(blocks, ids[0], ids[3]);
  assert.equal(moved[3].id, ids[0]);
  assert.deepEqual(
    blocks.map((b) => b.id),
    ids,
  );
  assert.deepEqual(new Set(moved.map((b) => b.id)), new Set(ids));
  assert.equal(moveBlock(blocks, 'missing', ids[0]), blocks);
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
test('publicación exige catálogo, identidad y portada visibles', () => {
  const p = project();
  p.draft.blocks.find((b) => b.kind === 'hero')!.visible = false;
  assert.throws(() => publishProject(p), /portada visible/);
  p.draft.blocks.find((b) => b.kind === 'hero')!.visible = true;
  p.draft.products = [];
  assert.throws(() => publishProject(p), /tres productos/);
  p.draft = createDesign('alma', '');
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
  const d = createDesign('sabor', 'Sabor de Sucre');
  d.blocks.push(createBlock('faq'));
  d.colors.primary = '#123456';
  const parsed = parseDesignFile(designFile(d));
  assert.deepEqual(parsed, d);
  parsed.name = 'Modificado';
  assert.notEqual(parsed.name, d.name);
});
test('importación rechaza scripts, imágenes externas, formas inválidas e identificadores duplicados', () => {
  const d = createDesign();
  assert.throws(() => parseDesignFile('{malformed'));
  assert.throws(() => parseDesignFile(JSON.stringify({ version: 2, design: d })));
  for (const image of [
    'javascript:alert(1)',
    'https://example.com/tracker.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
  ]) {
    const unsafe = { ...d, logo: image };
    assert.equal(isDesign(unsafe), false);
  }
  assert.equal(isDesign({ ...d, products: [{ ...d.products[0], price: -5 }] }), false);
  assert.equal(isDesign({ ...d, blocks: [d.blocks[0], d.blocks[0]] }), false);
  assert.equal(isDesign({ ...d, colors: { ...d.colors, primary: 'url(evil)' } }), false);
  assert.equal(isDesign({ ...d, blocks: [null] }), false);
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
  assert.equal(businessHref(business.id), '/tienda?id=local-test');
  assert.equal(businessHref('raices-de-sucre'), '/negocios/raices-de-sucre');
});
test('el espacio persistido valida versiones y los datos anidados', () => {
  const workspace = {
    schema: 1,
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
