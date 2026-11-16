<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, ShoppingBag, Heart, Smartphone, Monitor, PenLine, Check } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { useDemo } from '@/lib/demo-store';
import type { StoreProduct } from '@/domain/studio';
import { currency, cartTotal, actionLabel } from '@/domain/rules';
import EmptyState from '@/components/EmptyState.vue';
import EditorModal from './EditorModal.vue';
import StorePage from './StorePage.vue';

const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false });
const studio = useStudio();
const demo = useDemo();
const route = useRoute();
const id = computed(() => (route.query.id as string | undefined) ?? studio.selectedId);
const project = computed(() => studio.projects.find((p) => p.id === id.value));
const design = computed(() =>
  props.preview ? project.value?.draft : project.value?.published?.design,
);
const device = ref<'desktop' | 'mobile'>('desktop');
const notice = ref('');
const detail = ref('');
const date = ref('');
const time = ref('09:00');
const showRequest = ref(false);
let counted = '';

// Cuenta una visita por tienda publicada abierta (solo en la tienda, no en la vista previa).
watch(
  () => [studio.ready, id.value, !!project.value?.published] as const,
  ([ready, current, published]) => {
    if (!props.preview && ready && published && counted !== current) {
      counted = current;
      studio.visit(current);
    }
  },
  { immediate: true },
);

const items = computed(() => demo.cart.filter((x) => x.businessId === id.value));
const count = computed(() => items.value.reduce((n, x) => n + x.quantity, 0));
const favorite = computed(() => demo.favorites.includes(id.value));
const scrollToCatalog = () =>
  document.getElementById('sp-catalogo')?.scrollIntoView({ behavior: 'smooth' });

function productAction(product: StoreProduct) {
  const d = design.value;
  if (!d) return;
  if (props.preview) {
    notice.value = 'Vista previa: publica la tienda para probar sus pedidos.';
    return;
  }
  if (d.mode === 'products') {
    try {
      demo.add({
        businessId: id.value,
        productId: product.id,
        name: product.name,
        price: product.price,
      });
      notice.value = `${product.name} está en tu carrito.`;
    } catch (e) {
      notice.value = (e as Error).message;
    }
  } else {
    detail.value = product.name;
    showRequest.value = true;
  }
}
function action() {
  if (props.preview || design.value?.mode === 'products') scrollToCatalog();
  else showRequest.value = true;
}
function submit() {
  const d = design.value;
  if (!d || d.mode === 'products') return;
  if (d.mode === 'booking' && new Date(`${date.value}T${time.value}`).getTime() < Date.now()) {
    notice.value = 'Elige una fecha y hora futuras.';
    return;
  }
  demo.request({
    businessId: id.value,
    businessName: d.name,
    mode: d.mode,
    detail: detail.value,
    date: d.mode === 'booking' ? `${date.value} ${time.value}` : '',
  });
  showRequest.value = false;
  notice.value = 'Solicitud guardada. Puedes seguirla en Mis pedidos.';
}
</script>

<template>
  <div v-if="!studio.ready" class="studio-loading">
    <div class="loader" />
    Cargando esta historia…
  </div>
  <EmptyState
    v-else-if="!design || !project"
    title="Esta tienda aún no está publicada"
    href="/estudio"
    label="Ir a mis tiendas"
  >
    Publica tu diseño desde el estudio para verlo aquí. Las tiendas locales están disponibles en el
    navegador donde se crearon.
  </EmptyState>
  <div v-else :class="['storefront-page', { 'preview-page': preview }]">
    <header class="storefront-top">
      <NuxtLink :to="preview ? `/estudio/gestionar?id=${id}` : '/buscar'">
        <ArrowLeft :size="16" />
        <span>{{ preview ? 'Volver a mi tienda' : 'SucreIA' }}</span>
      </NuxtLink>
      <span>{{ preview ? 'VISTA PREVIA · BORRADOR' : 'TIENDA LOCAL' }}</span>
      <div>
        <template v-if="preview">
          <div class="device-switch">
            <button
              aria-label="Vista de escritorio"
              :class="device === 'desktop' ? 'active' : ''"
              @click="device = 'desktop'"
            >
              <Monitor :size="16" />
            </button>
            <button
              aria-label="Vista de celular"
              :class="device === 'mobile' ? 'active' : ''"
              @click="device = 'mobile'"
            >
              <Smartphone :size="16" />
            </button>
          </div>
          <NuxtLink :to="`/estudio/gestionar?id=${id}`">
            <PenLine :size="16" /><span>Editar mi tienda</span>
          </NuxtLink>
        </template>
        <template v-else>
          <button
            :aria-label="favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
            :aria-pressed="favorite"
            @click="demo.toggleFavorite(id)"
          >
            <Heart :size="17" :fill="favorite ? 'currentColor' : 'none'" />
          </button>
          <NuxtLink to="/carrito"><ShoppingBag :size="17" />{{ count }}</NuxtLink>
        </template>
      </div>
    </header>
    <h1 class="visually-hidden">{{ preview ? `Vista previa de ${design.name}` : design.name }}</h1>
    <div :class="['storefront-frame', { 'mobile-frame': device === 'mobile' }]">
      <StorePage :design="design" :on-product="productAction" :on-action="action" />
    </div>
    <div v-if="notice" class="storefront-notice" role="status">
      {{ notice }}
      <button aria-label="Cerrar mensaje" @click="notice = ''">×</button>
    </div>
    <div v-if="!preview" class="storefront-orderbar">
      <div>
        <strong>{{ design.mode === 'products' ? currency(cartTotal(items)) : design.name }}</strong>
        <span>
          {{
            design.mode === 'products'
              ? `${count} productos · recogida en el negocio`
              : 'Solicitud local, sujeta a confirmación'
          }}
        </span>
      </div>
      <NuxtLink v-if="design.mode === 'products'" class="studio-primary" to="/carrito">
        {{ actionLabel(design.mode) }} →
      </NuxtLink>
      <button v-else class="studio-primary" @click="showRequest = true">
        {{ actionLabel(design.mode) }} →
      </button>
    </div>
    <EditorModal v-if="showRequest" :title="actionLabel(design.mode)" @close="showRequest = false">
      <form class="store-request-form studio-form" @submit.prevent="submit">
        <button
          type="button"
          class="request-close"
          aria-label="Cerrar solicitud"
          @click="showRequest = false"
        >
          ×
        </button>
        <span class="studio-eyebrow">{{ design.name }}</span>
        <h2>{{ actionLabel(design.mode) }}</h2>
        <label>
          ¿Qué necesitas?
          <textarea v-model="detail" required minlength="3" maxlength="1000" />
        </label>
        <div v-if="design.mode === 'booking'" class="form-two">
          <label>Fecha preferida <input v-model="date" type="date" required /></label>
          <label>Hora preferida <input v-model="time" type="time" required /></label>
        </div>
        <p class="field-help">
          Prueba local. El negocio puede confirmar o responder desde su panel. No se envían
          notificaciones externas.
        </p>
        <button class="studio-primary" :disabled="!demo.ready">
          Enviar solicitud local <Check :size="16" />
        </button>
        <NuxtLink class="studio-text-button" to="/pedidos">Ver mis solicitudes →</NuxtLink>
      </form>
    </EditorModal>
  </div>
</template>
