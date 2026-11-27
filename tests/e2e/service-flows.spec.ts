import { test, expect } from '@playwright/test';
import { account, publishedStore } from './helpers.ts';

test('reserva: el cliente elige día y hora y el negocio confirma la cita', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor', 'servicios');
  const { id, design } = await publishedStore(
    page,
    'Belleza y Bienestar',
    `Servicio ${crypto.randomUUID().slice(0, 8)}`,
    'booking',
  );
  const buyer = await browser.newPage();
  await account(buyer, 'cliente', 'servicios');
  await buyer.goto(`/tienda?id=${id}`);
  await buyer.getByRole('button', { name: 'Reservar ahora', exact: true }).click();
  const picker = buyer.getByRole('dialog', { name: `Reservar en ${design.name}` });
  await picker
    .getByRole('radiogroup', { name: 'Servicio' })
    .getByRole('radio', { name: design.products[1].name })
    .click();
  // El segundo día abierto: hoy puede no tener horas libres.
  await picker.locator('[aria-label="Día"] [role=radio]:not([disabled])').nth(1).click();
  await picker.locator('.bk-grid [role=radio]:not([disabled])').first().click();
  await expect(picker.locator('.bk-summary')).toContainText(design.products[1].name);
  await picker.getByLabel('Tu WhatsApp', { exact: true }).fill('+573001234567');
  await picker.getByLabel('Nota para el negocio (opcional)').fill('Primera vez.');
  await picker.getByRole('button', { name: 'Confirmar reserva' }).click();
  await expect(buyer).toHaveURL(/solicitudes/);
  const mine = buyer.locator('.flow-operation').filter({ hasText: design.name });
  await expect(mine.locator('.tag')).toHaveText('Recibido');

  await page.goto('/panel/pedidos');
  const card = page.locator('.flow-operation').filter({ hasText: design.name });
  await card.getByRole('button', { name: 'Confirmar cita' }).click();
  // Cada lado actualiza cuando el otro ya guardó el cambio.
  await expect(card.locator('.tag')).toHaveText('Aceptado / confirmado');
  await buyer.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(mine.locator('.tag')).toHaveText('Aceptado / confirmado');
  await buyer.close();
});

test('cotización aceptada, pagada y completada; el cliente deja su reseña', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor', 'servicios');
  const { id, design } = await publishedStore(
    page,
    'Servicios Profesionales',
    `Servicio ${crypto.randomUUID().slice(0, 8)}`,
    'quote',
  );
  const buyer = await browser.newPage();
  await account(buyer, 'cliente', 'servicios');
  await buyer.goto(`/tienda?id=${id}`);
  await buyer.getByRole('button', { name: 'Solicitar cotización', exact: true }).click();
  const dialog = buyer.getByRole('dialog');
  await dialog
    .getByLabel('Detalle de tu solicitud')
    .fill('Quiero conocer y contratar el servicio.');
  await dialog.getByLabel('Tu WhatsApp', { exact: true }).fill('+573001234567');
  await dialog.getByRole('button', { name: 'Enviar solicitud de cotización', exact: true }).click();
  await expect(buyer).toHaveURL(/solicitudes/);

  await page.goto('/panel/pedidos');
  const card = page.locator('.flow-operation').filter({ hasText: design.name });
  await card.getByLabel('Valor de la cotización (COP)').fill('40000');
  await card.getByRole('button', { name: 'Enviar cotización' }).click();
  // Cada lado actualiza cuando el otro ya guardó el cambio.
  await expect(card.locator('.tag')).toHaveText('Cotización enviada');
  await buyer.getByRole('button', { name: 'Actualizar estado' }).click();
  const mine = buyer.locator('.flow-operation').filter({ hasText: design.name });
  await mine.getByRole('button', { name: /Aceptar cotización de/ }).click();
  await expect(mine.locator('.tag')).toHaveText('Aceptado / confirmado');
  await page.getByRole('button', { name: 'Actualizar panel' }).click();
  await card.getByRole('button', { name: 'Confirmar pago recibido' }).click();
  await card.getByRole('button', { name: 'Completar servicio' }).click();
  await expect(card.locator('.tag')).toHaveText('Completado');
  await buyer.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(mine.locator('.tag')).toHaveText('Completado');

  // Lo terminado aparece plegado: se abre para dejar la reseña.
  await mine.locator('.flow-summary').click();
  await mine.getByLabel('Tu experiencia').fill('Me explicaron todo y cumplieron con lo acordado.');
  await mine.getByRole('button', { name: 'Publicar reseña' }).click();
  await expect(buyer.getByRole('status').filter({ hasText: 'Tu reseña' })).toBeVisible();
  await buyer.goto(`/tienda?id=${id}`);
  await expect(buyer.getByRole('tab', { name: 'Reseñas (1)' })).toBeVisible();
  await buyer.close();
});
