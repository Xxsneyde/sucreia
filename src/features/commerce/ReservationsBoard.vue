<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Hourglass,
  Inbox,
  MessageCircle,
  RefreshCw,
  Sun,
} from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { statusNames, type Operation } from '@/domain/platform';
import { currency, whatsappUrl } from '@/domain/rules';

// Reservas (negocios con cita) y solicitudes (por cotización) de un negocio: indicadores, pestañas
// por estado y una tarjeta por cliente con las acciones del momento. Las acciones son las mismas
// de OperationList (POST /plataforma/operaciones/:id/:acción).
const studio = useStudio();
const p = usePlatform();
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) ?? studio.projects[0],
);
/** Negocios que trabajan con reservas o cotizaciones (para cambiar de uno a otro). */
const serviceStores = computed(() => studio.projects.filter((s) => s.draft.mode !== 'products'));
const quote = computed(() => store.value?.draft.mode === 'quote');
const all = computed(() =>
  (p.data.value?.sales ?? []).filter((o) => o.storeId === store.value?.id && o.kind !== 'products'),
);

const TZ = 'America/Bogota';
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));
const today = () => dayKey(new Date().toISOString());
const finished = ['completed', 'cancelled', 'refunded', 'no_show'];
const isFuture = (o: Operation) => !o.slot || Date.parse(o.slot) >= Date.now() - 3_600_000;

// --- Indicadores y pestañas -------------------------------------------------------------------
const stats = computed(() => {
  const ops = all.value;
  const month = Date.now() - 30 * 86_400_000;
  const done = ops.filter(
    (o) => o.status === 'completed' && Date.parse(o.completedAt || o.createdAt) >= month,
  ).length;
  return quote.value
    ? [
        {
          id: 'a',
          label: 'Por cotizar',
          value: ops.filter((o) => o.status === 'pending').length,
          icon: Inbox,
          tone: 'wait',
        },
        {
          id: 'b',
          label: 'Esperando al cliente',
          value: ops.filter((o) => o.status === 'quoted').length,
          icon: Hourglass,
          tone: 'blue',
        },
        {
          id: 'c',
          label: 'Aceptadas',
          value: ops.filter((o) => o.status === 'accepted').length,
          icon: CalendarClock,
          tone: 'navy',
        },
        { id: 'd', label: 'Completadas (30 días)', value: done, icon: CircleCheck, tone: 'ok' },
      ]
    : [
        {
          id: 'a',
          label: 'Citas hoy',
          value: ops.filter(
            (o) => o.slot && dayKey(o.slot) === today() && !finished.includes(o.status),
          ).length,
          icon: Sun,
          tone: 'navy',
        },
        {
          id: 'b',
          label: 'Por confirmar',
          value: ops.filter((o) => o.status === 'pending').length,
          icon: Hourglass,
          tone: 'wait',
        },
        {
          id: 'c',
          label: 'Próximas confirmadas',
          value: ops.filter((o) => o.status === 'accepted' && isFuture(o)).length,
          icon: CalendarClock,
          tone: 'blue',
        },
        { id: 'd', label: 'Completadas (30 días)', value: done, icon: CircleCheck, tone: 'ok' },
      ];
});
type Tab = 'nuevas' | 'curso' | 'historial';
const tabs = computed(() => [
  { id: 'nuevas' as Tab, label: quote.value ? 'Por cotizar' : 'Por confirmar' },
  { id: 'curso' as Tab, label: quote.value ? 'En curso' : 'Próximas' },
  { id: 'historial' as Tab, label: 'Historial' },
]);
function inTab(o: Operation, t: Tab) {
  if (t === 'nuevas') return o.status === 'pending';
  if (t === 'historial') return finished.includes(o.status);
  return !finished.includes(o.status) && o.status !== 'pending';
}
const tab = ref<Tab>('nuevas');
const counts = computed(() =>
  Object.fromEntries(tabs.value.map((t) => [t.id, all.value.filter((o) => inTab(o, t.id)).length])),
);
// Al entrar (o cambiar de negocio), la primera pestaña con algo pendiente.
watch(
  () => [store.value?.id, p.ready.value],
  () => {
    tab.value = counts.value.nuevas ? 'nuevas' : counts.value.curso ? 'curso' : 'nuevas';
  },
  { immediate: true },
);
const shown = computed(() => {
  const list = all.value.filter((o) => inTab(o, tab.value));
  const when = (o: Operation) => Date.parse(o.slot || o.createdAt);
  // Lo próximo primero; el historial, lo más reciente primero.
  return list.sort((a, b) => (tab.value === 'historial' ? when(b) - when(a) : when(a) - when(b)));
});
/** Agrupadas por día de la cita (o de la solicitud). */
const groups = computed(() => {
  const out: { key: string; label: string; items: Operation[] }[] = [];
  for (const o of shown.value) {
    const key = dayKey(o.slot || o.createdAt);
    let g = out.find((x) => x.key === key);
    if (!g) out.push((g = { key, label: dayLabel(o.slot || o.createdAt), items: [] }));
    g.items.push(o);
  }
  return out;
});
function dayLabel(iso: string) {
  const key = dayKey(iso);
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000).toISOString());
  const pretty = new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  });
  // «Sábado, 28 de noviembre»: solo la primera letra en mayúscula.
  const label = pretty.charAt(0).toUpperCase() + pretty.slice(1);
  return key === today() ? `Hoy · ${label}` : key === tomorrow ? `Mañana · ${label}` : label;
}
/** Hora («9:00») y jornada («a. m.») por separado, para que la hora quepa en una línea. */
function timeParts(iso: string) {
  const parts = new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { hour: `${get('hour')}:${get('minute')}`, period: get('dayPeriod') };
}
const dayNum = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', timeZone: TZ });
const month = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { month: 'short', timeZone: TZ }).replace('.', '');
const tone = (o: Operation) =>
  o.status === 'pending'
    ? 'wait'
    : o.status === 'quoted'
      ? 'blue'
      : o.status === 'accepted'
        ? 'navy'
        : o.status === 'completed'
          ? 'ok'
          : 'off';

// --- Acciones -----------------------------------------------------------------------------------
const notice = ref('');
const forms = reactive<Record<string, { amount: number; note: string; returned: boolean }>>({});
const form = (id: string) => (forms[id] ??= { amount: 0, note: '', returned: false });
async function act(o: Operation, action: string) {
  notice.value = '';
  try {
    await p.run('POST', `/operaciones/${o.id}/${action}`, {
      ...form(o.id),
      pin: '',
      courierId: '',
      etaMinutes: 30,
    });
    notice.value = 'Reserva actualizada.';
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
/** Acciones de un botón según el estado (mismas reglas que OperationList). */
function actions(o: Operation) {
  const list: { id: string; label: string; primary?: boolean; subtle?: boolean }[] = [];
  const past = o.slot && Date.parse(o.slot) <= Date.now();
  if (o.kind === 'booking' && o.status === 'pending')
    list.push({ id: 'confirm', label: 'Confirmar cita', primary: true });
  if (o.kind === 'booking' && o.status === 'accepted' && !o.arrivedAt)
    list.push({ id: 'arrive', label: 'El cliente llegó' });
  if (
    o.payment === 'pending' &&
    !finished.includes(o.status) &&
    (o.kind !== 'quote' || o.status === 'accepted')
  )
    list.push({ id: 'payment', label: 'Confirmar pago recibido' });
  if (o.status === 'accepted' && o.payment === 'confirmed' && (!o.slot || past))
    list.push({ id: 'complete', label: 'Completar servicio', primary: true });
  if (
    o.kind === 'booking' &&
    o.status === 'accepted' &&
    o.payment === 'pending' &&
    !o.arrivedAt &&
    past
  )
    list.push({ id: 'noshow', label: 'No asistió', subtle: true });
  if (
    !finished.includes(o.status) &&
    o.status !== 'dispatched' &&
    o.payment === 'pending' &&
    !o.courierId
  )
    list.push({ id: 'cancel', label: 'Cancelar', subtle: true });
  return list;
}
const open = ref<Record<string, boolean>>({});
const services = (o: Operation) => o.lines.map((l) => l.name).join(', ');
</script>

<template>
  <div class="rb">
    <header class="rb-head">
      <div>
        <NuxtLink to="/panel/negocios" class="rb-back"
          ><ArrowLeft :size="16" /> Mis negocios</NuxtLink
        >
        <p class="eyebrow">{{ store?.draft.name }}</p>
        <h1>{{ quote ? 'Solicitudes de cotización' : 'Reservas' }}</h1>
        <p class="muted">
          {{
            quote
              ? 'Cotiza, sigue lo que aceptan tus clientes y registra el pago y el servicio.'
              : 'Confirma las citas, registra la llegada y el pago, y completa cada servicio.'
          }}
        </p>
      </div>
      <div class="rb-tools">
        <label v-if="serviceStores.length > 1" class="rb-store">
          <span class="sr-only">Negocio</span>
          <select
            :value="store?.id"
            aria-label="Negocio"
            @change="studio.select(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="s in serviceStores" :key="s.id" :value="s.id">{{ s.draft.name }}</option>
          </select>
        </label>
        <NuxtLink v-if="!quote" to="/panel/agenda" class="sx-btn sx-btn--outline sx-btn--sm"
          ><CalendarDays :size="16" /> Horario y cupos</NuxtLink
        >
        <button type="button" class="sx-btn sx-btn--sm" :disabled="p.busy.value" @click="p.refresh">
          <RefreshCw :size="16" /> Actualizar
        </button>
      </div>
    </header>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <p v-if="p.error.value" class="notice" role="alert">{{ p.error.value }}</p>

    <div class="rb-stats">
      <article v-for="s in stats" :key="s.id" :class="['rb-stat', s.tone]">
        <span class="rb-stat-icon"><component :is="s.icon" :size="20" /></span>
        <strong>{{ s.value }}</strong>
        <small>{{ s.label }}</small>
      </article>
    </div>

    <div
      class="rb-tabs"
      role="tablist"
      :aria-label="quote ? 'Estado de las solicitudes' : 'Estado de las reservas'"
    >
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        :class="{ on: tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }} <span>{{ counts[t.id] }}</span>
      </button>
    </div>

    <p v-if="!p.ready.value" class="loader" role="status">Cargando…</p>
    <div v-else-if="!groups.length" class="rb-empty sx-card">
      <CalendarDays :size="34" aria-hidden="true" />
      <h2>
        {{
          tab === 'historial'
            ? 'Todavía no hay historial'
            : tab === 'nuevas'
              ? quote
                ? 'No hay solicitudes por cotizar'
                : 'No hay citas por confirmar'
              : quote
                ? 'No hay solicitudes en curso'
                : 'No hay citas próximas'
        }}
      </h2>
      <p class="muted">
        Cuando un cliente {{ quote ? 'pida una cotización' : 'reserve' }}, aparecerá aquí y te
        avisaremos en la campana.
      </p>
    </div>

    <template v-else>
      <section v-for="g in groups" :key="g.key" class="rb-day">
        <h2 class="rb-day-title">{{ g.label }}</h2>
        <ul class="rb-list">
          <li v-for="o in g.items" :key="o.id">
            <article
              :class="['rb-item', 'sx-card', tone(o)]"
              :aria-label="`${o.clientName} · ${services(o)}`"
            >
              <div class="rb-when">
                <template v-if="o.slot">
                  <strong>{{ timeParts(o.slot).hour }}</strong>
                  <span class="rb-period">{{ timeParts(o.slot).period }}</span>
                  <small>{{ dayNum(o.slot) }} {{ month(o.slot) }}</small>
                </template>
                <template v-else>
                  <strong>{{ dayNum(o.createdAt) }}</strong>
                  <small>{{ month(o.createdAt) }}</small>
                </template>
              </div>
              <div class="rb-main">
                <div class="rb-top">
                  <h3>{{ o.clientName }}</h3>
                  <span :class="['rb-status', tone(o)]">{{ statusNames[o.status] }}</span>
                </div>
                <p class="rb-service">{{ services(o) }}</p>
                <p v-if="o.detail" class="rb-detail">«{{ o.detail }}»</p>
                <div class="rb-meta">
                  <span class="rb-amount">{{
                    o.kind === 'quote' && o.status === 'pending'
                      ? 'Precio por cotizar'
                      : currency(o.amount)
                  }}</span>
                  <span
                    >Pago
                    {{
                      o.payment === 'confirmed'
                        ? 'recibido'
                        : o.payment === 'refunded'
                          ? 'devuelto'
                          : 'pendiente'
                    }}
                    · {{ o.paymentMethod === 'cash' ? 'efectivo' : 'transferencia' }}</span
                  >
                  <span v-if="o.arrivedAt" class="rb-arrived">Llegó</span>
                </div>

                <form
                  v-if="o.kind === 'quote' && ['pending', 'quoted'].includes(o.status)"
                  class="rb-quote"
                  @submit.prevent="act(o, 'quote')"
                >
                  <label
                    >Valor de la cotización (COP)<input
                      v-model.number="form(o.id).amount"
                      type="number"
                      min="1"
                      max="1000000000"
                      required
                  /></label>
                  <button class="sx-btn sx-btn--sm" :disabled="p.busy.value">
                    Enviar cotización
                  </button>
                </form>

                <div class="rb-actions">
                  <a
                    v-if="o.phone && whatsappUrl(o.phone, o.storeName)"
                    class="sx-btn sx-btn--outline sx-btn--sm rb-wa"
                    :href="whatsappUrl(o.phone, o.storeName) || undefined"
                    target="_blank"
                    rel="noopener"
                    ><MessageCircle :size="16" /> WhatsApp</a
                  >
                  <button
                    v-for="a in actions(o)"
                    :key="a.id"
                    type="button"
                    :class="[
                      'sx-btn',
                      'sx-btn--sm',
                      a.primary ? '' : a.subtle ? 'sx-btn--ghost' : 'sx-btn--outline',
                    ]"
                    :disabled="p.busy.value"
                    @click="act(o, a.id)"
                  >
                    {{ a.label }}
                  </button>
                  <button
                    type="button"
                    class="rb-more"
                    :aria-expanded="!!open[o.id]"
                    @click="open[o.id] = !open[o.id]"
                  >
                    Más detalles <ChevronDown :size="16" />
                  </button>
                </div>

                <div v-if="open[o.id]" class="rb-extra">
                  <ol class="rb-timeline">
                    <li v-for="(e, i) in o.events" :key="i">
                      <strong>{{ statusNames[e.status] }}</strong>
                      <span>{{ new Date(e.at).toLocaleString('es-CO', { timeZone: TZ }) }}</span>
                    </li>
                  </ol>
                  <form
                    v-if="o.payment === 'confirmed'"
                    class="rb-refund"
                    @submit.prevent="act(o, 'refund')"
                  >
                    <label
                      >Registrar una devolución total (después de devolver el dinero por el medio
                      acordado)<textarea
                        v-model="form(o.id).note"
                        required
                        maxlength="500"
                        placeholder="Motivo y referencia de la devolución"
                      />
                    </label>
                    <button class="sx-btn sx-btn--outline sx-btn--sm" :disabled="p.busy.value">
                      Registrar devolución realizada
                    </button>
                  </form>
                </div>
              </div>
            </article>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.rb {
  gap: 18px;
  display: grid;
}
.rb-head {
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  display: flex;
}
.rb-head h1 {
  margin: 2px 0 4px;
}
.rb-head .muted {
  max-width: 60ch;
  margin: 0;
}
.rb-back {
  color: var(--blue);
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 13.5px;
  font-weight: 600;
  display: inline-flex;
}
.rb-tools {
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  display: flex;
}
.rb-store select {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  min-height: 38px;
  padding: 0 12px;
}
/* Indicadores */
.rb-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  display: grid;
}
.rb-stat {
  background: #fff;
  border-radius: 16px;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 2px 12px;
  padding: 16px;
  display: grid;
  box-shadow: var(--shadow);
}
.rb-stat-icon {
  border-radius: 12px;
  grid-row: span 2;
  place-items: center;
  width: 42px;
  height: 42px;
  display: grid;
}
.rb-stat strong {
  color: var(--ink);
  font-size: 24px;
  line-height: 1.1;
}
.rb-stat small {
  color: var(--muted);
  font-size: 12.5px;
}
.rb-stat.wait .rb-stat-icon {
  color: #b45309;
  background: #fff4d6;
}
.rb-stat.blue .rb-stat-icon {
  color: var(--blue);
  background: var(--blue-soft);
}
.rb-stat.navy .rb-stat-icon {
  color: var(--navy-800);
  background: #e6ecf8;
}
.rb-stat.ok .rb-stat-icon {
  color: var(--green-dark);
  background: var(--green-soft);
}
/* Pestañas */
.rb-tabs {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  justify-self: start;
  gap: 4px;
  max-width: 100%;
  padding: 4px;
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}
.rb-tabs button {
  color: var(--text);
  border-radius: 10px;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex: none;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
}
.rb-tabs button span {
  background: var(--bg);
  border-radius: 999px;
  min-width: 22px;
  padding: 1px 7px;
  font-size: 12px;
}
.rb-tabs button.on {
  background: var(--navy-900);
  color: #fff;
}
.rb-tabs button.on span {
  background: #ffffff2e;
}
/* Lista por día */
.rb-day-title {
  color: var(--muted);
  margin: 4px 0 10px;
  font-size: 14px;
  font-weight: 700;
}
.rb-list {
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.rb-item {
  border-left: 5px solid var(--line);
  gap: 16px;
  padding: 16px 18px;
  display: flex;
}
.rb-item.wait {
  border-left-color: #f5b301;
}
.rb-item.blue {
  border-left-color: var(--blue);
}
.rb-item.navy {
  border-left-color: var(--navy-700);
}
.rb-item.ok {
  border-left-color: var(--green);
}
.rb-when {
  text-align: center;
  background: var(--bg);
  border-radius: 14px;
  flex: none;
  align-content: center;
  gap: 2px;
  width: 86px;
  min-height: 72px;
  padding: 8px;
  display: grid;
}
.rb-when strong {
  color: var(--navy-900);
  white-space: nowrap;
  font-size: 20px;
  line-height: 1.1;
}
.rb-period {
  color: var(--navy-700, #12408f);
  font-size: 12px;
  font-weight: 600;
}
.rb-when small {
  color: var(--muted);
  text-transform: uppercase;
  font-size: 11.5px;
  font-weight: 600;
}
.rb-main {
  flex: 1;
  gap: 6px;
  min-width: 0;
  display: grid;
}
.rb-top {
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  display: flex;
}
.rb-top h3 {
  color: var(--ink);
  margin: 0;
  font-size: 16.5px;
}
.rb-status {
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
}
.rb-status.wait {
  color: #92590a;
  background: #fff4d6;
}
.rb-status.blue {
  color: var(--blue);
  background: var(--blue-soft);
}
.rb-status.navy {
  color: var(--navy-800);
  background: #e6ecf8;
}
.rb-status.ok {
  color: var(--green-dark);
  background: var(--green-soft);
}
.rb-status.off {
  color: var(--muted);
  background: var(--bg);
}
.rb-service {
  color: var(--text);
  margin: 0;
  font-weight: 600;
}
.rb-detail {
  color: var(--muted);
  margin: 0;
  font-size: 13.5px;
  font-style: italic;
}
.rb-meta {
  color: var(--muted);
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 13px;
  display: flex;
}
.rb-amount {
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
}
.rb-arrived {
  color: var(--green-dark);
  background: var(--green-soft);
  border-radius: 999px;
  padding: 1px 8px;
  font-weight: 600;
}
.rb-quote {
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin-top: 4px;
  display: flex;
}
.rb-quote label,
.rb-refund label {
  color: var(--ink);
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  display: grid;
}
.rb-quote input,
.rb-refund textarea {
  border: 1.5px solid var(--field-border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
}
.rb-actions {
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  display: flex;
}
.rb-wa {
  color: #128c4a;
}
.rb-more {
  color: var(--muted);
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
}
.rb-extra {
  border-top: 1px dashed var(--line);
  gap: 12px;
  margin-top: 6px;
  padding-top: 12px;
  display: grid;
}
.rb-timeline {
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.rb-timeline li {
  color: var(--muted);
  gap: 10px;
  font-size: 13px;
  display: flex;
}
.rb-timeline strong {
  color: var(--text);
}
.rb-refund {
  gap: 8px;
  display: grid;
}
.rb-empty {
  text-align: center;
  color: var(--navy-800);
  justify-items: center;
  gap: 8px;
  padding: 34px 20px;
  display: grid;
}
.rb-empty h2,
.rb-empty p {
  margin: 0;
}
@media (width<=900px) {
  .rb-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (width<=560px) {
  .rb-item {
    flex-direction: column;
    gap: 10px;
  }
  .rb-when {
    grid-auto-flow: column;
    justify-content: start;
    align-items: baseline;
    gap: 8px;
    width: auto;
    min-height: 0;
  }
  .rb-tabs {
    justify-self: stretch;
  }
  .rb-tabs button {
    flex: 1;
    justify-content: center;
    padding: 8px 6px;
  }
  .rb-more {
    margin-left: 0;
  }
}
</style>
