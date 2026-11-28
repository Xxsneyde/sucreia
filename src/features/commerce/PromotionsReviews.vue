<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  BadgePercent,
  Copy,
  ExternalLink,
  MessageSquareText,
  Package,
  Plus,
  Star,
  Store,
  Ticket,
  X,
} from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import { businessHref, thumbnail, type StoreProject } from '@/domain/studio';
import type { CommerceStore, ProductReview, Review } from '@/domain/platform';
import {
  couponState,
  couponStateNames,
  dateInput,
  discounted,
  bestPercent,
  discountFor,
  discountPercent,
  MAX_PERCENT,
  normalizeCode,
  validCode,
  type ProductDiscounts,
  type StoreCoupon,
  type StoreDiscount,
} from '@/domain/offers';

// «Promociones y reseñas»: lista de negocios y, al elegir uno, sus productos en tarjetas, el
// descuento (para todo el negocio o para productos elegidos), los cupones con código y las
// reseñas (negocio y productos).
const studio = useStudio();
const route = useRoute();
const router = useRouter();

const list = computed(() =>
  [...studio.projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
);
const selectedId = computed(() =>
  typeof route.query.negocio === 'string' ? route.query.negocio : '',
);
const current = computed(() => studio.projects.find((p) => p.id === selectedId.value) ?? null);
const design = (p: StoreProject) => p.published?.design ?? p.draft;
const modeNames = { products: 'Productos', booking: 'Reservas', quote: 'Cotizaciones' } as const;
const open = (p: StoreProject) => {
  studio.select(p.id);
  void router.push({ query: { negocio: p.id } });
};
const back = () => void router.push({ query: {} });

// Resumen de cada negocio publicado (calificación y descuento vigente).
const summaries = ref<Record<string, CommerceStore>>({});
watch(
  () => list.value.map((p) => p.id).join(','),
  async () => {
    for (const p of list.value)
      if (p.published && !summaries.value[p.id])
        try {
          summaries.value = {
            ...summaries.value,
            [p.id]: await api<CommerceStore>('GET', `/plataforma/negocios/${p.id}`),
          };
        } catch {
          // Sin resumen se muestra la tarjeta igual.
        }
  },
  { immediate: true },
);

// ——— Detalle del negocio ———
const tab = ref<'productos' | 'resenas'>('productos');
const message = ref('');
const error = ref('');
const busy = ref(false);
/** Descuento de todo el negocio. */
const discount = ref<StoreDiscount | null>(null);
/** Descuento propio de cada producto (cada uno conserva el suyo). */
const productDiscounts = ref<ProductDiscounts>({});
const coupons = ref<StoreCoupon[]>([]);
const loaded = ref(false);
const form = ref({
  percent: 10,
  until: '',
  scope: 'all' as 'all' | 'selected',
  /** Productos elegidos para el próximo descuento (los que ya tienen uno lo conservan). */
  products: [] as string[],
});
const couponForm = ref({ code: '', percent: 10, expires: '', maxUses: '' as number | '' });
const creating = ref(false);
const reviews = ref<{ store: Review[]; products: ProductReview[] } | null>(null);
const reviewKind = ref<'negocio' | 'productos'>('negocio');
const order = ref<'mejores' | 'peores' | 'recientes'>('mejores');
const productFilter = ref('');

async function load(id: string) {
  loaded.value = false;
  reviews.value = null;
  message.value = error.value = '';
  creating.value = false;
  tab.value = route.query.vista === 'resenas' ? 'resenas' : 'productos';
  try {
    const panel = await api<{
      discount: StoreDiscount | null;
      productDiscounts?: ProductDiscounts;
      coupons: StoreCoupon[];
    }>('GET', `/plataforma/negocios/${id}/promociones-panel`);
    discount.value = panel.discount;
    productDiscounts.value = panel.productDiscounts ?? {};
    coupons.value = panel.coupons;
    form.value = {
      percent: panel.discount?.percent || 10,
      until: dateInput(panel.discount?.until ?? null),
      scope: !panel.discount && Object.keys(productDiscounts.value).length ? 'selected' : 'all',
      products: [],
    };
    loaded.value = true;
    if (tab.value === 'resenas') await loadReviews();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
watch(selectedId, (id) => id && void load(id), { immediate: true });

const activePercent = computed(() => discountPercent(discount.value));
/** Descuento propio vigente de un producto (0 si no tiene). */
const ownPercent = (id: string) => discountPercent(productDiscounts.value[id]);
/** Precio que ve el cliente: el mayor entre el del negocio y el propio del producto. */
const percentOf = (id: string) => discountFor(discount.value, productDiscounts.value, id);
const ownCount = computed(() => products.value.filter((p) => ownPercent(p.id)).length);
/** «1 producto», «3 servicios». */
const countText = (n: number) =>
  `${n} ${isServices.value ? 'servicio' : 'producto'}${n === 1 ? '' : 's'}`;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Bogota',
  });
const picking = computed(() => form.value.scope === 'selected');
const isPicked = (id: string) => form.value.products.includes(id);
function togglePick(id: string) {
  form.value.products = isPicked(id)
    ? form.value.products.filter((x) => x !== id)
    : [...form.value.products, id];
}
const pickAll = (on: boolean) => {
  form.value.products = on ? products.value.map((p) => p.id) : [];
};
const products = computed(() => (current.value ? design(current.value).products : []));
const summary = computed(() => (current.value ? summaries.value[current.value.id] : undefined));
const isServices = computed(() => !!current.value && design(current.value).mode !== 'products');
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });

async function run(fn: () => Promise<void>, ok: string) {
  if (busy.value) return;
  busy.value = true;
  message.value = error.value = '';
  try {
    await fn();
    message.value = ok;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
/** Descuento de todo el negocio (con 0 % se quita). No toca los de cada producto. */
const saveStoreDiscount = (percent: number) =>
  run(
    async () => {
      const r = await api<{ discount: StoreDiscount | null }>(
        'PUT',
        `/plataforma/negocios/${selectedId.value}/descuento`,
        { percent, until: form.value.until || null },
      );
      discount.value = r.discount;
      delete summaries.value[selectedId.value];
    },
    percent
      ? `Listo: ${percent} % de descuento en todo el negocio.`
      : 'Quitaste el descuento de todo el negocio.',
  );
/** Pone (o con 0 % quita) el descuento de unos productos; los demás conservan el suyo. */
const saveProductDiscount = (ids: string[], percent: number, ok: string) =>
  run(async () => {
    const r = await api<{ productDiscounts: ProductDiscounts }>(
      'PUT',
      `/plataforma/negocios/${selectedId.value}/descuento-productos`,
      { products: ids, percent, until: percent ? form.value.until || null : null },
    );
    productDiscounts.value = r.productDiscounts;
    form.value.products = [];
    delete summaries.value[selectedId.value];
  }, ok);
async function saveDiscount() {
  if (!picking.value) return saveStoreDiscount(form.value.percent);
  const chosen = form.value.products;
  if (!chosen.length) {
    message.value = '';
    error.value = `Elige abajo al menos ${isServices.value ? 'un servicio' : 'un producto'} para el descuento.`;
    return;
  }
  await saveProductDiscount(
    chosen,
    form.value.percent,
    `Listo: ${form.value.percent} % de descuento en ${countText(chosen.length)}. Los demás conservan el suyo.`,
  );
}
const removeOwn = (id: string, name: string) =>
  saveProductDiscount([id], 0, `Quitaste el descuento de ${name}.`);
function suggestCode() {
  const name = current.value ? design(current.value).name : 'SUCRE';
  const base =
    name
      .normalize('NFD')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8) || 'SUCRE';
  couponForm.value.code = `${base}${couponForm.value.percent || 10}`;
}
const codePreview = computed(() => normalizeCode(couponForm.value.code));
const createCoupon = () =>
  run(async () => {
    if (!validCode(codePreview.value))
      throw new Error('El código debe tener de 3 a 20 letras, números o guiones, sin espacios.');
    const r = await api<{ coupon: StoreCoupon }>(
      'POST',
      `/plataforma/negocios/${selectedId.value}/cupones`,
      {
        code: codePreview.value,
        percent: couponForm.value.percent,
        expires: couponForm.value.expires || null,
        maxUses: couponForm.value.maxUses === '' ? null : couponForm.value.maxUses,
      },
    );
    coupons.value = [r.coupon, ...coupons.value];
    couponForm.value = { code: '', percent: 10, expires: '', maxUses: '' };
    creating.value = false;
  }, 'Cupón creado. Compártelo con tus clientes.');
const toggleCoupon = (c: StoreCoupon) =>
  run(
    async () => {
      coupons.value = (
        await api<{ coupons: StoreCoupon[] }>(
          'PUT',
          `/plataforma/negocios/${selectedId.value}/cupones/${c.id}`,
          { active: !c.active },
        )
      ).coupons;
    },
    c.active ? `Desactivaste el cupón ${c.code}.` : `Activaste el cupón ${c.code}.`,
  );
async function copy(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    message.value = `Copiaste el código ${code}.`;
  } catch {
    message.value = `Código: ${code}`;
  }
}

// ——— Reseñas ———
async function loadReviews() {
  if (reviews.value || !selectedId.value) return;
  try {
    reviews.value = await api('GET', `/plataforma/negocios/${selectedId.value}/resenas`);
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function showReviews(kind?: 'negocio' | 'productos') {
  tab.value = 'resenas';
  if (kind) reviewKind.value = kind;
  void loadReviews();
}
const sortReviews = <T extends { rating: number; createdAt: string }>(items: T[]) =>
  [...items].sort((a, b) =>
    order.value === 'recientes'
      ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
      : order.value === 'mejores'
        ? b.rating - a.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt)
        : a.rating - b.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
const shownStore = computed(() => sortReviews(reviews.value?.store ?? []));
const shownProducts = computed(() =>
  sortReviews(
    (reviews.value?.products ?? []).filter(
      (r) => !productFilter.value || r.productId === productFilter.value,
    ),
  ),
);
const reviewed = computed(() => {
  const seen = new Map<string, string>();
  for (const r of reviews.value?.products ?? []) seen.set(r.productId, r.productName);
  return [...seen].map(([id, name]) => ({ id, name }));
});
const shown = computed(() =>
  reviewKind.value === 'negocio' ? shownStore.value : shownProducts.value,
);
const average = computed(() => {
  const items = shown.value;
  return items.length ? items.reduce((n, r) => n + r.rating, 0) / items.length : 0;
});
const bars = computed(() =>
  [5, 4, 3, 2, 1].map((stars) => {
    const n = shown.value.filter((r) => r.rating === stars).length;
    return { stars, n, pct: shown.value.length ? Math.round((n / shown.value.length) * 100) : 0 };
  }),
);
const imageOf = (productId: string) =>
  thumbnail(products.value.find((p) => p.id === productId)?.image) || '/art/food.svg';
const totalReviews = computed(
  () =>
    (summary.value?.reviewCount ?? 0) +
    Object.values(summary.value?.productRatings ?? {}).reduce((n, r) => n + r.count, 0),
);
</script>

<template>
  <!-- Lista de negocios -->
  <template v-if="!current">
    <div class="page-title">
      <div>
        <p class="eyebrow">Mi negocio</p>
        <h1>Promociones y reseñas</h1>
        <p class="muted">
          Elige un negocio para crear cupones, poner un descuento en todo el negocio y ver lo que
          opinan tus clientes.
        </p>
      </div>
    </div>
    <p v-if="!studio.ready" class="loader" role="status">Cargando tus negocios…</p>
    <section v-else-if="!list.length" class="sx-card pr-empty">
      <Store :size="30" aria-hidden="true" />
      <h2>Aún no tienes negocios</h2>
      <p class="muted">Cuando registres tu emprendimiento podrás crear promociones aquí.</p>
    </section>
    <ul v-else class="pr-grid" aria-label="Tus negocios">
      <li v-for="p in list" :key="p.id">
        <button type="button" class="sx-card pr-biz" @click="open(p)">
          <img
            v-if="design(p).logo"
            :src="thumbnail(design(p).logo)"
            alt=""
            width="56"
            height="56"
          />
          <span v-else class="pr-logo" aria-hidden="true"><Store :size="24" /></span>
          <span class="pr-biz-main">
            <strong>{{ design(p).name || 'Sin nombre' }}</strong>
            <small>{{ design(p).category }} · {{ modeNames[design(p).mode] }}</small>
            <span class="pr-biz-stats">
              <span v-if="summaries[p.id]?.reviewCount" class="pr-chip">
                <Star :size="13" aria-hidden="true" class="pr-star-on" />
                {{ summaries[p.id]!.rating!.toFixed(1) }} ({{ summaries[p.id]!.reviewCount }})
              </span>
              <span v-else class="pr-chip muted">Sin reseñas</span>
              <span
                v-if="bestPercent(summaries[p.id]?.discount, summaries[p.id]?.productDiscounts)"
                class="pr-chip pr-chip--green"
              >
                <BadgePercent :size="13" aria-hidden="true" />
                {{
                  discountPercent(summaries[p.id]?.discount)
                    ? `${discountPercent(summaries[p.id]?.discount)} % en todo`
                    : `Hasta ${bestPercent(null, summaries[p.id]?.productDiscounts)} % en algunos`
                }}
              </span>
              <span v-if="!p.published" class="pr-chip pr-chip--wait">Aún no publicado</span>
            </span>
          </span>
          <span class="pr-go" aria-hidden="true">Gestionar promociones y reseñas →</span>
        </button>
      </li>
    </ul>
  </template>

  <!-- Detalle de un negocio -->
  <template v-else>
    <button type="button" class="pr-back" @click="back">
      <ArrowLeft :size="17" /> Todos mis negocios
    </button>
    <header class="sx-card pr-head">
      <img
        v-if="design(current).logo"
        :src="thumbnail(design(current).logo)"
        alt=""
        width="64"
        height="64"
      />
      <span v-else class="pr-logo pr-logo--lg" aria-hidden="true"><Store :size="28" /></span>
      <div class="pr-head-main">
        <p class="eyebrow">Promociones y reseñas</p>
        <h1>{{ design(current).name || 'Sin nombre' }}</h1>
        <p class="pr-head-meta">
          <span v-if="summary?.reviewCount" class="pr-rating">
            <Star :size="16" class="pr-star-on" aria-hidden="true" />
            <strong>{{ summary.rating!.toFixed(1) }}</strong>
            <span class="muted">· {{ summary.reviewCount }} reseñas del negocio</span>
          </span>
          <span v-else class="muted">Aún sin reseñas del negocio</span>
          <span v-if="activePercent" class="pr-chip pr-chip--green">
            <BadgePercent :size="13" aria-hidden="true" /> {{ activePercent }} % en todo el negocio
          </span>
          <span v-if="ownCount" class="pr-chip pr-chip--green">
            <BadgePercent :size="13" aria-hidden="true" /> {{ countText(ownCount) }} con descuento
            propio
          </span>
        </p>
      </div>
      <div class="pr-head-actions">
        <button type="button" class="sx-btn sx-btn--outline pr-small" @click="showReviews()">
          <MessageSquareText :size="17" />
          {{ totalReviews ? `Ver reseñas (${totalReviews})` : 'Ver reseñas' }}
        </button>
        <a
          v-if="current.published"
          class="sx-btn sx-btn--outline pr-small"
          :href="businessHref(current.id)"
          target="_blank"
          rel="noopener"
          ><ExternalLink :size="17" /> Ver página</a
        >
      </div>
    </header>

    <div class="pr-tabs" role="tablist" aria-label="Secciones">
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'productos'"
        :class="{ on: tab === 'productos' }"
        @click="tab = 'productos'"
      >
        <Ticket :size="16" /> {{ isServices ? 'Servicios' : 'Productos' }} y descuentos
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'resenas'"
        :class="{ on: tab === 'resenas' }"
        @click="showReviews()"
      >
        <MessageSquareText :size="16" /> Reseñas
      </button>
    </div>

    <p v-if="message" class="pr-msg" role="status">{{ message }}</p>
    <p v-if="error" class="pr-msg pr-msg--bad" role="alert">{{ error }}</p>
    <p v-if="!current.published" class="pr-note">
      Este negocio aún no está publicado: las promociones se verán cuando la administración lo
      apruebe.
    </p>

    <!-- Productos, descuento del negocio y cupones -->
    <template v-if="tab === 'productos'">
      <p v-if="!loaded && !error" class="loader" role="status">Cargando promociones…</p>
      <div v-else-if="loaded" class="pr-offers">
        <section class="sx-card pr-box" aria-labelledby="pr-discount-title">
          <header class="pr-box-head">
            <span class="pr-icon pr-icon--green" aria-hidden="true"
              ><BadgePercent :size="20"
            /></span>
            <div>
              <h2 id="pr-discount-title">Descuento del negocio</h2>
              <p class="muted">
                Para todo el negocio o solo para los
                {{ isServices ? 'servicios' : 'productos' }} que elijas. Se aplica sin que el
                cliente escriba nada.
              </p>
            </div>
          </header>
          <p v-if="activePercent" class="pr-state pr-state--on">
            Todo el negocio: <strong>{{ activePercent }} %</strong>,
            {{ discount?.until ? `hasta el ${longDate(discount.until)}` : 'sin fecha de fin' }}
          </p>
          <p v-if="ownCount" class="pr-state pr-state--on">
            <strong>{{ countText(ownCount) }}</strong> con descuento propio (lo ves en cada
            tarjeta).
          </p>
          <p v-if="!activePercent && !ownCount" class="pr-state">Sin descuento activo.</p>
          <form class="pr-form" @submit.prevent="saveDiscount">
            <div class="pr-seg pr-scope" role="radiogroup" aria-label="A qué aplica el descuento">
              <button
                type="button"
                role="radio"
                :aria-checked="!picking"
                :class="{ on: !picking }"
                @click="form.scope = 'all'"
              >
                Todo el negocio
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="picking"
                :class="{ on: picking }"
                @click="form.scope = 'selected'"
              >
                {{ isServices ? 'Servicios' : 'Productos' }} seleccionados
              </button>
            </div>
            <div v-if="picking" class="pr-pick-note">
              <span
                ><strong>{{ form.products.length }}</strong> de {{ products.length }}
                {{ isServices ? 'servicios' : 'productos' }} elegidos. Márcalos abajo, en sus
                tarjetas. Los que ya tienen descuento lo conservan.</span
              >
              <span class="pr-pick-all">
                <button type="button" class="pr-link" @click="pickAll(true)">Todos</button>
                <button type="button" class="pr-link" @click="pickAll(false)">Ninguno</button>
              </span>
            </div>
            <label class="pr-range">
              <span
                >Porcentaje de descuento <b>{{ form.percent }} %</b></span
              >
              <input
                v-model.number="form.percent"
                type="range"
                min="1"
                :max="MAX_PERCENT"
                step="1"
                aria-label="Porcentaje de descuento"
              />
            </label>
            <label
              >Hasta (opcional)<input
                v-model="form.until"
                type="date"
                :min="dateInput(new Date().toISOString())"
            /></label>
            <div class="pr-actions">
              <button class="sx-btn" :disabled="busy">
                {{
                  picking
                    ? form.products.length
                      ? `Aplicar a ${countText(form.products.length)}`
                      : 'Aplicar a los elegidos'
                    : activePercent
                      ? 'Actualizar descuento'
                      : 'Aplicar descuento'
                }}
              </button>
              <button
                v-if="!picking && activePercent"
                type="button"
                class="sx-btn sx-btn--outline"
                :disabled="busy"
                @click="saveStoreDiscount(0)"
              >
                Quitar descuento
              </button>
            </div>
          </form>
        </section>

        <section class="sx-card pr-box" aria-labelledby="pr-coupons-title">
          <header class="pr-box-head">
            <span class="pr-icon" aria-hidden="true"><Ticket :size="20" /></span>
            <div>
              <h2 id="pr-coupons-title">Cupones</h2>
              <p class="muted">
                Un código que el cliente escribe al comprar o reservar. Si también hay descuento en
                el negocio, se aplica el mayor.
              </p>
            </div>
          </header>
          <button
            v-if="!creating"
            type="button"
            class="sx-btn pr-create"
            @click="((creating = true), suggestCode())"
          >
            <Plus :size="18" /> Crear cupón
          </button>
          <form v-else class="pr-form pr-coupon-form" @submit.prevent="createCoupon">
            <div class="pr-form-head">
              <strong>Nuevo cupón</strong>
              <button
                type="button"
                class="pr-icon-btn"
                aria-label="Cancelar cupón nuevo"
                @click="creating = false"
              >
                <X :size="18" />
              </button>
            </div>
            <label
              >Código del cupón<input
                v-model="couponForm.code"
                required
                maxlength="20"
                autocomplete="off"
                class="pr-code-input"
                placeholder="Por ejemplo: BIENVENIDA"
            /></label>
            <div class="pr-row">
              <label
                >Descuento (%)<input
                  v-model.number="couponForm.percent"
                  type="number"
                  min="1"
                  :max="MAX_PERCENT"
                  required
              /></label>
              <label
                >Usos máximos (opcional)<input
                  v-model.number="couponForm.maxUses"
                  type="number"
                  min="1"
                  placeholder="Sin límite"
              /></label>
            </div>
            <label
              >Vence (opcional)<input
                v-model="couponForm.expires"
                type="date"
                :min="dateInput(new Date().toISOString())"
            /></label>
            <button class="sx-btn" :disabled="busy">Crear cupón {{ codePreview }}</button>
          </form>
          <p v-if="!coupons.length" class="pr-none">Todavía no tienes cupones.</p>
          <ul v-else class="pr-coupons" aria-label="Tus cupones">
            <li
              v-for="c in coupons"
              :key="c.id"
              :class="['pr-coupon', `pr-coupon--${couponState(c)}`]"
            >
              <div class="pr-ticket">
                <span class="pr-ticket-pct">{{ c.percent }}%</span>
                <span class="pr-ticket-off">dcto.</span>
              </div>
              <div class="pr-coupon-main">
                <p class="pr-coupon-code">
                  <code>{{ c.code }}</code>
                  <button
                    type="button"
                    class="pr-icon-btn"
                    :aria-label="`Copiar código ${c.code}`"
                    @click="copy(c.code)"
                  >
                    <Copy :size="15" />
                  </button>
                </p>
                <small>
                  <span :class="['pr-badge', `pr-badge--${couponState(c)}`]">{{
                    couponStateNames[couponState(c)]
                  }}</span>
                  · {{ c.uses }}{{ c.maxUses ? ` / ${c.maxUses}` : '' }}
                  {{ (c.maxUses ?? c.uses) === 1 ? 'uso' : 'usos' }} ·
                  {{ c.expires ? `vence el ${longDate(c.expires)}` : 'sin vencimiento' }}
                </small>
              </div>
              <button
                type="button"
                class="pr-link"
                :disabled="busy"
                :aria-label="`${c.active ? 'Desactivar' : 'Activar'} cupón ${c.code}`"
                @click="toggleCoupon(c)"
              >
                {{ c.active ? 'Desactivar' : 'Activar' }}
              </button>
            </li>
          </ul>
        </section>
      </div>

      <section class="pr-products" aria-labelledby="pr-products-title">
        <div class="pr-section-head">
          <h2 id="pr-products-title">
            <Package :size="20" aria-hidden="true" /> Tus
            {{ isServices ? 'servicios' : 'productos' }}
          </h2>
          <small class="muted">{{
            picking
              ? 'Marca la casilla de cada tarjeta para incluirla en el descuento'
              : `${products.length} en tu página`
          }}</small>
        </div>
        <p v-if="!products.length" class="pr-none">Este negocio aún no tiene productos.</p>
        <ul v-else class="pr-cards">
          <li
            v-for="p in products"
            :key="p.id"
            :class="['sx-card', 'pr-card', { 'pr-card--picked': picking && isPicked(p.id) }]"
          >
            <div class="pr-card-img">
              <img :src="thumbnail(p.image) || '/art/food.svg'" alt="" loading="lazy" />
              <span v-if="percentOf(p.id) && p.price" class="pr-off">−{{ percentOf(p.id) }}%</span>
              <label v-if="picking" class="pr-pick"
                ><input
                  type="checkbox"
                  :checked="isPicked(p.id)"
                  :aria-label="`Incluir ${p.name} en el descuento`"
                  @change="togglePick(p.id)"
                /><span>{{
                  isPicked(p.id) ? 'Elegido' : ownPercent(p.id) ? 'Cambiar' : 'Elegir'
                }}</span></label
              >
            </div>
            <div class="pr-card-body">
              <h3>{{ p.name }}</h3>
              <p class="pr-price">
                <template v-if="!p.price">A convenir</template>
                <template v-else-if="percentOf(p.id)">
                  <strong>{{ currency(discounted(p.price, percentOf(p.id))) }}</strong>
                  <s>{{ currency(p.price) }}</s>
                </template>
                <strong v-else>{{ currency(p.price) }}</strong>
              </p>
              <p v-if="ownPercent(p.id)" class="pr-own">
                <span
                  >Descuento propio: {{ ownPercent(p.id) }} %{{
                    productDiscounts[p.id]?.until
                      ? ` · hasta el ${shortDate(productDiscounts[p.id]!.until!)}`
                      : ''
                  }}</span
                >
                <button
                  type="button"
                  class="pr-link"
                  :disabled="busy"
                  :aria-label="`Quitar el descuento de ${p.name}`"
                  @click="removeOwn(p.id, p.name)"
                >
                  Quitar
                </button>
              </p>
              <button
                v-if="summary?.productRatings?.[p.id]"
                type="button"
                class="pr-card-rating"
                @click="((productFilter = p.id), showReviews('productos'))"
              >
                <Star :size="14" class="pr-star-on" aria-hidden="true" />
                {{ summary.productRatings[p.id]!.rating.toFixed(1) }}
                <span>({{ summary.productRatings[p.id]!.count }} reseñas)</span>
              </button>
              <small v-else class="muted">Sin reseñas</small>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Reseñas -->
    <section v-else class="pr-reviews" aria-label="Reseñas">
      <div class="pr-review-tools">
        <div class="pr-seg" role="group" aria-label="Tipo de reseñas">
          <button
            type="button"
            :aria-pressed="reviewKind === 'negocio'"
            :class="{ on: reviewKind === 'negocio' }"
            @click="reviewKind = 'negocio'"
          >
            Del negocio ({{ reviews?.store.length ?? 0 }})
          </button>
          <button
            type="button"
            :aria-pressed="reviewKind === 'productos'"
            :class="{ on: reviewKind === 'productos' }"
            @click="reviewKind = 'productos'"
          >
            De {{ isServices ? 'servicios' : 'productos' }} ({{ reviews?.products.length ?? 0 }})
          </button>
        </div>
        <label v-if="reviewKind === 'productos' && reviewed.length" class="pr-select"
          >{{ isServices ? 'Servicio' : 'Producto'
          }}<select v-model="productFilter">
            <option value="">Todos</option>
            <option v-for="r in reviewed" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select></label
        >
        <label class="pr-select"
          >Ordenar<select v-model="order">
            <option value="mejores">Mejores primero</option>
            <option value="peores">Peores primero</option>
            <option value="recientes">Más recientes</option>
          </select></label
        >
      </div>
      <p v-if="!reviews && !error" class="loader" role="status">Cargando reseñas…</p>
      <template v-else-if="reviews">
        <div v-if="shown.length" class="sx-card pr-summary">
          <div class="pr-avg">
            <strong>{{ average.toFixed(1) }}</strong>
            <span class="pr-stars" :aria-label="`${average.toFixed(1)} de 5 estrellas`">
              <Star
                v-for="i in 5"
                :key="i"
                :size="18"
                :class="{ 'pr-star-on': i <= Math.round(average) }"
                aria-hidden="true"
              />
            </span>
            <small class="muted">{{ shown.length }} reseñas</small>
          </div>
          <ul class="pr-bars" aria-label="Reseñas por estrellas">
            <li v-for="b in bars" :key="b.stars">
              <span>{{ b.stars }} <Star :size="12" class="pr-star-on" aria-hidden="true" /></span>
              <span class="pr-bar"><span :style="{ width: `${b.pct}%` }" /></span>
              <small>{{ b.n }}</small>
            </li>
          </ul>
        </div>
        <p v-if="!shown.length" class="sx-card pr-empty">
          <MessageSquareText :size="28" aria-hidden="true" />
          <span
            >Todavía no hay reseñas {{ reviewKind === 'negocio' ? 'del negocio' : 'aquí' }}.</span
          >
        </p>
        <ul v-else class="pr-review-list">
          <li v-for="r in shown" :key="r.id" class="sx-card pr-review">
            <img
              v-if="'productId' in r"
              :src="imageOf(r.productId)"
              alt=""
              class="pr-review-img"
              width="56"
              height="56"
            />
            <span v-else class="pr-avatar" aria-hidden="true">{{
              r.name.slice(0, 1).toUpperCase()
            }}</span>
            <div class="pr-review-main">
              <p class="pr-review-top">
                <strong>{{ r.name }}</strong>
                <span class="pr-stars" :aria-label="`${r.rating} de 5 estrellas`">
                  <Star
                    v-for="i in 5"
                    :key="i"
                    :size="15"
                    :class="{ 'pr-star-on': i <= r.rating }"
                    aria-hidden="true"
                  />
                </span>
              </p>
              <p v-if="'productName' in r" class="pr-review-product">{{ r.productName }}</p>
              <p class="pr-review-text">{{ r.comment || 'Sin comentario.' }}</p>
              <small class="muted">{{ longDate(r.createdAt) }}</small>
            </div>
          </li>
        </ul>
      </template>
    </section>
  </template>
</template>

<style scoped>
.pr-grid {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pr-biz {
  text-align: left;
  border: 1px solid transparent;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px 14px;
  width: 100%;
  height: 100%;
  padding: 18px;
  transition:
    border-color 0.15s,
    transform 0.15s;
  display: grid;
}
.pr-biz:hover,
.pr-biz:focus-visible {
  border-color: var(--blue);
  transform: translateY(-1px);
}
.pr-biz img,
.pr-head img {
  object-fit: cover;
  border-radius: 14px;
  flex: none;
}
.pr-logo {
  color: var(--blue);
  background: var(--blue-soft);
  border-radius: 14px;
  flex: none;
  place-items: center;
  width: 56px;
  height: 56px;
  display: grid;
}
.pr-logo--lg {
  width: 64px;
  height: 64px;
}
.pr-biz-main {
  flex: 1;
  gap: 3px;
  min-width: 0;
  display: grid;
}
.pr-biz-main strong {
  color: var(--ink);
  font-size: 16px;
}
.pr-biz-main small {
  color: var(--muted);
}
.pr-biz-stats {
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  display: flex;
}
.pr-chip {
  color: var(--navy-900);
  background: var(--bg);
  border-radius: 999px;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
}
.pr-chip.muted {
  color: var(--muted);
  font-weight: 500;
}
.pr-chip--green {
  color: #15803d;
  background: #e8f8ed;
}
.pr-chip--wait {
  color: #92400e;
  background: #fff4dc;
}
.pr-go {
  color: var(--blue);
  border-top: 1px solid var(--line);
  grid-column: 1 / -1;
  padding-top: 12px;
  font-size: 13.5px;
  font-weight: 600;
}
.pr-star-on {
  color: #f5b301;
  fill: #f5b301;
}
.pr-stars {
  color: #cbd5e1;
  gap: 1px;
  display: inline-flex;
}
.pr-back {
  color: var(--blue);
  align-items: center;
  gap: 6px;
  margin: 4px 0 12px;
  font-weight: 600;
  display: inline-flex;
}
.pr-head {
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 20px;
  display: flex;
}
.pr-head-main {
  flex: 1;
  min-width: 220px;
}
.pr-head-main .eyebrow {
  margin: 0;
}
.pr-head h1 {
  margin: 2px 0 6px;
  font-size: clamp(22px, 3vw, 30px);
}
.pr-head-meta {
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0;
  display: flex;
}
.pr-rating {
  align-items: center;
  gap: 5px;
  display: inline-flex;
}
.pr-head-actions {
  flex-wrap: wrap;
  gap: 8px;
  display: flex;
}
.pr-small {
  white-space: nowrap;
  min-height: 40px;
  padding: 8px 14px;
  font-size: 14px;
}
.pr-tabs {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  gap: 4px;
  max-width: 100%;
  margin: 16px 0 12px;
  padding: 4px;
  display: inline-flex;
  overflow-x: auto;
}
.pr-tabs button {
  color: var(--text);
  white-space: nowrap;
  border-radius: 10px;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
}
.pr-tabs button.on {
  color: #fff;
  background: var(--navy-900);
}
.pr-msg {
  color: #15803d;
  background: #e8f8ed;
  border-radius: 12px;
  margin: 0 0 12px;
  padding: 10px 14px;
  font-weight: 500;
}
.pr-msg--bad {
  color: #b91c1c;
  background: #fdecec;
}
.pr-note {
  color: #92400e;
  background: #fff4dc;
  border-radius: 12px;
  margin: 0 0 12px;
  padding: 10px 14px;
}
.pr-offers {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 16px;
  display: grid;
}
.pr-box {
  gap: 14px;
  padding: 20px;
  display: grid;
}
.pr-box-head {
  gap: 12px;
  display: flex;
}
.pr-box-head h2 {
  margin: 0 0 2px;
  font-size: 18px;
}
.pr-box-head p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
}
.pr-icon {
  color: var(--blue);
  background: var(--blue-soft);
  border-radius: 12px;
  flex: none;
  place-items: center;
  width: 42px;
  height: 42px;
  display: grid;
}
.pr-icon--green {
  color: #15803d;
  background: #e8f8ed;
}
.pr-state {
  color: var(--muted);
  background: var(--bg);
  border-radius: 10px;
  margin: 0;
  padding: 9px 12px;
  font-size: 14px;
}
.pr-state--on {
  color: #15803d;
  background: #e8f8ed;
}
.pr-form {
  gap: 12px;
  display: grid;
}
.pr-form label {
  color: var(--ink);
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  display: grid;
}
.pr-form input:not([type='range']) {
  border: 1px solid var(--line);
  border-radius: 12px;
  min-height: 44px;
  padding: 0 12px;
  font: inherit;
  font-weight: 500;
}
/* El campo de fecha no se sale de su columna (en algunos navegadores tiene un ancho mínimo). */
.pr-form input[type='date'] {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}
.pr-range span {
  justify-content: space-between;
  display: flex;
}
.pr-range b {
  color: #15803d;
  font-size: 16px;
}
.pr-range input {
  accent-color: #15803d;
  width: 100%;
}
.pr-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  display: grid;
}
.pr-actions {
  flex-wrap: wrap;
  gap: 8px;
  display: flex;
}
.pr-create {
  justify-self: start;
}
.pr-coupon-form {
  border: 1px dashed var(--line);
  border-radius: 14px;
  padding: 14px;
}
.pr-form-head {
  justify-content: space-between;
  align-items: center;
  display: flex;
}
.pr-code-input {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: ui-monospace, 'Cascadia Mono', monospace !important;
}
.pr-icon-btn {
  color: var(--muted);
  border-radius: 8px;
  place-items: center;
  width: 32px;
  height: 32px;
  display: inline-grid;
}
.pr-icon-btn:hover {
  color: var(--ink);
  background: var(--bg);
}
.pr-none {
  color: var(--muted);
  margin: 0;
  font-size: 14px;
}
.pr-coupons {
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pr-coupon {
  flex-wrap: wrap;
  border: 1px solid var(--line);
  border-radius: 14px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 10px;
  display: flex;
}
.pr-ticket {
  color: #fff;
  text-align: center;
  background: linear-gradient(135deg, var(--navy-700, #12408f), var(--navy-900));
  border-radius: 10px;
  flex: none;
  align-content: center;
  width: 62px;
  height: 56px;
  display: grid;
  position: relative;
}
.pr-coupon--expired .pr-ticket,
.pr-coupon--exhausted .pr-ticket,
.pr-coupon--inactive .pr-ticket {
  background: #94a3b8;
}
.pr-ticket-pct {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}
.pr-ticket-off {
  opacity: 0.85;
  font-size: 11px;
}
.pr-coupon-main {
  flex: 1 1 170px;
  min-width: 0;
}
.pr-coupon-code {
  align-items: center;
  gap: 4px;
  margin: 0 0 2px;
  display: flex;
}
.pr-coupon-code code {
  color: var(--navy-900);
  letter-spacing: 0.06em;
  font-size: 15px;
  font-weight: 700;
}
.pr-coupon-main small {
  color: var(--muted);
  font-size: 12.5px;
}
.pr-badge {
  border-radius: 999px;
  padding: 1px 8px;
  font-weight: 600;
}
.pr-badge--active {
  color: #15803d;
  background: #e8f8ed;
}
.pr-badge--expired,
.pr-badge--exhausted,
.pr-badge--inactive {
  color: #475569;
  background: #eef2f7;
}
.pr-link {
  color: var(--blue);
  white-space: nowrap;
  font-size: 13.5px;
  font-weight: 600;
}
.pr-products {
  margin-top: 24px;
}
.pr-section-head {
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
  display: flex;
}
.pr-section-head h2 {
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 19px;
  display: flex;
}
.pr-cards {
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pr-card {
  overflow: hidden;
  padding: 0;
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}
.pr-card--picked {
  border-color: #15803d;
  box-shadow: 0 0 0 2px #15803d;
}
/* Casilla para elegir el producto del descuento (arriba a la derecha de la foto). */
.pr-pick {
  color: var(--ink);
  cursor: pointer;
  background: #fffffff0;
  border-radius: 999px;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  position: absolute;
  top: 8px;
  right: 8px;
  box-shadow: 0 1px 4px #0f172a26;
}
.pr-pick input {
  accent-color: #15803d;
  width: 17px;
  height: 17px;
  margin: 0;
}
.pr-scope {
  grid-template-columns: 1fr 1fr;
  display: grid;
}
.pr-scope button {
  text-align: center;
  white-space: normal;
  line-height: 1.25;
}
.pr-pick-note {
  color: var(--text);
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 6px 12px;
  padding: 10px 12px;
  font-size: 13.5px;
  display: flex;
}
.pr-own {
  color: #166534;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 4px 10px;
  margin: 2px 0;
  font-size: 12.5px;
  font-weight: 600;
  display: flex;
}
.pr-pick-all {
  gap: 12px;
  display: flex;
}
.pr-card-img {
  aspect-ratio: 4 / 3;
  background: var(--bg);
  position: relative;
}
.pr-card-img img {
  object-fit: cover;
  width: 100%;
  height: 100%;
  display: block;
}
.pr-off {
  color: #fff;
  background: #15803d;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 700;
  position: absolute;
  top: 10px;
  left: 10px;
}
.pr-card-body {
  gap: 4px;
  padding: 12px 14px 14px;
  display: grid;
}
.pr-card-body h3 {
  color: var(--ink);
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
}
.pr-price {
  align-items: baseline;
  gap: 8px;
  margin: 0;
  display: flex;
}
.pr-price strong {
  color: var(--navy-900);
  font-size: 16px;
}
.pr-price s {
  color: var(--muted);
  font-size: 13px;
}
.pr-card-rating {
  color: var(--ink);
  justify-self: start;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
}
.pr-card-rating span {
  color: var(--blue);
  font-weight: 500;
}
.pr-review-tools {
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  margin-bottom: 14px;
  display: flex;
}
.pr-seg {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 3px;
  display: inline-flex;
}
.pr-seg button {
  color: var(--text);
  white-space: nowrap;
  border-radius: 9px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
}
.pr-seg button.on {
  color: var(--navy-900);
  background: var(--blue-soft);
}
.pr-select {
  color: var(--muted);
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  display: grid;
}
.pr-select select {
  color: var(--ink);
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 10px;
  min-height: 42px;
  padding: 0 10px;
  font: inherit;
  font-size: 14px;
}
.pr-summary {
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  margin-bottom: 14px;
  padding: 18px 20px;
  display: flex;
}
.pr-avg {
  text-align: center;
  justify-items: center;
  gap: 4px;
  min-width: 120px;
  display: grid;
}
.pr-avg strong {
  color: var(--navy-900);
  font-size: 40px;
  line-height: 1;
}
.pr-bars {
  flex: 1;
  gap: 5px;
  min-width: 220px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pr-bars li {
  grid-template-columns: 34px 1fr 28px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  display: grid;
}
.pr-bars li > span:first-child {
  align-items: center;
  gap: 2px;
  display: inline-flex;
}
.pr-bar {
  background: var(--bg);
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
}
.pr-bar span {
  background: #f5b301;
  border-radius: 999px;
  height: 100%;
  display: block;
}
.pr-empty {
  color: var(--muted);
  text-align: center;
  justify-items: center;
  gap: 8px;
  padding: 32px 16px;
  display: grid;
}
.pr-review-list {
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pr-review {
  gap: 14px;
  padding: 16px;
  display: flex;
}
.pr-avatar {
  color: #fff;
  background: linear-gradient(135deg, var(--green), var(--navy-700, #12408f));
  border-radius: 999px;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  font-weight: 700;
  display: grid;
}
.pr-review-img {
  object-fit: cover;
  border-radius: 12px;
  flex: none;
}
.pr-review-main {
  flex: 1;
  min-width: 0;
}
.pr-review-top {
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin: 0;
  display: flex;
}
.pr-review-product {
  color: var(--blue);
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
}
.pr-review-text {
  color: var(--text);
  margin: 6px 0 4px;
  line-height: 1.55;
}
@media (width<=900px) {
  .pr-offers {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (width<=520px) {
  .pr-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .pr-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .pr-row {
    grid-template-columns: minmax(0, 1fr);
  }
  .pr-head-actions {
    width: 100%;
  }
  .pr-head-actions > * {
    flex: 1;
    justify-content: center;
  }
}
</style>
