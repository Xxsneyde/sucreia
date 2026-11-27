<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  House,
  Info,
  Leaf,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Users,
  Zap,
} from '@lucide/vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { usePlatform } from '@/lib/platform-store';
import { useStudio } from '@/lib/studio-store';
import { useCarousel } from '@/composables/carousel';
import { canBuyRole } from '@/domain/roles';
import { socialUrl, thumbnail, type StoreDesign, type StoreProduct } from '@/domain/studio';
import { rankByRating, weekSummary, type CommerceStore } from '@/domain/platform';
import { currency, whatsappUrl } from '@/domain/rules';
import { sectorFor, sentenceCase, subregionFor } from '@/domain/sectors';
import type { BrainContext, Reply } from '@/domain/brain/types';
import EmptyState from '@/components/EmptyState.vue';
import StarRating from '@/components/sucre/StarRating.vue';
import ChatCard from '@/components/sucre/ChatCard.vue';
import SxModal from '@/components/sucre/SxModal.vue';
import VerifiedBadge from '@/components/sucre/VerifiedBadge.vue';
import ShareMenu from '@/components/sucre/ShareMenu.vue';
import ReviewList from '@/components/sucre/ReviewList.vue';
import ProductSheet from '@/components/business/ProductSheet.vue';
import BookingPicker from '@/components/business/BookingPicker.vue';
import PhoneField from '@/components/PhoneField.vue';

// Página pública de un negocio (diseño fijo de la presentación): inicio, catálogo, reseñas,
// ubicación y el asistente del negocio. Las compras se envían por WhatsApp desde el carrito;
// las reservas y cotizaciones se registran como operaciones.
const route = useRoute();
const router = useRouter();
const session = useSession();
const platform = usePlatform();
const id = ref('');
const design = ref<StoreDesign | null>(null);
const meta = ref<CommerceStore | null>(null);
const loading = ref(true);
const loadError = ref('');
const notice = ref('');
type Tab = 'inicio' | 'productos' | 'resenas' | 'ubicacion' | 'bot';
const tab = ref<Tab>('inicio');
const group = ref('');
const quantities = ref<Record<string, number>>({});
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    design.value = (
      await api<{ design: StoreDesign }>('GET', `/tiendas/${encodeURIComponent(id.value)}`)
    ).design;
    meta.value = await api<CommerceStore>(
      'GET',
      `/plataforma/negocios/${encodeURIComponent(id.value)}`,
    );
    api('POST', `/plataforma/negocios/${id.value}/visita`).catch(() => {});
  } catch (e) {
    loadError.value = (e as Error).message;
    design.value = null;
  } finally {
    loading.value = false;
  }
}
// La página se genera sin «?…»: se lee al montar.
const query = (key: string) => {
  const v = route.query[key];
  return (typeof v === 'string' && v) || new URLSearchParams(window.location.search).get(key) || '';
};
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
  id.value = query('id');
  const view = query('ver');
  if (view === 'bot' || view === 'productos' || view === 'resenas') tab.value = view;
  openProduct.value = query('producto');
  if (id.value) void load();
  else loading.value = false;
});
watch(
  () => route.query.id,
  (value) => {
    if (mounted.value && typeof value === 'string' && value && value !== id.value) {
      id.value = value;
      void load();
    }
  },
);
// ?producto=<id> (enlace del asistente o de compartir) abre la ficha de ese producto.
const openProduct = ref('');
watch(
  () => route.query.producto,
  (value) => {
    if (mounted.value && typeof value === 'string' && value) openProduct.value = value;
  },
);
watch([design, loading, openProduct], () => {
  if (loading.value || !design.value || !openProduct.value) return;
  const product = design.value.products.find((p) => p.id === openProduct.value);
  openProduct.value = '';
  if (product) {
    tab.value = 'productos';
    group.value = '';
    showProduct(product);
  }
});
const sector = computed(() => sectorFor(design.value?.category ?? ''));
const region = computed(() => subregionFor(design.value?.municipality ?? ''));
const verified = computed(() => meta.value?.settings.verification === 'approved');
const favorite = computed(() => !!platform.data.value?.favorites.includes(id.value));
/** Las reservas muestran el horario por días; los demás, el horario escrito. */
const hours = computed(() => {
  const week = meta.value?.settings.week;
  return design.value?.mode === 'booking' && week?.length
    ? weekSummary(week)
    : design.value?.hours || '';
});
const reviews = computed(() => meta.value?.reviews ?? []);
const withComment = computed(() => reviews.value.filter((r) => r.comment.trim()));
const quotes = useCarousel(
  computed(() => withComment.value.length),
  6000,
);
const quoteIndex = quotes.index;
const featured = computed(() =>
  rankByRating(design.value?.products ?? [], meta.value?.productRatings).slice(0, 4),
);
const productRating = (productId: string) => meta.value?.productRatings?.[productId];
async function reloadMeta() {
  try {
    meta.value = await api<CommerceStore>(
      'GET',
      `/plataforma/negocios/${encodeURIComponent(id.value)}`,
    );
  } catch {
    // Se conserva lo que ya se mostraba.
  }
}
// --- Reseñas ----------------------------------------------------------------------------------
const writing = ref(false);
const stars = ref(0);
const hoverStars = ref(0);
const comment = ref('');
const sendingReview = ref(false);
const reviewNotice = ref('');
const isClient = computed(() => session.user?.role === 'cliente');
const starNames = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
async function sendReview() {
  if (!stars.value) {
    reviewNotice.value = 'Elige de 1 a 5 estrellas.';
    return;
  }
  sendingReview.value = true;
  reviewNotice.value = '';
  try {
    const result = await api<{ updated?: boolean }>(
      'POST',
      `/plataforma/negocios/${encodeURIComponent(id.value)}/resenas`,
      { rating: stars.value, comment: comment.value },
    );
    reviewNotice.value = result.updated
      ? 'Actualizamos tu reseña. ¡Gracias!'
      : '¡Gracias! Tu reseña quedó publicada.';
    writing.value = false;
    stars.value = 0;
    comment.value = '';
    await reloadMeta();
  } catch (e) {
    reviewNotice.value = (e as Error).message;
  } finally {
    sendingReview.value = false;
  }
}
const distribution = computed(() =>
  [5, 4, 3, 2, 1].map((n) => {
    const count = reviews.value.filter((r) => Math.round(r.rating) === n).length;
    return { n, pct: reviews.value.length ? Math.round((count / reviews.value.length) * 100) : 0 };
  }),
);
// --- Catálogo ---------------------------------------------------------------------------------
const groups = computed(() => [
  ...new Set((design.value?.products ?? []).map((p) => p.category?.trim()).filter(Boolean)),
]);
const products = computed(() =>
  (design.value?.products ?? []).filter((p) => !group.value || p.category === group.value),
);
const art = (src?: string) => !src || src.startsWith('/art/');
/** Fotos del carrusel de «Sobre este emprendimiento» (sin ilustraciones genéricas). */
const photos = computed(() => {
  const d = design.value;
  if (!d) return [];
  const all = [d.content.storyImage, d.content.heroImage, ...d.products.map((p) => p.image)];
  const real = [...new Set(all.filter((src) => src && !art(src)))];
  return real.length ? real.slice(0, 5) : [d.content.heroImage || '/art/food.svg'];
});
const gallery = useCarousel(
  computed(() => photos.value.length),
  4500,
);
const photoIndex = gallery.index;
const highlightIcons = [CalendarDays, Users, Leaf, Truck, ShieldCheck, Zap];
const actionLabel = computed(() =>
  design.value?.mode === 'booking'
    ? 'Reservar'
    : design.value?.mode === 'quote'
      ? 'Cotizar'
      : 'Agregar',
);
const stockOf = (p: StoreProduct) => meta.value?.stock[p.id];
const otherCart = computed(() => platform.cart.value.some((l) => l.businessId !== id.value));
const login = computed(() => `/ingresar?volver=${encodeURIComponent(route.fullPath)}`);
// --- Quién puede comprar --------------------------------------------------------------------
const studio = useStudio();
const ownStore = computed(() => studio.projects.some((p) => p.id === id.value));
const blockedMessage = computed(() =>
  ownStore.value
    ? 'Este es tu negocio: no puedes comprar ni reservar en él.'
    : 'La cuenta de administración no hace compras, reservas ni guarda favoritos.',
);
const canBuy = computed(() => !session.user || (canBuyRole(session.user.role) && !ownStore.value));
/** true = no puede comprar (se avisa por qué). */
function blocked() {
  if (canBuy.value) return false;
  notice.value = blockedMessage.value;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return true;
}
function act(p: StoreProduct, quantity?: number) {
  api('POST', `/plataforma/negocios/${id.value}/visita`, { productId: p.id }).catch(() => {});
  if (blocked()) return;
  if (!session.user) {
    void router.push(login.value);
    return;
  }
  if (design.value?.mode !== 'products') {
    sheet.value = null;
    startRequest(p);
    return;
  }
  try {
    if (stockOf(p) === 0) throw new Error('Este producto está agotado.');
    if (otherCart.value) {
      if (
        !window.confirm(
          'Tu carrito tiene productos de otro negocio. ¿Lo vaciamos para empezar con este?',
        )
      )
        return;
      platform.clear();
    }
    const n = Math.max(1, quantity ?? quantities.value[p.id] ?? 1);
    for (let i = 0; i < n; i++)
      platform.add({ businessId: id.value, productId: p.id, name: p.name, price: p.price });
    quantities.value[p.id] = 1;
    sheet.value = null;
    notice.value = `${p.name} se agregó al carrito.`;
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
const sheet = ref<StoreProduct | null>(null);
function showProduct(p: StoreProduct) {
  sheet.value = p;
  api('POST', `/plataforma/negocios/${id.value}/visita`, { productId: p.id }).catch(() => {});
}
function changeQuantity(productId: string, delta: number) {
  quantities.value[productId] = Math.max(
    1,
    Math.min(99, (quantities.value[productId] ?? 1) + delta),
  );
}
// --- Reservas y cotizaciones ----------------------------------------------------------------
const requestOpen = ref(false);
const service = ref('');
const detail = ref('');
const phone = ref('');
const date = ref('');
const slot = ref('');
const slots = ref<string[]>([]);
const payment = ref<'cash' | 'transfer'>('cash');
/** Clave de idempotencia: un reintento no crea dos solicitudes. */
const requestKey = ref('');
function startRequest(p?: StoreProduct) {
  if (blocked()) return;
  if (!session.user) {
    void router.push(login.value);
    return;
  }
  service.value = p?.id || design.value?.products[0]?.id || '';
  detail.value = p?.name || '';
  requestKey.value = crypto.randomUUID();
  notice.value = '';
  if (design.value?.mode === 'booking') bookingOpen.value = true;
  else requestOpen.value = true;
}
const bookingOpen = ref(false);
async function book(b: { productId: string; slot: string; phone: string; detail: string }) {
  notice.value = '';
  try {
    await platform.run('POST', '/operaciones', {
      storeId: id.value,
      key: requestKey.value,
      kind: 'booking',
      items: [{ productId: b.productId, quantity: 1 }],
      detail: b.detail,
      phone: b.phone,
      slot: b.slot,
      paymentMethod: 'cash',
    });
    bookingOpen.value = false;
    await router.push('/solicitudes');
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
watch([date, service], async ([day]) => {
  slot.value = '';
  if (!day) return;
  try {
    slots.value = (
      await api<{ slots: string[] }>(
        'GET',
        `/plataforma/negocios/${id.value}/horarios?fecha=${day}&servicio=${encodeURIComponent(service.value)}`,
      )
    ).slots;
  } catch (e) {
    notice.value = (e as Error).message;
  }
});
async function sendRequest() {
  try {
    await platform.run('POST', '/operaciones', {
      storeId: id.value,
      key: requestKey.value,
      kind: design.value?.mode,
      items: [{ productId: service.value, quantity: 1 }],
      detail: detail.value,
      phone: phone.value,
      slot: slot.value,
      paymentMethod: payment.value,
    });
    requestOpen.value = false;
    await router.push('/solicitudes');
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
async function toggleFavorite() {
  if (blocked()) return;
  if (!session.user) {
    await router.push(login.value);
    return;
  }
  try {
    await platform.run('POST', `/favoritos/${id.value}`);
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
// --- Compartir, asistente y ubicación ---------------------------------------------------------
const origin = ref('');
onMounted(() => (origin.value = window.location.origin));
const shareUrl = computed(() => {
  if (!origin.value) return '';
  const url = new URL('/tienda', origin.value);
  url.searchParams.set('id', id.value);
  return url.href;
});
let assistantContext: BrainContext = {};
async function ask(question: string): Promise<Reply> {
  const result = await api<{ reply: Reply; context: BrainContext }>('POST', '/asistente', {
    question,
    store: id.value,
    context: assistantContext,
  });
  assistantContext = result.context;
  return result.reply;
}
const ago = (iso: string) => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  return days < 7
    ? rtf.format(-days, 'day')
    : days < 60
      ? rtf.format(-Math.round(days / 7), 'week')
      : rtf.format(-Math.round(days / 30), 'month');
};
const mapUrl = computed(() => {
  const s = meta.value?.settings;
  if (s?.latitude != null && s?.longitude != null)
    return `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`;
  const d = design.value;
  return d
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.address} ${d.municipality} Sucre Colombia`)}`
    : '';
});
const socials = computed(() =>
  (
    [
      ['instagram', 'Instagram', '#e1306c'],
      ['facebook', 'Facebook', '#1877f2'],
      ['tiktok', 'TikTok', '#111111'],
    ] as const
  )
    .map(([network, label, color]) => ({
      id: network,
      label,
      color,
      href: socialUrl(network, design.value?.[network]),
    }))
    .filter((s) => s.href),
);
const tabs = computed(() => [
  { id: 'inicio' as const, label: 'Inicio', icon: House },
  {
    id: 'productos' as const,
    label: design.value?.mode === 'products' ? 'Productos y servicios' : 'Servicios',
    icon: ShoppingCart,
  },
  { id: 'resenas' as const, label: `Reseñas (${meta.value?.reviewCount ?? 0})`, icon: Star },
  { id: 'ubicacion' as const, label: 'Ubicación', icon: MapPin },
  { id: 'bot' as const, label: 'Bot del negocio', icon: Bot },
]);
const assistantBullets = computed(() => [
  'Catálogo y precios',
  design.value?.mode === 'products' ? 'Pedidos personalizados' : 'Reservas y cotizaciones',
  'Disponibilidad y tiempos de entrega',
]);
</script>

<template>
  <p v-if="loading" class="loader" role="status">Cargando emprendimiento…</p>
  <EmptyState
    v-else-if="!design"
    title="Este negocio no está disponible"
    href="/buscar"
    label="Buscar negocios"
  >
    {{ loadError || 'Puede que todavía no esté publicado o que su dueño lo haya retirado.' }}
  </EmptyState>
  <div v-else class="bp">
    <nav class="bp-crumbs" aria-label="Ruta">
      <NuxtLink to="/buscar" class="bp-back"><ArrowLeft :size="18" /> Volver a resultados</NuxtLink>
      <ol>
        <li><NuxtLink to="/buscar">Inicio</NuxtLink></li>
        <li>
          <NuxtLink :to="{ path: '/buscar', query: { sector: sector.id } }">{{
            sector.id
          }}</NuxtLink>
        </li>
        <li aria-current="page">{{ sentenceCase(design.name) }}</li>
      </ol>
    </nav>
    <header class="bp-hero">
      <img class="bp-hero-bg" :src="design.content.heroImage || '/art/food.svg'" alt="" />
      <span class="bp-hero-logo">
        <img v-if="design.logo" :src="thumbnail(design.logo)" :alt="`Logo de ${design.name}`" />
        <template v-else>{{ design.name.slice(0, 1) }}</template>
      </span>
      <div class="bp-hero-text">
        <h1>
          {{ sentenceCase(design.name) }}
          <VerifiedBadge v-if="verified" :size="28" light />
        </h1>
        <p>{{ design.description || design.content.heroText }}</p>
        <StarRating :rating="meta?.rating" :count="meta?.reviewCount ?? 0" label="valoraciones" />
      </div>
      <div class="bp-hero-actions">
        <button
          v-if="canBuy"
          type="button"
          :class="['bp-round', { on: favorite }]"
          :aria-pressed="favorite"
          :aria-label="favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
          @click="toggleFavorite"
        >
          <Heart :size="21" />
        </button>
        <ShareMenu
          v-if="shareUrl"
          :url="shareUrl"
          :title="design.name"
          variant="icon"
          button-class="bp-round"
        />
      </div>
    </header>
    <p v-if="notice" class="notice" role="status">
      {{ notice }}
      <NuxtLink v-if="notice.includes('carrito')" to="/carrito" class="sx-link"
        >Ver carrito</NuxtLink
      >
    </p>
    <div class="bp-grid">
      <div class="bp-main">
        <div class="sx-tabs bp-tabs" role="tablist" aria-label="Secciones del negocio">
          <button
            v-for="t in tabs"
            :key="t.id"
            type="button"
            role="tab"
            :aria-selected="tab === t.id"
            :class="{ on: tab === t.id }"
            @click="tab = t.id"
          >
            <component :is="t.icon" :size="18" /> {{ t.label }}
          </button>
        </div>

        <template v-if="tab === 'inicio'">
          <section class="sx-card bp-quick" aria-label="Horario y contacto">
            <p v-if="hours">
              <strong>Horario de atención</strong><span>{{ hours }}</span>
            </p>
            <p v-if="design.subcategory">
              <strong>Especialidad</strong><span>{{ design.subcategory }}</span>
            </p>
            <div class="bp-quick-actions">
              <a
                v-if="whatsappUrl(design.whatsapp, design.name)"
                class="sx-btn sx-btn--sm"
                :href="whatsappUrl(design.whatsapp, design.name) || undefined"
                target="_blank"
                rel="noopener"
                >Escribir por WhatsApp</a
              >
            </div>
          </section>
          <section class="sx-card bp-about">
            <div>
              <h2>Sobre este emprendimiento</h2>
              <p class="flow-pre">{{ design.content.storyText || design.description }}</p>
              <ul v-if="design.content.promises.length" class="bp-highlights">
                <li v-for="(h, i) in design.content.promises.slice(0, 4)" :key="h">
                  <component :is="highlightIcons[i]" :size="24" />
                  <span>{{ h }}</span>
                </li>
              </ul>
            </div>
            <div
              class="bp-gallery"
              @mouseenter="gallery.pause"
              @mouseleave="gallery.resume"
              @focusin="gallery.pause"
              @focusout="gallery.resume"
            >
              <div class="bp-frame">
                <div class="bp-slides" :style="{ transform: `translateX(-${photoIndex * 100}%)` }">
                  <img
                    v-for="(src, i) in photos"
                    :key="src"
                    :src="src"
                    :alt="`Fotografía ${i + 1} de ${design.name}`"
                    :aria-hidden="i !== photoIndex"
                    :class="{ art: art(src) }"
                  />
                </div>
              </div>
              <div v-if="photos.length > 1" class="bp-dots" role="group" aria-label="Fotografías">
                <button
                  v-for="(src, i) in photos"
                  :key="src"
                  type="button"
                  :class="{ on: i === photoIndex }"
                  :aria-label="`Foto ${i + 1}`"
                  :aria-pressed="i === photoIndex"
                  @click="gallery.go(i)"
                />
              </div>
            </div>
          </section>
          <section class="sx-card">
            <div class="sx-head">
              <h2>
                {{ design.mode === 'products' ? 'Productos destacados' : 'Servicios destacados' }}
              </h2>
              <button type="button" class="sx-link" @click="tab = 'productos'">
                Ver todo <ChevronRight :size="16" />
              </button>
            </div>
            <div class="bp-featured">
              <article v-for="p in featured" :key="p.id" class="bp-mini">
                <button
                  type="button"
                  class="bp-open"
                  :aria-label="`Ver detalles de ${p.name}`"
                  @click="showProduct(p)"
                >
                  <img
                    :src="thumbnail(p.image || design.content.heroImage)"
                    alt=""
                    :class="{ art: art(p.image) }"
                    loading="lazy"
                  />
                  <span v-if="p.gallery?.length" class="bp-photos"
                    >{{ 1 + p.gallery.length }} fotos</span
                  >
                </button>
                <h3>
                  <button type="button" class="bp-open-name" @click="showProduct(p)">
                    {{ sentenceCase(p.name) }}
                  </button>
                </h3>
                <p v-if="productRating(p.id)" class="bp-prating">
                  <Star :size="13" fill="currentColor" />
                  {{ productRating(p.id)!.rating.toFixed(1) }}
                  <span class="muted">({{ productRating(p.id)!.count }})</span>
                </p>
                <p v-if="p.description">{{ p.description }}</p>
                <div class="bp-mini-foot">
                  <strong>{{ p.price ? currency(p.price) : 'A cotizar' }}</strong>
                  <button
                    type="button"
                    class="bp-cart"
                    :aria-label="`${actionLabel} ${p.name}`"
                    @click="act(p)"
                  >
                    <ShoppingCart v-if="design.mode === 'products'" :size="18" />
                    <CalendarDays v-else :size="18" />
                  </button>
                </div>
              </article>
            </div>
          </section>
          <div class="bp-two">
            <section class="sx-card">
              <h2 style="margin-bottom: 12px">Valoración del emprendimiento</h2>
              <div class="bp-score">
                <div>
                  <strong>{{ meta?.rating ? meta.rating.toFixed(1) : '—' }}</strong>
                  <span class="bp-stars" aria-hidden="true">
                    <Star
                      v-for="i in 5"
                      :key="i"
                      :size="20"
                      :fill="meta?.rating && i <= Math.round(meta.rating) ? 'currentColor' : 'none'"
                    />
                  </span>
                  <span class="muted small">({{ meta?.reviewCount ?? 0 }} valoraciones)</span>
                </div>
                <ul aria-label="Distribución de valoraciones">
                  <li v-for="d in distribution" :key="d.n">
                    <span>{{ d.n }} <Star :size="12" fill="currentColor" /></span>
                    <span class="sx-bar"><i :style="{ width: `${d.pct}%` }" /></span>
                    <span>{{ d.pct }}%</span>
                  </li>
                </ul>
              </div>
            </section>
            <section class="sx-card">
              <div class="sx-head">
                <h2>Lo que dicen los clientes</h2>
                <button
                  v-if="reviews.length"
                  type="button"
                  class="sx-link"
                  @click="tab = 'resenas'"
                >
                  Ver reseñas ({{ reviews.length }}) <ChevronRight :size="16" />
                </button>
              </div>
              <div
                v-if="withComment.length"
                class="bp-quote"
                @mouseenter="quotes.pause"
                @mouseleave="quotes.resume"
                @focusin="quotes.pause"
                @focusout="quotes.resume"
              >
                <button
                  type="button"
                  class="bp-arrow"
                  aria-label="Reseña anterior"
                  @click="quotes.prev"
                >
                  <ChevronLeft :size="18" />
                </button>
                <Transition name="bp-fade" mode="out-in">
                  <figure :key="withComment[quoteIndex].id" aria-live="polite">
                    <span class="sx-avatar">{{ withComment[quoteIndex].name.slice(0, 1) }}</span>
                    <div>
                      <strong>{{ withComment[quoteIndex].name }}</strong>
                      <span
                        class="bp-stars small"
                        :aria-label="`${withComment[quoteIndex].rating} de 5`"
                      >
                        <Star
                          v-for="i in 5"
                          :key="i"
                          :size="13"
                          :fill="i <= withComment[quoteIndex].rating ? 'currentColor' : 'none'"
                        />
                      </span>
                      <span class="muted small">{{ ago(withComment[quoteIndex].createdAt) }}</span>
                      <blockquote>“{{ withComment[quoteIndex].comment }}”</blockquote>
                    </div>
                  </figure>
                </Transition>
                <button
                  type="button"
                  class="bp-arrow"
                  aria-label="Reseña siguiente"
                  @click="quotes.next"
                >
                  <ChevronRight :size="18" />
                </button>
              </div>
              <p v-else class="muted">
                Todavía no hay reseñas con comentarios. Aparecen cuando los clientes completan una
                compra y dejan su opinión.
              </p>
            </section>
          </div>
        </template>

        <section v-else-if="tab === 'productos'" class="sx-card">
          <h2 style="margin-bottom: 12px">
            {{
              design.mode === 'products'
                ? 'Productos del emprendimiento'
                : 'Servicios del emprendimiento'
            }}
          </h2>
          <div
            v-if="groups.length"
            class="bp-chips"
            role="group"
            aria-label="Categorías del catálogo"
          >
            <button
              type="button"
              :class="{ on: !group }"
              :aria-pressed="!group"
              @click="group = ''"
            >
              Todos
            </button>
            <button
              v-for="g in groups"
              :key="g"
              type="button"
              :class="{ on: group === g }"
              :aria-pressed="group === g"
              @click="group = g!"
            >
              {{ g }}
            </button>
          </div>
          <div class="bp-products">
            <article v-for="p in products" :key="p.id" class="bp-product">
              <button
                type="button"
                class="bp-open"
                :aria-label="`Ver detalles de ${p.name}`"
                @click="showProduct(p)"
              >
                <img
                  :src="thumbnail(p.image || design.content.heroImage)"
                  alt=""
                  :class="{ art: art(p.image) }"
                  loading="lazy"
                />
                <span v-if="p.gallery?.length" class="bp-photos"
                  >{{ 1 + p.gallery.length }} fotos</span
                >
              </button>
              <div class="bp-product-body">
                <h3>
                  <button type="button" class="bp-open-name" @click="showProduct(p)">
                    {{ sentenceCase(p.name) }}
                  </button>
                </h3>
                <p v-if="productRating(p.id)" class="bp-prating">
                  <Star :size="13" fill="currentColor" />
                  {{ productRating(p.id)!.rating.toFixed(1) }}
                  <span class="muted">({{ productRating(p.id)!.count }})</span>
                </p>
                <p v-if="p.description" class="small muted">{{ p.description }}</p>
                <strong class="bp-price">{{ p.price ? currency(p.price) : 'A cotizar' }}</strong>
                <p v-if="stockOf(p) === 0" class="small danger" style="margin: 0">Agotado</p>
                <div class="bp-buy">
                  <div
                    v-if="design.mode === 'products'"
                    class="bp-qty"
                    role="group"
                    :aria-label="`Cantidad de ${p.name}`"
                  >
                    <button type="button" aria-label="Menos" @click="changeQuantity(p.id, -1)">
                      <Minus :size="14" />
                    </button>
                    <span>{{ quantities[p.id] ?? 1 }}</span>
                    <button type="button" aria-label="Más" @click="changeQuantity(p.id, 1)">
                      <Plus :size="14" />
                    </button>
                  </div>
                  <button
                    type="button"
                    class="sx-btn sx-btn--sm"
                    :disabled="stockOf(p) === 0"
                    :aria-label="`${actionLabel} ${p.name}`"
                    @click="act(p)"
                  >
                    <ShoppingCart v-if="design.mode === 'products'" :size="15" />
                    <CalendarDays v-else :size="15" />
                    {{ actionLabel }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="tab === 'resenas'" class="sx-card bp-reviews">
          <div class="bp-reviews-head">
            <h2>Reseñas de clientes</h2>
            <button
              v-if="isClient && !writing"
              type="button"
              class="sx-btn sx-btn--sm"
              @click="
                writing = true;
                reviewNotice = '';
              "
            >
              <Star :size="15" /> Añadir reseña
            </button>
            <NuxtLink v-else-if="!session.user" class="sx-btn sx-btn--ghost sx-btn--sm" :to="login"
              >Ingresa para añadir una reseña</NuxtLink
            >
          </div>
          <p v-if="reviewNotice && !writing" class="notice" role="status">{{ reviewNotice }}</p>
          <form
            v-if="isClient && writing"
            class="form-stack bp-review-form"
            aria-label="Añadir reseña"
            @submit.prevent="sendReview"
          >
            <fieldset class="bp-stars-pick">
              <legend>¿Cómo calificas a {{ design.name }}?</legend>
              <div class="bp-stars-row" @mouseleave="hoverStars = 0">
                <button
                  v-for="i in 5"
                  :key="i"
                  type="button"
                  :class="{ on: i <= (hoverStars || stars) }"
                  :aria-label="`${i} ${i === 1 ? 'estrella' : 'estrellas'}: ${starNames[i - 1]}`"
                  :aria-pressed="stars === i"
                  @mouseenter="hoverStars = i"
                  @click="stars = i"
                >
                  <Star :size="30" />
                </button>
                <span class="bp-stars-label">{{
                  starNames[(hoverStars || stars) - 1] ?? 'Toca una estrella'
                }}</span>
              </div>
            </fieldset>
            <label
              >Tu experiencia<textarea
                v-model="comment"
                required
                maxlength="500"
                placeholder="Cuéntales a otros clientes cómo te fue: atención, calidad, tiempos…"
              />
            </label>
            <p v-if="reviewNotice" class="field-error" role="alert">{{ reviewNotice }}</p>
            <div class="bp-review-actions">
              <button type="button" class="sx-btn sx-btn--ghost" @click="writing = false">
                Cancelar
              </button>
              <button class="sx-btn" :disabled="sendingReview">
                {{ sendingReview ? 'Publicando…' : 'Publicar reseña' }}
              </button>
            </div>
          </form>
          <ReviewList :reviews="reviews">
            <template #empty>
              <p class="muted">Todavía no hay reseñas. ¡Sé el primero en contar cómo te fue!</p>
            </template>
          </ReviewList>
        </section>

        <section v-else-if="tab === 'ubicacion'" class="sx-card bp-location">
          <h2>Ubicación</h2>
          <p>
            <MapPin :size="18" />
            {{ design.address || 'Dirección no publicada' }} · {{ design.municipality }}, Sucre
          </p>
          <p v-if="region"><MapPinned :size="18" /> Subregión {{ region.id }}</p>
          <p v-if="hours"><Info :size="18" /> {{ hours }}</p>
          <a
            v-if="mapUrl"
            class="sx-btn sx-btn--outline sx-btn--pill"
            :href="mapUrl"
            target="_blank"
            rel="noopener"
            >Ver en mapa</a
          >
        </section>

        <ChatCard
          v-else
          :title="`Asistente de ${design.name}`"
          :greeting="`¡Hola! 👋 Soy el asistente virtual de ${design.name}. ¿En qué puedo ayudarte?`"
          intro="Puedo ayudarte con:"
          :bullets="assistantBullets"
          :ask="ask"
          note="Responde con la información publicada por el negocio; confirma los detalles directamente con él."
        />
      </div>

      <aside class="bp-side">
        <p v-if="otherCart" class="notice">
          Tienes productos de otro negocio en el carrito.
          <NuxtLink to="/carrito" class="sx-link">Ver carrito</NuxtLink>
        </p>
        <section class="sx-card bp-contact">
          <h2>Contacto y atención</h2>
          <div v-if="design.whatsapp" class="bp-contact-row">
            <MessageCircle :size="22" class="bp-wa" />
            <span><strong>WhatsApp</strong>{{ design.whatsapp }}</span>
            <a
              class="sx-btn sx-btn--pill sx-btn--sm"
              :href="whatsappUrl(design.whatsapp, design.name) || undefined"
              target="_blank"
              rel="noopener"
              >Contactar</a
            >
          </div>
          <div v-if="design.phone" class="bp-contact-row">
            <Phone :size="20" />
            <span
              ><strong>Llamar</strong
              ><a :href="`tel:${design.phone.replace(/[^\d+]/g, '')}`">{{ design.phone }}</a></span
            >
          </div>
          <div v-if="design.email" class="bp-contact-row">
            <Mail :size="20" />
            <span
              ><strong>Correo</strong
              ><a :href="`mailto:${design.email}`">{{ design.email }}</a></span
            >
          </div>
          <div class="bp-contact-row">
            <MapPin :size="20" />
            <span
              ><strong>Dirección</strong>{{ design.address || design.municipality
              }}{{ design.address ? `, ${design.municipality}` : '' }}, Sucre</span
            >
            <a v-if="mapUrl" class="bp-map" :href="mapUrl" target="_blank" rel="noopener"
              ><MapPin :size="14" /> Ver en mapa</a
            >
          </div>
          <div v-if="socials.length" class="bp-social" aria-label="Redes sociales del negocio">
            <a
              v-for="s in socials"
              :key="s.id"
              :href="s.href"
              target="_blank"
              rel="noopener"
              :style="{ '--c': s.color }"
              >{{ s.label }}</a
            >
          </div>
          <button
            v-if="design.mode !== 'products'"
            type="button"
            class="sx-btn sx-btn--block"
            @click="startRequest()"
          >
            <CalendarDays :size="18" />
            {{ design.mode === 'booking' ? 'Reservar ahora' : 'Solicitar cotización' }}
          </button>
        </section>
        <ChatCard
          v-if="tab !== 'bot'"
          :title="`Asistente de ${design.name}`"
          :greeting="`¡Hola! 👋 Soy el asistente virtual de ${design.name}. ¿En qué puedo ayudarte?`"
          intro="Puedo ayudarte con:"
          :bullets="assistantBullets"
          :ask="ask"
        />
      </aside>
    </div>

    <ProductSheet
      v-if="sheet"
      :product="sheet"
      :mode="design.mode"
      :fallback="design.content.heroImage || '/art/food.svg'"
      :sold-out="stockOf(sheet) === 0"
      :store-id="id"
      :rating="productRating(sheet.id)"
      @rated="reloadMeta"
      @close="sheet = null"
      @add="(n: number) => act(sheet!, n)"
      @book="startRequest(sheet!)"
    />
    <BookingPicker
      v-if="bookingOpen"
      :store-id="id"
      :store-name="design.name"
      :services="design.products"
      :initial="service"
      :settings="meta?.settings ?? null"
      :busy="platform.busy.value"
      :error="notice"
      @close="bookingOpen = false"
      @confirm="book"
    />
    <SxModal
      v-if="requestOpen"
      :title="design.mode === 'booking' ? 'Reservar' : 'Solicitar cotización'"
      @close="requestOpen = false"
    >
      <form class="form-stack" @submit.prevent="sendRequest">
        <label
          >Servicio
          <select v-model="service" required>
            <option v-for="p in design.products" :key="p.id" :value="p.id">
              {{ p.name }} · {{ design.mode === 'quote' ? 'A cotizar' : currency(p.price)
              }}{{ design.mode === 'booking' && p.duration ? ` · ${p.duration} min` : '' }}
            </option>
          </select></label
        >
        <label
          >Detalle de tu solicitud<textarea v-model="detail" required maxlength="1500" />
        </label>
        <PhoneField v-model="phone" label="Tu WhatsApp" required />
        <template v-if="design.mode === 'booking'">
          <label>Fecha preferida<input v-model="date" type="date" required /></label>
          <label
            >Horario disponible (Colombia)
            <select v-model="slot" required>
              <option value="">Selecciona una hora</option>
              <option v-for="s in slots" :key="s" :value="s">{{ s.slice(11, 16) }}</option>
            </select></label
          >
          <p v-if="date && !slots.length" class="muted">No hay horas disponibles para esa fecha.</p>
        </template>
        <label
          >Medio de pago
          <select v-model="payment">
            <option value="cash">Efectivo al negocio</option>
            <option v-if="meta?.settings.paymentInstructions" value="transfer">
              Transferencia al negocio
            </option>
          </select></label
        >
        <p v-if="notice" role="alert" class="field-error">{{ notice }}</p>
        <button class="sx-btn" :disabled="platform.busy.value">
          {{ design.mode === 'booking' ? 'Solicitar reserva' : 'Enviar solicitud de cotización' }}
        </button>
        <small class="muted"
          >El negocio confirmará tu solicitud. Las cotizaciones requieren tu aceptación
          posterior.</small
        >
      </form>
    </SxModal>
  </div>
</template>

<style scoped>
.bp {
  gap: 16px;
  display: grid;
}
.bp-crumbs {
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  font-size: 13.5px;
  display: flex;
}
.bp-back {
  color: var(--ink);
  align-items: center;
  gap: 8px;
  font-weight: 600;
  display: inline-flex;
}
.bp-crumbs ol {
  color: var(--muted);
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
}
.bp-crumbs li + li:before {
  content: '›';
  margin-right: 8px;
}
.bp-crumbs [aria-current] {
  color: var(--ink);
  font-weight: 600;
}
.bp-hero {
  color: #fff;
  isolation: isolate;
  background: #2b1a12;
  border-radius: 18px;
  align-items: center;
  gap: 22px;
  min-height: 190px;
  padding: 22px 24px;
  display: flex;
  position: relative;
  overflow: hidden;
}
.bp-hero-bg {
  z-index: -2;
  object-fit: cover;
  object-position: right center;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
.bp-hero:before {
  content: '';
  z-index: -1;
  background: linear-gradient(90deg, #140c06eb, #140c06b8 45%, #140c060d 85%);
  position: absolute;
  inset: 0;
}
.bp-hero-logo {
  color: #7c2d12;
  background: #fff4e6;
  border: 4px solid #fff;
  border-radius: 50%;
  flex-shrink: 0;
  place-items: center;
  width: 128px;
  height: 128px;
  font-size: 48px;
  font-weight: 800;
  display: grid;
  overflow: hidden;
}
.bp-hero-logo img {
  object-fit: cover;
  width: 100%;
  height: 100%;
}
.bp-hero h1 {
  color: #fff;
  align-items: center;
  gap: 10px;
  font-size: clamp(24px, 2.6vw, 34px);
  display: flex;
}
.bp-verified {
  color: #fff;
  fill: #1d70e0;
}
.bp-hero-text p {
  color: #f5ede6;
  max-width: 460px;
  margin: 8px 0;
  font-size: 15px;
}
.bp-hero-text :deep(.sx-stars) {
  color: #fff;
  font-size: 15px;
}
.bp-hero-text :deep(.sx-stars .muted) {
  color: #e6dcd3;
}
.bp-hero-actions {
  align-self: start;
  gap: 10px;
  margin-left: auto;
  display: flex;
}
.bp-hero-actions :deep(.bp-round),
.bp-round {
  width: 46px;
  height: 46px;
  color: var(--ink);
  background: #fff;
  border-radius: 50%;
  place-items: center;
  display: grid;
}
.bp-round.on {
  color: #e11d48;
}
.bp-round.on svg {
  fill: currentColor;
}
.bp-tabs button {
  padding: 0 12px;
  font-size: 13.5px;
}
.bp-grid {
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
  gap: 18px;
  display: grid;
}
.bp-main,
.bp-side {
  gap: 16px;
  min-width: 0;
  display: grid;
}
.bp-about {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  display: grid;
}
.bp-about p {
  font-size: 14px;
}
.bp-highlights {
  grid-template-columns: repeat(4, 1fr);
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.bp-highlights li {
  text-align: center;
  color: var(--ink);
  justify-items: center;
  gap: 6px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  display: grid;
}
.bp-highlights li + li {
  border-left: 1px solid var(--line);
}
.bp-highlights svg {
  color: var(--green);
}
.bp-gallery {
  gap: 8px;
  display: grid;
}
.bp-frame {
  aspect-ratio: 16/9;
  background: var(--bg);
  border-radius: 14px;
  overflow: hidden;
}
.bp-slides {
  height: 100%;
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
}
.bp-gallery img {
  object-fit: cover;
  flex: 0 0 100%;
  min-width: 100%;
  height: 100%;
}
.bp-fade-enter-active,
.bp-fade-leave-active {
  transition:
    opacity 0.35s,
    transform 0.35s;
}
.bp-fade-enter-from {
  opacity: 0;
  transform: translate(14px);
}
.bp-fade-leave-to {
  opacity: 0;
  transform: translate(-14px);
}
@media (prefers-reduced-motion: reduce) {
  .bp-fade-enter-active,
  .bp-fade-leave-active,
  .bp-slides {
    transition: none;
  }
}
.bp-social {
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 6px;
  display: flex;
}
.bp-social a {
  background: var(--c);
  color: #fff;
  border-radius: 999px;
  padding: 5px 12px;
  text-decoration: none;
}
.bp-prating,
.bp-social a {
  font-size: 13px;
  font-weight: 700;
}
.bp-prating {
  align-items: center;
  gap: 4px;
  margin: 2px 0;
  display: flex;
}
.bp-prating svg {
  color: #f5b301;
}
.bp-reviews {
  gap: 10px;
  display: grid;
}
.bp-reviews-head {
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  display: flex;
}
.bp-reviews-head h2 {
  margin: 0;
}
.bp-review-form {
  border: 1px solid var(--line);
  background: #f8fbff;
  border-radius: 16px;
  padding: 18px;
}
.bp-stars-pick {
  border: 0 !important;
  padding: 0 !important;
}
.bp-stars-row {
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  display: flex;
}
.bp-stars-row button {
  color: #cbd5e1;
  border-radius: 10px;
  place-items: center;
  width: 44px;
  height: 44px;
  transition:
    color 0.12s,
    transform 0.12s;
  display: grid;
}
.bp-stars-row button:hover {
  transform: scale(1.08);
}
.bp-stars-row button.on {
  color: #f5b301;
}
.bp-stars-row button.on :deep(svg) {
  fill: currentColor;
}
.bp-stars-label {
  color: var(--ink);
  margin-left: 8px;
  font-size: 14px;
  font-weight: 600;
}
.bp-review-actions {
  justify-content: flex-end;
  gap: 10px;
  display: flex;
}
.bp-gallery img.art {
  object-fit: contain;
  padding: 16px;
}
.bp-dots {
  justify-content: center;
  gap: 6px;
  display: flex;
}
.bp-dots button {
  background: #cbd5e1;
  border-radius: 999px;
  width: 8px;
  height: 8px;
}
.bp-dots .on {
  background: var(--green);
  width: 18px;
}
.bp-featured {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  display: grid;
}
.bp-mini {
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: 14px;
  gap: 6px;
  padding-bottom: 10px;
  display: grid;
  overflow: hidden;
}
.bp-mini img {
  aspect-ratio: 16/9;
  object-fit: cover;
  background: var(--bg);
  width: 100%;
}
.bp-mini img.art,
.bp-product img.art {
  object-fit: contain;
  padding: 8px;
}
.bp-mini h3 {
  padding: 0 10px;
  font-size: 13.5px;
  font-weight: 600;
}
.bp-mini-foot {
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  display: flex;
}
.bp-mini-foot strong,
.bp-price {
  color: var(--ink);
  font-size: 15px;
}
.bp-cart {
  border: 1.5px solid var(--green);
  width: 38px;
  height: 38px;
  color: var(--green-dark);
  border-radius: 10px;
  place-items: center;
  display: grid;
}
.bp-two {
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 16px;
  display: grid;
}
.bp-score {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 18px;
  display: grid;
}
.bp-score > div {
  justify-items: center;
  display: grid;
}
.bp-score strong {
  color: var(--ink);
  font-size: 44px;
  line-height: 1;
}
.bp-stars {
  color: var(--star);
  gap: 2px;
  display: inline-flex;
}
.bp-score ul {
  gap: 4px;
  margin: 0;
  padding: 0;
  font-size: 12.5px;
  list-style: none;
  display: grid;
}
.bp-score li {
  grid-template-columns: 34px 1fr 38px;
  align-items: center;
  gap: 8px;
  display: grid;
}
.bp-score li svg {
  color: var(--star);
}
.bp-score .sx-bar {
  height: 7px;
}
.bp-quote {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  display: grid;
}
.bp-quote figure {
  gap: 12px;
  margin: 0;
  display: flex;
}
.bp-quote blockquote {
  color: var(--ink);
  margin: 6px 0 0;
  font-size: 14px;
}
.bp-quote strong,
.bp-review strong {
  color: var(--ink);
  display: block;
}
.bp-arrow {
  width: 34px;
  height: 34px;
  box-shadow: var(--shadow);
  background: #fff;
  border-radius: 50%;
  place-items: center;
  display: grid;
}
.bp-review {
  border-top: 1px solid var(--line);
  gap: 12px;
  padding: 14px 0;
  display: flex;
}
.bp-review p {
  margin: 6px 0 0;
}
.bp-chips {
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  display: flex;
}
.bp-chips button {
  border: 1.5px solid var(--field-border);
  background: #f7f9fc;
  border-radius: 999px;
  min-height: 36px;
  padding: 0 18px;
  font-weight: 500;
}
.bp-chips .on {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-dark);
}
.bp-products {
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  display: grid;
}
.bp-product {
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: 14px;
  grid-template-rows: auto 1fr;
  min-width: 0;
  display: grid;
  overflow: hidden;
}
.bp-product img {
  aspect-ratio: 1.8;
  object-fit: cover;
  background: var(--bg);
  width: 100%;
}
.bp-open {
  cursor: zoom-in;
  width: 100%;
  padding: 0;
  display: block;
  position: relative;
}
.bp-open img {
  transition: transform 0.25s ease-out;
}
.bp-open:hover img {
  transform: scale(1.03);
}
.bp-photos {
  color: #fff;
  background: #071a42b8;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 600;
  position: absolute;
  bottom: 8px;
  right: 8px;
}
.bp-open-name {
  font: inherit;
  text-align: left;
  color: inherit;
  padding: 0;
}
.bp-open-name:hover {
  color: var(--green-dark);
  text-decoration: underline;
}
.bp-logistics,
.bp-mini,
.bp-product {
  overflow: hidden;
}
.bp-product-body {
  gap: 6px;
  padding: 10px;
  display: grid;
}
.bp-product h3 {
  font-size: 14px;
  font-weight: 600;
}
.bp-product p {
  margin: 0;
}
.bp-buy {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  display: flex;
}
.bp-buy,
.bp-lines li,
.bp-location p,
.bp-logistics h2,
.bp-logistics li,
.bp-qty {
  align-items: center;
}
.bp-qty {
  gap: 8px;
  display: inline-flex;
}
.bp-qty button {
  width: 24px;
  height: 24px;
  color: var(--ink);
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  place-items: center;
  display: grid;
}
.bp-logistics {
  box-shadow: var(--shadow);
  background: linear-gradient(90deg, #e6f1ff, #f4f8ff);
  border-radius: 18px;
  grid-template-columns: 220px minmax(0, 1fr);
  display: grid;
}
.bp-logistics img {
  object-fit: cover;
  width: 100%;
  height: 100%;
}
.bp-logistics > div {
  padding: 18px 20px;
}
.bp-logistics h2 {
  gap: 10px;
  font-size: 22px;
  display: flex;
}
.bp-logistics h2 svg,
.bp-logistics li svg {
  color: var(--green);
}
.bp-logistics ul {
  background: #fff;
  border-radius: 14px;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 10px 0 0;
  padding: 12px;
  list-style: none;
  display: grid;
}
.bp-logistics li {
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
}
.bp-location p,
.bp-logistics li {
  gap: 8px;
  display: flex;
}
.bp-icon,
.bp-line-name {
  color: var(--ink);
}
.bp-lines {
  gap: 10px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  display: grid;
}
.bp-lines li {
  grid-template-columns: 54px minmax(0, 1fr) auto auto;
  gap: 8px;
  font-size: 13px;
  display: grid;
}
.bp-lines img {
  object-fit: cover;
  border-radius: 8px;
  width: 54px;
  height: 40px;
}
.bp-line-name {
  font-weight: 600;
}
.bp-lines strong {
  color: var(--green-dark);
}
.bp-sum {
  border-top: 1px solid var(--line);
  gap: 4px;
  margin: 0 0 12px;
  padding-top: 10px;
  display: grid;
}
.bp-sum div {
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  display: flex;
}
.bp-sum dd {
  margin: 0;
}
.bp-total {
  color: var(--ink);
  font-weight: 700;
  font-size: 17px !important;
}
.bp-opt b,
.bp-total dd {
  color: var(--green-dark);
}
.bp-opt {
  border: 1.5px solid var(--line);
  cursor: pointer;
  border-radius: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 10px 12px;
  display: grid;
}
.bp-opt.on {
  border-color: var(--green);
  background: var(--green-soft);
}
.bp-opt input {
  accent-color: var(--green);
}
.bp-opt small,
.bp-opt strong {
  display: block;
}
.bp-opt small,
.bp-track li {
  color: var(--muted);
}
.bp-state {
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  display: flex;
}
.bp-state span {
  background: var(--green);
  color: #fff;
  border-radius: 999px;
  padding: 4px 14px;
  font-weight: 600;
}
.bp-track {
  text-align: center;
  grid-template-columns: repeat(4, 1fr);
  margin: 12px 0;
  padding: 0;
  font-size: 11.5px;
  list-style: none;
  display: grid;
}
.bp-track li {
  justify-items: center;
  gap: 4px;
  display: grid;
  position: relative;
}
.bp-track li:before {
  content: '';
  z-index: 0;
  background: #dbe3ee;
  width: 100%;
  height: 3px;
  position: absolute;
  top: 17px;
  right: 50%;
}
.bp-track li:first-child:before {
  display: none;
}
.bp-track li.done:before {
  background: var(--green);
}
.bp-track-icon {
  z-index: 1;
  background: #fff;
  border: 2px solid #dbe3ee;
  border-radius: 50%;
  place-items: center;
  width: 36px;
  height: 36px;
  display: grid;
  position: relative;
}
.bp-track .done .bp-track-icon {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}
.bp-track strong {
  color: var(--ink);
  font-size: 11.5px;
}
.bp-contact {
  gap: 12px;
  display: grid;
}
.bp-contact-row {
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  display: grid;
}
.bp-contact-row strong {
  color: var(--ink);
  display: block;
}
.bp-contact-row a:not(.sx-btn):not(.bp-map) {
  color: var(--text);
}
.bp-wa {
  color: #22c55e;
}
.bp-map {
  background: var(--blue-soft);
  color: var(--blue);
  border-radius: 999px;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
}
@media (width<=1250px) {
  .bp-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .bp-featured {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (width<=760px) {
  .bp-hero {
    flex-direction: column;
    align-items: start;
  }
  .bp-hero-logo {
    width: 88px;
    height: 88px;
    font-size: 34px;
  }
  .bp-hero-actions {
    position: absolute;
    top: 16px;
    right: 16px;
  }
  .bp-about,
  .bp-logistics,
  .bp-two {
    grid-template-columns: minmax(0, 1fr);
  }
  .bp-highlights {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .bp-highlights li + li {
    border-left: 0;
  }
  .bp-logistics ul {
    grid-template-columns: 1fr;
  }
}
.bp-quick {
  gap: 10px;
  margin-bottom: 16px;
  display: grid;
}
.bp-quick p {
  gap: 2px;
  margin: 0;
  display: grid;
}
.bp-quick-actions {
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  display: flex;
}
</style>
