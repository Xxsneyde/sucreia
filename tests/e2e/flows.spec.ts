import { test, expect } from '@playwright/test';
test('buscar, comprar y avanzar un pedido de demostración', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lo nuestro, más cerca.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar negocios o productos' }).fill('raices');
  await expect(page.locator('.business-card')).toHaveCount(1);
  await page.locator('.business-card').click();
  await page.getByRole('button', { name: 'Agregar Bolso de caña flecha' }).click();
  await page.getByRole('link', { name: 'Finalizar pedido' }).click();
  await page.getByRole('button', { name: 'Crear pedido de ejemplo' }).click();
  await expect(page.getByRole('heading', { name: 'Tus pedidos y solicitudes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Raíces de Sucre' })).toBeVisible();
  await page.goto('/panel/pedidos/');
  await page.getByRole('button', { name: 'Avanzar estado de demo' }).first().click();
  await page.goto('/pedidos/');
  await expect(
    page.locator('.order-list article').first().locator('.timeline-step.done'),
  ).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Raíces de Sucre' })).toBeVisible();
});
test('reserva, favoritos y borrador sobreviven la navegación', async ({ page }) => {
  await page.goto('/negocios/alma-estudio/');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.getByRole('button', { name: 'Agendar cita / reservar' }).click();
  await page.getByLabel('Detalle de tu solicitud').fill('Corte de cabello');
  await page.getByLabel('Fecha preferida').fill('2027-12-20');
  await page.getByRole('button', { name: 'Guardar solicitud de ejemplo' }).click();
  await page.goto('/pedidos/');
  await expect(page.getByText('Cita / reserva · Corte de cabello')).toBeVisible();
  await page.goto('/favoritos/');
  await expect(page.locator('.business-card')).toHaveCount(1);
  await page.goto('/registro/negocio/');
  await page.getByLabel('Nombre del negocio').fill('Tejidos del Caribe');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.reload();
  await expect(page.getByLabel('Nombre del negocio')).toHaveValue('Tejidos del Caribe');
});
test('rutas principales y diseño sin desbordamiento', async ({ page }) => {
  for (const route of [
    '/',
    '/buscar/',
    '/panel/',
    '/puntos/',
    '/perfil/',
    '/registro/negocio/',
    '/escuela/',
    '/mapa/',
    '/domiciliario/',
    '/admin/',
    '/equipo/',
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
