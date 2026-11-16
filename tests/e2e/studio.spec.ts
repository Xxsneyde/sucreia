import { test, expect } from '@playwright/test';
async function createStore(page: import('@playwright/test').Page) {
  await page.goto('/registro/negocio/');
  await page.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Tejidos del Caribe');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir mi editor visual' }).click();
  await expect(page.locator('.studio-editor')).toBeVisible();
}
test('crear, editar, publicar, comprar y gestionar una tienda local', async ({ page }) => {
  await createStore(page);
  const editorUrl = page.url();
  await page.getByRole('button', { name: 'Diseño', exact: true }).click();
  await page.getByLabel('Color principal').fill('#7b304b');
  await page.getByLabel('Tipografía').selectOption('modern');
  await page.getByRole('button', { name: 'Bloques', exact: true }).click();
  await page
    .locator('.block-library')
    .getByRole('button', { name: 'Preguntas frecuentes' })
    .click();
  await expect(page.locator('[data-block-kind="faq"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('[data-block-kind="faq"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rehacer', exact: true }).click();
  await expect(page.locator('[data-block-kind="faq"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar en mi plataforma local' }).click();
  await page.getByRole('link', { name: 'Visitar mi tienda' }).click();
  await expect(page.locator('.store-canvas')).toHaveCSS('--shop-primary', '#7b304b');
  await page.getByRole('button', { name: 'Agregar Bolso de caña flecha' }).click();
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
  await page.getByRole('button', { name: 'Canjear por 500 puntos' }).click();
  await expect(page.getByRole('button', { name: 'Bono disponible' })).toBeDisabled();
  await page.goto(editorUrl);
  await page.getByRole('button', { name: 'Negocio', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Cambio todavía privado');
  await expect(page.locator('.save-indicator')).toContainText('Guardado');
  await page.reload();
  await page.getByRole('button', { name: 'Negocio', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre del negocio' })).toHaveValue(
    'Cambio todavía privado',
  );
  await page.goto('/buscar/');
  await page
    .getByRole('textbox', { name: 'Buscar negocios o productos' })
    .fill('Tejidos del Caribe');
  await expect(page.locator('.business-card')).toHaveCount(1);
  await expect(page.locator('.business-card')).toContainText('Tejidos del Caribe');
});
test('reordenar, ocultar y restaurar bloques sin perder el diseño', async ({ page, isMobile }) => {
  await createStore(page);
  const layers = page.locator('.layer-row');
  if (!isMobile) {
    await layers.first().locator('.layer-grip').dragTo(layers.nth(2));
    await expect(page.locator('.canvas-block').first()).toHaveAttribute(
      'data-block-kind',
      'catalog',
    );
  }
  await page.locator('[data-block-kind="hero"]').click();
  await page.getByRole('button', { name: 'Ocultar bloque', exact: true }).click();
  await expect(page.locator('[data-block-kind="hero"]')).toHaveClass(/is-hidden/);
  await page.getByRole('button', { name: 'Mostrar bloque', exact: true }).click();
  await page.getByRole('button', { name: 'Editar bloque', exact: true }).click();
  await expect(page.locator('.editor-inspector .studio-form')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar propiedades', exact: true }).click();
  await page.getByRole('button', { name: 'Vista de celular', exact: true }).click();
  await expect(page.locator('.canvas-scroll')).toHaveClass(/mobile-canvas/);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar en mi plataforma local' }).click();
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.getByRole('button', { name: 'Versiones', exact: true }).click();
  await expect(page.locator('.version-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Versión cargada');
});
test('el editor no desborda la pantalla y permite teclado', async ({ page }) => {
  await createStore(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Bloques', exact: true }).click();
  await page
    .locator('.block-library')
    .getByRole('button', { name: 'Anuncio', exact: true })
    .click();
  await page.locator('.editor-topbar').click({ position: { x: 10, y: 10 } });
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-block-kind="banner"]')).toHaveCount(0);
});
