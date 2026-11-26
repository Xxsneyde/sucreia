<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import { verificationNames } from '@/domain/platform';
import type { CommerceStore, Promotion } from '@/domain/platform';
import OperationList from './OperationList.vue';
import PageTitle from '@/components/PageTitle.vue';
const route = useRoute(),
  studio = useStudio(),
  p = usePlatform(),
  message = ref('');
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) || studio.projects[0],
);
const tab = computed(() =>
  route.path.includes('pedidos')
    ? 'orders'
    : route.path.includes('productos')
      ? 'catalog'
      : route.path.includes('descuentos')
        ? 'promotions'
        : route.path.includes('configuracion')
          ? 'settings'
          : 'dashboard',
);
// Promoción en edición ('' = nueva).
const editing = ref('');
function editPromotion(promo: Promotion) {
  editing.value = promo.id;
  promotion.value = {
    title: promo.title,
    cost: promo.cost,
    percent: promo.percent,
    // Fecha en Colombia (UTC−5) para el campo de fecha.
    expires: new Date(Date.parse(promo.expires) - 5 * 3_600_000).toISOString().slice(0, 10),
  };
}
function resetPromotion() {
  editing.value = '';
  promotion.value = { title: '', cost: 10, percent: 10, expires: '' };
}
const meta = ref<CommerceStore | null>(null),
  evidence = ref(''),
  promotion = ref({ title: '', percent: 10, cost: 10, expires: '' });
watch(
  () => store.value?.id,
  async (id) => {
    resetPromotion();
    if (id)
      try {
        meta.value = await api<CommerceStore>('GET', `/plataforma/negocios/${id}`);
      } catch (e) {
        message.value = (e as Error).message;
      }
  },
  { immediate: true },
);
const sales = computed(
  () => p.data.value?.sales.filter((o) => o.storeId === store.value?.id) ?? [],
);
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const revenue = computed(() =>
  sales.value
    .filter(
      (o) =>
        o.payment === 'confirmed' &&
        new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
          new Date(o.paidAt || o.createdAt),
        ) === today(),
    )
    .reduce((sum, o) => sum + o.amount, 0),
);
async function refresh() {
  await p.refresh();
  if (store.value)
    try {
      meta.value = await api('GET', `/plataforma/negocios/${store.value.id}`);
    } catch (e) {
      message.value = (e as Error).message;
    }
}
async function save() {
  if (!meta.value || !store.value) return;
  try {
    meta.value = await p.run(
      'PUT',
      `/negocios/${store.value.id}/configuracion`,
      meta.value.settings,
    );
    message.value = 'Configuración guardada.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function stock(productId: string, event: Event) {
  if (!store.value) return;
  const value = (event.target as HTMLInputElement).value;
  try {
    meta.value = await p.run('PUT', `/negocios/${store.value.id}/inventario`, {
      productId,
      quantity: value === '' ? null : Number(value),
    });
    message.value = 'Existencias actualizadas.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function promote() {
  try {
    await p.run(
      editing.value ? 'PUT' : 'POST',
      `/negocios/${store.value!.id}/promociones${editing.value ? '/' + editing.value : ''}`,
      {
        ...promotion.value,
        expires: new Date(promotion.value.expires + 'T23:59:00-05:00').toISOString(),
      },
    );
    message.value = editing.value ? 'Promoción actualizada.' : 'Promoción publicada.';
    resetPromotion();
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function verify() {
  try {
    await p.run('POST', `/negocios/${store.value!.id}/verificacion`, { evidence: evidence.value });
    meta.value = await api('GET', `/plataforma/negocios/${store.value!.id}`);
    message.value = 'Solicitud enviada a revisión.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function deactivate(id: string) {
  try {
    await p.run('DELETE', `/promociones/${id}`);
    message.value =
      'Promoción desactivada. Los bonos ya emitidos se respetan hasta su vencimiento.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
</script>
<template>
  <PageTitle
    eyebrow="Mi negocio"
    :title="store?.draft.name || 'Tu próximo negocio empieza aquí.'"
    description="Ventas y actividad calculadas con operaciones de tu negocio."
  />
  <p v-if="message" role="status" class="notice">{{ message }}</p>
  <p v-if="p.error.value" role="alert" class="notice">{{ p.error.value }}</p>
  <div v-if="!store" class="card flow-empty">
    <h2>Crea tu tienda para comenzar</h2>
    <NuxtLink class="button" to="/panel/perfil">Crear mi negocio →</NuxtLink>
  </div>
  <template v-else>
    <div class="flow-toolbar">
      <button class="button secondary" :disabled="p.busy.value" @click="refresh">
        Actualizar panel
      </button>
      <label
        >Negocio activo<select
          :value="store.id"
          @change="studio.select(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="s in studio.projects" :key="s.id" :value="s.id">
            {{ s.draft.name || 'Sin nombre' }}
          </option>
        </select></label
      ><NuxtLink class="button secondary" to="/panel/perfil">Editar datos y catálogo →</NuxtLink
      ><NuxtLink v-if="store.published" :to="`/tienda?id=${store.id}`"
        >Ver página publicada ↗</NuxtLink
      >
    </div>
    <template v-if="tab === 'dashboard'"
      ><div class="flow-metrics">
        <article class="card">
          <span>Pagos confirmados hoy</span><strong>{{ currency(revenue) }}</strong>
        </article>
        <article class="card">
          <span>Nuevas operaciones</span
          ><strong>{{ sales.filter((o) => o.status === 'pending').length }}</strong>
        </article>
        <article class="card">
          <span>Por despachar / recoger</span
          ><strong>{{ sales.filter((o) => o.status === 'ready').length }}</strong>
        </article>
        <article class="card">
          <span>Pendientes de entregar</span
          ><strong>{{ sales.filter((o) => o.status === 'dispatched').length }}</strong>
        </article>
      </div>
      <div class="card">
        <h2>Productos más consultados</h2>
        <ol>
          <li
            v-for="product in [...store.draft.products]
              .sort((a, b) => (meta?.views[b.id] ?? 0) - (meta?.views[a.id] ?? 0))
              .slice(0, 5)"
            :key="product.id"
          >
            {{ product.name }} · {{ meta?.views[product.id] ?? 0 }} consultas
          </li>
        </ol>
        <p class="muted">
          Se cuenta una consulta por visitante y producto cada 30 minutos. No equivale a una venta.
        </p>
      </div>
      <h2>Actividad reciente</h2>
      <OperationList :operations="sales.slice(0, 5)" role="merchant"
    /></template>
    <OperationList v-else-if="tab === 'orders'" :operations="sales" role="merchant" />
    <section v-else-if="tab === 'catalog'" class="card form-stack">
      <h2>Existencias</h2>
      <p>
        Deja una cantidad vacía si no quieres limitar las unidades. El nombre, precio y foto se
        editan en tu página; publica para que el cliente vea esos cambios.
      </p>
      <div v-for="product in store.draft.products" :key="product.id" class="flow-between">
        <span>{{ product.name }} · {{ currency(product.price) }}</span
        ><label
          >Unidades disponibles de {{ product.name
          }}<input
            type="number"
            min="0"
            max="1000000"
            :value="meta?.stock[product.id] ?? ''"
            placeholder="Sin límite"
            :disabled="p.busy.value"
            @change="stock(product.id, $event)"
        /></label>
      </div>
    </section>
    <section v-else-if="tab === 'promotions'" class="two-columns">
      <form class="card form-stack" @submit.prevent="promote">
        <h2>Un beneficio para tus clientes</h2>
        <label>Nombre del bono<input v-model="promotion.title" required maxlength="100" /></label
        ><label
          >Porcentaje de descuento<input
            v-model.number="promotion.percent"
            type="number"
            min="1"
            max="50"
            required /></label
        ><label
          >Puntos necesarios<input
            v-model.number="promotion.cost"
            type="number"
            min="1"
            required /></label
        ><label>Vigente hasta<input v-model="promotion.expires" type="date" required /></label
        ><button class="button" :disabled="p.busy.value || !store.published">
          {{ editing ? 'Guardar cambios' : 'Publicar promoción' }}
        </button>
        <button v-if="editing" type="button" @click="resetPromotion">Cancelar edición</button>
      </form>
      <section class="card">
        <h2>Bonos activos</h2>
        <article
          v-for="promo in p.data.value?.promotions.filter((c) => c.storeId === store?.id)"
          :key="promo.id"
        >
          <button
            v-if="promo.active"
            type="button"
            class="button secondary"
            @click="editPromotion(promo)"
          >
            Editar promoción
          </button>
          <h3>{{ promo.title }}</h3>
          <p>{{ promo.percent }} % · {{ promo.cost }} puntos</p>
          <button class="button secondary" :disabled="p.busy.value" @click="deactivate(promo.id)">
            Desactivar
          </button>
        </article>
      </section>
    </section>
    <div v-else-if="meta" class="two-columns">
      <form class="card form-stack" @submit.prevent="save">
        <h2>Cómo atiendes</h2>
        <label><input v-model="meta.settings.delivery" type="checkbox" /> Ofrezco domicilio</label
        ><label
          >Costo de domicilio (COP)<input
            v-model.number="meta.settings.deliveryFee"
            type="number"
            min="0"
            max="500000" /></label
        ><label
          >Instrucciones para transferencias<textarea
            v-model="meta.settings.paymentInstructions"
            maxlength="700"
            placeholder="Banco, titular, cuenta y cómo confirmar el pago. No pegues contraseñas."
          /></label
        ><label
          >Apertura (hora de Colombia, 0–23)<input
            v-model.number="meta.settings.opens"
            type="number"
            min="0"
            max="23" /></label
        ><label
          >Cierre (1–24)<input
            v-model.number="meta.settings.closes"
            type="number"
            min="1"
            max="24" /></label
        ><label
          >Duración de cada cita (minutos)<input
            v-model.number="meta.settings.duration"
            type="number"
            min="15"
            max="240" /></label
        ><label
          >Latitud (opcional)<input
            v-model.number="meta.settings.latitude"
            type="number"
            step="any"
            min="-90"
            max="90" /></label
        ><label
          >Longitud (opcional)<input
            v-model.number="meta.settings.longitude"
            type="number"
            step="any"
            min="-180"
            max="180" /></label
        ><button class="button" :disabled="p.busy.value">Guardar configuración</button>
      </form>
      <form class="card form-stack" @submit.prevent="verify">
        <h2>Verificación del negocio</h2>
        <p>Estado: {{ verificationNames[meta.settings.verification] }}</p>
        <p>{{ meta.settings.verificationNote }}</p>
        <label
          >Cómo podemos comprobar tu negocio<textarea
            v-model="evidence"
            maxlength="1000"
            required
            placeholder="Contacto, dirección y referencias públicas de tu actividad."
          /></label
        ><button
          class="button"
          :disabled="p.busy.value || meta.settings.verification === 'approved'"
        >
          Solicitar revisión
        </button>
        <p class="muted">
          El sello se concede después de una revisión manual de la plataforma. No representa un
          registro gubernamental.
        </p>
      </form>
    </div>
  </template>
</template>
