import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // En CI se reintenta una vez una prueba intermitente; en local no, para notar regresiones.
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  // El servidor real de producción (Express con la API y el sitio compilado en .output/public),
  // con una base de datos en memoria que empieza vacía en cada ejecución.
  webServer: {
    command: 'node server/index.ts --production',
    url: 'http://127.0.0.1:4173/api/salud',
    reuseExistingServer: false,
    env: { PORT: '4173', HOST: '127.0.0.1', DATABASE_PATH: ':memory:', COOKIE_SECURE: 'false' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
