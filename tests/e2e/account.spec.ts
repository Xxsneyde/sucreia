import { test, expect } from '@playwright/test';

test('verificar correo y recuperar contraseña desde la bandeja local', async ({ page }) => {
  const email = `cuenta-${crypto.randomUUID()}@ejemplo.co`;
  await page.goto('/ingresar?cuenta=nueva');
  await page.getByLabel('Tu nombre').fill('Emprendedora');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-inicial-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(/panel/);
  await page.goto('/correo-local');
  const verification = page
    .locator('li')
    .filter({ hasText: email })
    .filter({ hasText: 'Verifica tu correo' });
  await verification.getByRole('link', { name: 'Abrir enlace' }).click();
  await page.getByRole('button', { name: 'Confirmar mi correo' }).click();
  await expect(page.getByRole('heading', { name: 'Correo verificado', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Volver a mi perfil' }).click();
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
  await page.getByRole('link', { name: 'Volver a ingresar' }).click();
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-nueva-2');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
  await expect(page).toHaveURL(/panel/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('enlaces inválidos permiten volver a solicitarlos', async ({ page }) => {
  await page.goto('/verificar-correo?token=invalido');
  await page.getByRole('button', { name: 'Confirmar mi correo' }).click();
  await expect(page.getByRole('alert')).toContainText('ya se usó o venció');
  await page.getByRole('link', { name: 'Solicitar otro enlace' }).click();
  await expect(page.getByRole('link', { name: 'Ingresar', exact: false }).first()).toBeVisible();
});
