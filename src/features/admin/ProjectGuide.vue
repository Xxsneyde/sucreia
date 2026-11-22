<script setup lang="ts">
import PageTitle from '@/components/PageTitle.vue';
const modules = [
  [
    'Explorar',
    'Inicio, buscar, sectores, mapa, página del negocio y recomendaciones',
    'features/explore',
  ],
  [
    'Compras y panel',
    'Carrito, pedidos, solicitudes, panel y datos del negocio',
    'features/commerce',
  ],
  [
    'SucrePuntos, Escuela y Logística',
    'Puntos y bonos, cursos con constancia y entregas',
    'features/community',
  ],
  ['Autenticación y perfil', 'Sesiones, recuperación y verificación de correo', 'features/account'],
  ['Administración', 'Revisión y moderación con permisos y auditoría', 'features/admin'],
];
</script>

<template>
  <PageTitle
    eyebrow="CONSTRUIMOS EN EQUIPO"
    title="El recorrido de SucreIA."
    description="Módulos implementados y conexiones del producto local."
  />
  <section class="card">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Estado</th>
            <th>Carpeta en src/</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in modules" :key="m[0]">
            <td v-for="v in m" :key="v">{{ v }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <div class="two-columns">
    <section class="card">
      <h2>Una tarea, una rama</h2>
      <ol class="checklist">
        <li>Registrar la tarea en GitHub Issues.</li>
        <li>Crear una rama feature/nombre-de-la-tarea.</li>
        <li>Trabajar en el módulo correspondiente.</li>
        <li>Ejecutar npm run check.</li>
        <li>Abrir un pull request y pedir revisión.</li>
        <li>Integrar después de aprobar y pasar las comprobaciones.</li>
      </ol>
    </section>
    <section class="card">
      <h2>Siguiente etapa</h2>
      <p>
        Conectar un backend en Node.js para cuentas, pedidos y publicación real de las tiendas del
        estudio.
      </p>
      <p class="muted">
        La arquitectura, los contratos de datos y las tareas propuestas están documentados en el
        repositorio.
      </p>
      <span class="tag">Vue 3 · Nuxt · Node.js · Express · TypeScript</span>
    </section>
  </div>
</template>
