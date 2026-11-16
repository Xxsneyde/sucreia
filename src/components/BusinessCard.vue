<script setup lang="ts">
import { ArrowUpRight, BadgeCheck, MapPin, Star } from '@lucide/vue';
import { businessHref } from '@/domain/studio';
import type { Business } from '@/domain/types';
defineProps<{ business: Business }>();
</script>
<template>
  <NuxtLink class="business-card" :to="businessHref(business.id)">
    <div :class="['business-art', business.theme]">
      <img :src="business.cover || `/art/${business.theme}.svg`" alt="" />
      <span class="art-label">{{ business.category }}</span>
      <span class="round-arrow"><ArrowUpRight :size="19" /></span>
    </div>
    <div class="business-card-body">
      <div class="row">
        <h3>{{ business.name }}</h3>
        <BadgeCheck
          v-if="business.verified"
          class="verified"
          :size="19"
          aria-label="Verificado (ejemplo)"
        />
      </div>
      <p class="small muted"><MapPin :size="13" /> {{ business.municipality }}, Sucre</p>
      <div class="card-bottom">
        <span>
          <Star :size="14" fill="currentColor" /> {{ business.local ? 'Nuevo' : business.rating }}
          <span class="muted">{{ business.local ? '· Local' : '· Ejemplo' }}</span>
        </span>
        <span>
          {{
            business.mode === 'products'
              ? 'Ver productos'
              : business.mode === 'booking'
                ? 'Reservar'
                : 'Cotizar'
          }}
          →
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
