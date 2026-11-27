import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { account, fits, publishedStore } from './helpers.ts';

test('subir logo en «Datos del negocio», publicarlo y reutilizar fotos de la biblioteca', async ({
  page,
  request,
}) => {
  await account(page, 'emprendedor', 'imagenes');
  const { id, design } = await publishedStore(page, 'Moda y Confección', 'Tejidos de prueba');
  const draftLogo = async () =>
    (await (await page.request.get(`/api/mis-tiendas/${id}`)).json()).store.draft.logo as string;
  await page.goto('/panel/perfil');
  await expect(page.getByLabel('Nombre del negocio')).toHaveValue(design.name);
  const field = page
    .locator('.image-field')
    .filter({ has: page.getByText('Logo', { exact: true }) });
  const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#d34622' } })
    .png()
    .toBuffer();
  await field
    .locator('input[type=file]')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  // El logo se encuadra antes de subirlo.
  await page
    .getByRole('dialog', { name: 'Encuadrar imagen' })
    .getByRole('button', { name: 'Usar este encuadre' })
    .click();
  await expect.poll(draftLogo).not.toBe(design.logo);
  const url = await draftLogo();
  // El editor muestra una miniatura de la misma imagen (…-480.webp).
  const imageId = url.replace(/^\/api\/imagenes\//, '').replace(/\.webp$/, '');
  const thumb = field.locator('.image-thumb img');
  await expect(thumb).toHaveAttribute('src', new RegExp(imageId));
  // Un borrador no publica la foto: solo el dueño la ve hasta publicar.
  expect((await request.get(url)).status()).toBe(404);
  await page.getByRole('button', { name: 'Publicar cambios' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Tu negocio está publicado' }),
  ).toBeVisible();
  expect((await request.get(url)).status()).toBe(200);
  await page.goto(`/tienda?id=${id}`);
  await expect(page.getByRole('img', { name: `Logo de ${design.name}` })).toHaveAttribute(
    'src',
    new RegExp(imageId),
  );

  await page.goto('/panel/perfil');
  await field.getByRole('button', { name: 'Quitar Logo' }).click();
  await expect(field.locator('.image-thumb')).toHaveCount(0);
  await field.getByText('Elegir de mis imágenes', { exact: true }).click();
  await field
    .getByRole('listitem')
    .filter({ has: page.locator(`img[src*="${imageId}"]`) })
    .getByRole('button', { name: /^Usar imagen/ })
    .click();
  await expect(thumb).toHaveAttribute('src', new RegExp(imageId));
  await expect.poll(draftLogo).toBe(url);
  expect(await fits(page)).toBe(true);
});
