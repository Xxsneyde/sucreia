import { test, expect, type Page } from '@playwright/test';

/** Crea una cuenta de emprendedor nueva (correo único) y deja la sesión iniciada. */
async function registerMerchant(page: Page, name = 'Ana Pérez') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.co`;
  await page.goto('/ingresar/?cuenta=nueva');
  await page.getByRole('textbox', { name: 'Tu nombre' }).fill(name);
  await page.getByRole('textbox', { name: 'Correo' }).fill(email);
  await page.getByLabel('Contraseña').fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(/\/estudio/);
  return email;
}

/** Configurador: datos → catálogo → elegir uno de los 3 diseños → crear la tienda. */
async function createStore(page: Page, area = 'Gastronomía', choice = 1) {
  // Nombre único: las pruebas corren en paralelo contra la misma base de datos.
  const name = `Tejidos del Caribe ${Math.random().toString(36).slice(2, 7)}`;
  await registerMerchant(page);
  await page.goto('/registro/negocio/');
  await page.getByRole('textbox', { name: 'Nombre del negocio' }).fill(name);
  await page.getByLabel('¿A qué se dedica tu negocio?').selectOption(area);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const cards = page.locator('.dp-card');
  // Los siete estilos; los tres primeros, recomendados para el área.
  await expect(cards).toHaveCount(7);
  await expect(page.locator('.dp-group-recomendados .dp-card')).toHaveCount(3);
  const styles = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-style')));
  expect(new Set(styles).size).toBe(7);
  const chosen = styles[choice]!;
  // La primera propuesta viene elegida por defecto.
  if (choice > 0) await cards.nth(choice).getByRole('button', { name: 'Elegir este' }).click();
  await expect(cards.nth(choice)).toHaveClass(/selected/);
  await page.getByRole('button', { name: /^Continuar con/ }).click();
  await page.getByRole('button', { name: 'Crear mi tienda' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.locator('.manage-frame .sp')).toHaveAttribute('data-style', chosen);
  return { styles, chosen, name };
}

test('crear con un diseño propuesto, publicar, comprar y gestionar la tienda', async ({
  page,
  browser,
}) => {
  const { styles, chosen, name } = await createStore(page);
  const manageUrl = page.url();
  expect(manageUrl).toContain('/estudio/gestionar');
  await page.getByRole('button', { name: 'Publicar tienda' }).click();
  await page.getByRole('button', { name: 'Publicar mi tienda' }).click();
  await expect(page.getByText('Publicada', { exact: true })).toBeVisible();
  // Otra persona, sin cuenta y en otro navegador, ve la tienda publicada.
  const storeUrl = `/tienda/?id=${new URL(manageUrl).searchParams.get('id')}`;
  const visitor = await browser.newPage();
  await visitor.goto(storeUrl);
  await expect(visitor.locator('.sp')).toHaveAttribute('data-style', chosen);
  await expect(visitor.getByRole('button', { name: 'Agregar Torta artesanal' })).toBeVisible();
  await visitor.close();
  await page.getByRole('link', { name: 'Ver tienda' }).click();
  await expect(page.locator('.storefront-page .sp')).toHaveAttribute('data-style', chosen);
  await page.getByRole('button', { name: 'Agregar Torta artesanal' }).click();
  await page.getByRole('link', { name: 'Finalizar pedido' }).click();
  await page.getByRole('button', { name: 'Crear pedido de ejemplo' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.goto('/panel/pedidos/');
  await page.getByRole('button', { name: 'Avanzar estado de demo' }).first().click();
  await page.getByRole('button', { name: 'Avanzar estado de demo' }).first().click();
  await page.goto('/domiciliario/');
  await page.getByRole('button', { name: 'Confirmar entrega local' }).click();
  await page.goto('/puntos/');
  await expect(page.locator('.points-balance')).toContainText('2.950');

  // Cambiar a otra de las tres propuestas deja cambios sin publicar.
  await page.goto(manageUrl);
  // Un estilo fuera de los tres recomendados.
  const other = styles[5]!;
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
  await expect(page.getByText('Cambios guardados')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cambio todavía privado' }),
  ).toBeVisible();
  await expect(page.locator('.manage-frame .sp')).toHaveAttribute('data-style', other);

  // En el catálogo público sigue la versión publicada.
  await page.goto('/buscar/');
  await page.getByRole('textbox', { name: 'Buscar negocios o productos' }).fill(name);
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
  const { name } = await createStore(page, 'Servicios', 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.locator('.manage-frame .sp')).toContainText('Contratar es así de fácil');
  const id = new URL(page.url()).searchParams.get('id');
  await page.goto(`/estudio/editor/?id=${id}`);
  await expect(page).toHaveURL(/\/estudio\/gestionar/);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
});

test('sin cuenta: el estudio pide ingresar y el configurador continúa tras crearla', async ({
  page,
}) => {
  await page.goto('/estudio/');
  await expect(page.getByRole('heading', { level: 1, name: 'Tu tienda te espera' })).toBeVisible();

  await page.goto('/registro/negocio/');
  await page.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Dulces de Ana');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: /^Continuar con/ }).click();
  await page.getByRole('button', { name: 'Crear cuenta y guardar' }).click();
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.co`;
  await page.getByRole('textbox', { name: 'Tu nombre' }).fill('Ana');
  await page.getByRole('textbox', { name: 'Correo' }).fill(email);
  await page.getByLabel('Contraseña').fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  // Vuelve al último paso con lo que había llenado.
  await expect(page.locator('[aria-current="step"]')).toContainText('Listo');
  await page.getByRole('button', { name: 'Crear mi tienda' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dulces de Ana' })).toBeVisible();

  // Cerrar sesión: el estudio vuelve a pedir ingresar.
  await page.goto('/perfil/');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.goto('/estudio/');
  await expect(page.getByRole('heading', { level: 1, name: 'Tu tienda te espera' })).toBeVisible();
});
