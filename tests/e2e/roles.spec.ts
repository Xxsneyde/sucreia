import { test, expect, type Page } from '@playwright/test';
import { account, admin, openMenu, publishedStore, signIn } from './helpers.ts';

const menu = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

test('cliente: menú principal; administración y páginas retiradas lo devuelven a buscar', async ({
  page,
  isMobile,
}) => {
  await account(page, 'cliente', 'roles');
  await openMenu(page, isMobile);
  for (const label of [
    'Buscar negocios',
    'Mapa de emprendimientos',
    'Mis compras',
    'Mis reservas',
    'Favoritos',
    'Notificaciones',
    '¿Quieres montar tu propio emprendimiento?',
  ])
    await expect(menu(page).getByRole('link', { name: label, exact: true })).toBeVisible();
  await expect(menu(page).locator('.sx-nav-title')).toHaveCount(0);
  for (const path of ['/admin', '/inicio', '/puntos', '/escuela', '/domiciliario']) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/buscar\/?$/);
  }
  // Las páginas del negocio invitan al cliente a pasarse a emprendedor.
  await page.goto('/panel/perfil');
  await expect(
    page.getByRole('heading', { name: 'Esta sección es para emprendedores' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quiero montar mi emprendimiento' })).toHaveAttribute(
    'href',
    '/emprender',
  );
});

test('emprendedor: «Mi negocio» primero; con un negocio publicado aparece «Mis negocios»', async ({
  page,
  isMobile,
}) => {
  await account(page, 'emprendedor', 'roles');
  await openMenu(page, isMobile);
  const titles = menu(page).locator('.sx-nav-title');
  await expect(titles).toHaveText(['Mi negocio', 'Explorar y comprar']);
  // Sin negocios, la invitación es «Registra tu emprendimiento».
  await expect(menu(page).getByRole('link', { name: 'Registra tu emprendimiento' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Mis negocios' })).toHaveCount(0);

  const { design } = await publishedStore(page);
  await page.goto('/buscar');
  await openMenu(page, isMobile);
  await expect(menu(page).getByRole('link', { name: 'Promociones y reseñas' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Registrar emprendimiento' })).toBeVisible();
  await menu(page).getByRole('link', { name: 'Mis negocios' }).click();
  await expect(page).toHaveURL(/panel\/negocios/);
  await expect(page.getByRole('listitem').filter({ hasText: design.name })).toContainText(
    'Publicado',
  );
  await openMenu(page, isMobile);
  await expect(titles.first()).toHaveText('Mi negocio');
});

test('administración: su propio menú, sin compras', async ({ page, isMobile }) => {
  await signIn(page, admin().email, admin().password);
  await expect(page).toHaveURL(/buscar/);
  await openMenu(page, isMobile);
  await expect(menu(page).locator('.sx-nav-title')).toHaveText(['Administración', 'Explorar']);
  for (const label of ['Aprobación de negocios', 'Negocios aprobados', 'PQRS'])
    await expect(menu(page).getByRole('link', { name: label, exact: true })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Mis compras' })).toHaveCount(0);
  await page.goto('/pedidos');
  await expect(page).toHaveURL(/\/buscar\/?$/);
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Aprobación de negocios' }),
  ).toBeVisible();
});
