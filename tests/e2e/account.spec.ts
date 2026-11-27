import { test, expect } from '@playwright/test';
import { account, cedula, fits, PASSWORD, register } from './helpers.ts';

test('confirmar la cuenta, completar el perfil y recuperar la contraseña desde la bandeja local', async ({
  page,
  browser,
}) => {
  // Otra cuenta ya registró esta cédula.
  const taken = cedula();
  const other = await browser.newPage();
  await account(other, 'cliente', 'cedula', 'Otra persona', taken);
  await other.close();

  const email = `cuenta-${crypto.randomUUID()}@ejemplo.co`;
  await register(page, email, 'cliente');
  await expect(page).toHaveURL(/verificar-correo/);
  await expect(page.getByRole('heading', { name: 'Confirma tu correo.' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  // Sin confirmar, la plataforma devuelve a este paso.
  await page.goto('/buscar');
  await expect(page).toHaveURL(/verificar-correo/);

  await page.getByRole('link', { name: 'bandeja de desarrollo' }).click();
  await page
    .locator('li')
    .filter({ hasText: email })
    .filter({ hasText: 'Verifica tu correo' })
    .getByRole('link', { name: 'Abrir enlace' })
    .click();
  await expect(page).toHaveURL(/ingresar\/?\?confirmado=1/);
  await expect(page.getByRole('status')).toContainText('¡Tu cuenta quedó confirmada!');
  await expect(page.getByLabel('Correo electrónico')).toHaveValue(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();

  await expect(page).toHaveURL(/completar-perfil/);
  await expect(page.getByRole('heading', { name: 'Completa tus datos.' })).toBeVisible();
  // Sin perfil completo tampoco se entra a la plataforma.
  await page.goto('/pedidos');
  await expect(page).toHaveURL(/completar-perfil/);
  await page.getByLabel('Nombre completo').fill('Compradora de prueba');
  await page.getByLabel('Número de cédula').fill(taken);
  await page.getByLabel('Dirección').fill('Calle 20 # 18-35, Sincelejo');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  // Una cédula solo puede tener una cuenta.
  await expect(page.getByRole('alert')).toContainText(
    'Ya hay una cuenta registrada con esa cédula',
  );
  await expect(page).toHaveURL(/completar-perfil/);
  await page.getByLabel('Número de cédula').fill(cedula());
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page).toHaveURL(/buscar/);
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hola, Compradora de prueba.');
  await expect(page.getByText('Correo verificado', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Hola,/ }).click();
  await page
    .locator('.sx-menu')
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect(page).toHaveURL(/ingresar/);
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await page.getByLabel('Correo de tu cuenta').fill(email);
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
  await page.getByRole('link', { name: 'bandeja de desarrollo' }).click();
  const reset = page
    .locator('li')
    .filter({ hasText: email })
    .filter({ hasText: 'Recupera tu contraseña' });
  await reset.getByRole('link', { name: 'Abrir enlace' }).click();
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('clave-nueva-2');
  await page.getByLabel('Repite la contraseña').fill('otra-clave-3');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('alert')).toHaveText('Las contraseñas no coinciden.');
  await page.getByLabel('Repite la contraseña').fill('clave-nueva-2');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('heading', { name: 'Ya puedes volver' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver a ingresar →' }).click();
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-nueva-2');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
  await expect(page).toHaveURL(/buscar/);
  expect(await fits(page)).toBe(true);
});

test('enlaces inválidos permiten volver a solicitarlos', async ({ page }) => {
  // El enlace de confirmación se usa al abrirlo.
  await page.goto('/verificar-correo?token=invalido');
  await expect(page.getByRole('alert')).toContainText('ya se usó o venció');
  await page.getByRole('link', { name: 'Iniciar sesión →' }).click();
  await expect(page).toHaveURL(/ingresar/);

  await page.goto('/recuperar?token=invalido');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('clave-nueva-2');
  await page.getByLabel('Repite la contraseña').fill('clave-nueva-2');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('alert')).toContainText('venció');
  await page.getByRole('link', { name: 'Solicitar otro enlace' }).click();
  await expect(page.getByRole('heading', { name: 'Recupera tu acceso.' })).toBeVisible();
  await expect(page.getByLabel('Correo de tu cuenta')).toBeVisible();
});
