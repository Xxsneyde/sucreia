<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import type { CommerceStore, Operation } from '@/domain/platform';

// Ventas (productos) o Dashboard (servicios): cifras calculadas con las operaciones reales.
const studio = useStudio();
const p = usePlatform();
onMounted(() => void p.refresh());
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) ?? studio.projects[0],
);
const kind = computed(() => store.value?.draft.mode ?? 'products');
const meta = ref<CommerceStore | null>(null);
watch(
  () => store.value?.id,
  async (id) => {
    if (id)
      meta.value = await api<CommerceStore>('GET', `/plataforma/negocios/${id}`).catch(() => null);
  },
  { immediate: true },
);
const days = ref(7);
const bogota = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso));
const range = computed(() =>
  Array.from({ length: days.value }, (_, i) =>
    bogota(new Date(Date.now() - (days.value - 1 - i) * 86_400_000).toISOString()),
  ),
);
const sales = computed(() =>
  (p.data.value?.sales ?? []).filter((o) => o.storeId === store.value?.id),
);
const inRange = (o: Operation, field: string) => range.value.includes(bogota(field || o.createdAt));
const done = computed(() =>
  sales.value.filter((o) => o.status === 'completed' && inRange(o, o.completedAt)),
);
const income = computed(() => done.value.reduce((n, o) => n + o.amount - o.fee, 0));
const perDay = computed(() =>
  range.value.map((d) => ({
    day: d,
    total: done.value
      .filter((o) => bogota(o.completedAt) === d)
      .reduce((n, o) => n + o.amount - o.fee, 0),
  })),
);
const max = computed(() => Math.max(1, ...perDay.value.map((d) => d.total)));
const clients = computed(() => {
  const count = new Map<string, number>();
  for (const o of done.value) count.set(o.clientId, (count.get(o.clientId) ?? 0) + 1);
  return { unique: count.size, repeat: [...count.values()].filter((n) => n > 1).length };
});
const top = computed(() => {
  const count = new Map<string, number>();
  for (const o of done.value)
    if (o.kind === 'products')
      for (const l of o.lines) count.set(l.name, (count.get(l.name) ?? 0) + l.quantity);
    else {
      const name = o.detail.split(':')[0] || 'Servicio';
      count.set(name, (count.get(name) ?? 0) + 1);
    }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
});
const noShows = computed(
  () => sales.value.filter((o) => o.status === 'no_show' && inRange(o, o.slot)).length,
);
const cancelled = computed(
  () => sales.value.filter((o) => o.status === 'cancelled' && inRange(o, o.createdAt)).length,
);
const viewed = computed(() =>
  (store.value?.draft.products ?? [])
    .map((x) => ({ name: x.name, views: meta.value?.views[x.id] ?? 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5),
);
const label = (d: string) =>
  new Date(d + 'T12:00:00Z').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
</script>
<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">{{ store?.draft.name }}</p>
      <h1>{{ kind === 'products' ? 'Ventas' : 'Dashboard' }}</h1>
      <p class="muted">Calculado con operaciones completadas (sin incluir domicilios).</p>
    </div>
    <div class="sx-tabs" role="group" aria-label="Periodo">
      <button
        v-for="n in [7, 30]"
        :key="n"
        type="button"
        :class="{ on: days === n }"
        :aria-pressed="days === n"
        @click="days = n"
      >
        Últimos {{ n }} días
      </button>
    </div>
  </div>
  <div class="sd-metrics">
    <article class="sx-card">
      <span>Ingresos</span><strong>{{ currency(income) }}</strong>
    </article>
    <article class="sx-card">
      <span>{{
        kind === 'booking' ? 'Citas atendidas' : kind === 'quote' ? 'Servicios cerrados' : 'Ventas'
      }}</span
      ><strong>{{ done.length }}</strong>
    </article>
    <article class="sx-card">
      <span>Ticket promedio</span
      ><strong>{{ currency(done.length ? Math.round(income / done.length) : 0) }}</strong>
    </article>
    <article class="sx-card">
      <span>Clientes (repiten)</span
      ><strong
        >{{ clients.unique }} <small>({{ clients.repeat }})</small></strong
      >
    </article>
    <article v-if="kind === 'booking'" class="sx-card">
      <span>No asistieron</span><strong>{{ noShows }}</strong>
    </article>
    <article v-else class="sx-card">
      <span>Cancelados</span><strong>{{ cancelled }}</strong>
    </article>
  </div>
  <section class="sx-card">
    <h2 style="margin-bottom: 12px">Ingresos por día</h2>
    <div class="sd-chart" role="img" :aria-label="`Ingresos de los últimos ${days} días`">
      <div
        v-for="d in perDay"
        :key="d.day"
        class="sd-bar"
        :title="`${label(d.day)}: ${currency(d.total)}`"
      >
        <i :style="{ height: `${(d.total / max) * 100}%` }" />
        <span v-if="days === 7 || perDay.indexOf(d) % 5 === 0">{{ label(d.day) }}</span>
      </div>
    </div>
  </section>
  <div class="sd-two">
    <section class="sx-card">
      <h2 style="margin-bottom: 12px">
        {{ kind === 'products' ? 'Más vendidos' : 'Servicios más pedidos' }}
      </h2>
      <p v-if="!top.length" class="muted">Aún no hay ventas en este periodo.</p>
      <ol class="sd-list">
        <li v-for="[name, n] in top" :key="name">
          <span>{{ name }}</span
          ><b>{{ n }}</b>
        </li>
      </ol>
    </section>
    <section class="sx-card">
      <h2 style="margin-bottom: 12px">Más consultados en tu página</h2>
      <ol class="sd-list">
        <li v-for="x in viewed" :key="x.name">
          <span>{{ x.name }}</span
          ><b>{{ x.views }}</b>
        </li>
      </ol>
      <p class="small muted">Una consulta por visitante y producto cada 30 minutos.</p>
    </section>
  </div>
</template>
<style scoped>
.sd-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.sd-metrics article {
  display: grid;
  gap: 4px;
}
.sd-metrics span {
  font-size: 13px;
  color: var(--muted);
}
.sd-metrics strong {
  font-size: 24px;
  color: var(--navy-800);
}
.sd-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 200px;
  padding-bottom: 22px;
}
.sd-bar {
  position: relative;
  display: flex;
  flex: 1;
  align-items: flex-end;
  height: 100%;
}
.sd-bar i {
  display: block;
  width: 100%;
  min-height: 3px;
  border-radius: 8px 8px 2px 2px;
  background: linear-gradient(180deg, #2bbd55, #1a9e45);
}
.sd-bar span {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  white-space: nowrap;
  color: var(--muted);
}
.sd-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.sd-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}
.sd-list li span {
  display: inline-block;
  min-width: 70%;
}
@media (max-width: 900px) {
  .sd-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .sd-two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
