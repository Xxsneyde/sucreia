import { test, expect } from '@playwright/test';
import { createDesign } from '../../src/domain/studio.ts';
import { fits } from './helpers.ts';

test('desde la portada se explora solo lo publicado, sin menús del negocio', async ({
  page,
  request,
}) => {
  const suffix = crypto.randomUUID();
  expect(
    (
      await request.post('/api/auth/registro', {
        data: {
          email: `publico-${suffix}@ejemplo.co`,
          name: 'Negocio',
          password: 'clave-segura-1',
          role: 'emprendedor',
        },
      })
    ).status(),
  ).toBe(201);
  const live = await (
    await request.post('/api/mis-tiendas', {
      data: { design: createDesign('Artesanías', `Visible ${suffix}`) },
    })
  ).json();
  await request.post('/api/mis-tiendas', {
    data: { design: createDesign('Artesanías', `Borrador ${suffix}`) },
  });
  expect((await request.post(`/api/mis-tiendas/${live.store.id}/publicar`)).status()).toBe(200);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('El ecosistema digital');
  await page.getByRole('link', { name: 'Explorar negocios', exact: true }).click();
  await expect(page).toHaveURL(/buscar/);
  await page.getByRole('searchbox', { name: '¿Qué producto o servicio necesitas?' }).fill(suffix);
  await expect(page.locator('.sx-biz')).toHaveCount(1);
  await expect(page.locator('.sx-biz')).toContainText(`Visible ${suffix}`);
  await expect(page.locator('.sx-biz')).not.toContainText('Borrador');
  await page.locator('.sx-biz h3').getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1, name: `Visible ${suffix}` })).toBeVisible();
  await expect(page.locator('a[href^="/panel"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true }).first()).toBeAttached();
  expect(await fits(page)).toBe(true);
});

test('las páginas con cuenta piden sesión y conservan el destino', async ({ page }) => {
  for (const path of [
    '/inicio',
    '/panel',
    '/perfil',
    '/carrito',
    '/puntos',
    '/escuela',
    '/admin',
  ]) {
    await page.goto(path);
    // Al arrancar, Nuxt quita y repone la consulta un instante: se espera la dirección final.
    await expect.poll(() => new URL(page.url()).searchParams.get('volver')).toBe(path);
    await expect(page).toHaveURL(/ingresar/);
  }
  for (const path of ['/buscar', '/sectores', '/mapa']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path));
  }
});

test('si no carga la API, buscar informa y permite reintentar sin mostrar ejemplos', async ({
  page,
}) => {
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
