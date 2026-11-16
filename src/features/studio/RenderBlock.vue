<script setup lang="ts">
import { computed } from 'vue';
import {
  ArrowUpRight,
  ArrowRight,
  Leaf,
  MapPin,
  Clock,
  MessageCircle,
  Plus,
  Sparkles,
} from '@lucide/vue';
import type { StoreDesign, StoreBlock, StoreProduct } from '@/domain/studio';
import { currency, actionLabel, whatsappUrl } from '@/domain/rules';
import EditableTitle from './EditableTitle.vue';

// Las funciones se reciben como props (onAction, onProduct…) para saber si el padre las pasó;
// en el padre se escriben igual que eventos: @action, @product, @title-change.
const props = withDefaults(
  defineProps<{
    block: StoreBlock;
    design: StoreDesign;
    editable?: boolean;
    onTitleChange?: (value: string) => void;
    onAction?: () => void;
    onProduct?: (p: StoreProduct) => void;
  }>(),
  { editable: false, onTitleChange: undefined, onAction: undefined, onProduct: undefined },
);
const sectionId: Partial<Record<StoreBlock['kind'], string>> = {
  catalog: 'shop-catalog',
  story: 'shop-story',
  contact: 'shop-contact',
};
const image = computed(() => {
  const t = props.design.template;
  const art =
    t === 'sabor' ? 'food' : t === 'alma' ? 'beauty' : t === 'pulso' ? 'service' : 'craft';
  return props.block.image || `/art/${art}.svg`;
});
const lines = computed(() => props.block.text.split('\n').filter(Boolean));
const faqs = computed(() =>
  lines.value.map((line) => {
    const [q, ...answer] = line.split('|');
    return { q, a: answer.join('|') || 'Contáctanos para conocer más.' };
  }),
);
const gallery = computed(() => [
  image.value,
  ...props.design.products.slice(0, 2).map((p) => p.image || image.value),
]);
const whatsapp = computed(() => whatsappUrl(props.design.whatsapp, props.design.name));
function action() {
  if (props.onAction) props.onAction();
  else if (!props.editable)
    document.querySelector('#shop-catalog')?.scrollIntoView({ behavior: 'smooth' });
}
const title = (value: string) => props.onTitleChange?.(value);
</script>

<template>
  <section
    :id="sectionId[block.kind]"
    :class="['shop-section', `shop-${block.kind}`, `tone-${block.tone}`, `layout-${block.layout}`]"
    :style="{ '--block-pad': `${block.padding}px` }"
  >
    <template v-if="block.kind === 'hero'">
      <div class="shop-hero-text">
        <span class="shop-kicker">
          <span /> {{ design.category.toUpperCase() }} · {{ design.municipality.toUpperCase() }}
        </span>
        <EditableTitle :value="block.title" :editable="editable" @change="title" />
        <p>{{ block.text }}</p>
        <button class="shop-button" type="button" @click="action">
          {{
            design.mode === 'products'
              ? 'Explorar la colección'
              : design.mode === 'booking'
                ? 'Encuentra tu momento'
                : 'Conoce nuestros servicios'
          }}
          <ArrowUpRight :size="17" />
        </button>
        <span class="shop-hero-foot">
          <Leaf :size="15" /> Talento local, detalles que importan.
        </span>
      </div>
      <div class="shop-hero-image">
        <img :src="image" :alt="design.name" />
        <span class="shop-image-note">
          Hecho aquí.<br /><b>Hecho con corazón.</b>
          <Sparkles :size="17" />
        </span>
      </div>
    </template>

    <template v-else-if="block.kind === 'catalog'">
      <div class="shop-section-heading">
        <div>
          <span class="shop-kicker">DESCUBRE LO NUESTRO</span>
          <EditableTitle :value="block.title" :editable="editable" @change="title" />
          <p>{{ block.text }}</p>
        </div>
        <span class="shop-product-count">
          {{ design.products.length }} {{ design.mode === 'products' ? 'productos' : 'servicios' }}
        </span>
      </div>
      <div class="shop-products">
        <article v-for="p in design.products" :key="p.id" class="shop-product">
          <div class="shop-product-image">
            <img :src="p.image || image" :alt="p.name" loading="lazy" />
            <button type="button" :aria-label="`Agregar ${p.name}`" @click="onProduct?.(p)">
              <Plus :size="18" />
            </button>
          </div>
          <h3>{{ p.name }}</h3>
          <p>{{ p.description }}</p>
          <div>
            <strong>{{ design.mode === 'quote' ? 'A tu medida' : currency(p.price) }}</strong>
            <button
              v-if="design.mode !== 'products'"
              class="shop-text-button"
              @click="onProduct?.(p)"
            >
              {{ design.mode === 'booking' ? 'Reservar' : 'Cotizar' }} →
            </button>
          </div>
        </article>
      </div>
    </template>

    <template v-else-if="block.kind === 'story'">
      <div class="shop-story-image">
        <img :src="image" alt="Nuestra historia" loading="lazy" />
      </div>
      <div>
        <span class="shop-kicker">EL ORIGEN DE TODO</span>
        <EditableTitle :value="block.title" :editable="editable" @change="title" />
        <p>{{ block.text }}</p>
        <span class="shop-signature">Desde {{ design.municipality }}, con amor.</span>
      </div>
    </template>

    <template v-else-if="block.kind === 'benefits'">
      <EditableTitle :value="block.title" :editable="editable" @change="title" />
      <div class="shop-benefits">
        <div v-for="(text, i) in lines" :key="i">
          <span>{{ ['✳', '◇', '♡', '✦'][i % 4] }}</span>
          <h3>{{ text }}</h3>
        </div>
      </div>
    </template>

    <template v-else-if="block.kind === 'gallery'">
      <EditableTitle :value="block.title" :editable="editable" @change="title" />
      <p>{{ block.text }}</p>
      <div class="shop-gallery">
        <img
          v-for="(src, i) in gallery"
          :key="i"
          :src="src"
          :alt="`Detalle de ${design.name} ${i + 1}`"
          loading="lazy"
        />
      </div>
    </template>

    <template v-else-if="block.kind === 'banner'">
      <EditableTitle :value="block.title" :editable="editable" @change="title" />
      <p>{{ block.text }}</p>
      <button class="shop-button" @click="action">
        {{ actionLabel(design.mode) }} <ArrowRight :size="16" />
      </button>
    </template>

    <template v-else-if="block.kind === 'faq'">
      <EditableTitle :value="block.title" :editable="editable" @change="title" />
      <div class="shop-faq">
        <details v-for="(f, i) in faqs" :key="i">
          <summary>{{ f.q }}<Plus :size="15" /></summary>
          <p>{{ f.a }}</p>
        </details>
      </div>
    </template>

    <template v-else>
      <div>
        <span class="shop-kicker">ESTAMOS CERCA</span>
        <EditableTitle :value="block.title" :editable="editable" @change="title" />
        <p>{{ block.text }}</p>
      </div>
      <div class="shop-contact-details">
        <p><MapPin :size="17" />{{ design.address || design.municipality }}</p>
        <p><Clock :size="17" />{{ design.hours }}</p>
        <template v-if="design.whatsapp && whatsapp">
          <span v-if="editable" class="shop-button"><MessageCircle :size="16" /> WhatsApp</span>
          <a v-else class="shop-button" :href="whatsapp" target="_blank" rel="noopener noreferrer">
            <MessageCircle :size="16" /> Hablar por WhatsApp
          </a>
        </template>
        <span v-else class="shop-contact-note">Encuéntranos en SucreIA</span>
      </div>
    </template>
  </section>
</template>
