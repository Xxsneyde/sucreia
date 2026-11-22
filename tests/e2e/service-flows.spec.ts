import { test, expect } from '@playwright/test';
import { account, publishedStore } from './helpers.ts';

for (const mode of ['booking', 'quote'] as const)
  test(`recorrido de ${mode === 'booking' ? 'reserva con horario disponible' : 'cotización aceptada y completada'}`, async ({
    page,
    browser,
  }) => {
    await account(page, 'emprendedor', 'servicios');
    const { id, design } = await publishedStore(
      page,
      mode === 'booking' ? 'Belleza y Bienestar' : 'Servicios Profesionales',
      `Servicio ${crypto.randomUUID().slice(0, 8)}`,
      mode,
    );
    const buyer = await browser.newPage();
    await account(buyer, 'cliente', 'servicios');
    await buyer.goto(`/tienda?id=${id}`);
    await buyer
      .getByRole('button', {
        name: mode === 'booking' ? 'Reservar ahora' : 'Solicitar cotización',
        exact: true,
      })
      .click();
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
        name: mode === 'booking' ? 'Solicitar reserva' : 'Enviar solicitud de cotización',
        exact: true,
      })
      .click();
    await expect(buyer).toHaveURL(/solicitudes/);
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

test('escuela: ruta en orden, evaluaciones guardadas y constancia consultable', async ({
  page,
}) => {
  await account(page);
  await page.goto('/escuela');
  const { lessons } = await import('../../src/features/community/lessons.ts');
  // Orden de la ruta por defecto; cada curso se desbloquea al terminar el anterior.
  const route = [
    ['Marketing digital', ['historia', 'diseno']],
    ['Costos y finanzas', ['costos']],
    ['Formalización del negocio', ['formalizacion']],
    ['Ventas en línea y e-commerce', ['catalogo']],
    ['Atención al cliente', ['atencion']],
    ['Uso de tecnologías e IA', ['herramientas']],
  ] as const;
  await expect(page.getByRole('button', { name: 'Costos y finanzas', exact: true })).toBeDisabled();
  for (const [topic, ids] of route) {
    await page.getByRole('button', { name: topic, exact: true }).click();
    const dialog = page.getByRole('dialog');
    for (const id of ids) {
      const lesson = lessons.find((l) => l.id === id)!;
      const card = dialog
        .locator('article')
        .filter({ has: page.getByRole('heading', { name: lesson.title, exact: true }) });
      await card.getByRole('radio', { name: lesson.answers[lesson.correct], exact: true }).check();
      await card.getByRole('button', { name: 'Comprobar y guardar progreso' }).click();
      await expect(card.getByText('Completada', { exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
  await expect(page.getByText('100%')).toBeVisible();
  await page.getByRole('button', { name: 'Generar constancia de finalización' }).click();
  await expect(page).toHaveURL(/constancia\?id=/);
  await expect(page.getByRole('heading', { name: 'Constancia de finalización' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir o guardar como PDF' })).toBeVisible();
});
