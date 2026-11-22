import { test, expect, type Page } from '@playwright/test';
import { account, openMenu } from './helpers.ts';

const menu = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

test('cliente: menú de la presentación; administración lo devuelve a su inicio', async ({
  page,
  isMobile,
}) => {
  await account(page, 'cliente', 'roles');
  await openMenu(page, isMobile);
  for (const label of [
    'Inicio',
    'Buscar negocios',
    'Sectores',
    'Mapa de emprendimientos',
    'Descuentos y SucrePuntos',
    'Logística y entregas',
    'Escuela del Emprendedor con IA',
    'Recomendaciones IA',
    'Mis solicitudes',
    'Mis compras',
    'Favoritos',
    'Notificaciones',
  ])
    await expect(menu(page).getByRole('link', { name: label, exact: true })).toBeVisible();
  await expect(menu(page).getByText('Mi negocio', { exact: true })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/inicio/);
});

test('emprendedor: su negocio primero en el panel y también el menú principal', async ({
  page,
  isMobile,
}) => {
  await account(page, 'emprendedor', 'roles');
  await openMenu(page, isMobile);
  await expect(menu(page).locator('.sx-nav-title').first()).toHaveText('Mi negocio');
  await expect(menu(page).getByRole('link', { name: 'Datos del negocio' })).toBeVisible();
  await menu(page).getByRole('link', { name: 'Buscar negocios', exact: true }).click();
  await expect(page).toHaveURL(/buscar/);
  await openMenu(page, isMobile);
  await expect(menu(page).locator('.sx-nav-title').first()).toHaveText('Mi negocio');
  await expect(menu(page).getByRole('link', { name: 'Inicio', exact: true })).toBeVisible();
});
