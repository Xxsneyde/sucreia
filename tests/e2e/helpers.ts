// Ayudas compartidas de las pruebas de navegador.
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import sharp from 'sharp';
import { createDesign } from '../../src/domain/studio.ts';
import { sentenceCase } from '../../src/domain/sectors.ts';
import type { BusinessMode } from '../../src/domain/types.ts';

export const PASSWORD = 'clave-segura-1';
/**
 * Administración de la base de pruebas: una cuenta por proceso de Playwright (las crea
 * tests/browser-server.ts), porque el ingreso admite 10 intentos por correo cada 15 minutos.
 */
export const admin = () => ({
  email: `admin-${test.info().parallelIndex}@pruebas.co`,
  password: PASSWORD,
});
/** Versión de los términos que se aceptan al crear un negocio (src/lib/studio-store.ts). */
export const TERMS_VERSION = '2026-11-23';

/** Una cédula distinta para cada cuenta: dos cuentas no pueden tener la misma. */
export const cedula = () => String(1_000_000_000 + Math.floor(Math.random() * 8_999_999_999));

/**
 * Confirma la cuenta con el enlace de la bandeja local y completa el perfil, por la API y con la
 * sesión de `page`. Las pantallas de confirmar y completar perfil se prueban en account.spec.ts.
 */
export async function confirmAccount(
  page: Page,
  email: string,
  name = 'Persona de prueba',
  documentNumber = cedula(),
) {
  const { messages } = (await (await page.request.get('/api/desarrollo/correos')).json()) as {
    messages: { to: string; subject: string; path: string }[];
  };
  const mail = messages.find((m) => m.to === email && m.subject === 'Verifica tu correo');
  expect(mail, `correo de verificación para ${email}`).toBeTruthy();
  const token = new URL(mail!.path, 'http://sucreia.local').searchParams.get('token');
  expect(
    (await page.request.post('/api/auth/verificar-correo', { data: { token } })).status(),
  ).toBe(200);
  // El emprendedor queda sin sesión después de registrarse: ingresa con su correo y contraseña.
  if (!(await (await page.request.get('/api/auth/yo')).json()).user)
    expect(
      (
        await page.request.post('/api/auth/ingresar', { data: { email, password: PASSWORD } })
      ).status(),
    ).toBe(200);
  const profile = await page.request.put('/api/auth/perfil/datos', {
    data: { name, documentNumber, address: 'Calle 20 # 18-35, Sincelejo' },
  });
  expect(profile.status()).toBe(200);
}

/**
 * Crea una cuenta desde «Registrarse», la confirma, completa el perfil y abre «Buscar negocios».
 * (El emprendedor sin negocios entraría al formulario del emprendimiento: eso se prueba en
 * session.spec.ts; aquí se va directo a /buscar.)
 */
export async function account(
  page: Page,
  role: 'cliente' | 'emprendedor' = 'cliente',
  prefix = 'prueba',
  name = 'Persona de prueba',
  documentNumber = cedula(),
) {
  const email = `${prefix}-${crypto.randomUUID()}@ejemplo.co`;
  await register(page, email, role);
  // El cliente queda en «Confirma tu correo»; el emprendedor, en el ingreso sin sesión.
  await expect(page).toHaveURL(
    role === 'emprendedor' ? /ingresar\/?\?registrado=1/ : /verificar-correo/,
  );
  await confirmAccount(page, email, name, documentNumber);
  await page.goto('/buscar');
  await expect(page).toHaveURL(/buscar/);
  return email;
}

/** Llena y envía el formulario de registro (sin confirmar la cuenta). */
export async function register(page: Page, email: string, role: 'cliente' | 'emprendedor') {
  await page.goto('/ingresar?cuenta=nueva');
  // Un clic antes de que la página termine de cargar puede perderse: se repite hasta marcarlo.
  const label = role === 'cliente' ? 'Quiero comprar' : 'Tengo un negocio';
  await expect(async () => {
    await page.getByText(label, { exact: true }).click();
    await expect(page.getByRole('radio', { name: new RegExp(label) })).toBeChecked({
      timeout: 1000,
    });
  }).toPass();
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
}

/** Ingresa con correo y contraseña desde la pantalla de acceso y espera a salir de ella. */
export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
  await expect(page).not.toHaveURL(/\/ingresar/);
}

/** PNG de un color (12 px: biblioteca por la API; el registro en pantalla pide 360 px). */
export async function png(color = { r: 34, g: 177, b: 76 }, size = 12) {
  return sharp({ create: { width: size, height: size, channels: 3, background: color } })
    .png()
    .toBuffer();
}
/** La misma foto como data URL (POST /api/imagenes). */
export async function photo(color = { r: 34, g: 177, b: 76 }, size = 12) {
  return `data:image/png;base64,${(await png(color, size)).toString('base64')}`;
}
const pdfBytes = Buffer.from('%PDF-1.4\n%prueba\n');
const pdf = `data:application/pdf;base64,${pdfBytes.toString('base64')}`;

/**
 * Las compras se envían a wa.me en una pestaña nueva: en las pruebas no se sale a internet y se
 * responde una página vacía.
 */
export async function stubWhatsapp(page: Page) {
  await page
    .context()
    .route('https://wa.me/**', (r) =>
      r.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title>' }),
    );
}

/** Elige la primera foto de «Elegir de mis imágenes» dentro de un campo de imagen. */
export async function pickFromLibrary(field: import('@playwright/test').Locator) {
  await field.getByText('Elegir de mis imágenes', { exact: true }).click();
  await field.getByRole('button', { name: 'Usar imagen 1' }).click();
  await expect(field.locator('.image-thumb img')).toHaveAttribute('src', /^\/api\/imagenes\//);
}

/**
 * Llena el registro del negocio en siete pasos (/panel/configurar) y lo envía a revisión.
 * Sube antes a la biblioteca una foto de 400 px para la portada y los productos; el logo se sube
 * desde el equipo y se encuadra.
 */
export async function registerBusiness(
  page: Page,
  options: {
    name: string;
    sector: string;
    municipality?: string;
    mode?: 'Vendo productos' | 'Servicios con reserva' | 'Servicios por cotización';
    whatsapp?: string;
    description?: string;
    /** Paso 5 de un negocio con reservas. */
    capacity?: number;
  },
) {
  const library = await page.request.post('/api/imagenes', {
    data: { data: await photo({ r: 21, g: 101, b: 192 }, 400) },
  });
  expect(library.status()).toBe(201);
  await page.goto('/panel/configurar');
  const step = (title: string | RegExp) =>
    expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
  const next = () => page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await step('Tu negocio');
  await page.getByLabel('Nombre del negocio').fill(options.name);
  // (La etiqueta envuelve el <select>: su texto incluye las opciones; se busca por el rol.)
  await page
    .getByRole('combobox', { name: 'Sector', exact: true })
    .selectOption(sentenceCase(options.sector));
  await page
    .getByRole('combobox', { name: 'Municipio', exact: true })
    .selectOption(options.municipality ?? 'Sincelejo');
  await page
    .getByLabel('Descripción corta')
    .fill(options.description ?? 'Hecho en Sucre, con cariño y precios claros.');
  await page.getByLabel('Dirección').fill('Calle 28 # 26-14');
  await page.getByLabel('WhatsApp', { exact: true }).fill(options.whatsapp ?? '+573001112233');
  await next();

  await step('¿Cómo atiendes a tus clientes?');
  await page.getByRole('radio', { name: new RegExp(options.mode ?? 'Vendo productos') }).click();
  await next();

  await step('Logo y portada');
  const field = (label: string) =>
    page.locator('.image-field').filter({ has: page.getByText(label, { exact: true }) });
  await field('Logo')
    .locator('input[type=file]')
    .setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await png({ r: 211, g: 70, b: 34 }, 480),
    });
  const cropper = page.getByRole('dialog', { name: 'Encuadrar imagen' });
  await cropper.getByRole('button', { name: 'Usar este encuadre' }).click();
  await expect(cropper).toHaveCount(0);
  await expect(field('Logo').locator('.image-thumb img')).toHaveAttribute(
    'src',
    /^\/api\/imagenes\//,
  );
  await pickFromLibrary(field('Foto de portada'));
  await next();

  // Catálogo: tres ejemplos del sector con nombre, descripción y precio; falta la foto.
  await step(/^Tus (productos|servicios)$/);
  const items = page.locator('.wz-item');
  await expect(items).toHaveCount(3);
  for (let i = 0; i < 3; i++) await pickFromLibrary(items.nth(i).locator('.image-field'));
  await next();

  await step(/^(Días, horas y cupos|Ubicación)$/);
  if (options.capacity)
    await page
      .getByLabel('¿Cuántas citas atiendes a la misma hora?', { exact: false })
      .fill(String(options.capacity));
  await next();

  await step('Documentos para la revisión');
  for (const label of ['Documento de identidad', 'RUT', 'Certificado bancario'])
    await page
      .getByLabel(`Adjuntar ${label}`)
      .setInputFiles({ name: `${label}.pdf`, mimeType: 'application/pdf', buffer: pdfBytes });
  await next();

  await step('Todo listo');
  await page.getByRole('checkbox', { name: /Acepto los/ }).check();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '¡Registro enviado!' })).toBeVisible();
  const { stores } = (await (await page.request.get('/api/mis-tiendas')).json()) as {
    stores: { id: string; draft: { name: string } }[];
  };
  return stores.find((s) => s.draft.name === options.name)!.id;
}

/**
 * Sesión de la administración de pruebas (contexto de API aparte, sin navegador). Se inicia una
 * vez por proceso y se reutiliza en sus pruebas.
 */
let adminSession: { origin: string; api: APIRequestContext } | null = null;
export async function adminApi(page: Page) {
  const origin = new URL(page.url()).origin;
  if (adminSession?.origin === origin) return adminSession.api;
  const api = await request.newContext({ baseURL: origin });
  const login = await api.post('/api/auth/ingresar', { data: admin() });
  expect(login.status(), await login.text()).toBe(200);
  adminSession = { origin, api };
  return api;
}

/**
 * Publica un negocio de la cuenta con sesión en `page` por el recorrido real de la API: fotos
 * propias, términos, documentos, envío a revisión y aprobación de la administración.
 */
export async function publishedStore(
  page: Page,
  sector = 'Gastronomía y Alimentos',
  name = `Negocio ${crypto.randomUUID().slice(0, 8)}`,
  mode?: BusinessMode,
) {
  const upload = async () => {
    const res = await page.request.post('/api/imagenes', { data: { data: await photo() } });
    expect(res.status()).toBe(201);
    return ((await res.json()) as { image: { url: string } }).image.url;
  };
  const design = createDesign(sector, name);
  if (mode) design.mode = mode;
  design.address = 'Calle 20 # 18-35';
  design.whatsapp = '+573001234567';
  design.logo = await upload();
  design.content.heroImage = await upload();
  const productPhoto = await upload();
  while (design.products.length < 3)
    design.products.push({ ...design.products[0], id: crypto.randomUUID() });
  design.products = design.products.map((p, i) => ({
    ...p,
    name: p.name || `Producto ${i + 1}`,
    description: p.description || 'Hecho en Sucre.',
    price: p.price > 0 ? p.price : 10000,
    image: productPhoto,
  }));
  const created = await page.request.post('/api/mis-tiendas', {
    data: { design, termsVersion: TERMS_VERSION },
  });
  expect(created.status()).toBe(201);
  const { store } = (await created.json()) as { store: { id: string } };
  for (const kind of ['identidad', 'rut', 'bancario'])
    expect(
      (
        await page.request.put(`/api/plataforma/negocios/${store.id}/documentos/${kind}`, {
          data: { name: `${kind}.pdf`, data: pdf },
        })
      ).status(),
    ).toBe(200);
  expect((await page.request.post(`/api/mis-tiendas/${store.id}/publicar`)).status()).toBe(202);
  await approve(page, store.id);
  return { id: store.id, design };
}

/** La administración aprueba (y así publica) un registro enviado a revisión. */
export async function approve(page: Page, storeId: string) {
  const decision = await (
    await adminApi(page)
  ).post(`/api/plataforma/admin/registro/${storeId}`, {
    data: { approved: true, note: 'Registro de prueba aprobado.' },
  });
  expect(decision.status(), await decision.text()).toBe(204);
}

export const fits = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/**
 * Abre el menú lateral en celular (en escritorio ya está visible). Un clic antes de que la página
 * termine de cargar no hace nada, así que se repite hasta que el menú queda abierto.
 */
export async function openMenu(page: Page, isMobile: boolean) {
  if (!isMobile) return;
  const burger = page.getByRole('button', { name: 'Abrir menú' });
  await expect(async () => {
    if ((await burger.getAttribute('aria-expanded')) !== 'true') await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
  }).toPass();
}
