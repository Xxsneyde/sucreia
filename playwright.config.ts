import { defineConfig, devices } from '@playwright/test';
// Opcionales: PW_CHANNEL=chrome usa el Chrome instalado en el equipo (sin `npx playwright install`)
// y E2E_PORT cambia el puerto del servidor de pruebas (4173 por defecto).
const port = Number(process.env.E2E_PORT ?? 4173);
const channel = process.env.PW_CHANNEL || undefined;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // En CI se reintenta una vez una prueba intermitente; en local no, para notar regresiones.
  retries: process.env.CI ? 1 : 0,
  // Casi todos los recorridos crean cuentas, publican un negocio y lo aprueban; en paralelo
  // pueden pasar de los 30 segundos por defecto.
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  // Express con la API y el sitio compilado en .output/public; base y bandeja de correo
  // en memoria, exclusivas para las pruebas. No habilita la bandeja en producción.
  webServer: {
    command: 'node tests/browser-server.ts',
    url: `http://127.0.0.1:${port}/api/salud`,
    env: { E2E_PORT: String(port) },
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel },
    },
  ],
});
