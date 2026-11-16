<script setup lang="ts">
import { computed } from 'vue';
import { ArrowUpRight, CircleDollarSign, ShoppingBag, Package, Truck, Eye } from '@lucide/vue';
import { useDemo } from '@/lib/demo-store';
import { useStudio } from '@/lib/studio-store';
import { currency, orderSteps } from '@/domain/rules';
import PageTitle from '@/components/PageTitle.vue';
import StoreSelector from './StoreSelector.vue';
const demo = useDemo();
const studio = useStudio();
const orders = computed(() =>
  demo.orders.filter((o) => !studio.selectedId || o.businessId === studio.selectedId),
);
const stats = computed(() => {
  const today = new Date().toLocaleDateString('es-CO');
  const sales = orders.value
    .filter(
      (o) =>
        new Date(o.deliveredAt ?? o.createdAt).toLocaleDateString('es-CO') === today &&
        o.status === 'delivered',
    )
    .reduce((n, o) => n + o.total, 0);
  const count = (status: string) => orders.value.filter((o) => o.status === status).length;
  return [
    {
      label: 'Ventas del día',
      value: currency(sales),
      icon: CircleDollarSign,
      note: 'Pedidos de demo entregados hoy',
    },
    {
      label: 'Pedidos nuevos',
      value: count('received'),
      icon: ShoppingBag,
      note: 'Esperando confirmación',
    },
    { label: 'Por despachar', value: count('preparing'), icon: Package, note: 'En preparación' },
    { label: 'Por entregar', value: count('dispatched'), icon: Truck, note: 'En camino' },
  ];
});
const ranking = ['Bolso de caña flecha', 'Torta de chocolate', 'Sombrero artesanal'];
const stepLabel = (status: string) => orderSteps.find((s) => s.status === status)?.label;
</script>

<template>
  <PageTitle
    eyebrow="EL PULSO DE TU NEGOCIO"
    title="Vamos a seguir creciendo."
    description="Un vistazo a lo que pasa hoy en tu emprendimiento."
  >
    <template #action>
      <NuxtLink class="button" to="/panel/perfil">
        Ver mi negocio <ArrowUpRight :size="17" />
      </NuxtLink>
    </template>
  </PageTitle>
  <StoreSelector />
  <div class="studio-dashboard-shortcut">
    <div>
      <span class="studio-eyebrow">TU MARCA, TU ESPACIO</span>
      <h2>Diseña algo que se sienta tuyo.</h2>
      <p>Siete estilos para tu página. Tú eliges.</p>
    </div>
    <NuxtLink class="studio-primary" to="/estudio">Abrir mi estudio →</NuxtLink>
  </div>
  <div class="notice">
    Panel de demostración: filtra las operaciones locales por negocio. Las cuentas y permisos reales
    se implementarán al conectar el servidor.
  </div>
  <div class="stats-grid">
    <article v-for="s in stats" :key="s.label" class="card stat">
      <div class="row between">
        <span>{{ s.label }}</span>
        <component :is="s.icon" :size="20" />
      </div>
      <strong>{{ s.value }}</strong>
      <span class="small muted">{{ s.note }}</span>
    </article>
  </div>
  <div class="two-columns">
    <section class="card">
      <div class="section-heading">
        <h2>Últimos pedidos</h2>
        <NuxtLink to="/panel/pedidos" class="text-button">Ver todos →</NuxtLink>
      </div>
      <div v-for="o in orders.slice(0, 4)" :key="o.id" class="list-row">
        <span class="item-icon"><ShoppingBag :size="20" /></span>
        <div class="grow">
          <h3>{{ o.businessName }}</h3>
          <p class="small muted">{{ o.id }} · {{ stepLabel(o.status) }}</p>
        </div>
        <strong>{{ currency(o.total) }}</strong>
      </div>
    </section>
    <section class="card">
      <span class="tag"><Eye :size="14" /> Ejemplo de analítica</span>
      <h2>Productos más vistos</h2>
      <div v-for="(name, i) in ranking" :key="name" class="ranking">
        <span>0{{ i + 1 }}</span>
        <div class="grow">
          <p>{{ name }}</p>
          <div class="bar"><i :style="{ width: `${90 - i * 25}%` }" /></div>
        </div>
        <strong>{{ [124, 98, 62][i] }}</strong>
      </div>
    </section>
  </div>
  <section class="growth-banner">
    <div>
      <p class="eyebrow">TU SIGUIENTE PASO</p>
      <h2>Dale personalidad a tu vitrina.</h2>
      <p>Comienza con la configuración de tu negocio.</p>
    </div>
    <NuxtLink class="button secondary" to="/estudio">Abrir mi tienda →</NuxtLink>
  </section>
</template>
