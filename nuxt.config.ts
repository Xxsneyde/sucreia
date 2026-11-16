// Nuxt 4 (Vue 3 + Node). El sitio se genera estático con `nuxt generate` en .output/public;
// cuando haya backend, se puede servir con Node (`nuxt build`) o conectar una API aparte.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  srcDir: 'src',
  ssr: true,
  devtools: { enabled: false },
  telemetry: false,
  css: [
    '@/assets/css/fonts.css',
    '@/assets/css/globals.css',
    '@/assets/css/studio.css',
    '@/assets/css/plantillas.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      meta: [
        {
          name: 'description',
          content:
            'La comunidad digital de emprendimientos de Sucre. Compra local, reserva servicios y conecta con nuestra tierra.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  router: { options: { strict: false } },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/estudio/gestionar/', '/estudio/vista-previa/', '/tienda/'],
      autoSubfolderIndex: true,
    },
  },
  typescript: {
    strict: true,
    // Misma rigurosidad que tenía el proyecto: strict, sin noUncheckedIndexedAccess.
    tsConfig: {
      compilerOptions: { allowImportingTsExtensions: true, noUncheckedIndexedAccess: false },
    },
  },
});
