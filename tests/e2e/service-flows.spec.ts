import { test, expect, type Page } from '@playwright/test';
import { createDesign } from '../../src/domain/studio.ts';
async function account(page: Page, merchant = false) {
  await page.goto('/ingresar?cuenta=nueva');
  await page.getByLabel('Tu nombre').fill('Persona de prueba');
  await page
    .getByLabel('Correo', { exact: true })
    .fill(`servicios-${crypto.randomUUID()}@ejemplo.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  if (!merchant) await page.getByText('Quiero comprar', { exact: true }).click();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(merchant ? /estudio/ : /inicio/);
}
for (const mode of ['booking', 'quote'] as const)
  test(`recorrido de ${mode === 'booking' ? 'cita con horario disponible' : 'cotización aceptada y completada'}`, async ({
    page,
    browser,
  }) => {
    await account(page, true);
    const design = createDesign(
      mode === 'booking' ? 'Belleza' : 'Servicios',
      `Servicio ${crypto.randomUUID().slice(0, 8)}`,
    );
    design.mode = mode;
    const response = await page.request.post('/api/mis-tiendas', { data: { design } });
    expect(response.status()).toBe(201);
    const { store } = await response.json();
    expect((await page.request.post(`/api/mis-tiendas/${store.id}/publicar`)).status()).toBe(200);
    const buyer = await browser.newPage();
    await account(buyer);
    await buyer.goto(`/tienda?id=${store.id}`);
    await buyer.locator('#sp-catalogo button').first().click();
    const dialog = buyer.getByRole('dialog');
    await dialog
      .getByLabel('Detalle de tu solicitud')
      .fill('Quiero conocer y contratar el servicio.');
    await dialog.getByLabel('WhatsApp con código de país').fill('+573001234567');
    if (mode === 'booking') {
      await dialog
        .getByLabel('Fecha preferida')
        .fill(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
      await dialog.getByLabel('Horario disponible (Colombia)').selectOption({ index: 1 });
    }
    await dialog
      .getByRole('button', {
        name: mode === 'booking' ? 'Solicitar cita' : 'Enviar solicitud de cotización',
        exact: true,
      })
      .click();
    await expect(buyer).toHaveURL(/pedidos/);
    await page.goto('/panel/pedidos');
    const card = page.locator('.flow-operation').filter({ hasText: design.name });
    if (mode === 'booking') {
      await card.getByRole('button', { name: 'Confirmar cita' }).click();
      await buyer.getByRole('button', { name: 'Actualizar estado' }).click();
      await expect(buyer.locator('.flow-operation .tag')).toHaveText('Aceptado / confirmado');
    } else {
      await card.getByLabel('Valor de la cotización (COP)').fill('40000');
      await card.getByRole('button', { name: 'Enviar cotización' }).click();
      await buyer.getByRole('button', { name: 'Actualizar estado' }).click();
      await buyer.getByRole('button', { name: /Aceptar cotización de/ }).click();
      await page.getByRole('button', { name: 'Actualizar panel' }).click();
      await card.getByRole('button', { name: 'Confirmar pago recibido' }).click();
      await card.getByRole('button', { name: 'Completar servicio' }).click();
      await buyer.getByRole('button', { name: 'Actualizar estado' }).click();
      await expect(buyer.locator('.flow-operation .tag')).toHaveText('Completado');
    }
    await buyer.close();
  });
test('escuela conserva evaluaciones y emite una constancia consultable', async ({ page }) => {
  await account(page);
  await page.goto('/escuela');
  const { lessons } = await import('../../src/features/community/lessons.ts');
  for (const lesson of lessons) {
    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: lesson.title, exact: true }) });
    await card.getByRole('radio', { name: lesson.answers[lesson.correct], exact: true }).check();
    await card.getByRole('button', { name: 'Comprobar y guardar progreso' }).click();
    await expect(card.getByText('Completada', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Generar constancia de finalización' }).click();
  await expect(page).toHaveURL(/constancia\?id=/);
  await expect(page.getByRole('heading', { name: 'Constancia de finalización' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir o guardar como PDF' })).toBeVisible();
});
