import { test, expect } from '@playwright/test';
import { account, cedula, fits, openMenu, PASSWORD, register, signIn } from './helpers.ts';

const userMenu = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /Hola,/ }).click();
  return page.locator('.sx-menu');
};

test('ingreso y recuperación tienen su propia vista y se adaptan al celular', async ({ page }) => {
  await page.goto('/ingresar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Bienvenido a SucreIA!');
  await expect(page.locator('.sx-side')).toHaveCount(0);
  // Google queda deshabilitado mientras el servidor no tenga esa cuenta configurada.
  await expect(page.getByRole('button', { name: 'Iniciar sesión con Google' })).toBeDisabled();
  await expect(page.getByText('El acceso con Google se activará')).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page.getByRole('heading', { name: 'Recupera tu acceso.' })).toBeVisible();
  expect(await fits(page)).toBe(true);
});

test('sin sesión el panel redirige al ingreso y vuelve al destino tras confirmar y completar el perfil', async ({
  page,
}) => {
  const email = `volver-${crypto.randomUUID()}@ejemplo.co`;
  await page.goto('/panel/productos');
  await expect(page).toHaveURL(/ingresar\/?\?volver=/);
  // Mientras la redirección termina de cargar, un clic puede perderse: se repite.
  const signUp = page.getByRole('button', { name: 'Registrarse', exact: true });
  await expect(async () => {
    await signUp.click();
    await expect(signUp).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
  }).toPass();
  await page.getByText('Tengo un negocio', { exact: true }).click();
  await page.getByLabel('Correo electrónico').fill(email);
  // Una contraseña sin número ni carácter especial no se acepta: la lista dice qué falta.
  await page.getByLabel('Contraseña', { exact: true }).fill('clavesegura');
  const rules = page.getByRole('list', { name: 'Requisitos de la contraseña' });
  await expect(rules.getByRole('listitem').filter({ hasText: 'Mínimo 8 caracteres' })).toHaveClass(
    /ok/,
  );
  await expect(
    rules.getByRole('listitem').filter({ hasText: 'Al menos un número' }),
  ).not.toHaveClass(/ok/);
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('alert')).toContainText('al menos un carácter especial');
  await expect(page).toHaveURL(/ingresar/);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await expect(rules.locator('li.ok')).toHaveCount(4);
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  // El emprendedor no queda con la sesión abierta: va al ingreso con el aviso del correo.
  await expect(page).toHaveURL(/ingresar\/?\?registrado=1/);
  await expect(page.getByRole('status')).toContainText('Tu cuenta quedó creada');
  await expect(page.getByLabel('Correo electrónico')).toHaveValue(email);
  // Si intenta ingresar sin confirmar, primero debe confirmar.
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
  await expect(page).toHaveURL(/verificar-correo/);

  // Confirmar con el enlace cierra la sesión: se vuelve a ingresar con el correo ya escrito.
  await page.getByRole('link', { name: 'bandeja de desarrollo' }).click();
  await page
    .locator('li')
    .filter({ hasText: email })
    .filter({ hasText: 'Verifica tu correo' })
    .getByRole('link', { name: 'Abrir enlace' })
    .click();
  await expect(page).toHaveURL(/ingresar\/?\?confirmado=1/);
  await expect(page.getByLabel('Correo electrónico')).toHaveValue(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();

  await expect(page).toHaveURL(/completar-perfil/);
  await page.getByLabel('Nombre completo').fill('Persona de prueba');
  await page.getByLabel('Número de cédula').fill(cedula());
  await page.getByLabel('Dirección').fill('Calle 20 # 18-35, Sincelejo');
  // Vuelve a la página que pidió al principio, en la misma pestaña.
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page).toHaveURL(/\/panel\/productos\/?$/);
});

test('emprendedor nuevo: tras confirmar e ingresar entra a «Registra tu emprendimiento»', async ({
  page,
  isMobile,
}) => {
  const email = `primero-${crypto.randomUUID()}@ejemplo.co`;
  await register(page, email, 'emprendedor');
  await expect(page).toHaveURL(/ingresar\/?\?registrado=1/);
  // Confirma con el enlace del correo e ingresa.
  await page.getByRole('link', { name: 'bandeja de desarrollo' }).click();
  await page
    .locator('li')
    .filter({ hasText: email })
    .filter({ hasText: 'Verifica tu correo' })
    .getByRole('link', { name: 'Abrir enlace' })
    .click();
  await expect(page).toHaveURL(/ingresar\/?\?confirmado=1/);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
  await expect(page).toHaveURL(/completar-perfil/);
  await page.getByLabel('Nombre completo').fill('Emprendedora nueva');
  await page.getByLabel('Número de cédula').fill(cedula());
  await page.getByLabel('Dirección').fill('Calle 20 # 18-35, Sincelejo');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  // Entra directo al formulario, en la misma pestaña, con el menú de la plataforma.
  await expect(page).toHaveURL(/\/panel\/configurar\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Registra tu emprendimiento');
  await expect(page.getByRole('heading', { level: 2, name: 'Tu negocio' })).toBeVisible();
  await openMenu(page, isMobile);
  await expect(
    page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Registra tu emprendimiento', exact: true }),
  ).toBeVisible();
  // Mientras no tenga negocios, cada vez que entra llega al formulario.
  await page.goto('/');
  await expect(page).toHaveURL(/\/panel\/configurar\/?$/);
  await page.request.post('/api/auth/salir');
  await signIn(page, email);
  await expect(page).toHaveURL(/\/panel\/configurar\/?$/);
});

test('cerrar sesión desde el menú de la cuenta invalida la cookie y vuelve como visitante', async ({
  page,
}) => {
  await account(page, 'emprendedor', 'sesion');
  await (await userMenu(page)).getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/ingresar\?salida=1/);
  await expect(page.getByRole('status').filter({ hasText: 'Cerraste tu sesión' })).toBeVisible();
  expect((await (await page.request.get('/api/auth/yo')).json()).user).toBeNull();
  // Buscar necesita cuenta: el visitante vuelve al ingreso.
  await page.goto('/buscar');
  await expect(page).toHaveURL(/ingresar\/?\?volver=/);
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
