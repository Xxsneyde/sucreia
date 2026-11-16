import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // En CI se reintenta una vez una prueba intermitente; en local no, para notar regresiones.
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  // Express con la API y el sitio compilado en .output/public; base y bandeja de correo
  // en memoria, exclusivas para las pruebas. No habilita la bandeja en producción.
  webServer: {
    command: 'node tests/browser-server.ts',
    url: 'http://127.0.0.1:4173/api/salud',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
