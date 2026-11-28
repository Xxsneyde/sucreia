import { test, expect } from '@playwright/test';
import { currency } from '../../src/domain/rules.ts';
import { account, fits, publishedStore, stubWhatsapp } from './helpers.ts';

test('promociones: descuento en todo el negocio, cupón en el carrito y reseñas ordenadas', async ({
  page,
  browser,
}) => {
  // Recorrido largo (descuentos, cupón, compra, reseñas y descuentos por producto).
  test.slow();
  await account(page, 'emprendedor', 'promos');
  const { id, design } = await publishedStore(page);
  const product = design.products[0];

  // La lista de negocios y, al elegir uno, sus productos en tarjetas.
  await page.goto('/panel/descuentos');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Promociones y reseñas' }),
  ).toBeVisible();
  await page
    .getByRole('list', { name: 'Tus negocios' })
    .getByRole('button', { name: new RegExp(design.name) })
    .click();
  await expect(page).toHaveURL(/negocio=/);
  await expect(page.getByRole('heading', { level: 1, name: design.name })).toBeVisible();
  await expect(page.locator('.pr-card')).toHaveCount(design.products.length);

  // Descuento para todo el negocio.
  await page.getByRole('slider', { name: 'Porcentaje de descuento' }).fill('20');
  await page.getByRole('button', { name: 'Aplicar descuento' }).click();
  await expect(page.locator('.pr-msg')).toContainText('20 % de descuento en todo el negocio');
  await expect(page.locator('.pr-card').first().locator('.pr-off')).toHaveText('−20%');

  // Cupón con código (se guarda en mayúsculas).
  await page.getByRole('button', { name: 'Crear cupón' }).click();
  await page.getByLabel('Código del cupón').fill('amigos30');
  await page.getByLabel('Descuento (%)').fill('30');
  await page.getByRole('button', { name: 'Crear cupón AMIGOS30' }).click();
  await expect(page.getByRole('list', { name: 'Tus cupones' })).toContainText('AMIGOS30');
  expect(await fits(page)).toBe(true);

  // El cliente ve el descuento en la página y usa el cupón en el carrito: se aplica el mayor.
  const buyer = await browser.newPage();
  await stubWhatsapp(buyer);
  await account(buyer, 'cliente', 'promos', 'Cliente Promo');
  await buyer.goto(`/tienda?id=${id}`);
  await expect(buyer.locator('.bp-offer')).toContainText('20 % de descuento en todo el negocio');
  await buyer.getByRole('tab', { name: 'Productos y servicios' }).click();
  await buyer.getByRole('button', { name: `Agregar ${product.name}` }).click();
  const cart = buyer.getByRole('region', { name: 'Tu carrito' });
  await expect(cart.locator('.fc-sub--off')).toContainText('Descuento del negocio (20 %)');
  await cart.getByLabel('¿Tienes un cupón?').fill('amigos30');
  await cart.getByRole('button', { name: 'Aplicar' }).click();
  await expect(cart.getByRole('status')).toContainText('Cupón AMIGOS30 aplicado: 30 %');
  await expect(cart.locator('.fc-total')).toContainText(
    currency(product.price - Math.floor(product.price * 0.3)),
  );
  const whatsapp = buyer.waitForEvent('popup');
  await cart.getByRole('button', { name: 'Comprar por WhatsApp' }).click();
  const chat = await whatsapp;
  await chat.waitForURL(/wa\.me/);
  expect(new URL(chat.url()).searchParams.get('text')).toContain('Cupón AMIGOS30 (30 %)');
  await chat.close();
  expect(
    (
      await buyer.request.post(`/api/plataforma/negocios/${id}/resenas`, {
        data: { rating: 2, comment: 'Demoraron con el pedido.' },
      })
    ).status(),
  ).toBe(201);
  await buyer.close();
  const fan = await browser.newPage();
  await account(fan, 'cliente', 'promos', 'Cliente Feliz');
  expect(
    (
      await fan.request.post(`/api/plataforma/negocios/${id}/resenas`, {
        data: { rating: 5, comment: 'Excelente atención.' },
      })
    ).status(),
  ).toBe(201);
  await fan.close();

  // El cupón cuenta su uso; las reseñas se ordenan de mejores a peores y al revés.
  await page.reload();
  await expect(page.getByRole('list', { name: 'Tus cupones' })).toContainText('1 uso ');
  await page.getByRole('button', { name: /Ver reseñas/ }).click();
  await expect(page.getByRole('button', { name: 'Del negocio (2)' })).toBeVisible();
  const reviews = page.locator('.pr-review');
  await expect(reviews.first()).toContainText('Excelente atención.');
  await page.getByLabel('Ordenar').selectOption('peores');
  await expect(reviews.first()).toContainText('Demoraron con el pedido.');
  await expect(page.locator('.pr-avg strong')).toHaveText('3.5');
  expect(await fits(page)).toBe(true);

  // Descuento propio por producto: se eligen en sus tarjetas y cada uno conserva el suyo.
  const [first, second] = design.products;
  await page.getByRole('tab', { name: /descuentos/ }).click();
  await page.getByRole('button', { name: 'Quitar descuento' }).click();
  await expect(page.locator('.pr-msg')).toContainText('Quitaste el descuento de todo el negocio');
  await page.getByRole('radio', { name: 'Productos seleccionados' }).click();
  await page.getByRole('button', { name: 'Aplicar a los elegidos' }).click();
  await expect(page.getByRole('alert')).toContainText('Elige abajo al menos un producto');
  const slider = page.getByRole('slider', { name: 'Porcentaje de descuento' });
  await page.getByLabel(`Incluir ${first.name} en el descuento`).check();
  await slider.fill('30');
  await page.getByRole('button', { name: 'Aplicar a 1 producto' }).click();
  await expect(page.locator('.pr-msg')).toContainText('30 % de descuento en 1 producto');
  // Elegir otro producto con otro porcentaje no le quita el descuento al primero.
  await page.getByLabel(`Incluir ${second.name} en el descuento`).check();
  await slider.fill('10');
  await page.getByRole('button', { name: 'Aplicar a 1 producto' }).click();
  await expect(page.locator('.pr-msg')).toContainText('10 % de descuento en 1 producto');
  const cards = page.locator('.pr-card');
  await expect(cards.nth(0).locator('.pr-off')).toHaveText('−30%');
  await expect(cards.nth(0).locator('.pr-own')).toContainText('Descuento propio: 30 %');
  await expect(cards.nth(1).locator('.pr-off')).toHaveText('−10%');
  await expect(cards.nth(2).locator('.pr-off')).toHaveCount(0);
  await page.reload();
  await expect(cards.nth(0).locator('.pr-off')).toHaveText('−30%');
  await expect(cards.nth(1).locator('.pr-off')).toHaveText('−10%');
  expect(await fits(page)).toBe(true);
  const visitor = await browser.newPage();
  await visitor.goto(`/tienda?id=${id}`);
  await expect(visitor.locator('.bp-offer')).toContainText('Hasta 30 % en productos seleccionados');
  await visitor.close();
  // Quitar el de un producto no toca el del otro.
  await page.getByRole('button', { name: `Quitar el descuento de ${second.name}` }).click();
  await expect(page.locator('.pr-msg')).toContainText(`Quitaste el descuento de ${second.name}`);
  await expect(cards.nth(1).locator('.pr-off')).toHaveCount(0);
  await expect(cards.nth(0).locator('.pr-off')).toHaveText('−30%');
});
