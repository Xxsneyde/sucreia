<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
  CircleCheck,
  KeyRound,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Store,
  Truck,
  Users,
  Zap,
} from '@lucide/vue';
import { usePlatform } from '@/lib/platform-store';
import { useSession } from '@/lib/session';
import { currency } from '@/domain/rules';
import type { Operation } from '@/domain/platform';

// Logística y entregas (diapositiva 6): seguimiento de los pedidos de la cuenta y la red
// de transportadores locales. Los estados y horas salen de cada operación.
const p = usePlatform();
const session = useSession();
onMounted(() => void p.refresh());
const orders = computed(() =>
  (p.data.value?.operations ?? []).filter((o) => o.kind === 'products'),
);
const active = computed(() =>
  orders.value.filter((o) => !['completed', 'cancelled', 'refunded'].includes(o.status)),
);
const history = computed(() => orders.value.filter((o) => o.status === 'completed').slice(0, 8));
const time = (v?: string) =>
  v
    ? new Intl.DateTimeFormat('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Bogota',
      }).format(new Date(v))
    : '';
const order = ['pending', 'preparing', 'ready', 'dispatched', 'completed'];
function steps(o: Operation) {
  const at = (s: string[]) => o.events.find((e) => s.includes(e.status))?.at;
  const reached = (s: string) => order.indexOf(o.status) >= order.indexOf(s);
  return [
    { label: 'Pedido confirmado', icon: CircleCheck, done: true, time: time(o.createdAt) },
    {
      label: 'Preparando pedido',
      icon: Package,
      done: reached('preparing'),
      time: time(at(['preparing'])),
    },
    {
      label: o.fulfillment === 'delivery' ? 'En camino' : 'Listo para recoger',
      icon: o.fulfillment === 'delivery' ? Truck : Store,
      done: reached(o.fulfillment === 'delivery' ? 'dispatched' : 'ready'),
      time: time(at(['dispatched', 'ready'])),
    },
    {
      label: 'Entregado',
      icon: PackageCheck,
      done: o.status === 'completed',
      time: time(o.completedAt),
    },
  ];
}
const label = (o: Operation) =>
  o.status === 'dispatched'
    ? 'En camino'
    : o.status === 'ready'
      ? 'Listo'
      : o.status === 'preparing'
        ? 'Preparando'
        : 'Confirmado';
const isCourier = computed(() => !!p.data.value?.courier);
</script>
<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">Logística y entregas</p>
      <h1>Seguimiento de tus entregas</h1>
      <p class="muted">Pedidos en curso, transportadores locales y entregas confirmadas con PIN.</p>
    </div>
    <button class="sx-btn sx-btn--ghost" :disabled="p.busy.value" @click="p.refresh">
      <RefreshCw :size="17" /> Actualizar
    </button>
  </div>

  <section class="lg-banner">
    <img src="/sucre/repartidor.webp" alt="Repartidor de SucreIA en moto" />
    <div>
      <h2><Truck :size="34" /> Logística y Entregas Colaborativas</h2>
      <p>
        Recibe tus compras en casa o en tu negocio con transportadores locales del departamento de
        Sucre.
      </p>
      <ul>
        <li><Zap :size="28" /> Entregas rápidas en todo Sucre</li>
        <li><Users :size="28" /> Transportadores locales verificados</li>
        <li><ShieldCheck :size="28" /> Seguimiento en tiempo real</li>
      </ul>
    </div>
  </section>

  <p v-if="!p.ready.value" class="loader" role="status">Cargando tus entregas…</p>
  <template v-else>
    <div v-if="active.length" class="lg-list">
      <article v-for="o in active" :key="o.id" class="sx-card lg-item">
        <header class="lg-head">
          <div>
            <h2>{{ o.storeName }}</h2>
            <span class="small muted">{{
              o.lines.map((l) => `${l.quantity} × ${l.name}`).join(' · ')
            }}</span>
          </div>
          <strong>{{ currency(o.amount) }}</strong>
        </header>
        <p class="lg-state">
          <span>{{ label(o) }}</span>
          <template v-if="o.status === 'dispatched' && o.etaMinutes"
            >Entrega estimada en {{ o.etaMinutes }} min</template
          >
          <template v-else-if="o.fulfillment === 'pickup'">Retiras en el negocio</template>
          <template v-else-if="o.address"><MapPin :size="14" /> {{ o.address }}</template>
        </p>
        <ol class="lg-track">
          <li v-for="s in steps(o)" :key="s.label" :class="{ done: s.done }">
            <span class="lg-icon"><component :is="s.icon" :size="20" /></span>
            <strong>{{ s.label }}</strong>
            <small>{{ s.time }}</small>
          </li>
        </ol>
        <div class="lg-foot">
          <span v-if="o.courierName"><Truck :size="16" /> {{ o.courierName }}</span>
          <span v-if="o.pin" class="lg-pin"
            ><KeyRound :size="16" /> PIN de entrega: <b>{{ o.pin }}</b></span
          >
          <NuxtLink to="/pedidos" class="sx-link">Ver detalle del pedido</NuxtLink>
        </div>
      </article>
    </div>
    <div v-else class="sx-card empty">
      <div class="empty-symbol">🚚</div>
      <h2>No tienes entregas en curso</h2>
      <p>Cuando hagas un pedido con domicilio o recogida, aquí verás cada paso.</p>
      <NuxtLink to="/buscar" class="sx-btn">Buscar negocios</NuxtLink>
    </div>

    <div class="lg-two">
      <section class="sx-card">
        <h2 style="margin-bottom: 12px">Entregas recientes</h2>
        <p v-if="!history.length" class="muted">Tus entregas completadas aparecerán aquí.</p>
        <ul class="lg-history">
          <li v-for="o in history" :key="o.id">
            <PackageCheck :size="20" />
            <span
              ><strong>{{ o.storeName }}</strong
              ><small class="muted">{{
                new Date(o.completedAt || o.createdAt).toLocaleDateString('es-CO')
              }}</small></span
            >
            <b>{{ currency(o.amount) }}</b>
          </li>
        </ul>
      </section>
      <section class="sx-card lg-join">
        <Truck :size="40" />
        <div>
          <h2>{{ isCourier ? 'Tu espacio de transportador' : '¿Quieres ser transportador?' }}</h2>
          <p>
            {{
              isCourier
                ? 'Revisa las entregas que tienes asignadas.'
                : 'Únete a la red de entregas colaborativas de Sucre. La administración revisa cada solicitud.'
            }}
          </p>
          <NuxtLink
            :to="session.user ? '/domiciliario' : '/ingresar?volver=/domiciliario'"
            class="sx-btn sx-btn--pill"
          >
            {{ isCourier ? 'Ver mis entregas' : 'Quiero repartir' }}
          </NuxtLink>
        </div>
      </section>
    </div>
  </template>
</template>
<style scoped>
.lg-banner {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  margin-bottom: 18px;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(90deg, #e6f1ff, #f4f8ff);
  box-shadow: var(--shadow);
}
.lg-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lg-banner > div {
  padding: 20px 22px;
}
.lg-banner h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 26px;
}
.lg-banner h2 svg,
.lg-banner li svg {
  color: var(--green);
}
.lg-banner ul {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 12px 0 0;
  padding: 14px;
  list-style: none;
  border-radius: 14px;
  background: #fff;
}
.lg-banner li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: var(--ink);
}
.lg-list {
  display: grid;
  gap: 16px;
  margin-bottom: 18px;
}
.lg-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.lg-head strong {
  font-size: 18px;
  color: var(--green-dark);
}
.lg-state {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.lg-state span {
  padding: 4px 16px;
  border-radius: 999px;
  background: var(--green);
  color: #fff;
  font-weight: 600;
}
.lg-track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  text-align: center;
  font-size: 12.5px;
}
.lg-track li {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 4px;
  color: var(--muted);
}
.lg-track li::before {
  content: '';
  position: absolute;
  top: 21px;
  right: 50%;
  width: 100%;
  height: 3px;
  background: #dbe3ee;
}
.lg-track li:first-child::before {
  display: none;
}
.lg-track li.done::before {
  background: var(--green);
}
.lg-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 2px solid #dbe3ee;
  border-radius: 50%;
  background: #fff;
}
.lg-track .done .lg-icon {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}
.lg-track strong {
  color: var(--ink);
}
.lg-foot {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.lg-foot span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lg-pin {
  padding: 6px 12px;
  border-radius: 10px;
  background: var(--green-soft);
  color: var(--green-dark);
}
.lg-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.lg-history {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.lg-history li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.lg-history span {
  display: grid;
}
.lg-history svg {
  color: var(--green);
}
.lg-join {
  display: flex;
  gap: 16px;
  align-items: center;
  background: linear-gradient(135deg, #f0fbf3, #fff);
}
.lg-join > svg {
  color: var(--green);
}
.lg-join p {
  margin: 6px 0 12px;
}
@media (max-width: 900px) {
  .lg-banner,
  .lg-two {
    grid-template-columns: minmax(0, 1fr);
  }
  .lg-banner ul {
    grid-template-columns: 1fr;
  }
}
</style>
