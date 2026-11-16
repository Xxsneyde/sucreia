import { test, expect } from '@playwright/test';
async function register(
  page: import('@playwright/test').Page,
  role: 'cliente' | 'emprendedor' = 'emprendedor',
) {
  await page.goto('/ingresar?cuenta=nueva');
  await page.getByLabel('Tu nombre').fill('Persona de prueba');
  await page.getByLabel('Correo', { exact: true }).fill(`sesion-${crypto.randomUUID()}@ejemplo.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-sesion-1');
  if (role === 'cliente') await page.getByText('Quiero comprar', { exact: true }).click();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(role === 'cliente' ? /inicio/ : /estudio/);
}
test('ingreso y recuperación tienen una vista independiente y adaptada al celular', async ({
  page,
}) => {
  await page.goto('/ingresar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Qué bueno verte de nuevo.');
  for (const selector of ['.sidebar', '.topbar', '.bottom-nav', '.demo-banner'])
    await expect(page.locator(selector)).toHaveCount(0);
  await page.getByRole('link', { name: 'Olvidé mi contraseña' }).click();
  await expect(page.getByRole('heading', { name: 'Recupera tu acceso.' })).toBeVisible();
  await expect(page.locator('.auth-shell')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('sin sesión el estudio redirige al ingreso independiente y conserva el destino', async ({
  page,
}) => {
  await page.goto('/estudio/gestionar?id=tienda-prueba');
  // El servidor redirige al ingreso antes de enviar la página (sin mostrar el panel).
  await expect(page).toHaveURL(/ingresar\/?\?volver=/);
  await expect(page.locator('.sidebar')).toHaveCount(0);
  // Resultado real: al crear la cuenta vuelve exactamente a la tienda que intentaba abrir.
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Tu nombre').fill('Persona de prueba');
  await page.getByLabel('Correo', { exact: true }).fill(`volver-${crypto.randomUUID()}@ejemplo.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(/\/estudio\/gestionar\/?\?id=tienda-prueba$/);
});
test('cerrar sesión desde la cabecera invalida la cookie y permite volver como visitante', async ({
  page,
}) => {
  await register(page);
  const exit = page.locator('.topbar').getByRole('button', { name: 'Cerrar sesión', exact: true });
  await expect(exit).toBeVisible();
  await exit.click();
  await expect(page).toHaveURL(/ingresar\?salida=1/);
  await expect(page.getByRole('status').filter({ hasText: 'Cerraste tu sesión' })).toBeVisible();
  expect((await (await page.request.get('/api/auth/yo')).json()).user).toBeNull();
  await page.goBack();
  await expect(page).toHaveURL(/ingresar/);
  await page.getByRole('link', { name: 'Explorar negocios' }).click();
  await expect(
    page.locator('.public-header').getByRole('link', { name: 'Ingresar', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.topbar').getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(
    0,
  );
});
test('un fallo al salir muestra el error y conserva la sesión', async ({ page }) => {
  await register(page, 'cliente');
  await page.route('**/api/auth/salir', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Inténtalo de nuevo.' }),
    }),
  );
  await page.locator('.topbar').getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No se cerró la sesión');
  expect((await (await page.request.get('/api/auth/yo')).json()).user).not.toBeNull();
});
