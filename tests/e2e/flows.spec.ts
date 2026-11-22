import { test, expect } from '@playwright/test';
import { account, fits, publishedStore } from './helpers.ts';

test('dos cuentas: publicación, pedido, pago, entrega con PIN, reseña y puntos', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor', 'recorrido');
  const design = (await import('../../src/domain/studio.ts')).createDesign(
    'Artesanías',
    `Artesanías ${crypto.randomUUID().slice(0, 6)}`,
  );
  design.products[0].price = 12000;
  const created = await page.request.post('/api/mis-tiendas', { data: { design } });
  const { store } = await created.json();
  expect((await page.request.post(`/api/mis-tiendas/${store.id}/publicar`)).status()).toBe(200);

  const buyer = await browser.newPage();
  await account(buyer, 'cliente', 'recorrido');
  await buyer.goto(`/tienda?id=${store.id}`);
  await expect(buyer.getByRole('heading', { level: 1, name: design.name })).toBeVisible();
  await buyer.getByRole('tab', { name: 'Productos y servicios' }).click();
  await buyer.getByRole('button', { name: `Agregar ${design.products[0].name}` }).click();
  const cart = buyer.getByRole('region', { name: 'Tu carrito' });
  await expect(cart).toContainText('Total a pagar');
  await cart.getByRole('button', { name: 'Finalizar compra' }).click();
  await expect(buyer).toHaveURL(/carrito/);
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

  // La reseña real aparece en la página del negocio y los puntos en SucrePuntos.
  await buyer.goto(`/tienda?id=${store.id}`);
  await expect(buyer.getByRole('tab', { name: 'Reseñas (1)' })).toBeVisible();
  await buyer.goto('/puntos');
  // 12 por la compra de $12.000 + 20 por la reseña.
  await expect(buyer.locator('.pt-balance strong')).toHaveText('32');
  expect(await fits(buyer)).toBe(true);
  await buyer.close();
});

test('cliente activa su negocio conservando la cuenta y lo crea en «Datos del negocio»', async ({
  page,
}) => {
  await account(page);
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Activar mi cuenta de emprendedor' }).click();
  await page.goto('/panel/perfil');
  await page.getByLabel('Nombre del negocio').fill('Mi primera tienda');
  await page.getByRole('button', { name: 'Crear mi negocio' }).click();
  await expect(page.getByRole('heading', { name: 'Identidad' })).toBeVisible();
  await expect(page.getByLabel('Nombre del negocio')).toHaveValue('Mi primera tienda');
});

test('las pantallas principales tienen estados vacíos sin desbordar ni inventar actividad', async ({
  page,
}) => {
  await account(page, 'emprendedor');
  for (const path of [
    '/inicio',
    '/buscar',
    '/sectores',
    '/mapa',
    '/puntos',
    '/logistica',
    '/escuela',
    '/recomendaciones',
    '/solicitudes',
    '/pedidos',
    '/favoritos',
    '/notificaciones',
    '/perfil',
    '/panel',
    '/panel/perfil',
    '/panel/productos',
    '/domiciliario',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached();
    await expect(page.getByRole('status').filter({ hasText: 'Comprobando' })).toHaveCount(0);
    expect(await fits(page), path).toBe(true);
  }
  await page.goto('/puntos');
  await expect(page.locator('.pt-balance strong')).toHaveText('0');
});

test('buscar, filtrar por sector y abrir un negocio con su asistente', async ({ page }) => {
  await account(page, 'emprendedor', 'buscar');
  const tag = crypto.randomUUID().slice(0, 6);
  const food = await publishedStore(page, 'Gastronomía y Alimentos', `Cocina ${tag}`);
  await publishedStore(page, 'Turismo y Hospedaje', `Cabañas ${tag}`, 'booking');
  await page.goto(`/buscar?q=${tag}`);
  await expect(page.locator('.sx-biz')).toHaveCount(2);
  await page.getByRole('listitem').filter({ hasText: 'Turismo' }).first().click();
  await expect(page.locator('.sx-biz')).toHaveCount(1);
  await expect(page.locator('.sx-biz')).toContainText(`Cabañas ${tag}`);
  await page.getByRole('listitem').filter({ hasText: 'Turismo' }).first().click();
  await expect(page.locator('.sx-biz')).toHaveCount(2);
  await page
    .locator('.sx-biz')
    .filter({ hasText: food.design.name })
    .getByRole('link', { name: 'Bot IA' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: food.design.name })).toBeVisible();
  const bot = page.getByRole('region', { name: `Asistente de ${food.design.name}` });
  await bot.getByRole('textbox').fill(`¿Cuánto cuesta ${food.design.products[0].name}?`);
  await bot.getByRole('button', { name: 'Enviar pregunta' }).click();
  await expect(bot.locator('.sx-bubble').nth(2)).toContainText(food.design.products[0].name);
});

test('referidos: el enlace con código llena el registro y cuenta al invitado', async ({
  page,
  browser,
}) => {
  await account(page, 'cliente', 'invita');
  await page.goto('/puntos');
  const card = page.locator('#referidos');
  await expect(
    card.getByRole('img', { name: 'Código QR de tu enlace de invitación' }),
  ).toBeVisible();
  const code = (await card.locator('.pt-code').textContent())!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  const friend = await browser.newPage();
  await friend.goto(`/ingresar?ref=${code}`);
  await expect(friend.getByRole('button', { name: 'Registrarse', exact: true })).toHaveClass(/on/);
  await expect(friend.getByLabel('Código de invitación (opcional)')).toHaveValue(code);
  await friend.getByLabel('Tu nombre').fill('Amiga invitada');
  await friend.getByLabel('Correo electrónico').fill(`amiga-${crypto.randomUUID()}@ejemplo.co`);
  await friend.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await friend.getByText('Quiero comprar', { exact: true }).click();
  await friend.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(friend).toHaveURL(/inicio/);
  await friend.close();
  await page.reload();
  await expect(page.locator('#referidos')).toContainText('1 invitados');
  await expect(page.locator('#retos')).toContainText('Compra en 3 sectores distintos');
});
