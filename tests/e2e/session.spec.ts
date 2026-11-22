import { test, expect } from '@playwright/test';
import { account, fits } from './helpers.ts';

const userMenu = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /Hola,/ }).click();
  return page.locator('.sx-menu');
};

test('ingreso y recuperación tienen su propia vista y se adaptan al celular', async ({ page }) => {
  await page.goto('/ingresar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Bienvenido a SucreIA!');
  await expect(page.locator('.sx-side')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Iniciar sesión con Google' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Iniciar sesión con Facebook' })).toBeDisabled();
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page.getByRole('heading', { name: 'Recupera tu acceso.' })).toBeVisible();
  expect(await fits(page)).toBe(true);
});

test('sin sesión el panel redirige al ingreso y vuelve al destino al crear la cuenta', async ({
  page,
}) => {
  await page.goto('/panel/productos');
  await expect(page).toHaveURL(/ingresar\/?\?volver=/);
  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();
  await page.getByLabel('Tu nombre').fill('Persona de prueba');
  await page.getByLabel('Correo electrónico').fill(`volver-${crypto.randomUUID()}@ejemplo.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(/\/panel\/productos\/?$/);
});

test('cerrar sesión desde el menú de la cuenta invalida la cookie y vuelve como visitante', async ({
  page,
}) => {
  await account(page, 'emprendedor', 'sesion');
  await (await userMenu(page)).getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/ingresar\?salida=1/);
  await expect(page.getByRole('status').filter({ hasText: 'Cerraste tu sesión' })).toBeVisible();
  expect((await (await page.request.get('/api/auth/yo')).json()).user).toBeNull();
  await page.goto('/buscar');
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true }).first()).toBeAttached();
  await expect(page.getByRole('button', { name: /Hola,/ })).toHaveCount(0);
});

test('un fallo al salir muestra el error y conserva la sesión', async ({ page }) => {
  await account(page, 'cliente', 'sesion');
  await page.route('**/api/auth/salir', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Inténtalo de nuevo.' }),
    }),
  );
  await (await userMenu(page)).getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No se cerró la sesión');
  expect((await (await page.request.get('/api/auth/yo')).json()).user).not.toBeNull();
});
