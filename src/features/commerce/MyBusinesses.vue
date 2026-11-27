<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  CalendarCheck,
  CalendarClock,
  ExternalLink,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  Store,
} from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { REGISTER_PATH, onRegistrationSent } from '@/lib/registration-tab';
import { businessHref, thumbnail, type StoreProject } from '@/domain/studio';
// Todos los negocios de la cuenta, con su estado de registro y accesos para gestionarlos.
const studio = useStudio();
const router = useRouter();
let stopListening = () => {};
function onFocus() {
  if (document.visibilityState === 'visible') void studio.refresh();
}
onMounted(() => {
  stopListening = onRegistrationSent(() => void studio.refresh());
  window.addEventListener('focus', onFocus);
});
onBeforeUnmount(() => {
  stopListening();
  window.removeEventListener('focus', onFocus);
});
const list = computed(() =>
  [...studio.projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
);
const modeNames = { products: 'Productos', booking: 'Reservas', quote: 'Cotizaciones' };
function statusOf(p: StoreProject) {
  if (p.registration === 'rejected') return { tone: 'bad', label: 'Registro rechazado' };
  if (p.registration === 'approved')
    return p.published ? { tone: 'ok', label: 'Publicado' } : { tone: 'off', label: 'Inactivo' };
  return p.publicationRequested
    ? { tone: 'wait', label: 'En revisión' }
    : { tone: 'wait', label: 'Registro incompleto' };
}
/** Elige el negocio y abre la página pedida. */
async function manage(p: StoreProject, to = '/panel') {
  studio.select(p.id);
  await router.push(to);
}
</script>
<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">Mi negocio</p>
      <h1>Mis negocios</h1>
      <p class="muted">
        Puedes registrar varios negocios con tu cuenta. Cada uno pasa por la revisión de la
        administración antes de aparecer en SucreIA.
      </p>
    </div>
    <NuxtLink class="sx-btn" :to="REGISTER_PATH"
      ><Plus :size="18" /> Registrar emprendimiento</NuxtLink
    >
  </div>
  <p v-if="!studio.ready" class="loader" role="status">Cargando tus negocios…</p>
  <section v-else-if="!list.length" class="sx-card mb-empty">
    <Store :size="30" />
    <h2>Aún no tienes negocios</h2>
    <p class="muted">Registra tu emprendimiento con tus datos, fotos y documentos.</p>
    <NuxtLink class="sx-btn" :to="REGISTER_PATH"
      ><Plus :size="18" /> Registrar mi primer emprendimiento</NuxtLink
    >
  </section>
  <ul v-else class="mb-list">
    <li
      v-for="p in list"
      :key="p.id"
      :class="['sx-card', 'mb-item', { active: p.id === studio.selectedId }]"
    >
      <img
        v-if="p.draft.logo"
        :src="thumbnail(p.draft.logo)"
        alt=""
        width="64"
        height="64"
        class="mb-logo"
      />
      <span v-else class="mb-logo mb-initial">{{ p.draft.name.slice(0, 1) }}</span>
      <div class="mb-info">
        <h2>{{ p.draft.name || 'Sin nombre' }}</h2>
        <p class="muted">
          {{ p.draft.category }} · {{ p.draft.municipality }} · {{ modeNames[p.draft.mode] }}
        </p>
        <span :class="['mb-status', statusOf(p).tone]">{{ statusOf(p).label }}</span>
        <span v-if="p.id === studio.selectedId" class="mb-current">Negocio activo</span>
      </div>
      <nav class="mb-actions" :aria-label="`Gestionar ${p.draft.name || 'negocio'}`">
        <button type="button" class="mb-action primary" @click="manage(p)">
          <LayoutDashboard :size="18" /> <span>Panel</span>
        </button>
        <button type="button" class="mb-action" @click="manage(p, '/panel/perfil')">
          <Settings :size="18" /> <span>Datos del negocio</span>
        </button>
        <button type="button" class="mb-action" @click="manage(p, '/panel/productos')">
          <Package :size="18" />
          <span>{{ p.draft.mode === 'products' ? 'Productos' : 'Servicios' }}</span>
        </button>
        <button
          v-if="p.draft.mode !== 'products'"
          type="button"
          class="mb-action"
          @click="manage(p, '/panel/pedidos')"
        >
          <CalendarCheck :size="18" />
          <span>{{ p.draft.mode === 'quote' ? 'Solicitudes' : 'Reservas' }}</span>
        </button>
        <button
          v-if="p.draft.mode === 'booking'"
          type="button"
          class="mb-action"
          @click="manage(p, '/panel/agenda')"
        >
          <CalendarClock :size="18" /> <span>Horario y cupos</span>
        </button>
        <NuxtLink v-if="p.published" class="mb-action" :to="businessHref(p.id)" target="_blank"
          ><ExternalLink :size="18" /> <span>Ver página</span></NuxtLink
        >
      </nav>
    </li>
  </ul>
</template>

<style scoped>
.mb-empty {
  text-align: center;
  max-width: 520px;
  color: var(--green-dark);
  justify-items: center;
  gap: 10px;
  margin: 20px auto;
  padding: 30px 20px;
  display: grid;
}
.mb-empty h2,
.mb-empty p {
  margin: 0;
}
.mb-list {
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
/* Arriba el logo y los datos; debajo los accesos, parejos y a todo el ancho. */
.mb-item {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px 16px;
  display: grid;
}
.mb-item.active {
  box-shadow:
    0 0 0 2px var(--green),
    var(--shadow);
}
.mb-logo {
  object-fit: cover;
  background: var(--bg);
  border-radius: 16px;
  flex: none;
  width: 64px;
  height: 64px;
}
.mb-initial {
  color: var(--green-dark);
  background: var(--green-soft);
  place-items: center;
  font-size: 26px;
  font-weight: 700;
  display: grid;
}
.mb-info {
  flex: 1;
  min-width: 0;
}
.mb-info h2 {
  margin: 0;
  font-size: 18px;
}
.mb-info p {
  margin: 2px 0 6px;
}
.mb-current,
.mb-status {
  border-radius: 999px;
  margin-right: 6px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 700;
  display: inline-block;
}
.mb-status.ok {
  background: var(--green-soft);
  color: var(--green-dark);
}
.mb-status.wait {
  color: #92590a;
  background: #fff7e6;
}
.mb-status.bad {
  color: #b91c1c;
  background: #fdecec;
}
.mb-status.off {
  background: var(--bg);
  color: var(--muted);
}
.mb-current {
  background: var(--blue-soft);
  color: var(--blue);
}
.mb-actions {
  border-top: 1px solid var(--line);
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  grid-column: 1 / -1;
  gap: 8px;
  padding-top: 14px;
  display: grid;
}
.mb-action {
  color: var(--navy-800);
  text-align: center;
  background: var(--bg);
  border: 1px solid transparent;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.2;
  transition:
    background 0.15s,
    border-color 0.15s;
  display: flex;
}
.mb-action:hover {
  background: #fff;
  border-color: var(--line);
}
.mb-action svg {
  flex: none;
}
.mb-action.primary {
  color: #fff;
  background: var(--green);
}
.mb-action.primary:hover {
  background: var(--green-dark);
}
@media (width<=520px) {
  .mb-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
