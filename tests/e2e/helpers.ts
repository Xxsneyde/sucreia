// Ayudas compartidas de las pruebas de navegador.
import { expect, type Page } from '@playwright/test';
import { createDesign } from '../../src/domain/studio.ts';
import type { BusinessMode } from '../../src/domain/types.ts';

export const PASSWORD = 'clave-segura-1';

/** Crea una cuenta desde la pestaña «Registrarse» y espera la vista de inicio de su rol. */
export async function account(
  page: Page,
  role: 'cliente' | 'emprendedor' = 'cliente',
  prefix = 'prueba',
) {
  const email = `${prefix}-${crypto.randomUUID()}@ejemplo.co`;
  await page.goto('/ingresar?cuenta=nueva');
  await page.getByLabel('Tu nombre').fill('Persona de prueba');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  if (role === 'cliente') await page.getByText('Quiero comprar', { exact: true }).click();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(role === 'cliente' ? /inicio/ : /panel/);
  return email;
}

/** Publica un negocio de la cuenta con sesión en `page` (por la API) y lo devuelve. */
export async function publishedStore(
  page: Page,
  sector = 'Gastronomía y Alimentos',
  name = `Negocio ${crypto.randomUUID().slice(0, 8)}`,
  mode?: BusinessMode,
) {
  const design = createDesign(sector, name);
  if (mode) design.mode = mode;
  const created = await page.request.post('/api/mis-tiendas', { data: { design } });
  expect(created.status()).toBe(201);
  const { store } = (await created.json()) as { store: { id: string } };
  expect((await page.request.post(`/api/mis-tiendas/${store.id}/publicar`)).status()).toBe(200);
  return { id: store.id, design };
}

export const fits = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Abre el menú lateral en celular (en escritorio ya está visible). */
export async function openMenu(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
}
