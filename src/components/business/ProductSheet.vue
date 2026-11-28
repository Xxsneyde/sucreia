<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  X,
} from '@lucide/vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useCarousel } from '@/composables/carousel';
import { cleanDetails } from '@/domain/product-details';
import { currency } from '@/domain/rules';
import { sentenceCase } from '@/domain/sectors';
import { thumbnail, type StoreProduct } from '@/domain/studio';
import type { BusinessMode } from '@/domain/types';
import ReviewList, { type ReviewItem } from '@/components/sucre/ReviewList.vue';
// Ficha de un producto o servicio: hasta tres fotos (carrusel), precio, ficha técnica, compra o
// reserva y las valoraciones del producto (quien lo compró puede calificarlo).
const props = defineProps<{
  product: StoreProduct;
  mode: BusinessMode;
  /** Imagen si el producto no tiene foto. */
  fallback: string;
  soldOut?: boolean;
  storeId?: string;
  rating?: { rating: number; count: number };
}>();
const emit = defineEmits<{ close: []; add: [quantity: number]; book: []; rated: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
onMounted(() => dialog.value?.showModal());
const photos = computed(() => {
  const list = [props.product.image, ...(props.product.gallery ?? [])].filter(Boolean);
  return list.length ? list.slice(0, 3) : [props.fallback];
});
const { index, go, pause, resume } = useCarousel(
  computed(() => photos.value.length),
  3500,
);
const quantity = ref(1);
const details = computed(() => cleanDetails(props.product.details));
const art = (src: string) => src.startsWith('/art/');
const step = (delta: number) => go(index.value + delta);
const session = useSession();
// --- Valoraciones del producto ----------------------------------------------------------------
const reviews = ref<ReviewItem[]>([]);
const canReview = ref(false);
const myRating = ref(0);
const myComment = ref('');
const sending = ref(false);
const notice = ref('');
const average = computed(() =>
  reviews.value.length
    ? reviews.value.reduce((n, r) => n + r.rating, 0) / reviews.value.length
    : (props.rating?.rating ?? 0),
);
const count = computed(() => reviews.value.length || props.rating?.count || 0);
async function loadReviews() {
  if (!props.storeId) return;
  try {
    const result = await api<{
      reviews: ReviewItem[];
      canReview: boolean;
      mine?: { rating: number; comment: string };
    }>('GET', `/plataforma/negocios/${props.storeId}/productos/${props.product.id}/resenas`);
    reviews.value = result.reviews;
    canReview.value = result.canReview;
    if (result.mine) {
      myRating.value = result.mine.rating;
      myComment.value = result.mine.comment;
    }
  } catch {
    // Sin valoraciones cargadas se muestra el promedio del negocio.
  }
}
onMounted(loadReviews);
async function rate() {
  if (!myRating.value) {
    notice.value = 'Elige de 1 a 5 estrellas.';
    return;
  }
  sending.value = true;
  notice.value = '';
  try {
    await api(
      'POST',
      `/plataforma/negocios/${props.storeId}/productos/${props.product.id}/resenas`,
      {
        rating: myRating.value,
        comment: myComment.value,
      },
    );
    notice.value = '¡Gracias! Tu valoración quedó publicada.';
    await loadReviews();
    emit('rated');
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    sending.value = false;
  }
}
// Deslizar las fotos con el dedo.
let touchX = 0;
function touchStart(e: TouchEvent) {
  touchX = e.touches[0]?.clientX ?? 0;
}
function touchEnd(e: TouchEvent) {
  const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX;
  if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
}
function primary() {
  if (props.mode === 'products') emit('add', quantity.value);
  else emit('book');
}
</script>
<template>
  <dialog
    ref="dialog"
    class="ps"
    :aria-label="product.name"
    @close="emit('close')"
    @click.self="dialog?.close()"
  >
    <div class="ps-body">
      <button type="button" class="ps-close" aria-label="Cerrar" @click="dialog?.close()">
        <X :size="20" />
      </button>
      <div class="ps-gallery">
        <div
          class="ps-main"
          @touchstart.passive="
            pause();
            touchStart($event);
          "
          @touchend.passive="touchEnd"
          @mouseenter="pause"
          @mouseleave="resume"
          @focusin="pause"
          @focusout="resume"
        >
          <div class="ps-track" :style="{ transform: `translateX(-${index * 100}%)` }">
            <img
              v-for="(src, i) in photos"
              :key="src + i"
              :src="src"
              :alt="`${product.name}, foto ${i + 1} de ${photos.length}`"
              :aria-hidden="i !== index"
              :class="{ art: art(src) }"
            />
          </div>
          <template v-if="photos.length > 1">
            <button type="button" class="ps-nav left" aria-label="Foto anterior" @click="step(-1)">
              <ChevronLeft :size="20" />
            </button>
            <button type="button" class="ps-nav right" aria-label="Foto siguiente" @click="step(1)">
              <ChevronRight :size="20" />
            </button>
            <span class="ps-count">{{ index + 1 }} / {{ photos.length }}</span>
          </template>
        </div>
        <div v-if="photos.length > 1" class="ps-thumbs" role="group" aria-label="Fotos">
          <button
            v-for="(src, i) in photos"
            :key="src + i"
            type="button"
            :class="{ on: i === index }"
            :aria-label="`Ver foto ${i + 1}`"
            :aria-pressed="i === index"
            @click="go(i)"
          >
            <img :src="thumbnail(src)" alt="" />
          </button>
        </div>
      </div>
      <div class="ps-info">
        <p v-if="product.category" class="ps-group">{{ product.category }}</p>
        <h2>{{ sentenceCase(product.name) }}</h2>
        <p class="ps-price">
          {{ product.price ? currency(product.price) : 'Precio a convenir' }}
          <small v-if="mode === 'booking' && product.duration"
            ><Clock :size="14" /> {{ product.duration }} min</small
          >
        </p>
        <p class="ps-rating">
          <template v-if="count">
            <span class="ps-stars" :aria-label="`${average.toFixed(1)} de 5 estrellas`">
              <Star
                v-for="i in 5"
                :key="i"
                :size="16"
                :fill="i <= Math.round(average) ? 'currentColor' : 'none'"
                aria-hidden="true"
              />
            </span>
            <strong>{{ average.toFixed(1) }}</strong>
            <a href="#ps-resenas" class="muted"
              >({{ count }} {{ count === 1 ? 'valoración' : 'valoraciones' }})</a
            >
          </template>
          <span v-else class="muted">Este producto aún no tiene valoraciones.</span>
        </p>
        <p v-if="product.description" class="ps-desc">{{ product.description }}</p>
        <section v-if="details.length" class="ps-spec" aria-label="Ficha">
          <h3>{{ mode === 'products' ? 'Detalles del producto' : 'Detalles del servicio' }}</h3>
          <dl>
            <template v-for="d in details" :key="d.label">
              <dt>{{ d.label }}</dt>
              <dd>{{ d.value }}</dd>
            </template>
          </dl>
        </section>
        <p v-else class="ps-empty">
          El negocio aún no agregó más detalles. Pregúntale por WhatsApp o con el asistente.
        </p>
        <div class="ps-buy">
          <p v-if="soldOut" class="danger" role="status">Agotado por ahora.</p>
          <div
            v-if="mode === 'products'"
            class="ps-qty"
            role="group"
            :aria-label="`Cantidad de ${product.name}`"
          >
            <button type="button" aria-label="Menos" @click="quantity = Math.max(1, quantity - 1)">
              <Minus :size="16" />
            </button>
            <span>{{ quantity }}</span>
            <button type="button" aria-label="Más" @click="quantity = Math.min(99, quantity + 1)">
              <Plus :size="16" />
            </button>
          </div>
          <button type="button" class="sx-btn ps-main-btn" :disabled="soldOut" @click="primary">
            <template v-if="mode === 'products'"
              ><ShoppingCart :size="18" /> Agregar ·
              {{ currency(product.price * quantity) }}</template
            >
            <template v-else-if="mode === 'booking'"
              ><CalendarDays :size="18" /> Elegir día y hora</template
            >
            <template v-else><FileText :size="18" /> Solicitar cotización</template>
          </button>
        </div>
        <section v-if="storeId" id="ps-resenas" class="ps-reviews" aria-label="Valoraciones">
          <h3>Valoraciones del producto</h3>
          <form v-if="canReview" class="ps-rate" @submit.prevent="rate">
            <span class="small">{{
              myRating ? 'Tu valoración' : '¿Lo compraste? Califícalo'
            }}</span>
            <div class="ps-rate-stars" role="radiogroup" aria-label="Tu calificación">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                role="radio"
                :aria-checked="myRating === i"
                :aria-label="`${i} estrella${i > 1 ? 's' : ''}`"
                :class="{ on: i <= myRating }"
                @click="myRating = i"
              >
                <Star :size="24" :fill="i <= myRating ? 'currentColor' : 'none'" />
              </button>
            </div>
            <textarea
              v-model="myComment"
              maxlength="500"
              rows="2"
              placeholder="Cuéntales a otros cómo te pareció (opcional)"
            />
            <button class="sx-btn sx-btn--sm" :disabled="sending">
              {{ sending ? 'Enviando…' : 'Publicar valoración' }}
            </button>
            <p v-if="notice" class="small" role="status">{{ notice }}</p>
          </form>
          <p v-else-if="!session.user" class="small muted">
            Quienes compran este producto pueden calificarlo.
          </p>
          <ReviewList :reviews="reviews" compact>
            <template #empty>
              <p class="small muted">Todavía nadie lo ha calificado.</p>
            </template>
          </ReviewList>
        </section>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.ps {
  width: min(900px, 100vw - 20px);
  max-height: calc(100dvh - 20px);
  box-shadow: var(--shadow-lg);
  border: 0;
  border-radius: 22px;
  padding: 0;
  overflow: auto;
}
.ps::backdrop {
  background: #071a428c;
}
.ps-body {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  display: grid;
  position: relative;
}
.ps-close {
  z-index: 3;
  width: 38px;
  height: 38px;
  box-shadow: var(--shadow);
  background: #fff;
  border-radius: 50%;
  place-items: center;
  display: grid;
  position: absolute;
  top: 12px;
  right: 12px;
}
.ps-gallery {
  background: var(--bg);
  gap: 10px;
  padding: 14px;
  display: grid;
}
.ps-main {
  aspect-ratio: 1;
  touch-action: pan-y;
  background: #fff;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}
.ps-track {
  height: 100%;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
}
.ps-track img {
  object-fit: cover;
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}
@media (prefers-reduced-motion: reduce) {
  .ps-track {
    transition: none;
  }
}
.ps-main img.art {
  object-fit: contain;
  padding: 18%;
}
.ps-nav {
  width: 38px;
  height: 38px;
  box-shadow: var(--shadow);
  background: #ffffffeb;
  border-radius: 50%;
  place-items: center;
  margin-top: -19px;
  display: grid;
  position: absolute;
  top: 50%;
}
.ps-nav.left {
  left: 10px;
}
.ps-count,
.ps-nav.right {
  right: 10px;
}
.ps-count {
  color: #fff;
  background: #071a42b3;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  position: absolute;
  bottom: 10px;
}
.ps-thumbs {
  gap: 8px;
  display: flex;
}
.ps-thumbs button {
  background: #fff;
  border: 2px solid #0000;
  border-radius: 12px;
  width: 64px;
  height: 64px;
  padding: 0;
  overflow: hidden;
}
.ps-thumbs button.on {
  border-color: var(--green);
}
.ps-thumbs img {
  object-fit: cover;
  width: 100%;
  height: 100%;
}
.ps-info {
  flex-direction: column;
  gap: 10px;
  padding: 26px 24px 22px;
  display: flex;
}
.ps-group {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--green-dark);
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}
.ps-info h2 {
  margin: 0;
  padding-right: 34px;
  font-size: 24px;
  line-height: 1.2;
}
.ps-price {
  color: var(--ink);
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  display: flex;
}
.ps-price small {
  color: var(--muted);
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
}
.ps-desc {
  white-space: pre-wrap;
  color: var(--text);
  margin: 0;
}
.ps-spec h3 {
  margin: 6px 0 8px;
  font-size: 15px;
}
.ps-spec dl {
  border: 1px solid var(--line);
  border-radius: 12px;
  grid-template-columns: minmax(0, 40%) minmax(0, 1fr);
  margin: 0;
  display: grid;
  overflow: hidden;
}
.ps-spec dd,
.ps-spec dt {
  overflow-wrap: anywhere;
  border-bottom: 1px solid var(--line);
  margin: 0;
  padding: 9px 12px;
}
.ps-spec dt {
  background: var(--bg);
  color: var(--ink);
  font-weight: 600;
}
.ps-spec dl > :deep(:nth-last-child(-n + 2)) {
  border-bottom: 0;
}
.ps-empty {
  color: var(--muted);
  margin: 0;
  font-size: 13px;
}
.ps-buy {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  padding-top: 14px;
}
.ps-buy,
.ps-qty {
  align-items: center;
  display: flex;
}
.ps-qty {
  background: var(--bg);
  border-radius: 999px;
  gap: 6px;
  padding: 4px;
}
.ps-qty button {
  background: #fff;
  border-radius: 50%;
  place-items: center;
  width: 36px;
  height: 36px;
  display: grid;
}
.ps-qty span {
  text-align: center;
  min-width: 24px;
  font-weight: 700;
}
.ps-main-btn {
  flex: 1;
  min-height: 48px;
}
@keyframes ps-fade {
  0% {
    opacity: 0.4;
  }
}
@media (width<=760px) {
  .ps {
    border-radius: 22px 22px 0 0;
    width: 100vw;
    max-width: 100vw;
    max-height: 94dvh;
    margin: auto 0 0;
  }
  .ps-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .ps-main {
    aspect-ratio: 4/3;
  }
  .ps-info h2 {
    font-size: 21px;
  }
  .ps-buy {
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
  .ps-info {
    padding: 18px 16px;
  }
  .ps-buy {
    background: #fff;
    padding: 12px 0 4px;
    position: sticky;
    bottom: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ps-main img {
    animation: none;
  }
}
.ps-rating {
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  display: flex;
}
.ps-rating a {
  color: inherit;
}
.ps-stars {
  color: #f5b301;
  display: inline-flex;
}
.ps-reviews {
  border-top: 1px solid var(--line);
  gap: 10px;
  margin-top: 6px;
  padding-top: 14px;
  display: grid;
}
.ps-reviews h3 {
  margin: 0;
  font-size: 15px;
}
.ps-rate {
  background: var(--bg);
  border-radius: 14px;
  gap: 8px;
  padding: 12px;
  display: grid;
}
.ps-rate-stars {
  gap: 2px;
  display: flex;
}
.ps-rate-stars button {
  color: #c7ced9;
  background: 0 0;
  padding: 2px;
}
.ps-rate-stars button.on {
  color: #f5b301;
}
.ps-rate textarea {
  border: 1px solid var(--line);
  width: 100%;
  font: inherit;
  resize: vertical;
  border-radius: 10px;
  padding: 8px 10px;
}
.ps-rate .sx-btn {
  justify-self: start;
}
</style>
