import { test, expect } from '@playwright/test';
import { createDesign } from '../../src/domain/studio.ts';
import { account, fits, publishedStore, TERMS_VERSION } from './helpers.ts';

test('la dirección principal lleva al ingreso; un negocio publicado se ve sin cuenta y un borrador no', async ({
  page,
  browser,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const owner = await browser.newPage();
  await account(owner, 'emprendedor', 'publico');
  const live = await publishedStore(owner, 'Moda y Confección', `Visible ${suffix}`);
  const draft = await owner.request.post('/api/mis-tiendas', {
    data: {
      design: createDesign('Moda y Confección', `Borrador ${suffix}`),
      termsVersion: TERMS_VERSION,
    },
  });
  expect(draft.status()).toBe(201);
  const draftId = ((await draft.json()) as { store: { id: string } }).store.id;
  // Buscar (con cuenta) muestra solo lo publicado.
  await owner.goto('/buscar');
  await owner.getByRole('searchbox', { name: '¿Qué producto o servicio necesitas?' }).fill(suffix);
  await owner.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(owner.locator('.sx-biz')).toHaveCount(1);
  await expect(owner.locator('.sx-biz')).toContainText(`Visible ${suffix}`);
  await expect(owner.locator('.sx-biz')).not.toContainText('Borrador');
  await owner.close();

  await page.goto('/');
  await expect(page).toHaveURL(/ingresar/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Bienvenido a SucreIA!');
  // La imagen del acceso lleva a buscar, que pide cuenta.
  await page.getByRole('link', { name: 'Explorar los negocios de SucreIA' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('volver')).toMatch(/^\/buscar/);
  // La página de cada negocio publicado es pública.
  await page.goto(`/tienda?id=${live.id}`);
  await expect(page.getByRole('heading', { level: 1, name: `Visible ${suffix}` })).toBeVisible();
  await expect(page.locator('a[href^="/panel"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true }).first()).toBeAttached();
  expect(await fits(page)).toBe(true);
  await page.goto(`/tienda?id=${draftId}`);
  await expect(
    page.getByRole('heading', { name: 'Este negocio no está disponible' }),
  ).toBeVisible();
});

test('las páginas con cuenta piden sesión y conservan el destino', async ({ page }) => {
  for (const path of [
    '/buscar',
    '/mapa',
    '/sectores',
    '/panel',
    '/panel/negocios',
    '/perfil',
    '/carrito',
    '/pedidos',
    '/notificaciones',
    '/admin',
  ]) {
    await page.goto(path);
    // Al arrancar, Nuxt quita y repone la consulta un instante: se espera la dirección final.
    await expect.poll(() => new URL(page.url()).searchParams.get('volver')).toBe(path);
    await expect(page).toHaveURL(/ingresar/);
  }
  // Las páginas informativas no piden cuenta.
  for (const path of ['/terminos', '/quienes-somos']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  }
});

test('si no carga la API, buscar informa y permite reintentar sin mostrar ejemplos', async ({
  page,
}) => {
  await account(page, 'cliente', 'sin-api');
  await page.route('**/api/tiendas', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Sin conexión de prueba.' }),
    }),
  );
  await page.goto('/buscar');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los negocios');
  await expect(page.locator('.sx-biz')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});
