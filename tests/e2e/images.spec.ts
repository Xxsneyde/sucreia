import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('subir logo, publicar y conservar la foto anterior en versiones', async ({
  page,
  request,
}) => {
  const email = `imagenes-${crypto.randomUUID()}@ejemplo.co`;
  await page.goto('/ingresar?cuenta=nueva');
  await page.getByLabel('Tu nombre').fill('Artesana');
  await page.getByLabel('Correo', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-imagenes-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(/estudio/);
  // Crear una tienda propia por API y recorrer toda la edición de imágenes en la interfaz.
  const { createDesign } = await import('../../src/domain/studio.ts');
  const created = await page.request.post('/api/mis-tiendas', {
    data: { design: createDesign('Artesanías', 'Tejidos de prueba') },
  });
  expect(created.status()).toBe(201);
  const { store } = await created.json();
  await page.goto(`/estudio/gestionar?id=${store.id}`);
  await page.getByRole('tab', { name: 'Datos', exact: true }).click();
  const field = page
    .locator('.image-field')
    .filter({ has: page.getByText('Logo', { exact: true }) });
  const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#d34622' } })
    .png()
    .toBuffer();
  await field
    .locator('input[type=file]')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(field.locator('.image-thumb img')).toHaveAttribute('src', /^\/api\/imagenes\//);
  const url = (await field.locator('.image-thumb img').getAttribute('src'))!;
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/mis-tiendas/${store.id}`)).json()).store.draft.logo,
    )
    .toBe(url);
  expect((await request.get(url)).status()).toBe(404);
  expect((await page.request.post(`/api/mis-tiendas/${store.id}/publicar`)).status()).toBe(200);
  expect((await request.get(url)).status()).toBe(200);
  await field.getByRole('button', { name: 'Quitar Logo' }).click();
  await expect(field.locator('.image-thumb')).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/mis-tiendas/${store.id}`)).json()).store.draft.logo,
    )
    .toBe('');
  await field.getByText('Elegir de mis imágenes', { exact: true }).click();
  await expect(field.getByText('Conservada en una tienda o versión')).toBeVisible();
  await field.getByRole('button', { name: 'Usar imagen 1' }).click();
  await expect(field.locator('.image-thumb img')).toHaveAttribute('src', url);
  const second = await sharp({
    create: { width: 8, height: 8, channels: 3, background: '#222299' },
  })
    .png()
    .toBuffer();
  await field
    .locator('input[type=file]')
    .setInputFiles({ name: 'otro.png', mimeType: 'image/png', buffer: second });
  await expect(field.locator('.image-thumb img')).not.toHaveAttribute('src', url);
  await expect(page.getByRole('status').filter({ hasText: 'Preparando' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
