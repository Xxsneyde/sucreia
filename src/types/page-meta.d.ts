// Metadatos propios de las páginas: `banner` = la página empieza con el encabezado con foto
// y la barra superior flota encima (ver layouts/default.vue).
declare module '#app' {
  interface PageMeta {
    banner?: boolean;
  }
}
declare module 'vue-router' {
  interface RouteMeta {
    banner?: boolean;
  }
}
export {};
