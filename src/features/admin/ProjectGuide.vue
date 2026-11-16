<script setup lang="ts">
import PageTitle from '@/components/PageTitle.vue';
const modules = [
  ['Catálogo y búsqueda', 'Navegable con filtros', 'features/marketplace'],
  ['Carrito y pedidos', 'Flujo local de demostración', 'features/orders'],
  ['Panel del negocio', 'Indicadores y cambios de estado de demo', 'features/business'],
  ['Configurador de negocios', 'Elección entre 3 diseños por área', 'features/onboarding'],
  [
    'Estudio visual',
    'Mi tienda: diseños, textos, versiones y publicación local',
    'features/studio',
  ],
  ['SucrePuntos', 'Pantalla base; reglas y canje pendientes', 'features/rewards'],
  ['Autenticación y perfil', 'Accesos de demo; autenticación pendiente', 'features/account'],
  [
    'Escuela, territorio y entregas',
    'Pantallas base; integraciones pendientes',
    'features/community',
  ],
  ['Administración', 'Pantallas base; permisos pendientes', 'features/admin'],
];
</script>

<template>
  <PageTitle
    eyebrow="CONSTRUIMOS EN EQUIPO"
    title="Una base, muchas manos."
    description="Mapa del esqueleto de SucreIA y del trabajo que viene."
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
      <span class="tag">Vue 3 · TypeScript · Nuxt · Node.js</span>
    </section>
  </div>
</template>
