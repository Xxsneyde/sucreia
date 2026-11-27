import { test, expect, type Page } from '@playwright/test';
import { account, approve, openMenu, registerBusiness } from './helpers.ts';

const menu = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

test('registro de un negocio con reservas: cupo por hora y agenda tras la aprobación', async ({
  page,
  isMobile,
}) => {
  await account(page, 'emprendedor', 'agenda');
  const name = `Barbería ${crypto.randomUUID().slice(0, 6)}`;
  const id = await registerBusiness(page, {
    name,
    sector: 'Belleza y Bienestar',
    mode: 'Servicios con reserva',
    capacity: 2,
  });
  await approve(page, id);
  await page.goto('/buscar');
  // Con un negocio de reservas el menú ofrece «Reservas».
  await openMenu(page, isMobile);
  await expect(menu(page).getByRole('link', { name: 'Reservas', exact: true })).toBeVisible();
  await page.goto('/panel/agenda');
  await expect(page.getByRole('heading', { name: 'Horario de atención' })).toBeVisible();
  await expect(page.getByLabel('Citas a la misma hora')).toHaveValue('2');
});
