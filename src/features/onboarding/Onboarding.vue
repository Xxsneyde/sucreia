<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShoppingBag,
  CalendarDays,
  MessageSquare,
  Palette,
  Sparkles,
} from '@lucide/vue';
import { useDemo } from '@/lib/demo-store';
import { useStudio } from '@/lib/studio-store';
import {
  createDesign,
  templates,
  isDesign,
  fonts,
  type StoreDesign,
  type StoreProduct,
} from '@/domain/studio';
import type { BusinessMode } from '@/domain/types';
import ImageField from '@/features/studio/ImageField.vue';
import ProductFields from '@/features/studio/ProductFields.vue';

const draftKey = 'sucreia:onboarding:v2';
const steps = ['Tu esencia', 'Tu estilo', 'Tu catálogo', 'Todo listo'];
const headings = [
  'Toda gran historia\nempieza contigo.',
  'Encuentra un estilo\nque hable de ti.',
  'Dales el lugar\nque se merecen.',
  'Tu idea está lista\npara tomar forma.',
];
const intros = [
  'Cuéntanos qué haces. Nosotros te ayudamos a darle forma.',
  'Este es tu punto de partida. Podrás cambiar cada detalle en el editor.',
  'Empieza con tus tres mejores productos o servicios.',
  'Ahora viene la mejor parte: diseñar tu tienda a tu manera.',
];
const categories = [
  'Artesanías',
  'Gastronomía',
  'Belleza',
  'Servicios',
  'Moda',
  'Turismo',
  'Salud',
  'Otro',
];
const modes: { id: BusinessMode; title: string; text: string; icon: typeof ShoppingBag }[] = [
  { id: 'products', title: 'Vendo productos', text: 'Catálogo y pedidos', icon: ShoppingBag },
  { id: 'booking', title: 'Atiendo con citas', text: 'Agenda y reservas', icon: CalendarDays },
  { id: 'quote', title: 'Hago cotizaciones', text: 'Proyectos a medida', icon: MessageSquare },
];

const studio = useStudio();
const demo = useDemo();
const router = useRouter();
// shallowRef: el diseño se reemplaza completo en cada cambio (objetos planos, sin proxies).
const design = shallowRef<StoreDesign>(createDesign('raices', ''));
const step = ref(0);
const ready = ref(false);
const error = ref('');
const busy = ref(false);
const storageError = ref(false);

// Recupera el borrador del configurador cuando la demo ya cargó el navegador.
watch(
  () => demo.ready,
  (isReady) => {
    if (!isReady || ready.value) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (isDesign(saved)) design.value = saved;
      } else if (demo.draft.name)
        design.value = {
          ...design.value,
          name: demo.draft.name,
          description: demo.draft.description,
          category: demo.draft.category,
          mode: demo.draft.mode,
        };
    } catch {
      storageError.value = true;
    }
    ready.value = true;
  },
  { immediate: true },
);
watch(design, (value) => {
  if (!ready.value) return;
  try {
    localStorage.setItem(draftKey, JSON.stringify(value));
  } catch {
    storageError.value = true;
  }
});

const template = computed(
  () => templates.find((t) => t.id === design.value.template) ?? templates[0],
);
function set(change: Partial<StoreDesign>) {
  design.value = { ...design.value, ...change };
}
function chooseTemplate(t: (typeof templates)[number]) {
  const fresh = createDesign(t.id, design.value.name);
  set({ template: t.id, colors: { ...t.colors }, font: t.font, blocks: fresh.blocks });
}
function back() {
  step.value -= 1;
  error.value = '';
}
function next() {
  const d = design.value;
  error.value = '';
  if (step.value === 0 && (!d.name.trim() || !d.municipality.trim())) {
    error.value = 'Cuéntanos el nombre de tu negocio y el municipio.';
    return;
  }
  if (step.value === 0 && d.whatsapp && !/^\+?[1-9]\d{9,14}$/.test(d.whatsapp)) {
    error.value = 'Escribe el WhatsApp con código de país, por ejemplo +57 seguido de tu número.';
    return;
  }
  if (step.value === 2 && (d.products.length < 3 || d.products.some((p) => !p.name.trim()))) {
    error.value = 'Agrega al menos tres ofertas con nombre para empezar.';
    return;
  }
  if (step.value < 3) {
    step.value += 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  busy.value = true;
  try {
    const id = studio.create(d);
    router.push(`/estudio/editor?id=${id}`);
  } catch (e) {
    error.value = (e as Error).message;
    busy.value = false;
  }
}
const value = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <div class="onboarding-flow">
    <div class="onboarding-top">
      <NuxtLink class="back-link" to="/estudio"><ArrowLeft :size="15" /> Mis tiendas</NuxtLink>
      <span>DE UNA IDEA A TU PROPIO ESPACIO</span>
    </div>
    <div class="onboarding-heading">
      <span class="studio-eyebrow">TU PRÓXIMO GRAN PASO</span>
      <h1>{{ headings[step] }}</h1>
      <p>{{ intros[step] }}</p>
    </div>
    <nav class="onboarding-progress" aria-label="Pasos de configuración">
      <div
        v-for="(label, i) in steps"
        :key="label"
        :class="i <= step ? 'done' : ''"
        :aria-current="i === step ? 'step' : undefined"
      >
        <span
          ><Check v-if="i < step" :size="15" /><template v-else>{{ i + 1 }}</template></span
        >
        <strong>{{ label }}</strong>
      </div>
    </nav>
    <div class="onboarding-layout">
      <section class="onboarding-sheet">
        <div v-if="step === 0" class="studio-form">
          <label>
            Nombre del negocio
            <input
              autocomplete="organization"
              placeholder="Ej. Tejidos del Caribe"
              maxlength="80"
              :value="design.name"
              :disabled="!ready"
              @input="set({ name: value($event) })"
            />
          </label>
          <div class="form-two">
            <label>
              Categoría
              <select :value="design.category" @change="set({ category: value($event) })">
                <option v-for="x in categories" :key="x">{{ x }}</option>
              </select>
            </label>
            <label>
              Municipio
              <input
                placeholder="Ej. Sincelejo"
                maxlength="80"
                :value="design.municipality"
                @input="set({ municipality: value($event) })"
              />
            </label>
          </div>
          <label>
            La historia de tu negocio
            <textarea
              placeholder="¿Qué haces y qué te hace especial?"
              maxlength="1000"
              :value="design.description"
              @input="set({ description: value($event) })"
            />
          </label>
          <span class="field-label">¿Cómo atenderás a tus clientes?</span>
          <div class="business-mode-options">
            <button
              v-for="m in modes"
              :key="m.id"
              type="button"
              :class="design.mode === m.id ? 'selected' : ''"
              :aria-pressed="design.mode === m.id"
              @click="set({ mode: m.id })"
            >
              <component :is="m.icon" :size="23" />
              <strong>{{ m.title }}</strong>
              <span>{{ m.text }}</span>
            </button>
          </div>
          <label>
            WhatsApp del negocio
            <span class="field-help">Opcional · puedes agregarlo después</span>
            <input
              type="tel"
              placeholder="+57…"
              maxlength="16"
              :value="design.whatsapp"
              @input="
                ($event.target as HTMLInputElement).value = value($event).replace(/[^+\d]/g, '');
                set({ whatsapp: value($event) });
              "
            />
          </label>
        </div>
        <div v-else-if="step === 1">
          <div class="template-picker">
            <button
              v-for="t in templates"
              :key="t.id"
              type="button"
              :class="['template-choice', { selected: design.template === t.id }]"
              @click="chooseTemplate(t)"
            >
              <div
                class="template-preview"
                :style="{ background: t.colors.background, color: t.colors.text }"
              >
                <span class="template-preview-nav">{{ design.name || 'Tu marca' }}<i /></span>
                <div class="template-preview-hero" :style="{ background: t.colors.accent }">
                  <div :style="{ fontFamily: fonts[t.font].family }">
                    Lo que amas,<br />más cerca.
                    <i :style="{ background: t.colors.primary }" />
                  </div>
                  <img :src="`/art/${t.theme}.svg`" alt="" />
                </div>
                <div class="template-preview-products">
                  <i v-for="i in 3" :key="i" :style="{ background: t.colors.accent }" />
                </div>
              </div>
              <div class="template-choice-caption">
                <div>
                  <strong>{{ t.name }}</strong>
                  <span>{{ t.category }}</span>
                </div>
                <span class="template-check">
                  <Check v-if="design.template === t.id" :size="15" />
                </span>
              </div>
            </button>
          </div>
          <div class="studio-form">
            <ImageField
              label="Tu logo (opcional)"
              :model-value="design.logo"
              @update:model-value="(logo: string) => set({ logo })"
            />
          </div>
        </div>
        <template v-else-if="step === 2">
          <p class="field-help">
            Incluimos ejemplos para ayudarte a comenzar. Reemplázalos por tus propias ofertas,
            fotografías y precios.
          </p>
          <ProductFields
            :mode="design.mode"
            :products="design.products"
            @update="(products: StoreProduct[]) => set({ products })"
          />
        </template>
        <div v-else class="onboarding-summary">
          <div class="summary-star"><Sparkles :size="38" /></div>
          <h2>{{ design.name }}</h2>
          <p>{{ design.description }}</p>
          <div class="summary-checks">
            <span><Check :size="16" /> {{ design.category }} · {{ design.municipality }}</span>
            <span><Check :size="16" /> Plantilla {{ template.name }}</span>
            <span><Check :size="16" /> {{ design.products.length }} ofertas para comenzar</span>
            <span><Check :size="16" /> Editable en celular y escritorio</span>
          </div>
          <div class="studio-tip">
            <Palette :size="20" />
            <p>
              En el editor podrás arrastrar bloques, escribir tus textos, cambiar colores y ver tu
              tienda en tiempo real.
            </p>
          </div>
        </div>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <p v-if="storageError" role="status" class="field-error">
          No se pudo guardar este paso en el navegador. Evita recargar hasta abrir el editor.
        </p>
        <div class="onboarding-actions">
          <button v-if="step > 0" class="studio-text-button" @click="back">
            <ArrowLeft :size="15" /> Atrás
          </button>
          <span v-else>Sin conocimientos de diseño.</span>
          <button class="studio-primary" :disabled="!ready || !studio.ready || busy" @click="next">
            {{ busy ? 'Creando tu espacio…' : step === 3 ? 'Abrir mi editor visual' : 'Continuar' }}
            <ArrowRight :size="16" />
          </button>
        </div>
      </section>
      <aside class="onboarding-aside">
        <div
          class="onboarding-poster"
          :style="{ background: template.colors.accent, color: template.colors.primary }"
        >
          <span>IMAGÍNALO.<br />CRÉALO.<br /><em>Hazlo tuyo.</em></span>
          <img :src="`/art/${template.theme}.svg`" alt="" />
          <small>EL TALENTO DE SUCRE TIENE SU PROPIO LUGAR.</small>
        </div>
        <p>
          <span>✦</span> Tu creatividad pone la idea.<br />
          Nosotros ponemos las herramientas.
        </p>
      </aside>
    </div>
  </div>
</template>
