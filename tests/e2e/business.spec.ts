import { test, expect } from '@playwright/test';
import { account, fits } from './helpers.ts';

test('crear el negocio, completar sus datos y productos, publicar y verlo como cliente', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor', 'negocio');
  await page.goto('/panel/perfil');
  await expect(page.getByRole('heading', { name: 'Crea tu negocio en SucreIA' })).toBeVisible();
  const name = `Delicias ${crypto.randomUUID().slice(0, 6)}`;
  await page.getByLabel('Nombre del negocio').fill(name);
  await page.getByLabel(/^Sector/).selectOption('Gastronomía y Alimentos');
  await page.getByLabel(/^Municipio/).selectOption('Corozal');
  await page.getByRole('button', { name: 'Crear mi negocio' }).click();
  await expect(page.getByRole('heading', { name: 'Identidad' })).toBeVisible();
  await page.getByLabel('Descripción corta').fill('Repostería artesanal y tortas personalizadas.');
  await page.getByLabel('Tu historia').fill('Hacemos tortas con recetas de la abuela.');
  await page.getByLabel('Destacado 1').fill('Desde 2022');
  await page.getByLabel('Destacado 2').fill('Domicilio en Corozal');
  await page.getByLabel('WhatsApp (con código de país)').fill('+573001112233');
  await page.getByLabel('Correo').fill('contacto@ejemplo.co');
  await page.getByLabel('Dirección').fill('Calle 28 # 26-14');

  await page.goto('/panel/productos');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  const last = page.locator('.pe-item').last();
  await last.getByLabel('Nombre').fill('Cupcakes (6 und)');
  await last.getByLabel('Grupo (opcional)').fill('Postres');
  await last.getByLabel('Precio (COP)').fill('20000');
  await page.getByRole('button', { name: 'Publicar cambios' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Catálogo publicado' })).toBeVisible();
  expect(await fits(page)).toBe(true);

  const store = (await (await page.request.get('/api/mis-tiendas')).json()).stores[0];
  const visitor = await browser.newPage();
  await visitor.goto(`/tienda?id=${store.id}`);
  await expect(visitor.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(visitor.getByText('Repostería artesanal y tortas personalizadas.')).toBeVisible();
  await expect(visitor.getByText('Hacemos tortas con recetas de la abuela.')).toBeVisible();
  await expect(visitor.getByText('Desde 2022')).toBeVisible();
  await expect(visitor.getByText('Sin reseñas todavía').first()).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'Contactar' })).toHaveAttribute(
    'href',
    /wa\.me\/573001112233/,
  );
  await visitor.getByRole('tab', { name: 'Productos y servicios' }).click();
  await visitor.getByRole('button', { name: 'Postres', exact: true }).click();
  await expect(visitor.locator('.bp-product')).toHaveCount(1);
  await expect(visitor.locator('.bp-product')).toContainText('$ 20.000');
  expect(await fits(visitor)).toBe(true);
  await visitor.close();
});
