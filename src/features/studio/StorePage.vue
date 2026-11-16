<script setup lang="ts">
import { computed } from 'vue';
import {
  ArrowRight,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Plus,
  ShoppingBag,
  Star,
} from '@lucide/vue';
import { onColor, styles, type StoreDesign, type StoreProduct } from '@/domain/studio';
import { purchaseSteps } from '@/domain/designs';
import { currency, whatsappUrl } from '@/domain/rules';

// Página de la tienda. La misma estructura para todos los estilos; cada estilo (clase sp--*)
// cambia composición, tipografía y detalles en assets/css/plantillas.css.
// Las funciones llegan como props para saber si el padre las pasó (@product, @action).
const props = withDefaults(
  defineProps<{
    design: StoreDesign;
    /** false en miniaturas: sin foco ni clics (inert). */
    interactive?: boolean;
    onProduct?: (p: StoreProduct) => void;
    onAction?: () => void;
  }>(),
  { interactive: true, onProduct: undefined, onAction: undefined },
);

const d = computed(() => props.design);
const style = computed(() => styles[d.value.style]);
const vars = computed(() => ({
  '--sp-primary': d.value.colors.primary,
  '--sp-bg': d.value.colors.background,
  '--sp-text': d.value.colors.text,
  '--sp-accent': d.value.colors.accent,
  '--sp-on-primary': onColor(d.value.colors.primary),
  '--sp-on-accent': onColor(d.value.colors.accent),
  '--sp-heading': style.value.fonts.heading,
  '--sp-body': style.value.fonts.body,
  '--sp-radius': `${style.value.radius}px`,
  '--sp-space': String(style.value.spacing),
}));
const titleLines = computed(() => d.value.content.heroTitle.split('\n').filter(Boolean));
const steps = computed(() => purchaseSteps(d.value.mode));
const whatsapp = computed(() => whatsappUrl(d.value.whatsapp, d.value.name));
const monogram = computed(() => d.value.name.trim().slice(0, 1).toUpperCase() || 'S');
const ctaLabel = computed(() =>
  d.value.mode === 'products'
    ? 'Ver productos'
    : d.value.mode === 'booking'
      ? 'Reservar una cita'
      : 'Pedir cotización',
);
const verb = computed(() =>
  d.value.mode === 'products' ? 'Comprar' : d.value.mode === 'booking' ? 'Reservar' : 'Contratar',
);
const headerLabel = computed(() =>
  d.value.mode === 'products' ? 'Pedir' : d.value.mode === 'booking' ? 'Reservar' : 'Cotizar',
);
const itemLabel = computed(() => (d.value.mode === 'products' ? 'productos' : 'servicios'));
// Marquesina solo en estilos que la usan como recurso gráfico.
const ticker = computed(() => ['brutalista', 'retro'].includes(d.value.style));

function action() {
  if (props.onAction) props.onAction();
  else document.querySelector('#sp-catalogo')?.scrollIntoView({ behavior: 'smooth' });
}
const price = (p: StoreProduct) => (d.value.mode === 'quote' ? 'A convenir' : currency(p.price));
</script>

<template>
  <div
    :class="['sp', `sp--${design.style}`]"
    :style="vars"
    :inert="!interactive || undefined"
    :data-style="design.style"
  >
    <div v-if="ticker" class="sp-ticker" aria-hidden="true">
      <div>
        <span v-for="n in 3" :key="n">
          <template v-for="p in design.content.promises" :key="p">{{ p }} <b>✦</b> </template>
        </span>
      </div>
    </div>

    <header class="sp-header">
      <div class="sp-brand">
        <img v-if="design.logo" :src="design.logo" alt="" />
        <span v-else class="sp-monogram">{{ monogram }}</span>
        <strong>{{ design.name || 'Tu emprendimiento' }}</strong>
      </div>
      <nav aria-label="Secciones de la tienda">
        <a href="#sp-catalogo">{{ design.mode === 'products' ? 'Productos' : 'Servicios' }}</a>
        <a href="#sp-historia">Nosotros</a>
        <a href="#sp-contacto">Contacto</a>
      </nav>
      <button class="sp-header-cta" type="button" @click="action">
        <ShoppingBag :size="16" />
        <span>{{ headerLabel }}</span>
      </button>
    </header>

    <section class="sp-hero">
      <div class="sp-hero-copy">
        <p class="sp-kicker">
          <span>{{ design.category }}</span> · <span>{{ design.municipality }}, Sucre</span>
        </p>
        <h2 class="sp-title">
          <span v-for="(line, i) in titleLines" :key="i">{{ line }}</span>
        </h2>
        <p class="sp-lead">{{ design.content.heroText }}</p>
        <div class="sp-actions">
          <button class="sp-button" type="button" @click="action">
            {{ ctaLabel }} <ArrowRight :size="17" />
          </button>
          <a
            v-if="whatsapp && interactive"
            class="sp-link"
            :href="whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle :size="16" /> Escribir por WhatsApp
          </a>
          <a v-else class="sp-link" href="#sp-pasos">Cómo {{ verb.toLowerCase() }}</a>
        </div>
        <ul class="sp-promises">
          <li v-for="p in design.content.promises" :key="p"><Check :size="15" />{{ p }}</li>
        </ul>
      </div>
      <figure class="sp-hero-media">
        <img :src="design.content.heroImage" :alt="design.name" />
        <figcaption class="sp-badge">
          <Star :size="14" /> Hecho en {{ design.municipality || 'Sucre' }}
        </figcaption>
      </figure>
    </section>

    <section id="sp-catalogo" class="sp-section sp-catalog">
      <div class="sp-section-head">
        <span class="sp-index">01</span>
        <div>
          <h3>{{ design.content.catalogTitle }}</h3>
          <p>{{ design.content.catalogText }}</p>
        </div>
        <span class="sp-count">{{ design.products.length }} {{ itemLabel }}</span>
      </div>
      <div class="sp-products">
        <article v-for="p in design.products" :key="p.id" class="sp-product">
          <div class="sp-product-media">
            <img :src="p.image || design.content.heroImage" :alt="p.name" loading="lazy" />
          </div>
          <div class="sp-product-body">
            <h4>{{ p.name }}</h4>
            <p>{{ p.description }}</p>
            <div class="sp-product-foot">
              <strong class="sp-price">{{ price(p) }}</strong>
              <button
                v-if="design.mode === 'products'"
                class="sp-add"
                type="button"
                :aria-label="`Agregar ${p.name}`"
                @click="onProduct?.(p)"
              >
                <Plus :size="18" />
              </button>
              <button v-else class="sp-text-button" type="button" @click="onProduct?.(p)">
                {{ design.mode === 'booking' ? 'Reservar' : 'Cotizar' }} →
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section id="sp-historia" class="sp-section sp-story">
      <figure class="sp-story-media">
        <img :src="design.content.storyImage" alt="" loading="lazy" />
      </figure>
      <div class="sp-story-copy">
        <span class="sp-index">02</span>
        <h3>{{ design.content.storyTitle }}</h3>
        <p>{{ design.content.storyText }}</p>
        <p class="sp-signature">— {{ design.name || 'Tu emprendimiento' }}</p>
      </div>
    </section>

    <section id="sp-pasos" class="sp-section sp-steps">
      <div class="sp-section-head">
        <span class="sp-index">03</span>
        <div>
          <h3>{{ verb }} es así de fácil</h3>
          <p>Sin sorpresas: sabes qué pides, cuánto cuesta y cuándo está listo.</p>
        </div>
      </div>
      <ol>
        <li v-for="([title, text], i) in steps" :key="title">
          <span class="sp-step-n">{{ i + 1 }}</span>
          <strong>{{ title }}</strong>
          <span>{{ text }}</span>
        </li>
      </ol>
    </section>

    <section id="sp-contacto" class="sp-section sp-contact">
      <div>
        <h3>{{ design.content.contactTitle }}</h3>
        <p>{{ design.content.contactText }}</p>
      </div>
      <ul class="sp-contact-list">
        <li><MapPin :size="18" />{{ design.address || `${design.municipality}, Sucre` }}</li>
        <li><Clock :size="18" />{{ design.hours }}</li>
        <li v-if="whatsapp">
          <MessageCircle :size="18" />
          <a v-if="interactive" :href="whatsapp" target="_blank" rel="noopener noreferrer">
            WhatsApp {{ design.whatsapp }}
          </a>
          <span v-else>WhatsApp {{ design.whatsapp }}</span>
        </li>
      </ul>
      <button class="sp-button" type="button" @click="action">
        {{ ctaLabel }} <ArrowRight :size="17" />
      </button>
    </section>

    <footer class="sp-footer">
      <span>{{ design.name }} · {{ design.municipality }}, Sucre</span>
      <span>Tienda local en SucreIA</span>
    </footer>
  </div>
</template>
