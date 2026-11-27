import { test, expect } from '@playwright/test';
import { currency } from '../../src/domain/rules.ts';
import {
  account,
  admin,
  fits,
  pickFromLibrary,
  publishedStore,
  registerBusiness,
  signIn,
} from './helpers.ts';

test('registro en siete pasos, revisión de la administración y negocio visible para los clientes', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor', 'registro');
  const name = `Delicias ${crypto.randomUUID().slice(0, 6)}`;
  const id = await registerBusiness(page, {
    name,
    sector: 'Gastronomía y Alimentos',
    municipality: 'Corozal',
    description: 'Repostería artesanal y tortas personalizadas.',
    whatsapp: '+573001112233',
  });
  expect(await fits(page)).toBe(true);

  // Hasta la aprobación no aparece en SucreIA.
  const visitor = await browser.newPage();
  await visitor.goto(`/tienda?id=${id}`);
  await expect(
    visitor.getByRole('heading', { name: 'Este negocio no está disponible' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ver mi emprendimiento' }).click();
  await expect(page).toHaveURL(/\/panel\/?$/);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

  const reviewer = await browser.newPage();
  await signIn(reviewer, admin().email, admin().password);
  await reviewer.goto('/admin');
  const pending = reviewer.getByRole('list', { name: 'Negocios' }).getByRole('button', { name });
  await pending.click();
  await reviewer
    .getByLabel('Motivo o comentario para el emprendedor')
    .fill('Documentos completos.');
  await reviewer.getByRole('button', { name: 'Aprobar y publicar' }).click();
  await expect(pending).toHaveCount(0);
  await reviewer.close();

  await visitor.reload();
  await expect(visitor.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(
    visitor.getByText('Repostería artesanal y tortas personalizadas.').first(),
  ).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'Contactar' })).toHaveAttribute(
    'href',
    /wa\.me\/573001112233/,
  );
  await visitor.close();
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'Publicado' })).toBeVisible();
});

test('editar los datos y el catálogo de un negocio publicado y verlo como cliente', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor', 'negocio');
  const { id, design } = await publishedStore(page);
  await page.goto('/panel/perfil');
  await expect(page.getByLabel('Nombre del negocio')).toHaveValue(design.name);
  await page.getByLabel('Descripción corta').fill('Repostería artesanal y tortas personalizadas.');
  await page.getByLabel('Tu historia').fill('Hacemos tortas con recetas de la abuela.');
  await page.getByLabel('Destacado 4').fill('Desde 2022');
  await page.getByLabel('WhatsApp (con código de país)').fill('+573001112233');
  await page.getByLabel('Correo', { exact: true }).fill('contacto@ejemplo.co');
  await page.getByRole('button', { name: 'Publicar cambios' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Tu negocio está publicado' }),
  ).toBeVisible();
  expect(await fits(page)).toBe(true);

  await page.goto('/panel/productos');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  const last = page.locator('.pe-item').last();
  await last.getByLabel('Nombre').fill('Cupcakes (6 und)');
  await last.getByLabel('Grupo (opcional)').fill('Postres');
  await last.getByLabel('Descripción').fill('Seis cupcakes de vainilla.');
  await last.getByLabel('Precio (COP)').fill('20000');
  await pickFromLibrary(last.locator('.image-field').first());
  await page.getByRole('button', { name: 'Publicar cambios' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Catálogo publicado' })).toBeVisible();
  expect(await fits(page)).toBe(true);

  const visitor = await browser.newPage();
  await visitor.goto(`/tienda?id=${id}`);
  await expect(visitor.getByRole('heading', { level: 1, name: design.name })).toBeVisible();
  await expect(
    visitor.getByText('Repostería artesanal y tortas personalizadas.').first(),
  ).toBeVisible();
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
  await expect(visitor.locator('.bp-product')).toContainText(currency(20000));
  expect(await fits(visitor)).toBe(true);
  await visitor.close();
});
