import { test, expect } from '@playwright/test';
import { currency } from '../../src/domain/rules.ts';
import { account, fits, PASSWORD, publishedStore, stubWhatsapp } from './helpers.ts';

test('compra por WhatsApp: el carrito arma el pedido y queda en Mis compras y en el panel', async ({
  page,
  browser,
}) => {
  await account(page, 'emprendedor', 'recorrido');
  const { id, design } = await publishedStore(page);
  const product = design.products[0];

  const buyer = await browser.newPage();
  await stubWhatsapp(buyer);
  await account(buyer, 'cliente', 'recorrido', 'Compradora Recorrido');
  await buyer.goto(`/tienda?id=${id}`);
  await expect(buyer.getByRole('heading', { level: 1, name: design.name })).toBeVisible();
  await buyer.getByRole('tab', { name: 'Productos y servicios' }).click();
  await buyer.getByRole('button', { name: `Agregar ${product.name}` }).click();
  const cart = buyer.getByRole('region', { name: 'Tu carrito' });
  await expect(cart).toContainText(product.name);
  await cart.getByRole('button', { name: 'Más', exact: true }).click();
  await expect(cart.locator('.fc-total')).toContainText(currency(product.price * 2));
  await cart.getByLabel('Nota para el negocio (opcional)').fill('Para el sábado, por favor.');
  // El pedido se abre en WhatsApp (en otra pestaña) con el detalle listo.
  const whatsapp = buyer.waitForEvent('popup');
  await cart.getByRole('button', { name: 'Comprar por WhatsApp' }).click();
  const chat = await whatsapp;
  await chat.waitForURL(/wa\.me\/573001234567/);
  const message = new URL(chat.url()).searchParams.get('text') ?? '';
  expect(message).toContain(product.name);
  expect(message).toContain('Para el sábado, por favor.');
  await chat.close();
  await expect(cart.getByRole('status')).toContainText(`¡Pedido enviado a ${design.name}!`);

  await buyer.goto('/pedidos');
  const mine = buyer.locator('.wo > li').filter({ hasText: design.name });
  await expect(mine).toContainText(`2 × ${product.name}`);
  await expect(mine).toContainText('Nota: Para el sábado, por favor.');
  expect(await fits(buyer)).toBe(true);
  await buyer.close();

  // El negocio lo ve anotado en su panel.
  await page.goto('/panel');
  const received = page.locator('.wo > li').filter({ hasText: 'Compradora Recorrido' });
  await expect(received).toContainText(`2 × ${product.name}`);
  await expect(received).toContainText(currency(product.price * 2));
});

test('cliente se pasa a emprendedor desde su cuenta y el registro se abre en otra pestaña', async ({
  page,
}) => {
  await account(page, 'cliente', 'cambio');
  await page.goto('/perfil');
  await page.getByRole('link', { name: '¿Quieres montar tu propio emprendimiento? →' }).click();
  await expect(page).toHaveURL(/emprender/);
  const change = page.getByRole('button', { name: 'Pasarme a emprendedor y registrar mi negocio' });
  await expect(change).toBeDisabled();
  await page.getByLabel('Entiendo y acepto que mi cuenta pasará a ser de emprendedor.').check();
  const registration = page.waitForEvent('popup');
  await change.click();
  const tab = await registration;
  await expect(tab).toHaveURL(/registro-negocio/);
  await expect(
    tab.getByRole('heading', { level: 1, name: 'Registra tu emprendimiento' }),
  ).toBeVisible();
  await tab.close();
  await expect(page).toHaveURL(/\/panel\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Registra tu emprendimiento');
  await page.goto('/perfil');
  await expect(page.getByText('Emprendedor', { exact: true })).toBeVisible();
});

test('las pantallas principales tienen estados vacíos sin desbordar ni inventar actividad', async ({
  page,
}) => {
  await account(page, 'emprendedor');
  for (const path of [
    '/buscar',
    '/sectores',
    '/mapa',
    '/solicitudes',
    '/pedidos',
    '/favoritos',
    '/notificaciones',
    '/perfil',
    '/pqrs',
    '/panel',
    '/panel/negocios',
    '/panel/perfil',
    '/panel/productos',
    '/panel/configurar',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first(), path).toBeAttached();
    await expect(page.getByRole('status').filter({ hasText: 'Comprobando' })).toHaveCount(0);
    expect(await fits(page), path).toBe(true);
  }
  await page.goto('/panel');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Registra tu emprendimiento');
  await page.goto('/panel/negocios');
  await expect(page.getByRole('heading', { name: 'Aún no tienes negocios' })).toBeVisible();
  await page.goto('/pedidos');
  await expect(page.getByRole('heading', { name: 'Todavía no has hecho compras' })).toBeVisible();
  await page.goto('/solicitudes');
  await expect(page.getByRole('heading', { name: 'Todavía no tienes reservas' })).toBeVisible();
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
  // La página de SucrePuntos se retiró del menú; el código sigue en el estado de la cuenta.
  const referral = async () =>
    (
      (await (await page.request.get('/api/plataforma/estado')).json()) as {
        referral: { code: string; invited: number };
      }
    ).referral;
  const { code, invited } = await referral();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  expect(invited).toBe(0);
  const friend = await browser.newPage();
  await friend.goto(`/ingresar?ref=${code}`);
  await expect(friend.getByRole('button', { name: 'Registrarse', exact: true })).toHaveClass(/on/);
  await expect(friend.getByLabel('Código de invitación (opcional)')).toHaveValue(code);
  await friend.getByText('Quiero comprar', { exact: true }).click();
  await friend.getByLabel('Correo electrónico').fill(`amiga-${crypto.randomUUID()}@ejemplo.co`);
  await friend.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await friend.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(friend).toHaveURL(/verificar-correo/);
  await friend.close();
  await expect.poll(async () => (await referral()).invited).toBe(1);
});
