import { test, expect, type Page } from '@playwright/test';

/** Configurador: datos → catálogo → elegir uno de los 3 diseños → crear la tienda. */
async function createStore(page: Page, area = 'Gastronomía', choice = 1) {
  await page.goto('/registro/negocio/');
  await page.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Tejidos del Caribe');
  await page.getByLabel('¿A qué se dedica tu negocio?').selectOption(area);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const cards = page.locator('.dp-card');
  await expect(cards).toHaveCount(3);
  const styles = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-style')));
  expect(new Set(styles).size).toBe(3);
  const chosen = styles[choice]!;
  // La primera propuesta viene elegida por defecto.
  if (choice > 0) await cards.nth(choice).getByRole('button', { name: 'Elegir este' }).click();
  await expect(cards.nth(choice)).toHaveClass(/selected/);
  await page.getByRole('button', { name: /^Continuar con/ }).click();
  await page.getByRole('button', { name: 'Crear mi tienda' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tejidos del Caribe' })).toBeVisible();
  await expect(page.locator('.manage-frame .sp')).toHaveAttribute('data-style', chosen);
  return { styles, chosen };
}

test('crear con un diseño propuesto, publicar, comprar y gestionar la tienda', async ({ page }) => {
  const { styles, chosen } = await createStore(page);
  const manageUrl = page.url();
  expect(manageUrl).toContain('/estudio/gestionar');
  await page.getByRole('button', { name: 'Publicar tienda' }).click();
  await page.getByRole('button', { name: 'Publicar en mi plataforma local' }).click();
  await expect(page.getByText('Publicada', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver tienda' }).click();
  await expect(page.locator('.storefront-page .sp')).toHaveAttribute('data-style', chosen);
  await page.getByRole('button', { name: 'Agregar Torta artesanal' }).click();
  await page.getByRole('link', { name: 'Finalizar pedido' }).click();
  await page.getByRole('button', { name: 'Crear pedido de ejemplo' }).click();
  await expect(page.getByRole('heading', { name: 'Tejidos del Caribe' })).toBeVisible();
  await page.goto('/panel/pedidos/');
  await page.getByRole('button', { name: 'Avanzar estado de demo' }).first().click();
  await page.getByRole('button', { name: 'Avanzar estado de demo' }).first().click();
  await page.goto('/domiciliario/');
  await page.getByRole('button', { name: 'Confirmar entrega local' }).click();
  await page.goto('/puntos/');
  await expect(page.locator('.points-balance')).toContainText('2.950');

  // Cambiar a otra de las tres propuestas deja cambios sin publicar.
  await page.goto(manageUrl);
  const other = styles.find((s) => s !== chosen)!;
  await page
    .locator(`.dp-card[data-style="${other}"]`)
    .getByRole('button', { name: 'Elegir este' })
    .click();
  await expect(page.locator('.manage-frame .sp')).toHaveAttribute('data-style', other);
  await expect(page.getByText('Cambios sin publicar')).toBeVisible();

  // Datos y textos se guardan en el navegador.
  await page.getByRole('tab', { name: 'Datos' }).click();
  await page.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Cambio todavía privado');
  await page.getByRole('tab', { name: 'Textos' }).click();
  await page.getByRole('textbox', { name: 'Título principal' }).fill('Hecho en Corozal');
  await expect(page.locator('.manage-frame .sp-title')).toHaveText('Hecho en Corozal');
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cambio todavía privado' }),
  ).toBeVisible();
  await expect(page.locator('.manage-frame .sp')).toHaveAttribute('data-style', other);

  // En el catálogo público sigue la versión publicada.
  await page.goto('/buscar/');
  await page
    .getByRole('textbox', { name: 'Buscar negocios o productos' })
    .fill('Tejidos del Caribe');
  await expect(page.locator('.business-card')).toHaveCount(1);
});

test('ver una propuesta completa en escritorio y celular antes de elegir', async ({ page }) => {
  await page.goto('/registro/negocio/');
  await page.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Alma Estudio');
  await page.getByLabel('¿A qué se dedica tu negocio?').selectOption('Belleza');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const third = page.locator('.dp-card').nth(2);
  const style = await third.getAttribute('data-style');
  await third.getByRole('button', { name: 'Ver completa' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.sp')).toHaveAttribute('data-style', style!);
  await expect(dialog.getByText('Reservar es así de fácil')).toBeVisible();
  await dialog.getByRole('button', { name: 'Vista de celular' }).click();
  expect(
    await dialog.locator('.sp').evaluate((e) => e.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: 'Elegir este diseño' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.dp-card').nth(2)).toHaveClass(/selected/);
});

test('mi tienda no desborda la pantalla y el editor anterior redirige', async ({ page }) => {
  await createStore(page, 'Servicios', 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.locator('.manage-frame .sp')).toContainText('Contratar es así de fácil');
  const id = new URL(page.url()).searchParams.get('id');
  await page.goto(`/estudio/editor/?id=${id}`);
  await expect(page).toHaveURL(/\/estudio\/gestionar/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tejidos del Caribe' })).toBeVisible();
});
