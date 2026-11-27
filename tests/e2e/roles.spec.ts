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
    '¿Quieres montar tu propio emprendimiento?',
  ])
    await expect(menu(page).getByRole('link', { name: label, exact: true })).toBeVisible();
  await expect(menu(page).locator('.sx-nav-title')).toHaveCount(0);
  // Las notificaciones no están en el menú: solo en la campana de arriba.
  await expect(menu(page).getByRole('link', { name: /Notificaciones/ })).toHaveCount(0);
  // «Mi cuenta» solo está en el menú de la cuenta, arriba a la derecha.
  await expect(page.getByRole('link', { name: 'Mi cuenta', exact: true })).toHaveCount(0);
  // En celular se cierra primero el menú lateral, que tapa la barra de arriba.
  if (isMobile) {
    const width = page.viewportSize()!.width;
    await page.locator('.sx-scrim').click({ position: { x: width - 12, y: 300 } });
    await expect(page.locator('.sx-scrim')).toHaveCount(0);
  }
  // La campana despliega las notificaciones ahí mismo (el cliente nuevo aún no tiene).
  await page.getByRole('button', { name: 'Notificaciones: 0 sin leer' }).click();
  const panel = page.getByRole('region', { name: 'Notificaciones' });
  await expect(panel).toContainText('No tienes notificaciones todavía.');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: /Hola,/ }).click();
  await page.locator('.sx-menu').getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/perfil\/?$/);
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
  await expect(menu(page).getByRole('link', { name: /Notificaciones/ })).toHaveCount(0);

  const { design } = await publishedStore(page);
  // La aprobación del negocio llega a la campana, que permite marcarla como leída.
  await page.goto('/buscar');
  const bell = page.getByRole('button', { name: /^Notificaciones: [1-9]\d* sin leer$/ });
  await bell.click();
  const panel = page.getByRole('region', { name: 'Notificaciones' });
  await expect(panel.getByRole('listitem').first()).toBeVisible();
  await panel.getByRole('button', { name: 'Marcar todas como leídas' }).click();
  await expect(page.getByRole('button', { name: 'Notificaciones: 0 sin leer' })).toBeVisible();
  await page.keyboard.press('Escape');
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
  await expect(menu(page).getByRole('link', { name: 'Mis negocios' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Aprobación de negocios' }),
  ).toBeVisible();

  // Cambiar de rol: como emprendedor solo ve lo de sus negocios (y explorar), y puede volver.
  const role = async (name: 'Administrador' | 'Emprendedor') => {
    await page.getByRole('button', { name: /Hola,/ }).click();
    const group = page.getByRole('group', { name: 'Cambiar de rol' });
    await expect(group.getByRole('button', { name: 'Administrador' })).toBeVisible();
    await group.getByRole('button', { name }).click();
  };
  await role('Emprendedor');
  await expect(page).toHaveURL(/\/panel(\/negocios)?\/?$/);
  await openMenu(page, isMobile);
  await expect(menu(page).locator('.sx-nav-title')).toHaveText(['Mi negocio', 'Explorar']);
  await expect(menu(page).getByRole('link', { name: 'Aprobación de negocios' })).toHaveCount(0);
  await expect(menu(page).getByRole('link', { name: 'Mis compras' })).toHaveCount(0);
  // La vista elegida se conserva al recargar.
  await page.reload();
  await openMenu(page, isMobile);
  await expect(menu(page).locator('.sx-nav-title').first()).toHaveText('Mi negocio');
  if (isMobile) {
    const width = page.viewportSize()!.width;
    await page.locator('.sx-scrim').click({ position: { x: width - 12, y: 300 } });
  }
  await role('Administrador');
  await expect(page).toHaveURL(/\/admin\/?$/);
  await openMenu(page, isMobile);
  await expect(menu(page).locator('.sx-nav-title')).toHaveText(['Administración', 'Explorar']);
});
