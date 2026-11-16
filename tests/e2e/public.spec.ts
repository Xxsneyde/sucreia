import { test, expect } from '@playwright/test';
import { createDesign } from '../../src/domain/studio.ts';
test('explorar desde el acceso muestra solo publicaciones y nunca menús internos', async ({
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
  const hidden = await (
    await request.post('/api/mis-tiendas', {
      data: { design: createDesign('Artesanías', `Borrador ${suffix}`) },
    })
  ).json();
  expect(hidden.store.id).toBeTruthy();
  expect((await request.post(`/api/mis-tiendas/${live.store.id}/publicar`)).status()).toBe(200);
  await page.goto('/ingresar');
  await page.getByRole('link', { name: 'Explorar negocios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Negocios publicados' })).toBeVisible();
  for (const selector of ['.sidebar', '.topbar', '.bottom-nav', '.demo-banner'])
    await expect(page.locator(selector)).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Buscar negocios o productos' }).fill(suffix);
  await expect(page.locator('.directory-card')).toHaveCount(1);
  await expect(page.locator('.directory-card')).toContainText(`Visible ${suffix}`);
  await expect(page.locator('.directory-card')).not.toContainText('Borrador');
  await page.locator('.directory-card').click();
  await expect(page.getByRole('heading', { level: 1, name: `Visible ${suffix}` })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ingresar para continuar' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('las rutas de herramientas piden sesión y nunca dibujan el panel a visitantes', async ({
  page,
}) => {
  for (const path of ['/inicio', '/panel', '/perfil', '/carrito', '/registro/negocio', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL(/ingresar\/?\?volver=/);
    await expect(page.locator('.sidebar')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('volver')).toBe(path);
  }
});
test('si no carga la API, la vitrina informa y permite reintentar sin mostrar ejemplos', async ({
  page,
}) => {
  await page.route('**/api/tiendas', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Sin conexión de prueba.' }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los negocios');
  await expect(page.locator('.directory-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});
