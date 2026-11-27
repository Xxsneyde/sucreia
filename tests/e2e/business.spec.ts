import { test, expect, type Locator } from '@playwright/test';
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
  const pending = reviewer.getByRole('button', { name: `Revisar ${name}` });
  // Filtro de municipio: Corozal lo muestra, Sampués no.
  await reviewer.getByRole('combobox', { name: 'Municipio' }).selectOption('Sampués');
  await expect(pending).toHaveCount(0);
  await expect(reviewer.getByText('No hay negocios con estos filtros.')).toBeVisible();
  await reviewer.getByRole('combobox', { name: 'Municipio' }).selectOption('Corozal');
  await reviewer
    .getByRole('combobox', { name: 'Categoría' })
    .selectOption({ label: 'Gastronomía y alimentos' });
  await pending.click();
  // Las fotos del registro (aún no publicado) se ven: portada, logo y catálogo.
  const loaded = (img: Locator) =>
    expect
      .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0))
      .toBe(true);
  await loaded(reviewer.getByRole('img', { name: `Portada de ${name}` }));
  await loaded(reviewer.getByRole('img', { name: `Logo de ${name}` }));
  const products = reviewer.locator('.adm-products img');
  await expect(products).toHaveCount(3);
  for (const img of await products.all()) await loaded(img);
  await reviewer
    .getByLabel('Motivo o comentario para el emprendedor')
    .fill('Documentos completos.');
  // Un clic durante el desplazamiento al abrir el detalle puede perderse: se repite solo si el
  // botón sigue activo (mientras se aprueba queda deshabilitado; aprobado, ya no está).
  const approveButton = reviewer.getByRole('button', { name: 'Aprobar y publicar' });
  await expect(async () => {
    if ((await approveButton.isVisible()) && (await approveButton.isEnabled()))
      await approveButton.click();
    // Aprobado sale de «Por revisar» y se vuelve a la lista.
    await expect(reviewer.getByRole('status')).toContainText(`${name} fue aprobado`, {
      timeout: 3000,
    });
  }).toPass({ timeout: 20_000 });
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
  // WhatsApp de otro país: el campo elige Venezuela por el indicativo.
  await page.getByLabel('WhatsApp', { exact: true }).fill('+58 412 765 4321');
  await expect(page.getByRole('combobox', { name: 'País de WhatsApp' })).toHaveValue('VE');
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
    /wa\.me\/584127654321/,
  );
  await visitor.getByRole('tab', { name: 'Productos y servicios' }).click();
  await visitor.getByRole('button', { name: 'Postres', exact: true }).click();
  await expect(visitor.locator('.bp-product')).toHaveCount(1);
  await expect(visitor.locator('.bp-product')).toContainText(currency(20000));
  expect(await fits(visitor)).toBe(true);
  await visitor.close();
});
