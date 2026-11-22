import { test, expect, type Page } from '@playwright/test';
import { account, openMenu, PASSWORD, publishedStore } from './helpers.ts';

const menu = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

test('configuración previa por pasos: un negocio con reservas queda publicado con su agenda', async ({
  page,
  isMobile,
}) => {
  await account(page, 'emprendedor', 'asistente');
  // Sin negocio, el panel lleva a la configuración previa.
  await expect(page).toHaveURL(/panel\/configurar/);
  const name = `Barbería ${crypto.randomUUID().slice(0, 6)}`;
  await page.getByLabel('Nombre del negocio').fill(name);
  await page
    .locator('.wz-body')
    .getByLabel(/^Sector/)
    .selectOption('Belleza y Bienestar');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('radio', { name: /Servicios con reserva/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click(); // Fotos: opcionales.
  await expect(page.getByRole('heading', { name: 'Tus servicios' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('cell', { name: 'Domingo', exact: true })).toBeVisible();
  await page.getByLabel('¿Cuántas citas atiendes a la misma hora?', { exact: false }).fill('2');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('2 cita(s) a la vez')).toBeVisible();
  await page.getByRole('button', { name: 'Publicar mi negocio' }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole('heading', { name: 'Reservas de hoy' })).toBeVisible();
  await openMenu(page, isMobile);
  await menu(page).getByRole('link', { name: 'Agenda', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Horario de atención' })).toBeVisible();
  await expect(page.getByLabel('Citas a la misma hora')).toHaveValue('2');
});

test('domicilio estilo Uber: bolsa de la zona, recogida, mapa en vivo, cobro y PIN', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000); // Cuatro cuentas y varias idas y vueltas.
  const courierPhone = `+57300${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
  // Negocio de comida con domicilio en Sincelejo.
  await account(page, 'emprendedor', 'domicilio');
  const { id, design } = await publishedStore(page);
  const cfg = (await (await page.request.get(`/api/plataforma/negocios/${id}`)).json()) as {
    settings: Record<string, unknown>;
  };
  expect(
    (
      await page.request.put(`/api/plataforma/negocios/${id}/configuracion`, {
        data: { ...cfg.settings, delivery: true, deliveryFee: 6000 },
      })
    ).status(),
  ).toBe(200);

  // Domiciliario: se registra, la administración lo aprueba y se pone disponible.
  const courierContext = await browser.newContext({
    geolocation: { latitude: 9.3035, longitude: -75.3958 },
    permissions: ['geolocation'],
  });
  const courier = await courierContext.newPage();
  await account(courier, 'cliente', 'repartidor');
  await courier.goto('/domiciliario');
  await courier.getByLabel('WhatsApp (con código de país)').fill(courierPhone);
  await courier.getByLabel('Vehículo').selectOption('Moto');
  await courier.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(courier.getByText('Tu solicitud está en revisión.')).toBeVisible();
  const admin = await browser.newPage();
  await admin.request.post('/api/auth/ingresar', {
    data: { email: 'admin@pruebas.co', password: PASSWORD },
  });
  const { couriers } = (await (await admin.request.get('/api/plataforma/admin')).json()) as {
    couriers: { id: string; phone: string }[];
  };
  const pending = couriers.find((c) => c.phone === courierPhone)!;
  const approval = await admin.request.post(`/api/plataforma/admin/domiciliarios/${pending.id}`, {
    data: { approved: true, note: 'Documentos revisados' },
  });
  expect(approval.ok(), await approval.text()).toBe(true);
  await admin.close();
  await courier.reload();
  await courier.getByRole('button', { name: 'No disponible' }).click();
  await expect(courier.getByRole('button', { name: 'Disponible' })).toBeVisible();

  // Cliente: pide a domicilio marcando el punto de entrega.
  const buyer = await browser.newPage();
  await account(buyer, 'cliente', 'comprador');
  const created = await buyer.request.post('/api/plataforma/operaciones', {
    data: {
      storeId: id,
      key: crypto.randomUUID(),
      kind: 'products',
      items: [{ productId: design.products[0].id, quantity: 1 }],
      phone: '+573001112233',
      address: 'Calle 20 # 10-15, barrio Centro',
      addressLat: 9.301,
      addressLng: -75.39,
      fulfillment: 'delivery',
      paymentMethod: 'cash',
    },
  });
  expect(created.status()).toBe(201);
  const { operation } = (await created.json()) as { operation: { id: string; pin: string } };

  // Negocio: lo acepta desde el tablero (Recientes → Preparando).
  await page.goto('/panel');
  const recent = page.getByRole('region', { name: 'Recientes' });
  await recent.getByRole('button', { name: 'Aceptar y preparar' }).click();
  const preparing = page.getByRole('region', { name: 'Preparando' });
  await expect(preparing.getByText('Buscando domiciliario en la zona…')).toBeVisible();

  // Domiciliario: ve el pedido en su zona sin datos privados y lo acepta.
  await courier.getByRole('button', { name: 'Actualizar' }).click();
  const pool = courier.locator('.cr-pool li').filter({ hasText: design.name });
  await expect(pool).toContainText('$ 6.000');
  await expect(pool).not.toContainText('Calle 20');
  await pool.getByRole('button', { name: 'Aceptar' }).click();
  const active = courier.getByRole('region', { name: 'Entrega en curso' });
  await expect(active.getByText('Ir a recoger')).toBeVisible();
  await expect(
    active.getByRole('button', { name: 'El negocio lo está preparando…' }),
  ).toBeDisabled();

  // Negocio: lo marca listo; el domiciliario lo recoge.
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(preparing).toContainText('viene a recogerlo');
  await preparing.getByRole('button', { name: 'Marcar listo' }).click();
  await courier.getByRole('button', { name: 'Actualizar' }).click();
  await active.getByRole('button', { name: 'Recogí el pedido' }).click();
  await expect(active.getByText('Ir a entregar')).toBeVisible();
  await expect(active).toContainText('Calle 20 # 10-15');

  // El cliente sigue el pedido en el mapa y el negocio lo ve en «Enviados».
  await buyer.goto('/pedidos');
  await expect(buyer.getByRole('region', { name: 'Mapa del pedido' })).toBeVisible();
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(page.getByRole('region', { name: 'Enviados' })).toContainText('va hacia el cliente');

  // Entrega: cobra en efectivo y confirma con el PIN del cliente.
  await active.getByRole('button', { name: /Cobré/ }).click();
  await active.getByLabel('PIN del cliente').fill(operation.pin);
  await active.getByRole('button', { name: 'Entregar' }).click();
  await expect(courier.getByText('¡Entrega completada!')).toBeVisible();
  await expect(courier.locator('.cr-earn')).toContainText('$ 6.000');
  await buyer.close();
  await courierContext.close();
});
