<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
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
      <div class="mb-actions">
        <button type="button" class="sx-btn sx-btn--sm" @click="manage(p)">
          <LayoutDashboard :size="16" /> Gestionar
        </button>
        <button
          type="button"
          class="sx-btn sx-btn--outline sx-btn--sm"
          @click="manage(p, '/panel/perfil')"
        >
          <Settings :size="16" /> Gestionar datos del negocio
        </button>
        <button
          type="button"
          class="sx-btn sx-btn--outline sx-btn--sm"
          @click="manage(p, '/panel/productos')"
        >
          <Package :size="16" />
          {{ p.draft.mode === 'products' ? 'Gestionar productos' : 'Gestionar servicios' }} del
          negocio
        </button>
        <button
          v-if="p.draft.mode === 'booking'"
          type="button"
          class="sx-btn sx-btn--outline sx-btn--sm"
          @click="manage(p, '/panel/agenda')"
        >
          <CalendarClock :size="16" /> Gestionar horario y cupos
        </button>
        <NuxtLink
          v-if="p.published"
          class="sx-btn sx-btn--outline sx-btn--sm"
          :to="businessHref(p.id)"
          target="_blank"
          ><ExternalLink :size="16" /> Ver página</NuxtLink
        >
      </div>
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
.mb-item {
  align-items: center;
  gap: 16px;
  display: flex;
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
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 560px;
  display: flex;
}
@media (width<=640px) {
  .mb-item {
    flex-wrap: wrap;
  }
  .mb-actions {
    width: 100%;
  }
  .mb-actions > * {
    flex: 1;
  }
}
</style>
