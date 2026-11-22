<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Bike, CalendarDays, Clock, MapPin, Package, RefreshCw, Store, Truck } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { statusNames, type Operation } from '@/domain/platform';
import { currency, whatsappUrl } from '@/domain/rules';

// Inicio del emprendedor según su tipo de negocio (diagrama del equipo):
// productos → tablero Recientes / Preparando / Enviados; reservas → reservas de hoy;
// cotizaciones → solicitudes por cotizar y por cerrar.
const studio = useStudio();
const p = usePlatform();
const router = useRouter();
const message = ref('');
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) ?? studio.projects[0],
);
watch(
  () => [studio.ready, store.value],
  () => {
    if (studio.ready && !store.value) void router.replace('/panel/configurar');
  },
  { immediate: true },
);
onMounted(() => void p.refresh());
const kind = computed(() => store.value?.draft.mode ?? 'products');
const sales = computed(() =>
  (p.data.value?.sales ?? []).filter((o) => o.storeId === store.value?.id),
);
const bogota = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso));
const today = bogota(new Date().toISOString());
const paidToday = computed(() =>
  sales.value
    .filter((o) => o.payment === 'confirmed' && bogota(o.paidAt || o.createdAt) === today)
    .reduce((n, o) => n + o.amount - o.fee, 0),
);
const time = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

// --- Productos -----------------------------------------------------------------------------
const columns = computed(() => [
  {
    id: 'recientes',
    title: 'Recientes',
    ops: sales.value.filter((o) => o.kind === 'products' && o.status === 'pending'),
  },
  {
    id: 'preparando',
    title: 'Preparando',
    ops: sales.value.filter(
      (o) => o.kind === 'products' && ['preparing', 'ready'].includes(o.status),
    ),
  },
  {
    id: 'enviados',
    title: 'Enviados',
    ops: sales.value.filter((o) => o.kind === 'products' && o.status === 'dispatched'),
  },
]);
const deliveredToday = computed(
  () =>
    sales.value.filter((o) => o.status === 'completed' && bogota(o.completedAt) === today).length,
);

// --- Reservas y cotizaciones -----------------------------------------------------------------
const bookingsToday = computed(() =>
  sales.value
    .filter(
      (o) =>
        o.kind === 'booking' &&
        o.slot &&
        bogota(o.slot) === today &&
        !['cancelled'].includes(o.status),
    )
    .sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot)),
);
const toConfirm = computed(() =>
  sales.value.filter(
    (o) => o.kind === 'booking' && o.status === 'pending' && bogota(o.slot) !== today,
  ),
);
const upcoming = computed(
  () =>
    sales.value.filter(
      (o) =>
        o.kind === 'booking' &&
        o.status === 'accepted' &&
        Date.parse(o.slot) > Date.now() &&
        bogota(o.slot) !== today,
    ).length,
);
const quotes = computed(() => ({
  toQuote: sales.value.filter((o) => o.kind === 'quote' && o.status === 'pending'),
  waiting: sales.value.filter((o) => o.kind === 'quote' && o.status === 'quoted'),
  accepted: sales.value.filter((o) => o.kind === 'quote' && o.status === 'accepted'),
}));

// --- Acciones -------------------------------------------------------------------------------
const form = reactive<Record<string, { pin: string; amount: number }>>({});
const f = (id: string) => (form[id] ??= { pin: '', amount: 0 });
async function act(op: Operation, action: string, body: Record<string, unknown> = {}) {
  try {
    await p.run('POST', `/operaciones/${op.id}/${action}`, body);
    message.value = 'Listo.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const courierText = (o: Operation) =>
  o.fulfillment !== 'delivery'
    ? 'Recoge en el negocio'
    : !o.courierId
      ? 'Buscando domiciliario en la zona…'
      : o.courierStage === 'to_store'
        ? `${o.courierName} viene a recogerlo`
        : `${o.courierName} va hacia el cliente`;
</script>

<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">{{ store?.draft.name }}</p>
      <h1>
        {{
          kind === 'products' ? 'Pedidos' : kind === 'booking' ? 'Reservas de hoy' : 'Solicitudes'
        }}
      </h1>
      <p class="muted">
        {{
          kind === 'booking'
            ? new Intl.DateTimeFormat('es-CO', {
                dateStyle: 'full',
                timeZone: 'America/Bogota',
              }).format(new Date())
            : 'Atiende tus pedidos de principio a fin.'
        }}
      </p>
    </div>
    <button class="sx-btn sx-btn--ghost" :disabled="p.busy.value" @click="p.refresh">
      <RefreshCw :size="17" /> Actualizar
    </button>
  </div>
  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <p v-if="!studio.ready || !store" class="loader" role="status">Cargando tu negocio…</p>

  <template v-else>
    <div class="mh-metrics">
      <article class="sx-card">
        <span>{{ kind === 'booking' ? 'Cobrado hoy' : 'Ventas de hoy' }}</span
        ><strong>{{ currency(paidToday) }}</strong>
      </article>
      <template v-if="kind === 'products'">
        <article class="sx-card">
          <span>Nuevos</span><strong>{{ columns[0].ops.length }}</strong>
        </article>
        <article class="sx-card">
          <span>En camino</span><strong>{{ columns[2].ops.length }}</strong>
        </article>
        <article class="sx-card">
          <span>Entregados hoy</span><strong>{{ deliveredToday }}</strong>
        </article>
      </template>
      <template v-else-if="kind === 'booking'">
        <article class="sx-card">
          <span>Citas hoy</span><strong>{{ bookingsToday.length }}</strong>
        </article>
        <article class="sx-card">
          <span>Por confirmar</span><strong>{{ toConfirm.length }}</strong>
        </article>
        <article class="sx-card">
          <span>Próximos días</span><strong>{{ upcoming }}</strong>
        </article>
      </template>
      <template v-else>
        <article class="sx-card">
          <span>Por cotizar</span><strong>{{ quotes.toQuote.length }}</strong>
        </article>
        <article class="sx-card">
          <span>Esperando al cliente</span><strong>{{ quotes.waiting.length }}</strong>
        </article>
        <article class="sx-card">
          <span>Aceptadas</span><strong>{{ quotes.accepted.length }}</strong>
        </article>
      </template>
    </div>

    <!-- Productos: tablero -->
    <div v-if="kind === 'products'" class="mh-board">
      <section v-for="col in columns" :key="col.id" class="mh-col" :aria-label="col.title">
        <h2>
          {{ col.title }}
          <span class="sx-badge" style="background: var(--navy-800)">{{ col.ops.length }}</span>
        </h2>
        <p v-if="!col.ops.length" class="small muted">Sin pedidos.</p>
        <article v-for="o in col.ops" :key="o.id" class="sx-card mh-order">
          <header>
            <strong>{{ o.clientName }}</strong>
            <span class="small muted"><Clock :size="13" /> {{ time(o.createdAt) }}</span>
          </header>
          <ul>
            <li v-for="l in o.lines" :key="l.productId">{{ l.quantity }} × {{ l.name }}</li>
          </ul>
          <p class="mh-total">
            {{ currency(o.amount) }} · {{ o.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'
            }}{{ o.payment === 'confirmed' ? ' · pagado' : '' }}
          </p>
          <p class="small mh-ship">
            <Truck v-if="o.fulfillment === 'delivery'" :size="15" /><Store v-else :size="15" />
            {{ courierText(o) }}
          </p>
          <p v-if="o.fulfillment === 'delivery' && o.address" class="small muted">
            <MapPin :size="13" /> {{ o.address }}
          </p>
          <div class="mh-actions">
            <button
              v-if="o.status === 'pending'"
              class="sx-btn sx-btn--sm"
              :disabled="p.busy.value"
              @click="act(o, 'prepare')"
            >
              Aceptar y preparar
            </button>
            <button
              v-if="o.status === 'preparing'"
              class="sx-btn sx-btn--sm"
              :disabled="p.busy.value"
              @click="act(o, 'ready')"
            >
              Marcar listo
            </button>
            <button
              v-if="o.status === 'ready' && o.fulfillment === 'delivery' && !o.courierId"
              class="sx-btn sx-btn--sm sx-btn--ghost"
              :disabled="p.busy.value"
              @click="act(o, 'dispatch', { etaMinutes: 30 })"
            >
              <Bike :size="15" /> Entregarlo yo
            </button>
            <button
              v-if="
                o.payment === 'pending' &&
                o.paymentMethod === 'transfer' &&
                !['cancelled'].includes(o.status)
              "
              class="sx-btn sx-btn--sm sx-btn--ghost"
              :disabled="p.busy.value"
              @click="act(o, 'payment')"
            >
              Confirmar transferencia
            </button>
            <button
              v-if="
                o.payment === 'pending' &&
                o.paymentMethod === 'cash' &&
                (o.fulfillment === 'pickup'
                  ? o.status === 'ready'
                  : o.courierId === o.ownerId && o.status === 'dispatched')
              "
              class="sx-btn sx-btn--sm sx-btn--ghost"
              :disabled="p.busy.value"
              @click="act(o, 'payment')"
            >
              Recibí el efectivo
            </button>
            <form
              v-if="
                o.payment === 'confirmed' &&
                ((o.fulfillment === 'pickup' && o.status === 'ready') ||
                  (o.courierId === o.ownerId && o.status === 'dispatched'))
              "
              class="mh-pin"
              @submit.prevent="act(o, 'complete', { pin: f(o.id).pin })"
            >
              <input
                v-model="f(o.id).pin"
                inputmode="numeric"
                pattern="[0-9]{6}"
                maxlength="6"
                required
                placeholder="PIN del cliente"
                :aria-label="`PIN del cliente ${o.clientName}`"
              />
              <button class="sx-btn sx-btn--sm" :disabled="p.busy.value">Entregar</button>
            </form>
            <a
              v-if="o.phone"
              class="sx-link small"
              :href="whatsappUrl(o.phone, o.storeName) || undefined"
              target="_blank"
              rel="noopener"
              >WhatsApp</a
            >
          </div>
        </article>
      </section>
    </div>

    <!-- Reservas: hoy -->
    <template v-else-if="kind === 'booking'">
      <section class="sx-card">
        <h2 style="margin-bottom: 12px"><CalendarDays :size="22" /> Citas de hoy</h2>
        <p v-if="!bookingsToday.length" class="muted">No tienes citas para hoy.</p>
        <ul class="mh-agenda">
          <li v-for="o in bookingsToday" :key="o.id" :class="o.status">
            <time>{{ time(o.slot) }}</time>
            <div>
              <strong>{{ o.clientName }}</strong>
              <span class="small muted">{{ o.detail }}</span>
              <span class="sx-tag" :class="{ off: ['no_show', 'pending'].includes(o.status) }">{{
                o.arrivedAt && o.status === 'accepted' ? 'En atención' : statusNames[o.status]
              }}</span>
            </div>
            <div class="mh-actions">
              <button
                v-if="o.status === 'pending'"
                class="sx-btn sx-btn--sm"
                :disabled="p.busy.value"
                @click="act(o, 'confirm')"
              >
                Confirmar
              </button>
              <button
                v-if="o.status === 'accepted' && !o.arrivedAt"
                class="sx-btn sx-btn--sm sx-btn--ghost"
                :disabled="p.busy.value"
                @click="act(o, 'arrive')"
              >
                Llegó
              </button>
              <button
                v-if="o.status === 'accepted' && o.payment === 'pending'"
                class="sx-btn sx-btn--sm sx-btn--ghost"
                :disabled="p.busy.value"
                @click="act(o, 'payment')"
              >
                Cobrar {{ currency(o.amount) }}
              </button>
              <button
                v-if="
                  o.status === 'accepted' &&
                  o.payment === 'confirmed' &&
                  Date.parse(o.slot) <= Date.now()
                "
                class="sx-btn sx-btn--sm"
                :disabled="p.busy.value"
                @click="act(o, 'complete')"
              >
                Completar
              </button>
              <button
                v-if="
                  o.status === 'accepted' &&
                  o.payment === 'pending' &&
                  !o.arrivedAt &&
                  Date.parse(o.slot) <= Date.now()
                "
                class="sx-btn sx-btn--sm sx-btn--ghost danger"
                :disabled="p.busy.value"
                @click="act(o, 'noshow')"
              >
                No asistió
              </button>
            </div>
          </li>
        </ul>
      </section>
      <section v-if="toConfirm.length" class="sx-card" style="margin-top: 16px">
        <h2 style="margin-bottom: 12px">Por confirmar</h2>
        <ul class="mh-agenda">
          <li v-for="o in toConfirm" :key="o.id">
            <time
              >{{
                new Date(o.slot).toLocaleDateString('es-CO', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'America/Bogota',
                })
              }}
              {{ time(o.slot) }}</time
            >
            <div>
              <strong>{{ o.clientName }}</strong
              ><span class="small muted">{{ o.detail }}</span>
            </div>
            <div class="mh-actions">
              <button class="sx-btn sx-btn--sm" :disabled="p.busy.value" @click="act(o, 'confirm')">
                Confirmar
              </button>
              <button
                class="sx-btn sx-btn--sm sx-btn--ghost"
                :disabled="p.busy.value"
                @click="act(o, 'cancel')"
              >
                Rechazar
              </button>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Cotizaciones -->
    <div v-else class="mh-board">
      <section class="mh-col" aria-label="Por cotizar">
        <h2>Por cotizar</h2>
        <p v-if="!quotes.toQuote.length" class="small muted">Sin solicitudes.</p>
        <article v-for="o in quotes.toQuote" :key="o.id" class="sx-card mh-order">
          <strong>{{ o.clientName }}</strong>
          <p class="small">{{ o.detail }}</p>
          <form class="mh-pin" @submit.prevent="act(o, 'quote', { amount: f(o.id).amount })">
            <input
              v-model.number="f(o.id).amount"
              type="number"
              min="1"
              required
              placeholder="Precio (COP)"
              :aria-label="`Precio para ${o.clientName}`"
            />
            <button class="sx-btn sx-btn--sm" :disabled="p.busy.value">Enviar</button>
          </form>
        </article>
      </section>
      <section class="mh-col" aria-label="Esperando al cliente">
        <h2>Esperando al cliente</h2>
        <article v-for="o in quotes.waiting" :key="o.id" class="sx-card mh-order">
          <strong>{{ o.clientName }}</strong>
          <p class="small">{{ currency(o.amount) }} · {{ o.detail }}</p>
        </article>
      </section>
      <section class="mh-col" aria-label="Aceptadas">
        <h2>Aceptadas</h2>
        <article v-for="o in quotes.accepted" :key="o.id" class="sx-card mh-order">
          <strong>{{ o.clientName }}</strong>
          <p class="small">{{ currency(o.amount) }} · {{ o.detail }}</p>
          <div class="mh-actions">
            <button
              v-if="o.payment === 'pending'"
              class="sx-btn sx-btn--sm sx-btn--ghost"
              :disabled="p.busy.value"
              @click="act(o, 'payment')"
            >
              Confirmar pago
            </button>
            <button
              v-else
              class="sx-btn sx-btn--sm"
              :disabled="p.busy.value"
              @click="act(o, 'complete')"
            >
              Completar servicio
            </button>
          </div>
        </article>
      </section>
    </div>
    <p style="margin-top: 16px">
      <NuxtLink to="/panel/pedidos" class="sx-link"
        ><Package :size="16" /> Ver el historial completo</NuxtLink
      >
    </p>
  </template>
</template>

<style scoped>
.mh-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.mh-metrics article {
  display: grid;
  gap: 4px;
}
.mh-metrics span {
  color: var(--muted);
  font-size: 13px;
}
.mh-metrics strong {
  font-size: 26px;
  color: var(--navy-800);
}
.mh-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}
.mh-col {
  display: grid;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  background: #e4edf8;
}
.mh-col h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}
.mh-order {
  display: grid;
  gap: 6px;
  padding: 14px;
}
.mh-order header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.mh-order header span,
.mh-ship {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.mh-order ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
}
.mh-order p {
  margin: 0;
}
.mh-total {
  font-weight: 600;
  color: var(--ink);
}
.mh-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.mh-pin {
  display: flex;
  gap: 6px;
}
.mh-pin input {
  width: 130px;
  min-height: 34px;
  padding: 4px 10px;
  border: 1px solid #d7e0ec;
  border-radius: 10px;
}
.mh-agenda {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mh-agenda li {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f6f9fd;
}
.mh-agenda li.completed {
  opacity: 0.6;
}
.mh-agenda time {
  font-size: 18px;
  font-weight: 700;
  color: var(--navy-800);
}
.mh-agenda div {
  display: grid;
  gap: 2px;
}
.sx-tag.off {
  background: #fff4d6;
  color: #92400e;
}
@media (max-width: 1000px) {
  .mh-board {
    grid-template-columns: minmax(0, 1fr);
  }
  .mh-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .mh-agenda li {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
