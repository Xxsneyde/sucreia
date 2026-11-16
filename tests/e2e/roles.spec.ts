import { test, expect, type Page } from '@playwright/test';

async function account(page: Page, role: 'cliente' | 'emprendedor') {
  await page.goto('/ingresar?cuenta=nueva');
  await page.getByLabel('Tu nombre').fill(role === 'cliente' ? 'Carlos' : 'Ana');
  await page.getByLabel('Correo', { exact: true }).fill(`roles-${crypto.randomUUID()}@ejemplo.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  if (role === 'cliente') await page.getByText('Quiero comprar', { exact: true }).click();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(role === 'cliente' ? /inicio/ : /estudio/);
}
const sections = (page: Page) => page.locator('.role-nav .nav-label');

test('cliente: menú de compras y comunidad; administración lo devuelve a su inicio', async ({
  page,
  isMobile,
}) => {
  await account(page, 'cliente');
  if (!isMobile) {
    await expect(sections(page)).toHaveText(['Comprar', 'Comunidad', 'Mi cuenta']);
    await expect(page.getByRole('link', { name: 'Abrir mi negocio' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quiero repartir' })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Mi negocio', exact: true })).toHaveCount(0);
  await expect(page.locator('a[href^="/admin"], a[href^="/equipo"]')).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/inicio\/?$/);
});

test('emprendedor: su negocio primero y puede pasar a comprar', async ({ page, isMobile }) => {
  await account(page, 'emprendedor');
  await page.goto('/panel');
  if (!isMobile) {
    await expect(sections(page)).toHaveText(['Mi negocio', 'Comprar', 'Comunidad', 'Mi cuenta']);
    await page.getByRole('link', { name: 'Comprar', exact: true }).click();
    await expect(page).toHaveURL(/\/inicio\/?$/);
    await expect(sections(page).first()).toHaveText('Comprar');
  } else {
    await expect(page.locator('.bottom-nav a').first()).toHaveAttribute('href', '/panel');
  }
  await page.goto('/equipo');
  await expect(page).toHaveURL(/\/estudio\/?$/);
});
