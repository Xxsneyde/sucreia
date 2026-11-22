<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Gift,
  Heart,
  House,
  Info,
  Leaf,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Minus,
  Package,
  PackageCheck,
  Phone,
  Plus,
  Quote,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  Users,
  Zap,
} from '@lucide/vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { usePlatform } from '@/lib/platform-store';
import type { StoreDesign, StoreProduct } from '@/domain/studio';
import type { CommerceStore, Operation } from '@/domain/platform';
import { currency, whatsappUrl } from '@/domain/rules';
import { sectorFor, subregionFor } from '@/domain/sectors';
import StarRating from '@/components/sucre/StarRating.vue';
import ChatCard from '@/components/sucre/ChatCard.vue';
import SxModal from '@/components/sucre/SxModal.vue';
import EmptyState from '@/components/EmptyState.vue';

// Página de un negocio (diapositivas 4 y 6): portada, pestañas, catálogo con carrito,
// reseñas reales, contacto, asistente y seguimiento de la entrega.
type Tab = 'inicio' | 'productos' | 'resenas' | 'testimonios' | 'ubicacion' | 'bot';
const route = useRoute();
const router = useRouter();
const session = useSession();
const p = usePlatform();
const id = ref('');
const design = ref<StoreDesign | null>(null);
const meta = ref<CommerceStore | null>(null);
const loading = ref(true);
const error = ref('');
const notice = ref('');
const tab = ref<Tab>('inicio');
const group = ref('');
const qty = ref<Record<string, number>>({});
const slide = ref(0);
const quote = ref(0);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    design.value = (
      await api<{ design: StoreDesign }>('GET', `/tiendas/${encodeURIComponent(id.value)}`)
    ).design;
    meta.value = await api<CommerceStore>(
      'GET',
      `/plataforma/negocios/${encodeURIComponent(id.value)}`,
    );
    void api('POST', `/plataforma/negocios/${id.value}/visita`).catch(() => {});
  } catch (e) {
    error.value = (e as Error).message;
    design.value = null;
  } finally {
    loading.value = false;
  }
}
// La página se genera sin «?…» y, al arrancar, la dirección puede no tenerla todavía:
// se lee primero de la ruta de Nuxt y, si falta, de la dirección del navegador.
const param = (name: string) => {
  const q = route.query[name];
  return (
    (typeof q === 'string' && q) || new URLSearchParams(window.location.search).get(name) || ''
  );
};
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
  id.value = param('id');
  const ver = param('ver');
  if (ver === 'bot' || ver === 'productos' || ver === 'resenas') tab.value = ver;
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

const sector = computed(() => sectorFor(design.value?.category ?? ''));
const region = computed(() => subregionFor(design.value?.municipality ?? ''));
const verified = computed(() => meta.value?.settings.verification === 'approved');
const favorite = computed(() => !!p.data.value?.favorites.includes(id.value));
const reviews = computed(() => meta.value?.reviews ?? []);
const testimonials = computed(() => reviews.value.filter((r) => r.comment.trim()));
const breakdown = computed(() =>
  [5, 4, 3, 2, 1].map((n) => {
    const c = reviews.value.filter((r) => Math.round(r.rating) === n).length;
    return { n, pct: reviews.value.length ? Math.round((c / reviews.value.length) * 100) : 0 };
  }),
);
const groups = computed(
  () =>
    [
      ...new Set((design.value?.products ?? []).map((x) => x.category?.trim()).filter(Boolean)),
    ] as string[],
);
const products = computed(() =>
  (design.value?.products ?? []).filter((x) => !group.value || x.category === group.value),
);
const isArt = (src: string) => !src || src.startsWith('/art/');
const gallery = computed(() => {
  const d = design.value;
  if (!d) return [];
  const all = [d.content.storyImage, d.content.heroImage, ...d.products.map((x) => x.image)];
  const real = [...new Set(all.filter((x) => x && !isArt(x)))];
  return real.length ? real.slice(0, 5) : [d.content.heroImage || `/art/${'food'}.svg`];
});
const highlightIcons = [CalendarDays, Users, Leaf, Truck, ShieldCheck, Zap];
const offerLabel = computed(() =>
  design.value?.mode === 'booking'
    ? 'Reservar'
    : design.value?.mode === 'quote'
      ? 'Cotizar'
      : 'Agregar',
);
const stockOf = (product: StoreProduct) => meta.value?.stock[product.id];

// --- Carrito (solo negocios de productos) ------------------------------------------------
const lines = computed(() => p.cart.value.filter((l) => l.businessId === id.value));
const otherCart = computed(() => p.cart.value.some((l) => l.businessId !== id.value));
const subtotal = computed(() => lines.value.reduce((n, l) => n + l.price * l.quantity, 0));
const delivery = ref<'delivery' | 'pickup'>('pickup');
watch(meta, (m) => {
  if (m?.settings.delivery) delivery.value = 'delivery';
});
const fee = computed(() =>
  delivery.value === 'delivery' && meta.value?.settings.delivery
    ? meta.value.settings.deliveryFee
    : 0,
);
const imageOf = (productId: string) =>
  design.value?.products.find((x) => x.id === productId)?.image ?? '';
const login = computed(() => `/ingresar?volver=${encodeURIComponent(route.fullPath)}`);

function add(product: StoreProduct) {
  void api('POST', `/plataforma/negocios/${id.value}/visita`, { productId: product.id }).catch(
    () => {},
  );
  if (!session.user) {
    void router.push(login.value);
    return;
  }
  if (design.value?.mode !== 'products') {
    openRequest(product);
    return;
  }
  try {
    if (stockOf(product) === 0) throw new Error('Este producto está agotado.');
    const n = Math.max(1, qty.value[product.id] ?? 1);
    for (let i = 0; i < n; i++)
      p.add({
        businessId: id.value,
        productId: product.id,
        name: product.name,
        price: product.price,
      });
    qty.value[product.id] = 1;
    notice.value = `${product.name} se agregó al carrito.`;
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
function step(productId: string, d: number) {
  qty.value[productId] = Math.max(1, Math.min(99, (qty.value[productId] ?? 1) + d));
}
function checkout() {
  void router.push({
    path: '/carrito',
    query: { entrega: delivery.value === 'delivery' ? 'domicilio' : 'recoger' },
  });
}

// --- Seguimiento de la entrega más reciente en este negocio --------------------------------
const active = computed<Operation | undefined>(() =>
  (p.data.value?.operations ?? []).find(
    (o) =>
      o.storeId === id.value &&
      o.kind === 'products' &&
      !['cancelled', 'refunded'].includes(o.status),
  ),
);
const trackSteps = computed(() => {
  const o = active.value;
  if (!o) return [];
  const at = (s: string[]) => o.events.find((e) => s.includes(e.status))?.at;
  const time = (v?: string) =>
    v
      ? new Intl.DateTimeFormat('es-CO', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Bogota',
        }).format(new Date(v))
      : '';
  const order = ['pending', 'preparing', 'ready', 'dispatched', 'completed'];
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
      icon: Truck,
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
});

// --- Reservas y cotizaciones (mismo flujo que antes) ---------------------------------------
const showRequest = ref(false);
const selected = ref('');
const detail = ref('');
const phone = ref('');
const date = ref('');
const slot = ref('');
const times = ref<string[]>([]);
const paymentMethod = ref('cash');
const requestKey = ref('');
function openRequest(product?: StoreProduct) {
  if (!session.user) {
    void router.push(login.value);
    return;
  }
  selected.value = product?.id || design.value?.products[0]?.id || '';
  detail.value = product?.name || '';
  requestKey.value = crypto.randomUUID();
  showRequest.value = true;
}
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
    await router.push('/solicitudes');
  } catch (e) {
    notice.value = (e as Error).message;
  }
}

async function toggleFavorite() {
  if (!session.user) {
    await router.push(login.value);
    return;
  }
  try {
    await p.run('POST', `/favoritos/${id.value}`);
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
async function share() {
  const url = window.location.href;
  try {
    if (navigator.share) await navigator.share({ title: design.value?.name, url });
    else {
      await navigator.clipboard.writeText(url);
      notice.value = 'Enlace copiado.';
    }
  } catch {
    /* la persona canceló */
  }
}
async function ask(question: string) {
  const r = await api<{ answer: string; mode: string }>(
    'POST',
    `/plataforma/asistente/${id.value}`,
    { question },
  );
  return r.answer;
}
const ago = (iso: string) => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (days < 7) return rtf.format(-days, 'day');
  if (days < 60) return rtf.format(-Math.round(days / 7), 'week');
  return rtf.format(-Math.round(days / 30), 'month');
};
const mapUrl = computed(() => {
  const s = meta.value?.settings;
  if (s?.latitude != null && s?.longitude != null)
    return `https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=17/${s.latitude}/${s.longitude}`;
  const d = design.value;
  return d
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${d.address} ${d.municipality} Sucre Colombia`)}`
    : '';
});
const tabs = computed(() => [
  { id: 'inicio' as const, label: 'Inicio', icon: House },
  {
    id: 'productos' as const,
    label: design.value?.mode === 'products' ? 'Productos y servicios' : 'Servicios',
    icon: ShoppingCart,
  },
  { id: 'resenas' as const, label: `Reseñas (${meta.value?.reviewCount ?? 0})`, icon: Star },
  { id: 'testimonios' as const, label: 'Testimonios', icon: Quote },
  { id: 'ubicacion' as const, label: 'Ubicación', icon: MapPin },
  { id: 'bot' as const, label: 'Bot del negocio', icon: Bot },
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
    {{ error || 'Puede que todavía no esté publicado o que su dueño lo haya retirado.' }}
  </EmptyState>
  <div v-else class="bp">
    <nav class="bp-crumbs" aria-label="Ruta">
      <NuxtLink to="/buscar" class="bp-back"><ArrowLeft :size="18" /> Volver a resultados</NuxtLink>
      <ol>
        <li><NuxtLink to="/inicio">Inicio</NuxtLink></li>
        <li>
          <NuxtLink :to="{ path: '/buscar', query: { sector: sector.id } }">{{
            sector.id
          }}</NuxtLink>
        </li>
        <li aria-current="page">{{ design.name }}</li>
      </ol>
    </nav>

    <header class="bp-hero">
      <img class="bp-hero-bg" :src="design.content.heroImage || `/art/food.svg`" alt="" />
      <span class="bp-hero-logo">
        <img v-if="design.logo" :src="design.logo" :alt="`Logo de ${design.name}`" />
        <template v-else>{{ design.name.slice(0, 1) }}</template>
      </span>
      <div class="bp-hero-text">
        <h1>
          {{ design.name }}
          <BadgeCheck
            v-if="verified"
            :size="26"
            class="bp-verified"
            aria-label="Negocio verificado por SucreIA"
          />
        </h1>
        <p>{{ design.description || design.content.heroText }}</p>
        <StarRating :rating="meta?.rating" :count="meta?.reviewCount ?? 0" label="valoraciones" />
      </div>
      <div class="bp-hero-actions">
        <button
          type="button"
          :class="['bp-round', { on: favorite }]"
          :aria-pressed="favorite"
          :aria-label="favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
          @click="toggleFavorite"
        >
          <Heart :size="21" />
        </button>
        <button type="button" class="bp-round" aria-label="Compartir" @click="share">
          <Share2 :size="20" />
        </button>
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

        <!-- Inicio -->
        <template v-if="tab === 'inicio'">
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
            <div class="bp-gallery">
              <img
                :src="gallery[slide]"
                :alt="`Fotografía de ${design.name}`"
                :class="{ art: isArt(gallery[slide]) }"
              />
              <div v-if="gallery.length > 1" class="bp-dots" role="group" aria-label="Fotografías">
                <button
                  v-for="(g, i) in gallery"
                  :key="g"
                  type="button"
                  :class="{ on: i === slide }"
                  :aria-label="`Foto ${i + 1}`"
                  :aria-pressed="i === slide"
                  @click="slide = i"
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
              <article
                v-for="product in design.products.slice(0, 4)"
                :key="product.id"
                class="bp-mini"
              >
                <img
                  :src="product.image || '/art/food.svg'"
                  alt=""
                  :class="{ art: isArt(product.image) }"
                  loading="lazy"
                />
                <h3>{{ product.name }}</h3>
                <div class="bp-mini-foot">
                  <strong>{{ product.price ? currency(product.price) : 'A cotizar' }}</strong>
                  <button
                    type="button"
                    class="bp-cart"
                    :aria-label="`${offerLabel} ${product.name}`"
                    @click="add(product)"
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
                  <span class="bp-stars" aria-hidden="true"
                    ><Star
                      v-for="i in 5"
                      :key="i"
                      :size="20"
                      :fill="
                        meta?.rating && i <= Math.round(meta.rating) ? 'currentColor' : 'none'
                      "
                  /></span>
                  <span class="muted small">({{ meta?.reviewCount ?? 0 }} valoraciones)</span>
                </div>
                <ul aria-label="Distribución de valoraciones">
                  <li v-for="b in breakdown" :key="b.n">
                    <span>{{ b.n }} <Star :size="12" fill="currentColor" /></span>
                    <span class="sx-bar"><i :style="{ width: `${b.pct}%` }" /></span>
                    <span>{{ b.pct }}%</span>
                  </li>
                </ul>
              </div>
            </section>
            <section class="sx-card">
              <div class="sx-head">
                <h2>Testimonios de clientes</h2>
                <button
                  v-if="testimonials.length"
                  type="button"
                  class="sx-link"
                  @click="tab = 'testimonios'"
                >
                  Ver todos ({{ testimonials.length }}) <ChevronRight :size="16" />
                </button>
              </div>
              <div v-if="testimonials.length" class="bp-quote">
                <button
                  type="button"
                  class="bp-arrow"
                  aria-label="Testimonio anterior"
                  @click="quote = (quote - 1 + testimonials.length) % testimonials.length"
                >
                  <ChevronLeft :size="18" />
                </button>
                <figure>
                  <span class="sx-avatar">{{ testimonials[quote].name.slice(0, 1) }}</span>
                  <div>
                    <strong>{{ testimonials[quote].name }}</strong>
                    <span class="bp-stars small" :aria-label="`${testimonials[quote].rating} de 5`"
                      ><Star
                        v-for="i in 5"
                        :key="i"
                        :size="13"
                        :fill="i <= testimonials[quote].rating ? 'currentColor' : 'none'"
                    /></span>
                    <span class="muted small">{{ ago(testimonials[quote].createdAt) }}</span>
                    <blockquote>“{{ testimonials[quote].comment }}”</blockquote>
                  </div>
                </figure>
                <button
                  type="button"
                  class="bp-arrow"
                  aria-label="Testimonio siguiente"
                  @click="quote = (quote + 1) % testimonials.length"
                >
                  <ChevronRight :size="18" />
                </button>
              </div>
              <p v-else class="muted">
                Todavía no hay testimonios. Aparecen cuando los clientes completan una compra y
                dejan su reseña.
              </p>
            </section>
          </div>
        </template>

        <!-- Productos -->
        <template v-else-if="tab === 'productos'">
          <section class="sx-card">
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
                @click="group = g"
              >
                {{ g }}
              </button>
            </div>
            <div class="bp-products">
              <article v-for="product in products" :key="product.id" class="bp-product">
                <img
                  :src="product.image || '/art/food.svg'"
                  alt=""
                  :class="{ art: isArt(product.image) }"
                  loading="lazy"
                />
                <div class="bp-product-body">
                  <h3>{{ product.name }}</h3>
                  <p v-if="product.description" class="small muted">{{ product.description }}</p>
                  <strong class="bp-price">{{
                    product.price ? currency(product.price) : 'A cotizar'
                  }}</strong>
                  <p v-if="stockOf(product) === 0" class="small danger" style="margin: 0">
                    Agotado
                  </p>
                  <div class="bp-buy">
                    <div
                      v-if="design.mode === 'products'"
                      class="bp-qty"
                      role="group"
                      :aria-label="`Cantidad de ${product.name}`"
                    >
                      <button type="button" aria-label="Menos" @click="step(product.id, -1)">
                        <Minus :size="14" />
                      </button>
                      <span>{{ qty[product.id] ?? 1 }}</span>
                      <button type="button" aria-label="Más" @click="step(product.id, 1)">
                        <Plus :size="14" />
                      </button>
                    </div>
                    <button
                      type="button"
                      class="sx-btn sx-btn--sm"
                      :disabled="stockOf(product) === 0"
                      :aria-label="`${offerLabel} ${product.name}`"
                      @click="add(product)"
                    >
                      <ShoppingCart v-if="design.mode === 'products'" :size="15" /><CalendarDays
                        v-else
                        :size="15"
                      />
                      {{ offerLabel }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
          <section v-if="meta?.settings.delivery" class="bp-logistics">
            <img src="/sucre/repartidor.webp" alt="Repartidor de SucreIA en moto" />
            <div>
              <h2><Truck :size="30" /> Logística y Entregas Colaborativas</h2>
              <p>
                Recibe tus compras en casa o en tu negocio con transportadores locales del
                departamento de Sucre.
              </p>
              <ul>
                <li><Zap :size="26" /> Entregas rápidas en todo Sucre</li>
                <li><Users :size="26" /> Transportadores locales verificados</li>
                <li><ShieldCheck :size="26" /> Seguimiento en tiempo real</li>
              </ul>
            </div>
          </section>
        </template>

        <!-- Reseñas y testimonios -->
        <section v-else-if="tab === 'resenas' || tab === 'testimonios'" class="sx-card">
          <h2 style="margin-bottom: 12px">
            {{ tab === 'resenas' ? 'Reseñas de clientes' : 'Testimonios de clientes' }}
          </h2>
          <p v-if="!(tab === 'resenas' ? reviews : testimonials).length" class="muted">
            Todavía no hay reseñas. Solo pueden opinar quienes completaron una compra o un servicio;
            no se publican valoraciones inventadas.
          </p>
          <article
            v-for="r in tab === 'resenas' ? reviews : testimonials"
            :key="r.id"
            class="bp-review"
          >
            <span class="sx-avatar">{{ r.name.slice(0, 1) }}</span>
            <div>
              <strong>{{ r.name }}</strong>
              <span class="bp-stars small"
                ><Star
                  v-for="i in 5"
                  :key="i"
                  :size="13"
                  :fill="i <= r.rating ? 'currentColor' : 'none'"
              /></span>
              <span class="muted small">{{ ago(r.createdAt) }}</span>
              <p v-if="r.comment">{{ r.comment }}</p>
            </div>
          </article>
        </section>

        <!-- Ubicación -->
        <section v-else-if="tab === 'ubicacion'" class="sx-card bp-location">
          <h2>Ubicación</h2>
          <p>
            <MapPin :size="18" /> {{ design.address || 'Dirección no publicada' }} ·
            {{ design.municipality }}, Sucre
          </p>
          <p v-if="region"><MapPinned :size="18" /> Subregión {{ region.id }}</p>
          <p v-if="design.hours"><Info :size="18" /> {{ design.hours }}</p>
          <a
            v-if="mapUrl"
            class="sx-btn sx-btn--outline sx-btn--pill"
            :href="mapUrl"
            target="_blank"
            rel="noopener"
            >Ver en mapa</a
          >
        </section>

        <!-- Bot -->
        <ChatCard
          v-else
          :title="`Asistente de ${design.name}`"
          :greeting="`¡Hola! 👋 Soy el asistente virtual de ${design.name}. ¿En qué puedo ayudarte?`"
          intro="Puedo ayudarte con:"
          :bullets="[
            'Catálogo y precios',
            design.mode === 'products' ? 'Pedidos personalizados' : 'Reservas y cotizaciones',
            'Disponibilidad y tiempos de entrega',
          ]"
          :ask="ask"
          note="Responde con la información publicada por el negocio; confirma los detalles directamente con él."
        />
      </div>

      <aside class="bp-side">
        <section
          v-if="design.mode === 'products' && lines.length"
          class="sx-card bp-cartbox"
          aria-label="Tu carrito"
        >
          <div class="sx-head">
            <h2>
              <ShoppingCart :size="22" /> Tu carrito
              <span class="muted small"
                >({{ lines.reduce((n, l) => n + l.quantity, 0) }} productos)</span
              >
            </h2>
            <button type="button" class="bp-icon" aria-label="Vaciar carrito" @click="p.clear()">
              <Trash2 :size="19" />
            </button>
          </div>
          <ul class="bp-lines">
            <li v-for="l in lines" :key="l.productId">
              <img :src="imageOf(l.productId) || '/art/food.svg'" alt="" />
              <span class="bp-line-name">{{ l.name }}</span>
              <div class="bp-qty" role="group" :aria-label="`Cantidad de ${l.name}`">
                <button
                  type="button"
                  aria-label="Menos"
                  @click="
                    l.quantity > 1 ? p.quantity(l.productId, l.quantity - 1) : p.remove(l.productId)
                  "
                >
                  <Minus :size="14" />
                </button>
                <span>{{ l.quantity }}</span>
                <button
                  type="button"
                  aria-label="Más"
                  @click="p.quantity(l.productId, l.quantity + 1)"
                >
                  <Plus :size="14" />
                </button>
              </div>
              <strong>{{ currency(l.price * l.quantity) }}</strong>
            </li>
          </ul>
          <dl class="bp-sum">
            <div>
              <dt>Subtotal</dt>
              <dd>{{ currency(subtotal) }}</dd>
            </div>
            <div v-if="meta?.settings.delivery">
              <dt>Costo de entrega ({{ design.municipality }})</dt>
              <dd>{{ currency(fee) }}</dd>
            </div>
            <div class="bp-total">
              <dt>Total a pagar</dt>
              <dd>{{ currency(subtotal + fee) }}</dd>
            </div>
          </dl>
          <button type="button" class="sx-btn sx-btn--block sx-btn--pill" @click="checkout">
            <Gift :size="18" /> Finalizar compra
          </button>
        </section>
        <p v-if="otherCart" class="notice">
          Tienes productos de otro negocio en el carrito.
          <NuxtLink to="/carrito" class="sx-link">Ver carrito</NuxtLink>
        </p>

        <section v-if="design.mode === 'products' && lines.length" class="sx-card">
          <h2 style="margin-bottom: 10px"><Truck :size="22" /> Opciones de entrega</h2>
          <label
            v-if="meta?.settings.delivery"
            :class="['bp-opt', { on: delivery === 'delivery' }]"
          >
            <input v-model="delivery" type="radio" value="delivery" />
            <span
              ><strong>Entrega a domicilio</strong
              ><small>Recibe en tu dirección en Sucre</small></span
            >
            <b>{{ currency(meta.settings.deliveryFee) }}</b>
          </label>
          <label :class="['bp-opt', { on: delivery === 'pickup' }]">
            <input v-model="delivery" type="radio" value="pickup" />
            <span><strong>Punto de recogida</strong><small>Retira en el negocio</small></span>
            <b>Gratis</b>
          </label>
        </section>

        <section v-if="active" class="sx-card">
          <h2 style="margin-bottom: 10px">Seguimiento de tu entrega</h2>
          <p class="bp-state">
            <span>{{
              active.status === 'dispatched'
                ? 'En camino'
                : active.status === 'completed'
                  ? 'Entregado'
                  : 'En proceso'
            }}</span>
            <template v-if="active.etaMinutes && active.status === 'dispatched'"
              >Entrega estimada en {{ active.etaMinutes }} min</template
            >
          </p>
          <ol class="bp-track">
            <li v-for="s in trackSteps" :key="s.label" :class="{ done: s.done }">
              <span class="bp-track-icon"><component :is="s.icon" :size="18" /></span>
              <strong>{{ s.label }}</strong>
              <small>{{ s.time }}</small>
            </li>
          </ol>
          <NuxtLink to="/logistica" class="sx-link"
            >Ver en Logística y entregas <ChevronRight :size="16"
          /></NuxtLink>
        </section>

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
          <button
            v-if="design.mode !== 'products'"
            type="button"
            class="sx-btn sx-btn--block"
            @click="openRequest()"
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
          :bullets="[
            'Catálogo y precios',
            design.mode === 'products' ? 'Pedidos personalizados' : 'Reservas y cotizaciones',
            'Disponibilidad y tiempos de entrega',
          ]"
          :ask="ask"
        />
      </aside>
    </div>

    <SxModal
      v-if="showRequest"
      :title="design.mode === 'booking' ? 'Reservar' : 'Solicitar cotización'"
      @close="showRequest = false"
    >
      <form class="form-stack" @submit.prevent="request">
        <label
          >Servicio
          <select v-model="selected" required>
            <option v-for="offer in design.products" :key="offer.id" :value="offer.id">
              {{ offer.name }} · {{ design.mode === 'quote' ? 'A cotizar' : currency(offer.price) }}
            </option>
          </select>
        </label>
        <label
          >Detalle de tu solicitud<textarea v-model="detail" required maxlength="1500" />
        </label>
        <label
          >WhatsApp con código de país<input
            v-model="phone"
            required
            maxlength="16"
            placeholder="+57…"
        /></label>
        <template v-if="design.mode === 'booking'">
          <label>Fecha preferida<input v-model="date" type="date" required /></label>
          <label
            >Horario disponible (Colombia)
            <select v-model="slot" required>
              <option value="">Selecciona una hora</option>
              <option v-for="time in times" :key="time" :value="time">
                {{ time.slice(11, 16) }}
              </option>
            </select>
          </label>
          <p v-if="date && !times.length" class="muted">No hay horas disponibles para esa fecha.</p>
        </template>
        <label
          >Medio de pago
          <select v-model="paymentMethod">
            <option value="cash">Efectivo al negocio</option>
            <option v-if="meta?.settings.paymentInstructions" value="transfer">
              Transferencia al negocio
            </option>
          </select>
        </label>
        <p v-if="notice" role="alert" class="field-error">{{ notice }}</p>
        <button class="sx-btn" :disabled="p.busy.value">
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
  display: grid;
  gap: 16px;
}
.bp-crumbs {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 13.5px;
}
.bp-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--ink);
}
.bp-crumbs ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
}
.bp-crumbs li + li::before {
  content: '›';
  margin-right: 8px;
}
.bp-crumbs [aria-current] {
  font-weight: 600;
  color: var(--ink);
}
.bp-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 22px;
  min-height: 190px;
  padding: 22px 24px;
  border-radius: 18px;
  overflow: hidden;
  color: #fff;
  background: #2b1a12;
  isolation: isolate;
}
.bp-hero-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right center;
}
.bp-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    90deg,
    rgba(20, 12, 6, 0.92) 0%,
    rgba(20, 12, 6, 0.72) 45%,
    rgba(20, 12, 6, 0.05) 85%
  );
}
.bp-hero-logo {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 128px;
  height: 128px;
  border: 4px solid #fff;
  border-radius: 50%;
  overflow: hidden;
  background: #fff4e6;
  color: #7c2d12;
  font-size: 48px;
  font-weight: 800;
}
.bp-hero-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bp-hero h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-size: clamp(24px, 2.6vw, 34px);
}
.bp-verified {
  color: #fff;
  fill: #1d70e0;
}
.bp-hero-text p {
  max-width: 460px;
  margin: 8px 0;
  font-size: 15px;
  color: #f5ede6;
}
.bp-hero-text :deep(.sx-stars) {
  font-size: 15px;
  color: #fff;
}
.bp-hero-text :deep(.sx-stars .muted) {
  color: #e6dcd3;
}
.bp-hero-actions {
  display: flex;
  gap: 10px;
  align-self: start;
  margin-left: auto;
}
.bp-round {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fff;
  color: var(--ink);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}
.bp-main,
.bp-side {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.bp-about {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
}
.bp-about p {
  font-size: 14px;
}
.bp-highlights {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}
.bp-highlights li {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 0 6px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
}
.bp-highlights li + li {
  border-left: 1px solid var(--line);
}
.bp-highlights svg {
  color: var(--green);
}
.bp-gallery {
  display: grid;
  gap: 8px;
}
.bp-gallery img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 14px;
  background: var(--bg);
}
.bp-gallery img.art {
  object-fit: contain;
  padding: 16px;
}
.bp-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
}
.bp-dots button {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #cbd5e1;
}
.bp-dots .on {
  width: 18px;
  background: var(--green);
}
.bp-featured {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.bp-mini {
  display: grid;
  gap: 6px;
  padding-bottom: 10px;
  border: 1px solid #e6edf6;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}
.bp-mini img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--bg);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}
.bp-mini-foot strong,
.bp-price {
  color: var(--ink);
  font-size: 15px;
}
.bp-cart {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1.5px solid var(--green);
  border-radius: 10px;
  color: var(--green-dark);
}
.bp-two {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 16px;
}
.bp-score {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}
.bp-score > div {
  display: grid;
  justify-items: center;
}
.bp-score strong {
  font-size: 44px;
  line-height: 1;
  color: var(--ink);
}
.bp-stars {
  display: inline-flex;
  gap: 2px;
  color: var(--star);
}
.bp-score ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12.5px;
}
.bp-score li {
  display: grid;
  grid-template-columns: 34px 1fr 38px;
  align-items: center;
  gap: 8px;
}
.bp-score li svg {
  color: var(--star);
}
.bp-score .sx-bar {
  height: 7px;
}
.bp-quote {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.bp-quote figure {
  display: flex;
  gap: 12px;
  margin: 0;
}
.bp-quote blockquote {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--ink);
}
.bp-quote strong,
.bp-review strong {
  display: block;
  color: var(--ink);
}
.bp-arrow {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow);
}
.bp-review {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--line);
}
.bp-review p {
  margin: 6px 0 0;
}
.bp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.bp-chips button {
  min-height: 36px;
  padding: 0 18px;
  border: 1px solid #d7e0ec;
  border-radius: 999px;
  background: #f7f9fc;
  font-weight: 500;
}
.bp-chips .on {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-dark);
}
.bp-products {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}
.bp-product {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
  border: 1px solid #e6edf6;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}
.bp-product img {
  width: 100%;
  aspect-ratio: 1.8;
  object-fit: cover;
  background: var(--bg);
}
.bp-product-body {
  display: grid;
  gap: 6px;
  padding: 10px;
}
.bp-product h3 {
  font-size: 14px;
  font-weight: 600;
}
.bp-product p {
  margin: 0;
}
.bp-buy {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.bp-qty {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.bp-qty button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  color: var(--ink);
}
.bp-logistics {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(90deg, #e6f1ff, #f4f8ff);
  box-shadow: var(--shadow);
}
.bp-logistics img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bp-logistics > div {
  padding: 18px 20px;
}
.bp-logistics h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
}
.bp-logistics h2 svg {
  color: var(--green);
}
.bp-logistics ul {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 10px 0 0;
  padding: 12px;
  list-style: none;
  border-radius: 14px;
  background: #fff;
}
.bp-logistics li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}
.bp-logistics li svg {
  color: var(--green);
}
.bp-location p {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bp-icon {
  color: var(--ink);
}
.bp-lines {
  display: grid;
  gap: 10px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}
.bp-lines li {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.bp-lines img {
  width: 54px;
  height: 40px;
  object-fit: cover;
  border-radius: 8px;
}
.bp-line-name {
  font-weight: 600;
  color: var(--ink);
}
.bp-lines strong {
  color: var(--green-dark);
}
.bp-sum {
  display: grid;
  gap: 4px;
  margin: 0 0 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.bp-sum div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}
.bp-sum dd {
  margin: 0;
}
.bp-total {
  font-size: 17px !important;
  font-weight: 700;
  color: var(--ink);
}
.bp-total dd {
  color: var(--green-dark);
}
.bp-opt {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
}
.bp-opt.on {
  border-color: var(--green);
  background: var(--green-soft);
}
.bp-opt input {
  accent-color: var(--green);
}
.bp-opt strong,
.bp-opt small {
  display: block;
}
.bp-opt small {
  color: var(--muted);
}
.bp-opt b {
  color: var(--green-dark);
}
.bp-state {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
}
.bp-state span {
  padding: 4px 14px;
  border-radius: 999px;
  background: var(--green);
  color: #fff;
  font-weight: 600;
}
.bp-track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 12px 0;
  padding: 0;
  list-style: none;
  text-align: center;
  font-size: 11.5px;
}
.bp-track li {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 4px;
  color: var(--muted);
}
.bp-track li::before {
  content: '';
  position: absolute;
  top: 17px;
  right: 50%;
  width: 100%;
  height: 3px;
  background: #dbe3ee;
  z-index: 0;
}
.bp-track li:first-child::before {
  display: none;
}
.bp-track li.done::before {
  background: var(--green);
}
.bp-track-icon {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2px solid #dbe3ee;
  border-radius: 50%;
  background: #fff;
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
  display: grid;
  gap: 12px;
}
.bp-contact-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.bp-contact-row strong {
  display: block;
  color: var(--ink);
}
.bp-contact-row a:not(.sx-btn):not(.bp-map) {
  color: var(--text);
}
.bp-wa {
  color: #22c55e;
}
.bp-map {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--blue-soft);
  color: var(--blue);
  font-size: 12px;
  font-weight: 600;
}
@media (max-width: 1250px) {
  .bp-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .bp-featured {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
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
  .bp-two,
  .bp-logistics {
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
</style>
