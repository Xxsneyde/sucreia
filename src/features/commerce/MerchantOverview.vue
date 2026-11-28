<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ExternalLink,
  Eye,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Star,
  Store,
} from '@lucide/vue';
import { api } from '@/lib/api';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { REGISTER_PATH, onRegistrationSent } from '@/lib/registration-tab';
import { businessHref } from '@/domain/studio';
import type { CommerceStore } from '@/domain/platform';
import VerifiedBadge from '@/components/sucre/VerifiedBadge.vue';
import ShareMenu from '@/components/sucre/ShareMenu.vue';
import WhatsappOrders from '@/components/business/WhatsappOrders.vue';
import BusinessDocuments from './BusinessDocuments.vue';
// Panel del negocio activo: estado del registro, cifras, pedidos o reservas recientes,
// accesos rápidos y documentos. Se actualiza al volver a la pestaña o al enviar un registro.
const studio = useStudio();
const platform = usePlatform();
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) ?? studio.projects[0],
);
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
const meta = ref<CommerceStore | null>(null);
watch(
  () => store.value?.id,
  async (id) => {
    if (!id) return;
    try {
      meta.value = await api<CommerceStore>('GET', `/plataforma/negocios/${id}`);
    } catch {
      meta.value = null;
    }
  },
  { immediate: true },
);
onMounted(() => void platform.refresh());
const design = computed(() => store.value?.published?.design ?? store.value?.draft);
const mode = computed(() => design.value?.mode ?? 'products');
const status = computed(() => {
  const s = store.value;
  if (!s) return null;
  if (meta.value?.settings.suspended)
    return {
      tone: 'bad',
      icon: ShieldAlert,
      title: 'Publicación retirada',
      text: 'La administración retiró tu página. Revisa el motivo en tus notificaciones.',
    };
  if (s.registration === 'rejected')
    return {
      tone: 'bad',
      icon: ShieldAlert,
      title: 'Registro rechazado',
      text: 'Revisa el motivo en tus notificaciones, corrige los datos o documentos y vuelve a enviarlo desde Datos del negocio.',
    };
  if (s.registration !== 'approved' || (!s.published && s.publicationRequested))
    return {
      tone: 'wait',
      icon: Clock,
      title: 'En revisión',
      text: 'La administración de SucreIA está revisando tus datos y documentos. Te avisaremos cuando tu negocio aparezca en la plataforma.',
    };
  if (s.published)
    return {
      tone: 'ok',
      icon: ShieldCheck,
      title: 'Publicado',
      text: 'Tu negocio ya aparece en SucreIA. Los clientes te escriben por WhatsApp con su pedido.',
    };
  return {
    tone: 'wait',
    icon: Store,
    title: 'Negocio inactivo',
    text: 'Tu negocio no aparece en las búsquedas. Actívalo desde Datos del negocio.',
  };
});
const sales = computed(() =>
  (platform.data.value?.sales ?? []).filter((o) => o.storeId === store.value?.id),
);
const dayOf = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso));
const today = dayOf(new Date().toISOString());
const todayBookings = computed(() =>
  sales.value
    .filter(
      (o) => o.kind === 'booking' && o.slot && dayOf(o.slot) === today && o.status !== 'cancelled',
    )
    .sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot)),
);
const views = computed(() => Object.values(meta.value?.views ?? {}).reduce((n, v) => n + v, 0));
const time = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
const pageUrl = computed(() =>
  store.value && typeof window !== 'undefined'
    ? new URL(businessHref(store.value.id), window.location.origin).href
    : '',
);
</script>

<template>
  <p v-if="!studio.ready" class="loader" role="status">Cargando tu negocio…</p>
  <section v-else-if="!store" class="sx-card mo-start">
    <span class="mo-start-icon"><Store :size="30" /></span>
    <p class="eyebrow">Paso 2 de 2</p>
    <h1>Registra tu emprendimiento</h1>
    <p>
      Llena el formulario en «Registra tu emprendimiento». Ten lista tu cédula en PDF (el RUT y la
      Cámara de Comercio son opcionales), tu logo, una foto de portada y las fotos de tus productos
      o servicios.
    </p>
    <NuxtLink class="sx-btn mo-start-btn" :to="REGISTER_PATH"
      ><Plus :size="18" /> Registra tu emprendimiento</NuxtLink
    >
    <small class="muted">Cuando lo envíes, esta página mostrará el estado de la revisión.</small>
  </section>
  <template v-else-if="store && design">
    <div class="page-title">
      <div>
        <NuxtLink to="/panel/negocios" class="mo-back"
          ><ArrowLeft :size="16" /> Mis negocios</NuxtLink
        >
        <h1>
          {{ design.name
          }}<VerifiedBadge v-if="meta?.settings.verification === 'approved'" :size="26" />
        </h1>
        <p class="muted">{{ design.category }} · {{ design.municipality }}</p>
        <label v-if="studio.projects.length > 1" class="mo-switch">
          Negocio activo
          <select
            :value="store.id"
            @change="studio.select(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="p in studio.projects" :key="p.id" :value="p.id">
              {{ p.draft.name || 'Sin nombre' }}
            </option>
          </select>
        </label>
      </div>
      <div class="mo-actions">
        <NuxtLink class="sx-btn sx-btn--ghost" :to="REGISTER_PATH"
          ><Plus :size="17" /> Registrar otro emprendimiento</NuxtLink
        >
        <NuxtLink
          v-if="store.published"
          class="sx-btn sx-btn--outline"
          :to="businessHref(store.id)"
          target="_blank"
          ><ExternalLink :size="17" /> Ver mi página</NuxtLink
        >
        <ShareMenu
          v-if="store.published && pageUrl"
          variant="menu"
          :url="pageUrl"
          :title="design.name"
          label="Compartir mi negocio"
        />
      </div>
    </div>
    <section v-if="status" :class="['mo-status', status.tone]" role="status">
      <component :is="status.icon" :size="26" />
      <div>
        <strong>{{ status.title }}</strong>
        <p>{{ status.text }}</p>
      </div>
    </section>
    <div class="mo-stats">
      <article class="sx-card">
        <Eye :size="20" /><strong>{{ views }}</strong
        ><span>Consultas de productos</span>
      </article>
      <article class="sx-card">
        <Package :size="20" /><strong>{{ design.products.length }}</strong
        ><span>{{ mode === 'products' ? 'Productos' : 'Servicios' }} publicados</span>
      </article>
    </div>
    <div class="mo-grid">
      <section v-if="mode === 'products'" class="sx-card">
        <div class="sx-head">
          <h2><MessageCircle :size="20" /> Pedidos recibidos por WhatsApp</h2>
        </div>
        <p class="muted small">
          Cada vez que un cliente envía su carrito, te llega a WhatsApp y queda anotado aquí.
        </p>
        <WhatsappOrders side="received" :store-id="store.id" :limit="5">
          <template #empty>
            <p class="mo-empty">
              Aún no hay pedidos. Comparte tu página para que los clientes te encuentren.
            </p>
          </template>
        </WhatsappOrders>
      </section>
      <section v-else class="sx-card">
        <div class="sx-head">
          <h2>
            <CalendarDays :size="20" />
            {{ mode === 'booking' ? 'Reservas de hoy' : 'Solicitudes recientes' }}
          </h2>
          <NuxtLink class="sx-link" to="/panel/pedidos">Ver todas</NuxtLink>
        </div>
        <ul v-if="mode === 'booking' && todayBookings.length" class="mo-list">
          <li v-for="o in todayBookings" :key="o.id">
            <strong>{{ time(o.slot) }}</strong>
            <span>{{ o.lines[0]?.name }} · {{ o.clientName }}</span>
            <small :class="o.status">{{
              o.status === 'pending' ? 'Por confirmar' : 'Confirmada'
            }}</small>
          </li>
        </ul>
        <ul
          v-else-if="mode === 'quote' && sales.filter((o) => o.kind === 'quote').length"
          class="mo-list"
        >
          <li v-for="o in sales.filter((x) => x.kind === 'quote').slice(0, 5)" :key="o.id">
            <strong>{{ o.lines[0]?.name }}</strong>
            <span>{{ o.clientName }}</span>
            <small :class="o.status">{{
              o.status === 'pending' ? 'Por cotizar' : 'En curso'
            }}</small>
          </li>
        </ul>
        <p v-else class="mo-empty">
          {{ mode === 'booking' ? 'No tienes reservas para hoy.' : 'No hay solicitudes nuevas.' }}
        </p>
      </section>
      <section class="sx-card mo-quick">
        <h2>Accesos rápidos</h2>
        <NuxtLink to="/panel/productos"
          ><Package :size="19" /> Editar
          {{ mode === 'products' ? 'productos' : 'servicios' }}</NuxtLink
        >
        <NuxtLink to="/panel/perfil"><Pencil :size="19" /> Datos del negocio</NuxtLink>
        <NuxtLink v-if="mode === 'booking'" to="/panel/agenda"
          ><CalendarDays :size="19" /> Horarios y cupos</NuxtLink
        >
        <NuxtLink to="/panel/descuentos"><Star :size="19" /> Promociones y reseñas</NuxtLink>
      </section>
    </div>
    <BusinessDocuments :store-id="store.id" />
  </template>
</template>

<style scoped>
.mo-start {
  text-align: center;
  justify-items: center;
  gap: 10px;
  max-width: 620px;
  margin: 30px auto;
  padding: 32px 24px;
  display: grid;
}
.mo-start h1 {
  margin: 0;
}
.mo-start p {
  color: var(--text);
  margin: 0;
}
.mo-start-icon {
  background: var(--green-soft);
  width: 64px;
  height: 64px;
  color: var(--green-dark);
  border-radius: 50%;
  place-items: center;
  display: grid;
}
.mo-start-btn {
  min-height: 48px;
  margin-top: 6px;
}
.mo-switch {
  color: var(--muted);
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
}
.mo-switch select {
  border: 1.5px solid var(--field-border);
  color: var(--ink);
  background: #fff;
  border-radius: 12px;
  padding: 7px 10px;
  font-weight: 600;
}
.mo-actions {
  flex-wrap: wrap;
  gap: 8px;
  display: flex;
}
.mo-status {
  border-radius: 16px;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
  padding: 16px 18px;
  display: flex;
}
.mo-status.ok {
  background: var(--green-soft);
  color: var(--green-dark);
}
.mo-status.wait {
  color: #92590a;
  background: #fff7e6;
}
.mo-status.bad {
  color: #b91c1c;
  background: #fdecec;
}
.mo-status p {
  color: var(--text);
  margin: 2px 0 0;
}
.mo-stats {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
  display: grid;
}
.mo-stats article {
  gap: 4px;
  display: grid;
}
.mo-stats svg {
  color: var(--blue);
}
.mo-stats strong {
  color: var(--ink);
  font-size: 26px;
}
.mo-stats span {
  color: var(--muted);
  font-size: 13px;
}
.mo-grid {
  grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
  align-items: start;
  gap: 18px;
  margin-bottom: 18px;
  display: grid;
}
.mo-grid h2 {
  align-items: center;
  gap: 8px;
  font-size: 17px;
  display: flex;
}
.mo-empty {
  background: var(--bg);
  text-align: center;
  color: var(--muted);
  border-radius: 12px;
  padding: 18px;
}
.mo-list {
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.mo-list li {
  background: var(--bg);
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  display: flex;
}
.mo-list small {
  background: #fff;
  border-radius: 999px;
  margin-left: auto;
  padding: 2px 8px;
  font-weight: 600;
}
.mo-list small.pending {
  color: #92590a;
}
.mo-quick {
  gap: 6px;
  display: grid;
}
.mo-back,
.mo-quick h2 {
  margin-bottom: 6px;
}
.mo-quick a {
  color: var(--ink);
  border-radius: 12px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  font-weight: 600;
  display: flex;
}
.mo-quick a:hover {
  background: var(--bg);
}
@media (width<=860px) {
  .mo-grid {
    grid-template-columns: 1fr;
  }
}
.mo-back {
  color: var(--green-dark);
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
}
</style>
