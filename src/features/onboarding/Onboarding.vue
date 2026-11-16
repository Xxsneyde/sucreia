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
  Sparkles,
} from '@lucide/vue';
import { useDemo } from '@/lib/demo-store';
import { useStudio } from '@/lib/studio-store';
import { useSession } from '@/lib/session';
import {
  createDesign,
  generateContent,
  isDesign,
  styles,
  type StoreDesign,
  type StoreProduct,
  type StyleId,
} from '@/domain/studio';
import { areaFor, areaNames, choiceFor } from '@/domain/designs';
import type { BusinessMode } from '@/domain/types';
import ImageField from '@/features/studio/ImageField.vue';
import ProductFields from '@/features/studio/ProductFields.vue';
import DesignPicker from '@/features/studio/DesignPicker.vue';
import StorePage from '@/features/studio/StorePage.vue';

const draftKey = 'sucreia:onboarding:v3';
// Paso actual: se conserva si la persona sale a crear su cuenta y vuelve.
const stepKey = 'sucreia:onboarding:paso';
const steps = ['Tu negocio', 'Tu catálogo', 'Tu diseño', 'Listo'];
const headings = [
  'Toda gran historia\nempieza contigo.',
  'Dales el lugar\nque se merecen.',
  'Siete estilos,\nuna página para ti.',
  'Tu tienda está lista\npara abrir sus puertas.',
];
const intros = [
  'Cuéntanos a qué te dedicas. Con eso preparamos tu página.',
  'Empieza con tus tres mejores productos o servicios. Puedes cambiarlos después.',
  'Tu página en los siete estilos. Los tres primeros son los que mejor le quedan a tu área; elige el que más te guste.',
  'Revisa el resultado. Podrás cambiar el diseño, los textos y el catálogo cuando quieras.',
];
const modes: { id: BusinessMode; title: string; text: string; icon: typeof ShoppingBag }[] = [
  { id: 'products', title: 'Vendo productos', text: 'Catálogo y pedidos', icon: ShoppingBag },
  { id: 'booking', title: 'Atiendo con citas', text: 'Agenda y reservas', icon: CalendarDays },
  { id: 'quote', title: 'Hago cotizaciones', text: 'Trabajos a medida', icon: MessageSquare },
];

const studio = useStudio();
const session = useSession();
const demo = useDemo();
const router = useRouter();
// shallowRef: el diseño se reemplaza completo en cada cambio (objetos planos, sin proxies).
const design = shallowRef<StoreDesign>(createDesign('Artesanías', ''));
const step = ref(0);
const ready = ref(false);
const error = ref('');
const busy = ref(false);
const storageError = ref(false);
// Mientras el catálogo siga siendo el de ejemplo, cambiar de área lo reemplaza.
const exampleProducts = ref(true);

watch(
  () => demo.ready,
  (isReady) => {
    if (!isReady || ready.value) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (isDesign(saved)) {
          design.value = saved;
          exampleProducts.value = false;
          const savedStep = Number(localStorage.getItem(stepKey));
          if (savedStep >= 0 && savedStep <= 3) step.value = savedStep;
        }
      }
    } catch {
      storageError.value = true;
    }
    ready.value = true;
  },
  { immediate: true },
);
watch([design, step], ([value, current]) => {
  if (!ready.value) return;
  try {
    localStorage.setItem(draftKey, JSON.stringify(value));
    localStorage.setItem(stepKey, String(current));
  } catch {
    storageError.value = true;
  }
});

function set(change: Partial<StoreDesign>) {
  design.value = { ...design.value, ...change };
}
function setArea(category: string) {
  const area = areaFor(category);
  const fresh = createDesign(area.id, design.value.name);
  set({
    category: area.id,
    mode: area.mode,
    style: fresh.style,
    colors: fresh.colors,
    ...(exampleProducts.value ? { products: fresh.products } : {}),
  });
}
function setProducts(products: StoreProduct[]) {
  exampleProducts.value = false;
  set({ products });
}
function chooseStyle(style: StyleId) {
  const option = choiceFor(design.value.category, style);
  if (option) set({ style, colors: { ...option.colors } });
}
const area = computed(() => areaFor(design.value.category));

function back() {
  step.value -= 1;
  error.value = '';
}
async function next() {
  const d = design.value;
  error.value = '';
  if (step.value === 0) {
    if (!d.name.trim() || !d.municipality.trim()) {
      error.value = 'Cuéntanos el nombre de tu negocio y el municipio.';
      return;
    }
    if (d.whatsapp && !/^\+?[1-9]\d{9,14}$/.test(d.whatsapp)) {
      error.value = 'Escribe el WhatsApp con código de país, por ejemplo +57 seguido de tu número.';
      return;
    }
    // Los textos de la página se generan con los datos del negocio.
    set({ content: generateContent(area.value, d.name, d.municipality, d.description) });
  }
  if (step.value === 1 && (d.products.length < 3 || d.products.some((p) => !p.name.trim()))) {
    error.value = 'Agrega al menos tres ofertas con nombre para empezar.';
    return;
  }
  if (step.value < 3) {
    step.value += 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  // Para guardar la tienda en el servidor hace falta una cuenta de emprendedor. El borrador y
  // el paso quedan en este navegador, así que al volver se continúa aquí mismo.
  if (!session.isMerchant.value) {
    await router.push('/ingresar?cuenta=nueva&volver=/registro/negocio');
    return;
  }
  busy.value = true;
  try {
    const id = await studio.create(design.value);
    localStorage.removeItem(draftKey);
    localStorage.removeItem(stepKey);
    await router.push(`/estudio/gestionar?id=${id}`);
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
      <span>DE UNA IDEA A TU PROPIA TIENDA</span>
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
    <div :class="['onboarding-layout', { wide: step >= 2 }]">
      <section class="onboarding-sheet">
        <!-- 1. Tu negocio -->
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
              ¿A qué se dedica tu negocio?
              <select :value="design.category" @change="setArea(value($event))">
                <option v-for="x in areaNames" :key="x">{{ x }}</option>
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
            <span class="field-help">Opcional · aparecerá en la sección «Nosotros»</span>
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
          <div class="form-two">
            <label>
              WhatsApp del negocio
              <span class="field-help">Opcional · genera confianza</span>
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
            <label>
              Dirección
              <span class="field-help">Opcional</span>
              <input
                maxlength="160"
                placeholder="Ej. Calle 20 # 18-35, Centro"
                :value="design.address"
                @input="set({ address: value($event) })"
              />
            </label>
          </div>
          <ImageField
            label="Tu logo (opcional)"
            :model-value="design.logo"
            @update:model-value="(logo: string) => set({ logo })"
          />
        </div>

        <!-- 2. Tu catálogo -->
        <template v-else-if="step === 1">
          <p class="field-help">
            Incluimos ejemplos de {{ design.category.toLowerCase() }} para ayudarte a comenzar.
            Reemplázalos por tus propias ofertas, fotografías y precios.
          </p>
          <ProductFields :mode="design.mode" :products="design.products" @update="setProducts" />
        </template>

        <!-- 3. Tu diseño -->
        <DesignPicker
          v-else-if="step === 2"
          :base="design"
          :model-value="design.style"
          @update:model-value="chooseStyle"
        />

        <!-- 4. Listo -->
        <div v-else class="onboarding-ready">
          <div class="onboarding-ready-preview" aria-hidden="true">
            <StorePage :design="design" :interactive="false" />
          </div>
          <div class="onboarding-summary">
            <div class="summary-star"><Sparkles :size="34" /></div>
            <h2>{{ design.name }}</h2>
            <div class="summary-checks">
              <span><Check :size="16" /> {{ design.category }} · {{ design.municipality }}</span>
              <span>
                <Check :size="16" /> Diseño {{ styles[design.style].name.toLowerCase() }} ·
                {{ styles[design.style].fonts.label }}
              </span>
              <span><Check :size="16" /> {{ design.products.length }} ofertas para comenzar</span>
              <span><Check :size="16" /> Se adapta a celular y computador</span>
            </div>
            <p class="field-help">
              Se crea como borrador. Desde «Mi tienda» la publicas y puedes cambiar el diseño cuando
              quieras.
            </p>
            <p v-if="session.ready && !session.isMerchant.value" class="notice">
              Para guardar tu tienda necesitas una cuenta de emprendedor. Lo que llevas no se
              pierde: al crearla vuelves aquí mismo.
            </p>
          </div>
        </div>

        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <p v-if="storageError" role="status" class="field-error">
          No se pudo guardar este paso en el navegador. Evita recargar hasta crear tu tienda.
        </p>
        <div class="onboarding-actions">
          <button v-if="step > 0" class="studio-text-button" @click="back">
            <ArrowLeft :size="15" /> Atrás
          </button>
          <span v-else>Sin conocimientos de diseño.</span>
          <button class="studio-primary" :disabled="!ready || !studio.ready || busy" @click="next">
            {{
              busy
                ? 'Creando tu tienda…'
                : step === 3
                  ? session.isMerchant.value
                    ? 'Crear mi tienda'
                    : 'Crear cuenta y guardar'
                  : step === 2
                    ? `Continuar con ${styles[design.style].name}`
                    : 'Continuar'
            }}
            <ArrowRight :size="16" />
          </button>
        </div>
      </section>
      <aside v-if="step < 2" class="onboarding-aside">
        <div
          class="onboarding-poster"
          :style="{ background: design.colors.accent, color: design.colors.primary }"
        >
          <span>IMAGÍNALO.<br />CRÉALO.<br /><em>Hazlo tuyo.</em></span>
          <img :src="`/art/${area.theme}.svg`" alt="" />
          <small>EL TALENTO DE SUCRE TIENE SU PROPIO LUGAR.</small>
        </div>
        <p>
          <span>✦</span> Tú pones la idea.<br />
          Nosotros diseñamos la página.
        </p>
      </aside>
    </div>
  </div>
</template>
