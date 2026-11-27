<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Ticket, X } from '@lucide/vue';
import { discountAmount } from '@/domain/offers';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import { normalizePhone } from '@/domain/phone';
import PhoneField from '@/components/PhoneField.vue';
import type { StoreSettings } from '@/domain/platform';
import type { StoreProduct } from '@/domain/studio';
// Reservar una cita: servicio, día (próximas tres semanas) y hora con los cupos libres que da la
// API, más el WhatsApp de la persona y una nota.
const props = defineProps<{
  storeId: string;
  storeName: string;
  services: StoreProduct[];
  initial?: string;
  settings?: StoreSettings | null;
  /** Descuento vigente para todo el negocio (%). */
  discount?: number;
  busy?: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  close: [];
  confirm: [
    booking: { productId: string; slot: string; phone: string; detail: string; code: string },
  ];
}>();
interface Slot {
  slot: string;
  free: number;
  capacity: number;
}
const dialog = ref<HTMLDialogElement | null>(null);
onMounted(() => dialog.value?.showModal());
const service = ref(props.initial || props.services[0]?.id || '');
const current = computed(() => props.services.find((s) => s.id === service.value));
const isoDay = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
const days = computed(() =>
  Array.from({ length: 21 }, (_, i) => {
    const iso = isoDay(new Date(Date.now() + i * 86_400_000));
    const noon = new Date(iso + 'T12:00:00Z');
    const week = props.settings?.week;
    return {
      iso,
      closed: week ? !!week[noon.getUTCDay()]?.closed : false,
      top:
        i === 0
          ? 'Hoy'
          : i === 1
            ? 'Mañana'
            : new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' })
                .format(noon)
                .replace('.', ''),
      day: Number(iso.slice(8, 10)),
      month: new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' })
        .format(noon)
        .replace('.', ''),
    };
  }),
);
const day = ref(days.value.find((d) => !d.closed)?.iso ?? days.value[0].iso);
const slots = ref<Slot[]>([]);
const loading = ref(false);
const loadError = ref('');
const chosen = ref('');
const phone = ref('');
const note = ref('');
const strip = ref<HTMLElement | null>(null);
watch(
  [day, service],
  async () => {
    chosen.value = '';
    slots.value = [];
    loadError.value = '';
    if (!day.value || !service.value) return;
    loading.value = true;
    try {
      slots.value = (
        await api<{ detail: Slot[] }>(
          'GET',
          `/plataforma/negocios/${props.storeId}/horarios?fecha=${day.value}&servicio=${encodeURIComponent(service.value)}`,
        )
      ).detail;
    } catch (e) {
      loadError.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
/** Horarios agrupados en mañana, tarde y noche. */
const parts = computed(() => {
  const groups: { label: string; items: Slot[] }[] = [
    { label: 'Mañana', items: [] },
    { label: 'Tarde', items: [] },
    { label: 'Noche', items: [] },
  ];
  for (const s of slots.value) {
    const hour = Number(s.slot.slice(11, 13));
    groups[hour < 12 ? 0 : hour < 18 ? 1 : 2].items.push(s);
  }
  return groups.filter((g) => g.items.length);
});
/** «2026-11-26T15:30…» → «3:30 p. m.» (la hora ya viene en Colombia). */
const time = (slot: string) => {
  const h = Number(slot.slice(11, 13));
  const m = slot.slice(14, 16);
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
const spaces = (s: Slot) =>
  s.free === 0
    ? 'Agotado'
    : s.free === 1
      ? s.capacity > 1
        ? 'Último cupo'
        : 'Disponible'
      : `${s.free} cupos`;
const dayLabel = computed(() => {
  const text = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(day.value + 'T12:00:00Z'));
  return text.charAt(0).toUpperCase() + text.slice(1);
});
function scrollDays(direction: number) {
  strip.value?.scrollBy({ left: direction * 280, behavior: 'smooth' });
}
const ready = computed(() => !!chosen.value && !!normalizePhone(phone.value));
// Cupón del negocio (opcional): se comprueba antes de reservar; el servidor aplica el mayor
// entre el cupón y el descuento del negocio.
const code = ref('');
const coupon = ref<{ code: string; percent: number } | null>(null);
const couponError = ref('');
const checking = ref(false);
async function applyCoupon() {
  couponError.value = '';
  coupon.value = null;
  if (!code.value.trim()) return;
  checking.value = true;
  try {
    coupon.value = await api('POST', '/plataforma/cupones/validar', {
      storeId: props.storeId,
      code: code.value,
    });
  } catch (e) {
    couponError.value = (e as Error).message;
  } finally {
    checking.value = false;
  }
}
const percent = computed(() => Math.max(props.discount ?? 0, coupon.value?.percent ?? 0));
const price = computed(() => current.value?.price ?? 0);
const off = computed(() => discountAmount(price.value, percent.value));
function confirm() {
  if (!ready.value) return;
  emit('confirm', {
    productId: service.value,
    slot: chosen.value,
    phone: phone.value.trim(),
    detail: note.value.trim() || current.value?.name || 'Reserva',
    code: coupon.value?.code ?? '',
  });
}
</script>
<template>
  <dialog ref="dialog" class="bk" :aria-label="`Reservar en ${storeName}`" @close="emit('close')">
    <header class="bk-head">
      <div>
        <p class="eyebrow">{{ storeName }}</p>
        <h2><CalendarDays :size="22" /> Elige día y hora</h2>
      </div>
      <button type="button" class="bk-x" aria-label="Cerrar" @click="dialog?.close()">
        <X :size="20" />
      </button>
    </header>
    <div v-if="services.length > 1" class="bk-services" role="radiogroup" aria-label="Servicio">
      <button
        v-for="s in services"
        :key="s.id"
        type="button"
        role="radio"
        :aria-checked="service === s.id"
        :class="{ on: service === s.id }"
        @click="service = s.id"
      >
        <strong>{{ s.name }}</strong>
        <small
          >{{ s.price ? currency(s.price) : 'A convenir'
          }}{{ s.duration ? ` · ${s.duration} min` : '' }}</small
        >
      </button>
    </div>
    <div class="bk-days">
      <button type="button" class="bk-arrow" aria-label="Días anteriores" @click="scrollDays(-1)">
        <ChevronLeft :size="18" />
      </button>
      <div ref="strip" class="bk-strip" role="radiogroup" aria-label="Día">
        <button
          v-for="d in days"
          :key="d.iso"
          type="button"
          role="radio"
          :aria-checked="day === d.iso"
          :disabled="d.closed"
          :class="{ on: day === d.iso }"
          :aria-label="`${d.top} ${d.day} de ${d.month}${d.closed ? ', cerrado' : ''}`"
          @click="day = d.iso"
        >
          <small>{{ d.top }}</small>
          <strong>{{ d.day }}</strong>
          <small>{{ d.closed ? 'Cerrado' : d.month }}</small>
        </button>
      </div>
      <button type="button" class="bk-arrow" aria-label="Días siguientes" @click="scrollDays(1)">
        <ChevronRight :size="18" />
      </button>
    </div>
    <section class="bk-times" aria-live="polite">
      <p class="bk-date">{{ dayLabel }}</p>
      <p v-if="loading" class="loader" role="status">Buscando horarios…</p>
      <p v-else-if="loadError" class="field-error" role="alert">{{ loadError }}</p>
      <template v-else-if="slots.length">
        <div v-for="part in parts" :key="part.label" class="bk-part">
          <h3>{{ part.label }}</h3>
          <div
            class="bk-grid"
            role="radiogroup"
            :aria-label="`Horarios de la ${part.label.toLowerCase()}`"
          >
            <button
              v-for="s in part.items"
              :key="s.slot"
              type="button"
              role="radio"
              :aria-checked="chosen === s.slot"
              :disabled="s.free === 0"
              :class="{
                on: chosen === s.slot,
                few: s.free === 1 && s.capacity > 1,
                full: s.free === 0,
              }"
              @click="chosen = s.slot"
            >
              <strong>{{ time(s.slot) }}</strong>
              <small>{{ spaces(s) }}</small>
            </button>
          </div>
        </div>
      </template>
      <p v-else class="bk-none">No hay horarios este día. Prueba con otra fecha.</p>
      <ul class="bk-legend" aria-hidden="true">
        <li><i class="free" /> Disponible</li>
        <li><i class="few" /> Últimos cupos</li>
        <li><i class="full" /> Agotado</li>
        <li><i class="on" /> Tu elección</li>
      </ul>
    </section>
    <form v-if="chosen" class="bk-form" @submit.prevent="confirm">
      <p class="bk-summary">
        <Clock :size="17" /> {{ current?.name }} · {{ dayLabel.toLowerCase() }} ·
        {{ time(chosen) }}
      </p>
      <PhoneField v-model="phone" label="Tu WhatsApp" required />
      <label>Nota para el negocio (opcional)<input v-model="note" maxlength="500" /></label>
      <div class="bk-coupon">
        <label
          >Código de cupón (opcional)<input
            v-model="code"
            maxlength="20"
            autocomplete="off"
            @keydown.enter.prevent="applyCoupon"
        /></label>
        <button
          type="button"
          class="sx-btn sx-btn--outline"
          :disabled="checking || !code.trim()"
          @click="applyCoupon"
        >
          <Ticket :size="16" /> Aplicar
        </button>
      </div>
      <p v-if="couponError" class="field-error" role="alert">{{ couponError }}</p>
      <p v-else-if="coupon" class="bk-ok" role="status">
        Cupón {{ coupon.code }}: {{ coupon.percent }} % de descuento{{
          (discount ?? 0) >= coupon.percent
            ? ' (el negocio ya tiene un descuento igual o mayor)'
            : ''
        }}.
      </p>
      <p v-if="price && percent" class="bk-total">
        <span>{{ currency(price) }} − {{ percent }} %</span>
        <strong>{{ currency(price - off) }}</strong>
      </p>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <button class="sx-btn sx-btn--block" :disabled="busy || !ready">
        {{ busy ? 'Reservando…' : 'Confirmar reserva' }}
      </button>
      <small class="muted">El negocio confirma tu reserva y te avisamos en Notificaciones.</small>
    </form>
  </dialog>
</template>

<style scoped>
.bk {
  width: min(640px, 100vw - 20px);
  max-height: calc(100dvh - 20px);
  box-shadow: var(--shadow-lg);
  border: 0;
  border-radius: 22px;
  padding: 20px;
}
.bk::backdrop {
  background: #071a428c;
}
.bk-head {
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  display: flex;
}
.bk-head h2 {
  align-items: center;
  gap: 8px;
  margin: 2px 0 0;
  font-size: 21px;
  display: flex;
}
.bk-x {
  background: var(--bg);
  border-radius: 50%;
  place-items: center;
  width: 38px;
  height: 38px;
  display: grid;
}
.bk-services {
  scrollbar-width: none;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  display: flex;
  overflow-x: auto;
}
.bk-services button {
  border: 1.5px solid var(--line);
  text-align: left;
  background: #fff;
  border-radius: 14px;
  flex: none;
  gap: 2px;
  padding: 10px 14px;
  display: grid;
}
.bk-services button.on {
  border-color: var(--green);
  background: var(--green-soft);
}
.bk-services small {
  color: var(--muted);
}
.bk-days {
  align-items: center;
  gap: 6px;
  display: flex;
}
.bk-arrow {
  background: var(--bg);
  border-radius: 50%;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  display: grid;
}
.bk-strip {
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  gap: 8px;
  padding: 4px 2px 8px;
  display: flex;
  overflow-x: auto;
}
.bk-strip::-webkit-scrollbar {
  display: none;
}
.bk-strip button {
  border: 1.5px solid var(--line);
  scroll-snap-align: start;
  text-transform: capitalize;
  background: #fff;
  border-radius: 16px;
  flex: none;
  justify-items: center;
  width: 66px;
  padding: 8px 4px;
  display: grid;
}
.bk-strip button strong {
  color: var(--ink);
  font-size: 22px;
  line-height: 1.1;
}
.bk-strip button small {
  color: var(--muted);
  font-size: 11.5px;
}
.bk-strip button.on {
  border-color: var(--navy-900);
  background: var(--navy-900);
}
.bk-strip button.on small,
.bk-strip button.on strong {
  color: #fff;
}
.bk-strip button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.bk-times {
  margin-top: 10px;
}
.bk-date {
  color: var(--ink);
  margin: 0 0 8px;
  font-weight: 700;
}
.bk-none {
  background: var(--bg);
  text-align: center;
  color: var(--muted);
  border-radius: 14px;
  padding: 18px;
}
.bk-part h3 {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 12px 0 8px;
  font-size: 13px;
  font-weight: 700;
}
.bk-grid {
  grid-template-columns: repeat(auto-fill, minmax(98px, 1fr));
  gap: 8px;
  display: grid;
}
.bk-grid button {
  background: var(--green-soft);
  text-align: center;
  border: 1.5px solid #bfe8cc;
  border-radius: 12px;
  gap: 2px;
  padding: 10px 6px;
  display: grid;
}
.bk-grid button strong {
  color: var(--ink);
  font-size: 14px;
}
.bk-grid button small {
  color: var(--green-dark);
  font-size: 11px;
  font-weight: 600;
}
.bk-grid button.few {
  background: #fff7e6;
  border-color: #f6d38b;
}
.bk-grid button.few small {
  color: #a16207;
}
.bk-grid button.full {
  border-color: var(--line);
  cursor: not-allowed;
  background: #f1f4f8;
}
.bk-grid button.full small,
.bk-grid button.full strong {
  color: #9aa8bb;
  text-decoration: line-through;
}
.bk-grid button.on {
  border-color: var(--navy-900);
  background: var(--navy-900);
}
.bk-grid button.on small,
.bk-grid button.on strong {
  color: #fff;
}
.bk-legend {
  color: var(--muted);
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 14px 0 0;
  padding: 0;
  font-size: 12px;
  list-style: none;
  display: flex;
}
.bk-legend li {
  align-items: center;
  gap: 6px;
  display: inline-flex;
}
.bk-legend i {
  border-radius: 4px;
  width: 14px;
  height: 14px;
}
.bk-legend .free {
  background: var(--green-soft);
  border: 1.5px solid #bfe8cc;
}
.bk-legend .few {
  background: #fff7e6;
  border: 1.5px solid #f6d38b;
}
.bk-legend .full {
  border: 1.5px solid var(--line);
  background: #f1f4f8;
}
.bk-legend .on {
  background: var(--navy-900);
}
.bk-form {
  border-top: 1px solid var(--line);
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  display: grid;
}
.bk-form label {
  gap: 4px;
  font-size: 13.5px;
  font-weight: 600;
  display: grid;
}
.bk-form input {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 400;
}
.bk-coupon {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
  display: grid;
}
.bk-coupon input {
  text-transform: uppercase;
}
.bk-ok {
  color: #15803d;
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
}
.bk-total {
  color: var(--ink);
  background: #e8f8ed;
  border-radius: 12px;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  padding: 10px 14px;
  display: flex;
}
.bk-total span {
  color: var(--muted);
  font-size: 14px;
}
.bk-total strong {
  color: #15803d;
  font-size: 18px;
}
.bk-summary {
  background: var(--blue-soft);
  color: var(--ink);
  border-radius: 12px;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  font-weight: 600;
  display: flex;
}
@media (hover: none) {
  .bk-arrow {
    display: none;
  }
}
@media (width<=640px) {
  .bk {
    width: 100vw;
    max-width: 100vw;
    max-height: 92dvh;
    padding: 16px 14px calc(16px + env(safe-area-inset-bottom));
    border-radius: 22px 22px 0 0;
    margin: auto 0 0;
  }
  .bk-head h2 {
    font-size: 19px;
  }
  .bk-strip button {
    width: 58px;
  }
  .bk-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .bk-grid button strong {
    font-size: 13px;
  }
  .bk-form {
    padding: 12px 14px calc(16px + env(safe-area-inset-bottom));
    background: #fff;
    margin: 12px -14px -16px;
    position: sticky;
    bottom: -16px;
    box-shadow: 0 -8px 18px #0a235714;
  }
}
</style>
