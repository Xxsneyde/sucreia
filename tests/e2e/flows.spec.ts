import { test, expect, type Page } from '@playwright/test';
import { createDesign } from '../../src/domain/studio.ts';
async function account(page: Page, role = 'cliente') {
  await page.goto('/ingresar?cuenta=nueva');
  await page.getByLabel('Tu nombre').fill('Persona de prueba');
  await page
    .getByLabel('Correo', { exact: true })
    .fill(`recorrido-${crypto.randomUUID()}@ejemplo.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  if (role === 'cliente') await page.getByText('Quiero comprar', { exact: true }).click();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(role === 'cliente' ? /inicio/ : /estudio/);
}
test('dos cuentas: publicación, pedido, pago, entrega con PIN, reseña y puntos', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor');
  const design = createDesign('Artesanías', `Artesanías ${crypto.randomUUID().slice(0, 6)}`);
  design.products[0].price = 12000;
  const created = await page.request.post('/api/mis-tiendas', { data: { design } });
  expect(created.status()).toBe(201);
  const { store } = await created.json();
  expect((await page.request.post(`/api/mis-tiendas/${store.id}/publicar`)).status()).toBe(200);
  const buyer = await browser.newPage();
  await account(buyer);
  await buyer.goto(`/tienda?id=${store.id}`);
  await buyer.getByRole('button', { name: `Agregar ${design.products[0].name}` }).click();
  await buyer.getByRole('link', { name: 'Finalizar pedido' }).click();
  await buyer.getByLabel('WhatsApp con código de país').fill('+573001234567');
  await buyer.getByRole('button', { name: 'Confirmar pedido', exact: true }).click();
  await expect(buyer).toHaveURL(/pedidos/);
  await expect(buyer.getByText(design.name, { exact: true })).toBeVisible();
  const pin = (await buyer.locator('.flow-pin strong').textContent())!.trim();
  await page.goto('/panel/pedidos');
  const card = page.locator('.flow-operation').filter({ hasText: design.name });
  await card.getByRole('button', { name: 'Tomar y preparar' }).click();
  await card.getByRole('button', { name: 'Marcar listo' }).click();
  await card.getByRole('button', { name: 'Confirmar pago recibido' }).click();
  await card.getByLabel('PIN que te comparte el cliente').fill(pin);
  await card.getByRole('button', { name: 'Confirmar entrega con PIN' }).click();
  await buyer.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(buyer.locator('.flow-operation .tag')).toHaveText('Completado');
  await buyer.getByLabel('Tu experiencia').fill('Recibí el producto y todo estuvo bien.');
  await buyer.getByRole('button', { name: 'Publicar reseña' }).click();
  await expect(buyer.getByRole('status').filter({ hasText: 'Tu reseña' })).toBeVisible();
  await buyer.goto('/puntos');
  await expect(buyer.locator('.flow-balance')).toContainText('12 puntos');
  expect(
    await buyer.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await buyer.close();
});
test('cliente puede activar su negocio conservando la cuenta y entrar al configurador', async ({
  page,
}) => {
  await account(page);
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Activar mi cuenta de emprendedor' }).click();
  await page.goto('/registro/negocio');
  await page.getByLabel('Nombre del negocio').fill('Mi primera tienda');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Tu catálogo');
});
test('espacios principales tienen estados vacíos sin desbordar ni inventar actividad', async ({
  page,
}) => {
  await account(page, 'emprendedor');
  for (const path of [
    '/inicio',
    '/panel',
    '/pedidos',
    '/puntos',
    '/perfil',
    '/escuela',
    '/mapa',
    '/domiciliario',
    '/notificaciones',
    '/asistente',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
