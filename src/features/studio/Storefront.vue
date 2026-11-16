<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Heart, ShoppingBag, BadgeCheck, MessageCircle } from '@lucide/vue';
import { useSession } from '@/lib/session';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import type { StoreDesign, StoreProduct } from '@/domain/studio';
import type { CommerceStore } from '@/domain/platform';
import { currency, actionLabel, whatsappUrl } from '@/domain/rules';
import StorePage from './StorePage.vue';
import EditorModal from './EditorModal.vue';
import EmptyState from '@/components/EmptyState.vue';
const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false });
const route = useRoute(),
  router = useRouter(),
  session = useSession(),
  studio = useStudio(),
  p = usePlatform();
const id = computed(() =>
  typeof route.query.id === 'string' ? route.query.id : studio.selectedId,
);
const published = shallowRef<StoreDesign | null>(null),
  meta = ref<CommerceStore | null>(null),
  loading = ref(!props.preview),
  error = ref(''),
  notice = ref(''),
  device = ref<'desktop' | 'mobile'>('desktop');
const design = computed(() =>
  props.preview ? studio.projects.find((s) => s.id === id.value)?.draft : published.value,
);
const ready = computed(() => (props.preview ? studio.ready : !loading.value));
const login = computed(() => `/ingresar?volver=${encodeURIComponent(route.fullPath)}`);
const items = computed(() => p.cart.value.filter((l) => l.businessId === id.value));
const count = computed(() => items.value.reduce((n, l) => n + l.quantity, 0));
const showRequest = ref(false),
  selected = ref(''),
  detail = ref(''),
  phone = ref(''),
  date = ref(''),
  slot = ref(''),
  times = ref<string[]>([]),
  paymentMethod = ref('cash'),
  requestKey = ref('');
const chatOpen = ref(false),
  question = ref(''),
  answer = ref(''),
  chatBusy = ref(false);
const answerMode = ref('');
// La primera carga espera a que la página esté montada: el HTML generado muestra «Cargando…»
// y debe coincidir con el primer render del navegador (sin diferencias de hidratación).
const loadStore = async (value: string) => {
  if (props.preview) return;
  loading.value = true;
  error.value = '';
  published.value = null;
  try {
    if (value) {
      const result = await api<{ design: StoreDesign }>(
        'GET',
        `/tiendas/${encodeURIComponent(value)}`,
      );
      published.value = result.design;
      meta.value = await api('GET', `/plataforma/negocios/${encodeURIComponent(value)}`);
      void api('POST', `/plataforma/negocios/${value}/visita`).catch(() => {});
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
};
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
  void loadStore(id.value);
});
watch(id, (value) => {
  if (mounted.value) void loadStore(value);
});
watch(date, async (value) => {
  slot.value = '';
  if (!value) return;
  try {
    times.value = (
      await api<{ slots: string[] }>(
        'GET',
        `/plataforma/negocios/${id.value}/horarios?fecha=${value}`,
      )
    ).slots;
  } catch (e) {
    notice.value = (e as Error).message;
  }
});
function openRequest(product?: StoreProduct) {
  if (props.preview) {
    notice.value = 'Publica tu negocio para recibir solicitudes.';
    return;
  }
  if (!session.user) {
    void router.push(login.value);
    return;
  }
  selected.value = product?.id || design.value?.products[0]?.id || '';
  detail.value = product?.name || '';
  requestKey.value = crypto.randomUUID();
  showRequest.value = true;
}
function productAction(product: StoreProduct) {
  if (props.preview) {
    notice.value = 'Esta es una vista previa del catálogo.';
    return;
  }
  void api('POST', `/plataforma/negocios/${id.value}/visita`, { productId: product.id }).catch(
    () => {},
  );
  if (!session.user) {
    void router.push(login.value);
    return;
  }
  if (design.value?.mode === 'products') {
    try {
      if (meta.value?.stock[product.id] === 0) throw new Error('Este producto está agotado.');
      p.add({
        businessId: id.value,
        productId: product.id,
        name: product.name,
        price: product.price,
      });
      notice.value = `${product.name} se agregó al carrito.`;
    } catch (e) {
      notice.value = (e as Error).message;
    }
  } else openRequest(product);
}
function action() {
  if (design.value?.mode === 'products')
    document.getElementById('sp-catalogo')?.scrollIntoView({ behavior: 'smooth' });
  else openRequest();
}
async function request() {
  try {
    await p.run('POST', '/operaciones', {
      storeId: id.value,
      key: requestKey.value,
      kind: design.value?.mode,
      items: [{ productId: selected.value, quantity: 1 }],
      detail: detail.value,
      phone: phone.value,
      slot: slot.value,
      paymentMethod: paymentMethod.value,
    });
    showRequest.value = false;
    await router.push('/pedidos');
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
async function favorite() {
  try {
    await p.run('POST', `/favoritos/${id.value}`);
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
async function chat() {
  chatBusy.value = true;
  try {
    const result = await api<{ answer: string; mode: string }>(
      'POST',
      `/plataforma/asistente/${id.value}`,
      {
        question: question.value,
      },
    );
    answer.value = result.answer;
    answerMode.value = result.mode;
  } catch (e) {
    answer.value = (e as Error).message;
  } finally {
    chatBusy.value = false;
  }
}
</script>
<template>
  <div v-if="!ready" class="studio-loading" role="status">Cargando esta historia…</div>
  <EmptyState
    v-else-if="!design"
    title="Esta tienda no está disponible"
    :href="preview ? '/estudio' : '/buscar'"
    :label="preview ? 'Volver al estudio' : 'Explorar negocios'"
    >{{
      error || 'Puede que todavía no esté publicada o que su dueño la haya retirado.'
    }}</EmptyState
  >
  <div v-else :class="['storefront-page', { 'preview-page': preview }]">
    <header class="storefront-top">
      <NuxtLink :to="preview ? `/estudio/gestionar?id=${id}` : '/buscar'"
        ><ArrowLeft :size="16" />{{
          preview ? 'Volver a mi tienda' : 'Explorar negocios'
        }}</NuxtLink
      ><span>{{ preview ? 'VISTA PREVIA' : 'TIENDA LOCAL' }}</span>
      <div v-if="preview" class="device-switch">
        <button aria-label="Vista de escritorio" @click="device = 'desktop'">Escritorio</button
        ><button aria-label="Vista de celular" @click="device = 'mobile'">Celular</button
        ><NuxtLink :to="`/estudio/gestionar?id=${id}`">Editar mi tienda</NuxtLink>
      </div>
      <div v-else-if="session.user">
        <button
          :aria-pressed="p.data.value?.favorites.includes(id)"
          aria-label="Guardar en favoritos"
          @click="favorite"
        >
          <Heart :size="18" /></button
        ><NuxtLink to="/carrito" aria-label="Ver carrito"
          ><ShoppingBag :size="18" />{{ count }}</NuxtLink
        ><NuxtLink :to="session.isMerchant.value ? '/panel' : '/inicio'">Mi espacio</NuxtLink>
      </div>
      <NuxtLink v-else :to="login">Ingresar</NuxtLink>
    </header>
    <div v-if="meta?.settings.verification === 'approved'" class="notice">
      <BadgeCheck :size="20" color="#1671c4" /> Negocio verificado por SucreIA ·
      {{ meta.completed365 }} operaciones completadas en los últimos 365 días
    </div>
    <h1 class="visually-hidden">{{ preview ? `Vista previa de ${design.name}` : design.name }}</h1>
    <div :class="['storefront-frame', { 'mobile-frame': device === 'mobile' }]">
      <StorePage :design="design" :on-product="productAction" :on-action="action" />
    </div>
    <section v-if="!preview" class="card" style="max-width: 1000px; margin: 24px auto 100px">
      <h2>Experiencias de clientes</h2>
      <p v-if="meta?.rating">
        {{ meta.rating.toFixed(1) }} / 5 · {{ meta.reviewCount }} reseñas de operaciones completadas
      </p>
      <p v-else>Todavía no hay reseñas. No se publican valoraciones inventadas.</p>
      <article v-for="review in meta?.reviews" :key="review.id" class="flow-review">
        <strong>{{ review.name }} · {{ review.rating }} / 5</strong>
        <p>{{ review.comment }}</p>
      </article>
      <button class="button secondary" @click="chatOpen = true">
        <MessageCircle :size="18" /> Preguntar por el catálogo
      </button>
    </section>
    <a
      v-if="!preview && design.whatsapp"
      class="shop-whatsapp"
      :href="whatsappUrl(design.whatsapp, design.name) || undefined"
      target="_blank"
      rel="noopener"
      ><MessageCircle :size="20" /> WhatsApp de {{ design.name }}</a
    >
    <div v-if="notice" class="storefront-notice" role="status">
      {{ notice }}<button aria-label="Cerrar mensaje" @click="notice = ''">×</button>
    </div>
    <div v-if="!preview" class="storefront-orderbar">
      <div>
        <strong>{{
          design.mode === 'products'
            ? currency(items.reduce((sum, l) => sum + l.price * l.quantity, 0))
            : design.name
        }}</strong
        ><span>{{
          session.user ? `${count} productos en carrito` : 'Ingresa para pedir, reservar o cotizar'
        }}</span>
      </div>
      <NuxtLink v-if="!session.user" class="studio-primary" :to="login"
        >Ingresar para continuar →</NuxtLink
      ><NuxtLink v-else-if="design.mode === 'products'" class="studio-primary" to="/carrito"
        >Finalizar pedido →</NuxtLink
      ><button v-else class="studio-primary" @click="openRequest()">
        {{ actionLabel(design.mode) }} →
      </button>
    </div>
    <EditorModal v-if="showRequest" :title="actionLabel(design.mode)" @close="showRequest = false"
      ><form class="form-stack" @submit.prevent="request">
        <label
          >Servicio<select v-model="selected" required>
            <option v-for="offer in design.products" :key="offer.id" :value="offer.id">
              {{ offer.name }} · {{ design.mode === 'quote' ? 'A cotizar' : currency(offer.price) }}
            </option>
          </select></label
        ><label
          >Detalle de tu solicitud<textarea v-model="detail" required maxlength="1500" /></label
        ><label
          >WhatsApp con código de país<input
            v-model="phone"
            required
            maxlength="16"
            placeholder="+57…" /></label
        ><template v-if="design.mode === 'booking'"
          ><label>Fecha preferida<input v-model="date" type="date" required /></label
          ><label
            >Horario disponible (Colombia)<select v-model="slot" required>
              <option value="">Selecciona una hora</option>
              <option v-for="time in times" :key="time" :value="time">
                {{ time.slice(11, 16) }}
              </option>
            </select></label
          >
          <p v-if="date && !times.length">No hay horas disponibles para esa fecha.</p></template
        ><label
          >Medio de pago<select v-model="paymentMethod">
            <option value="cash">Efectivo al negocio</option>
            <option v-if="meta?.settings.paymentInstructions" value="transfer">
              Transferencia al negocio
            </option>
          </select></label
        >
        <p v-if="notice" role="alert">{{ notice }}</p>
        <button class="button" :disabled="p.busy.value">
          {{
            design.mode === 'booking' ? 'Solicitar cita' : 'Enviar solicitud de cotización'
          }}</button
        ><small
          >El negocio confirmará tu solicitud. Las cotizaciones requieren tu aceptación
          posterior.</small
        >
      </form></EditorModal
    >
    <EditorModal v-if="chatOpen" title="Asistente de catálogo" @close="chatOpen = false"
      ><form class="form-stack" @submit.prevent="chat">
        <p>
          Búsqueda local en datos publicados. No es un modelo de IA y no confirma existencias o
          citas.
        </p>
        <label>Tu pregunta<input v-model="question" maxlength="500" required /></label
        ><button class="button" :disabled="chatBusy">Consultar</button>
        <p v-if="answerMode" class="small">
          {{
            answerMode === 'ollama'
              ? 'Respuesta de IA local · confirma detalles con el negocio'
              : 'Respuesta basada en el catálogo publicado'
          }}
        </p>
        <p v-if="answer" class="notice flow-pre" role="status">{{ answer }}</p>
      </form></EditorModal
    >
  </div>
</template>
<style scoped>
.shop-whatsapp {
  position: fixed;
  right: 20px;
  bottom: 100px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #176744;
  color: white;
  padding: 12px 18px;
  border-radius: 30px;
  box-shadow: 0 4px 16px #16362e30;
  font-size: 13px;
  max-width: calc(100vw - 40px);
}
@media (max-width: 600px) {
  .shop-whatsapp {
    bottom: 112px;
    right: 12px;
    max-width: calc(100vw - 24px);
    font-size: 12px;
  }
  .storefront-top > span {
    display: none;
  }
  .storefront-top {
    gap: 8px;
  }
  .storefront-orderbar {
    gap: 12px;
  }
  .storefront-orderbar > div {
    min-width: 0;
  }
  .storefront-orderbar strong {
    font-size: 16px;
  }
}
</style>
