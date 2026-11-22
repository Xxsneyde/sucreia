<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { CalendarDays, Plus, Trash2 } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import {
  dayNames,
  daySchedule,
  statusNames,
  type DaySchedule,
  type ScheduleBlock,
  type StoreSettings,
} from '@/domain/platform';

// Agenda de un negocio con reservas: semana con sus citas, horario por día, cupo y bloqueos.
const studio = useStudio();
const p = usePlatform();
onMounted(() => void p.refresh());
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) ?? studio.projects[0],
);
const cfg = ref<StoreSettings | null>(null);
const week = ref<DaySchedule[]>([]);
const blocks = ref<ScheduleBlock[]>([]);
const message = ref('');
watch(
  () => store.value?.id,
  async (id) => {
    if (!id) return;
    cfg.value = (
      await api<{ settings: StoreSettings }>('GET', `/plataforma/negocios/${id}`)
    ).settings;
    week.value = dayNames.map((_, i) => ({ ...daySchedule(cfg.value!, i) }));
    blocks.value = [...(cfg.value.blocks ?? [])];
  },
  { immediate: true },
);
async function save() {
  if (!cfg.value || !store.value) return;
  try {
    const open = week.value.filter((d) => !d.closed);
    const saved = await p.run<{ settings: StoreSettings }>(
      'PUT',
      `/negocios/${store.value.id}/configuracion`,
      {
        ...cfg.value,
        opens: open.length ? Math.min(...open.map((d) => d.opens)) : cfg.value.opens,
        closes: open.length ? Math.max(...open.map((d) => d.closes)) : cfg.value.closes,
        week: week.value,
        blocks: blocks.value,
      },
    );
    cfg.value = saved.settings;
    message.value = 'Agenda guardada.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const draft = ref({ date: '', from: '', to: '', note: '' });
function addBlock() {
  if (!draft.value.date) return;
  blocks.value.push({ id: crypto.randomUUID(), ...draft.value });
  draft.value = { date: '', from: '', to: '', note: '' };
  void save();
}
function removeBlock(id: string) {
  blocks.value = blocks.value.filter((b) => b.id !== id);
  void save();
}
const bogota = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso));
const next7 = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const date = bogota(new Date(Date.now() + i * 86_400_000).toISOString());
    return {
      date,
      label: new Date(date + 'T12:00:00Z').toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
      ops: (p.data.value?.sales ?? [])
        .filter(
          (o) =>
            o.storeId === store.value?.id &&
            o.kind === 'booking' &&
            o.slot &&
            bogota(o.slot) === date &&
            !['cancelled'].includes(o.status),
        )
        .sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot)),
      blocked: blocks.value.filter((b) => b.date === date),
      closed: week.value[new Date(date + 'T12:00:00Z').getUTCDay()]?.closed,
    };
  }),
);
const time = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
</script>
<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">{{ store?.draft.name }}</p>
      <h1>Agenda</h1>
      <p class="muted">Tus citas de la semana, tu horario y los días u horas sin atención.</p>
    </div>
  </div>
  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <p v-if="!cfg" class="loader" role="status">Cargando agenda…</p>
  <template v-else>
    <section class="ag-week">
      <article
        v-for="d in next7"
        :key="d.date"
        class="sx-card ag-day"
        :class="{ closed: d.closed }"
      >
        <h2>{{ d.label }}</h2>
        <p v-if="d.closed" class="small muted">Cerrado</p>
        <p v-for="b in d.blocked" :key="b.id" class="small ag-block">
          ⛔ {{ b.from ? `${b.from}–${b.to}` : 'Todo el día' }} {{ b.note }}
        </p>
        <ul>
          <li v-for="o in d.ops" :key="o.id">
            <time>{{ time(o.slot) }}</time>
            <span>{{ o.clientName }} · {{ o.detail.split(':')[0] }}</span>
            <small :class="o.status">{{ statusNames[o.status] }}</small>
          </li>
        </ul>
        <p v-if="!d.closed && !d.ops.length" class="small muted">Sin citas.</p>
      </article>
    </section>

    <div class="ag-two">
      <form class="sx-card form-stack" @submit.prevent="save">
        <h2><CalendarDays :size="20" /> Horario de atención</h2>
        <table class="ag-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Abierto</th>
              <th>Abre</th>
              <th>Cierra</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in week" :key="i">
              <td>{{ dayNames[i] }}</td>
              <td>
                <input
                  :checked="!d.closed"
                  type="checkbox"
                  :aria-label="`Abierto el ${dayNames[i]}`"
                  @change="d.closed = !($event.target as HTMLInputElement).checked"
                />
              </td>
              <td>
                <input
                  v-model.number="d.opens"
                  type="number"
                  min="0"
                  max="23"
                  :disabled="d.closed"
                  :aria-label="`Abre el ${dayNames[i]}`"
                />
              </td>
              <td>
                <input
                  v-model.number="d.closes"
                  type="number"
                  min="1"
                  max="24"
                  :disabled="d.closed"
                  :aria-label="`Cierra el ${dayNames[i]}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="ag-row">
          <label
            >Citas a la misma hora<input
              v-model.number="cfg.capacity"
              type="number"
              min="1"
              max="20"
              placeholder="1"
          /></label>
          <label
            >Duración general (min)<input
              v-model.number="cfg.duration"
              type="number"
              min="15"
              max="240"
          /></label>
        </div>
        <p class="small muted" style="margin: 0">
          Cada servicio puede tener su propia duración en «Mis servicios».
        </p>
        <button class="sx-btn" :disabled="p.busy.value">Guardar horario</button>
      </form>
      <section class="sx-card form-stack">
        <h2>Bloqueos (vacaciones, almuerzo…)</h2>
        <form class="ag-row" @submit.prevent="addBlock">
          <label>Fecha<input v-model="draft.date" type="date" required /></label>
          <label>Desde<input v-model="draft.from" type="time" /></label>
          <label>Hasta<input v-model="draft.to" type="time" /></label>
          <label>Nota<input v-model="draft.note" maxlength="120" placeholder="Almuerzo" /></label>
          <button class="sx-btn sx-btn--sm" :disabled="p.busy.value">
            <Plus :size="15" /> Bloquear
          </button>
        </form>
        <p class="small muted" style="margin: 0">Sin horas = todo el día.</p>
        <ul class="ag-blocks">
          <li v-for="b in blocks" :key="b.id">
            <span
              >{{ b.date }} · {{ b.from ? `${b.from}–${b.to}` : 'Todo el día' }} {{ b.note }}</span
            >
            <button
              type="button"
              class="sx-btn sx-btn--ghost sx-btn--sm"
              :aria-label="`Quitar bloqueo del ${b.date}`"
              @click="removeBlock(b.id)"
            >
              <Trash2 :size="14" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </template>
</template>
<style scoped>
.ag-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.ag-day {
  padding: 12px;
}
.ag-day.closed {
  opacity: 0.6;
}
.ag-day h2 {
  font-size: 13.5px;
  text-transform: capitalize;
  margin-bottom: 8px;
}
.ag-day ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12.5px;
}
.ag-day time {
  font-weight: 700;
  color: var(--navy-800);
}
.ag-day small {
  display: block;
  color: var(--muted);
}
.ag-block {
  margin: 0 0 6px;
  color: #b45309;
}
.ag-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.ag-two h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ag-table input[type='number'] {
  width: 70px;
  min-height: 34px;
  padding: 4px 8px;
}
.ag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}
.ag-row label {
  flex: 1;
  min-width: 110px;
}
.ag-blocks {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ag-blocks li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
@media (max-width: 1100px) {
  .ag-week {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ag-two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
