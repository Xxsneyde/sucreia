<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  Bike,
  KeyRound,
  MapPin,
  Navigation,
  Package,
  Power,
  RefreshCw,
  Store,
  Wallet,
} from '@lucide/vue';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import { municipalities } from '@/domain/sectors';
import { distanceKm, locate, routeUrl } from '@/domain/geo';
import { currency, whatsappUrl } from '@/domain/rules';
import type { Operation } from '@/domain/platform';
import ImageField from '@/components/images/ImageField.vue';
import SxMap, { type MapPoint } from '@/components/maps/SxMap.vue';

// App del domiciliario (estilo Uber): disponible / no disponible, pedidos de su zona, entrega en
// curso con mapa y ruta, cobro en efectivo, PIN del cliente y ganancias.
const p = usePlatform();
const message = ref('');
const me = computed(() => p.data.value?.courier ?? null);
const form = ref({ phone: '', municipality: 'Sincelejo', vehicle: 'Moto', avatar: '' });
watch(
  me,
  (c) => {
    if (c)
      form.value = {
        phone: c.phone,
        municipality: c.municipality,
        vehicle: c.vehicle || 'Moto',
        avatar: c.avatar,
      };
  },
  { immediate: true },
);
async function enroll() {
  try {
    await p.run('PUT', '/domiciliario', form.value);
    message.value = 'Tu solicitud quedó enviada. La administración la revisa y te avisa.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}

// --- Ubicación en vivo -------------------------------------------------------------------------
const here = ref<[number, number] | null>(null);
const gpsError = ref('');
let watchId: number | undefined;
let lastSent = 0;
function startGps() {
  if (watchId !== undefined || !navigator.geolocation) {
    if (!navigator.geolocation) gpsError.value = 'Tu navegador no permite compartir la ubicación.';
    return;
  }
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      here.value = [pos.coords.latitude, pos.coords.longitude];
      gpsError.value = '';
      // Durante una entrega se envía cada 5 s; si solo está disponible, cada 30 s.
      const every = active.value.some((o) => o.status === 'dispatched') ? 5000 : 30000;
      if (Date.now() - lastSent > every) {
        lastSent = Date.now();
        void api('PUT', '/plataforma/domiciliario/ubicacion', {
          lat: here.value[0],
          lng: here.value[1],
        }).catch(() => {});
      }
    },
    () => (gpsError.value = 'Activa la ubicación para que el cliente vea por dónde vas.'),
    { enableHighAccuracy: true, maximumAge: 5000 },
  );
}
function stopGps() {
  if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
  watchId = undefined;
}
async function toggle() {
  try {
    await p.run('PUT', '/domiciliario/disponible', { available: !me.value?.available });
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const active = computed(() =>
  (p.data.value?.deliveries ?? []).filter((o) =>
    ['preparing', 'ready', 'dispatched'].includes(o.status),
  ),
);
watch(
  () => [me.value?.available, active.value.length],
  () => (me.value?.available || active.value.length ? startGps() : stopGps()),
);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void p.refresh();
  timer = setInterval(() => document.visibilityState === 'visible' && void p.refresh(), 10000);
});
onBeforeUnmount(() => {
  stopGps();
  clearInterval(timer);
});

// --- Pedidos ----------------------------------------------------------------------------------
const pool = computed(() => p.data.value?.pool ?? []);
const storePoint = (o: Operation) => locate(o.storeLat, o.storeLng, o.storeMunicipality ?? '');
const km = (o: Operation) => (here.value ? distanceKm(here.value, storePoint(o)).toFixed(1) : null);
const points = (o: Operation): MapPoint[] => {
  const list: MapPoint[] = [
    { lat: storePoint(o)[0], lng: storePoint(o)[1], kind: 'store', label: o.storeName },
  ];
  if (o.addressLat != null && o.addressLng != null)
    list.push({ lat: o.addressLat, lng: o.addressLng, kind: 'client', label: o.clientName });
  if (here.value)
    list.push({ lat: here.value[0], lng: here.value[1], kind: 'courier', label: 'Tú' });
  return list;
};
const pins = reactive<Record<string, string>>({});
async function act(o: Operation, action: string, body: Record<string, unknown> = {}) {
  try {
    await p.run('POST', `/operaciones/${o.id}/${action}`, body);
    message.value =
      action === 'claim'
        ? '¡Pedido aceptado! Ve al negocio a recogerlo.'
        : action === 'complete'
          ? '¡Entrega completada! Ya cuenta en tus ganancias.'
          : 'Listo.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}

// --- Ganancias ---------------------------------------------------------------------------------
const bogota = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso));
const completed = computed(() =>
  (p.data.value?.deliveries ?? []).filter((o) => o.status === 'completed'),
);
const today = bogota(new Date().toISOString());
const week = computed(() =>
  Array.from({ length: 7 }, (_, i) => bogota(new Date(Date.now() - i * 86_400_000).toISOString())),
);
const earned = computed(() => ({
  today: completed.value
    .filter((o) => bogota(o.completedAt) === today)
    .reduce((n, o) => n + o.fee, 0),
  week: completed.value
    .filter((o) => week.value.includes(bogota(o.completedAt)))
    .reduce((n, o) => n + o.fee, 0),
  count: completed.value.length,
}));
</script>

<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">Logística</p>
      <h1>{{ me?.approved ? 'Pedidos en mi zona' : 'Quiero repartir' }}</h1>
      <p class="muted">
        {{
          me?.approved
            ? `Zona: ${me.municipality} · ${me.vehicle || 'Vehículo'}`
            : 'Reparte pedidos de los emprendimientos de tu municipio y gana la tarifa de cada domicilio.'
        }}
      </p>
    </div>
    <div v-if="me?.approved" class="cr-head">
      <button
        class="sx-btn sx-btn--ghost"
        :disabled="p.busy.value"
        aria-label="Actualizar"
        @click="p.refresh"
      >
        <RefreshCw :size="17" />
      </button>
      <button
        :class="['cr-toggle', { on: me.available }]"
        :aria-pressed="!!me.available"
        :disabled="p.busy.value"
        @click="toggle"
      >
        <Power :size="20" /> {{ me.available ? 'Disponible' : 'No disponible' }}
      </button>
    </div>
  </div>
  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <p v-if="!p.ready.value" class="loader" role="status">Cargando…</p>

  <!-- Registro / revisión -->
  <form v-else-if="!me?.approved" class="sx-card form-stack cr-form" @submit.prevent="enroll">
    <p v-if="me && !me.approved" class="notice">
      Tu solicitud está en revisión. Te avisaremos cuando la administración la apruebe.
    </p>
    <div class="cr-two">
      <label
        >WhatsApp (con código de país)<input
          v-model="form.phone"
          required
          maxlength="16"
          placeholder="+573001234567"
      /></label>
      <label
        >Municipio donde repartes<select v-model="form.municipality">
          <option v-for="m in municipalities" :key="m" :value="m">{{ m }}</option>
        </select></label
      >
    </div>
    <label
      >Vehículo
      <select v-model="form.vehicle">
        <option>Moto</option>
        <option>Bicicleta</option>
        <option>Carro</option>
        <option>A pie</option>
      </select>
    </label>
    <ImageField v-model="form.avatar" label="Foto de perfil (la ve el cliente)" />
    <button class="sx-btn" :disabled="p.busy.value">
      {{ me ? 'Actualizar solicitud' : 'Enviar solicitud' }}
    </button>
  </form>

  <template v-else>
    <p v-if="gpsError" class="notice" role="alert">{{ gpsError }}</p>
    <div class="cr-earn">
      <article class="sx-card">
        <Wallet :size="22" /><span>Hoy</span><strong>{{ currency(earned.today) }}</strong>
      </article>
      <article class="sx-card">
        <Wallet :size="22" /><span>Últimos 7 días</span><strong>{{ currency(earned.week) }}</strong>
      </article>
      <article class="sx-card">
        <Package :size="22" /><span>Entregas hechas</span><strong>{{ earned.count }}</strong>
      </article>
    </div>

    <!-- Entrega en curso -->
    <section
      v-for="o in active"
      :key="o.id"
      class="sx-card cr-active"
      aria-label="Entrega en curso"
    >
      <div class="cr-active-info">
        <p class="eyebrow">
          {{ o.courierStage === 'to_client' ? 'Ir a entregar' : 'Ir a recoger' }}
        </p>
        <h2>{{ o.courierStage === 'to_client' ? o.clientName : o.storeName }}</h2>
        <p v-if="o.courierStage !== 'to_client'">
          <Store :size="16" /> {{ o.storeAddress || o.storeMunicipality }}
        </p>
        <p v-else><MapPin :size="16" /> {{ o.address }}</p>
        <ul class="small">
          <li v-for="l in o.lines" :key="l.productId">{{ l.quantity }} × {{ l.name }}</li>
        </ul>
        <p>
          <strong>{{
            o.paymentMethod === 'cash'
              ? `Cobrar en efectivo: ${currency(o.amount)}`
              : 'Pagado por transferencia'
          }}</strong>
          · Ganas {{ currency(o.fee) }}
        </p>
        <div class="cr-actions">
          <a
            class="sx-btn sx-btn--sm sx-btn--navy"
            :href="
              o.courierStage === 'to_client' && o.addressLat != null
                ? routeUrl(o.addressLat, o.addressLng!)
                : routeUrl(...storePoint(o))
            "
            target="_blank"
            rel="noopener"
            ><Navigation :size="15" /> Abrir ruta</a
          >
          <a
            v-if="o.courierStage === 'to_client' && o.phone"
            class="sx-btn sx-btn--sm sx-btn--ghost"
            :href="whatsappUrl(o.phone, o.storeName) || undefined"
            target="_blank"
            rel="noopener"
            >WhatsApp del cliente</a
          >
          <template v-if="o.courierStage === 'to_store'">
            <button
              class="sx-btn sx-btn--sm"
              :disabled="p.busy.value || o.status !== 'ready'"
              @click="act(o, 'pickup')"
            >
              {{ o.status === 'ready' ? 'Recogí el pedido' : 'El negocio lo está preparando…' }}
            </button>
            <button
              class="sx-btn sx-btn--sm sx-btn--ghost"
              :disabled="p.busy.value"
              @click="act(o, 'release')"
            >
              Soltar pedido
            </button>
          </template>
          <template v-else>
            <button
              v-if="o.payment === 'pending' && o.paymentMethod === 'cash'"
              class="sx-btn sx-btn--sm"
              :disabled="p.busy.value"
              @click="act(o, 'payment')"
            >
              Cobré {{ currency(o.amount) }}
            </button>
            <form
              v-if="o.payment === 'confirmed'"
              class="cr-pin"
              @submit.prevent="act(o, 'complete', { pin: pins[o.id] })"
            >
              <KeyRound :size="18" />
              <input
                v-model="pins[o.id]"
                inputmode="numeric"
                pattern="[0-9]{6}"
                maxlength="6"
                required
                placeholder="PIN del cliente"
                aria-label="PIN del cliente"
              />
              <button class="sx-btn sx-btn--sm" :disabled="p.busy.value">Entregar</button>
            </form>
          </template>
        </div>
      </div>
      <SxMap
        :center="storePoint(o)"
        :points="points(o)"
        label="Mapa de la entrega"
        class="cr-map"
      />
    </section>

    <!-- Bolsa -->
    <section class="sx-card">
      <h2 style="margin-bottom: 12px"><Bike :size="22" /> Disponibles en {{ me.municipality }}</h2>
      <p v-if="!me.available" class="muted">Activa «Disponible» para ver y tomar pedidos.</p>
      <p v-else-if="!pool.length" class="muted">
        No hay pedidos esperando en tu zona. Esta lista se actualiza sola.
      </p>
      <ul class="cr-pool">
        <li v-for="o in pool" :key="o.id">
          <div>
            <strong>{{ o.storeName }}</strong>
            <span class="small muted"
              ><Store :size="13" /> {{ o.storeAddress || o.storeMunicipality
              }}<template v-if="km(o)"> · a {{ km(o) }} km</template></span
            >
            <span class="small"
              >{{ o.lines.reduce((n, l) => n + l.quantity, 0) }} productos · para
              {{ o.clientName }} ·
              {{ o.status === 'ready' ? 'listo para recoger' : 'en preparación' }}</span
            >
          </div>
          <b>{{ currency(o.fee) }}</b>
          <button
            class="sx-btn sx-btn--sm"
            :disabled="p.busy.value || active.length > 0"
            @click="act(o, 'claim')"
          >
            Aceptar
          </button>
        </li>
      </ul>
      <p v-if="active.length && pool.length" class="small muted">
        Termina tu entrega en curso para tomar otra.
      </p>
    </section>

    <section v-if="completed.length" class="sx-card" style="margin-top: 16px">
      <h2 style="margin-bottom: 12px">Historial</h2>
      <ul class="cr-history">
        <li v-for="o in completed.slice(0, 20)" :key="o.id">
          <span>{{ o.storeName }} → {{ o.clientName }}</span>
          <span class="small muted">{{
            new Date(o.completedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
          }}</span>
          <b>{{ currency(o.fee) }}</b>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.cr-head {
  display: flex;
  gap: 10px;
}
.cr-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
  font-weight: 700;
}
.cr-toggle.on {
  background: linear-gradient(90deg, #2bbd55, #1a9e45);
  color: #fff;
}
.cr-form {
  max-width: 720px;
}
.cr-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.cr-earn {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.cr-earn article {
  display: grid;
  gap: 2px;
}
.cr-earn svg {
  color: var(--green);
}
.cr-earn span {
  font-size: 13px;
  color: var(--muted);
}
.cr-earn strong {
  font-size: 24px;
  color: var(--navy-800);
}
.cr-active {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 16px;
  margin-bottom: 16px;
  border: 2px solid var(--green);
}
.cr-active-info {
  display: grid;
  gap: 6px;
  align-content: start;
}
.cr-active-info p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}
.cr-active-info ul {
  margin: 0;
  padding-left: 18px;
}
.cr-map {
  height: 300px;
}
.cr-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}
.cr-pin {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cr-pin input {
  width: 130px;
  min-height: 34px;
  padding: 4px 10px;
  border: 1px solid #d7e0ec;
  border-radius: 10px;
}
.cr-pool,
.cr-history {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.cr-pool li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: #f6f9fd;
}
.cr-pool li div {
  display: grid;
  gap: 2px;
}
.cr-pool b {
  font-size: 18px;
  color: var(--green-dark);
}
.cr-history li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
}
@media (max-width: 800px) {
  .cr-active,
  .cr-two {
    grid-template-columns: minmax(0, 1fr);
  }
  .cr-earn {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  }
  .cr-pool li {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
