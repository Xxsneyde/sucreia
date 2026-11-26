<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Bot, CalendarDays, FileText, Heart, MapPin, ShoppingCart } from '@lucide/vue';
import type { Business } from '@/domain/types';
import { sectorFor, sentenceCase } from '@/domain/sectors';
import { businessHref, thumbnail } from '@/domain/studio';
import { useSession } from '@/lib/session';
import { usePlatform } from '@/lib/platform-store';
import { canBuyRole } from '@/domain/roles';
import StarRating from './StarRating.vue';
import VerifiedBadge from './VerifiedBadge.vue';
// Tarjeta de resultado de la presentación (foto, sector, logo, valoración, Bot IA y acción).
const props = defineProps<{ business: Business }>();
const session = useSession();
const p = usePlatform();
const router = useRouter();
const href = computed(() => businessHref(props.business.id));
const sector = computed(() => sectorFor(props.business.category));
const favorite = computed(() => !!p.data.value?.favorites.includes(props.business.id));
const action = computed(
  () =>
    ({
      products: { label: 'Solicitar ahora', icon: ShoppingCart, tab: 'productos' },
      booking: { label: 'Reservar ahora', icon: CalendarDays, tab: 'productos' },
      quote: { label: 'Cotizar ahora', icon: FileText, tab: 'productos' },
    })[props.business.mode],
);
const art = (src?: string) => !src || src.startsWith('/art/');
async function toggle() {
  if (!session.user) {
    await router.push(`/ingresar?volver=${encodeURIComponent(router.currentRoute.value.fullPath)}`);
    return;
  }
  try {
    await p.run('POST', `/favoritos/${props.business.id}`);
  } catch {
    /* el aviso lo muestra la página */
  }
}
</script>
<template>
  <article class="sx-biz">
    <div class="sx-biz-media">
      <NuxtLink :to="href" tabindex="-1" aria-hidden="true">
        <img
          :src="thumbnail(business.cover) || `/art/${business.theme}.svg`"
          :class="{ art: art(business.cover) }"
          alt=""
          loading="lazy"
        />
      </NuxtLink>
      <span class="sx-biz-tag">{{ sector.id }}</span>
      <button
        v-if="!session.user || canBuyRole(session.user.role)"
        type="button"
        :class="['sx-heart', { on: favorite }]"
        :aria-pressed="favorite"
        :aria-label="
          favorite
            ? `Quitar ${business.name} de favoritos`
            : `Guardar ${business.name} en favoritos`
        "
        @click="toggle"
      >
        <Heart :size="19" />
      </button>
    </div>
    <div class="sx-biz-body">
      <div class="sx-biz-id">
        <span class="sx-logo">
          <img v-if="business.logo" :src="thumbnail(business.logo)" alt="" loading="lazy" />
          <template v-else>{{ business.name.slice(0, 1) }}</template>
        </span>
        <div style="min-width: 0">
          <h3>
            <NuxtLink :to="href">{{ sentenceCase(business.name) }}</NuxtLink
            ><VerifiedBadge v-if="business.verified" :size="17" />
          </h3>
          <span class="sx-place"><MapPin :size="13" /> {{ business.municipality }}, Sucre</span>
          <StarRating :rating="business.rating" :count="business.reviewCount ?? 0" />
        </div>
      </div>
      <p class="sx-biz-desc">{{ business.description }}</p>
      <div class="sx-biz-actions">
        <NuxtLink class="sx-btn sx-btn--soft sx-btn--sm" :to="`${href}&ver=bot`"
          ><Bot :size="16" /> Bot IA</NuxtLink
        >
        <NuxtLink class="sx-btn sx-btn--soft sx-btn--sm" :to="`${href}&ver=${action.tab}`"
          ><component :is="action.icon" :size="16" /> {{ action.label }}</NuxtLink
        >
      </div>
    </div>
  </article>
</template>
