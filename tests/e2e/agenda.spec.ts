import { test, expect } from '@playwright/test';
import { account, approve, registerBusiness } from './helpers.ts';

test('registro de un negocio con reservas: cupo por hora y agenda tras la aprobación', async ({
  page,
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
  // Reservas y Horario y cupos se abren desde el negocio en «Mis negocios».
  await page.goto('/panel/negocios');
  const actions = page.getByRole('navigation', { name: `Gestionar ${name}` });
  await expect(actions.getByRole('button', { name: 'Reservas' })).toBeVisible();
  await actions.getByRole('button', { name: 'Horario y cupos' }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/?$/);
  await expect(page.getByRole('heading', { name: 'Horario de atención' })).toBeVisible();
  await expect(page.getByLabel('Citas a la misma hora')).toHaveValue('2');
});
