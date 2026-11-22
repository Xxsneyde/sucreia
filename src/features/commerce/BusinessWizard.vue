<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarDays, Check, FileText, Package, Plus, Trash2 } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { api } from '@/lib/api';
import { createDesign, publicationErrors, type StoreProduct } from '@/domain/studio';
import type { BusinessMode } from '@/domain/types';
import { municipalities, sectors } from '@/domain/sectors';
import { centers } from '@/domain/geo';
import { dayNames, defaultSettings, type DaySchedule, type StoreSettings } from '@/domain/platform';
import { currency } from '@/domain/rules';
import ImageField from '@/components/images/ImageField.vue';
import SxMap from '@/components/maps/SxMap.vue';

// Configuración previa del emprendimiento (después de crear la cuenta): datos, tipo de negocio,
// fotos, catálogo, cobros/entregas u horarios y publicación. Se crea todo al final.
const studio = useStudio();
const router = useRouter();
const steps = ['Tu negocio', 'Cómo atiendes', 'Fotos', 'Catálogo', 'Cobros y horarios', 'Publicar'];
const step = ref(0);
const error = ref('');
const busy = ref(false);

const info = ref({
  name: '',
  sector: sectors[0].id,
  municipality: 'Sincelejo',
  description: '',
  address: '',
  whatsapp: '',
});
const mode = ref<BusinessMode>('products');
const logo = ref('');
const cover = ref('');
const items = ref<StoreProduct[]>([]);
// Productos de ejemplo del sector, para que la persona los cambie por los suyos.
function examples() {
  const base = createDesign(info.value.sector, info.value.name || 'Mi negocio');
  items.value = base.products.map((p) => ({
    ...p,
    image: '',
    price: mode.value === 'quote' ? 0 : p.price,
    ...(mode.value === 'booking' ? { duration: 30 } : {}),
  }));
}
watch([() => info.value.sector, mode], examples, { immediate: true });
function add() {
  items.value.push({
    id: crypto.randomUUID(),
    name: '',
    description: '',
    price: 0,
    image: '',
    ...(mode.value === 'booking' ? { duration: 30 } : {}),
  });
}

const cfg = ref<StoreSettings>({ ...defaultSettings(), opens: 8, closes: 18, duration: 30 });
const week = ref<DaySchedule[]>(
  dayNames.map((_, i) => ({ closed: i === 0, opens: 8, closes: i === 6 ? 14 : 18 })),
);
const center = computed(() => centers[info.value.municipality] ?? centers.Sincelejo);
const pin = ref<[number, number] | null>(null);
watch(
  () => info.value.municipality,
  () => (pin.value = null),
);

const design = computed(() => {
  const d = createDesign(info.value.sector, info.value.name.trim());
  d.municipality = info.value.municipality;
  d.description = info.value.description.trim();
  d.address = info.value.address.trim();
  d.whatsapp = info.value.whatsapp.trim();
  d.mode = mode.value;
  d.logo = logo.value;
  d.content.heroImage = cover.value || d.content.heroImage;
  d.content.heroTitle = d.name;
  d.content.storyText = d.description || d.content.storyText;
  d.products = items.value.map((p) => ({ ...p, image: p.image || d.content.heroImage }));
  return d;
});
const problems = computed(() => {
  if (step.value === 0) {
    if (!info.value.name.trim()) return 'Escribe el nombre de tu negocio.';
    if (info.value.whatsapp && !/^\+?[1-9]\d{9,14}$/.test(info.value.whatsapp))
      return 'El WhatsApp debe tener código de país (por ejemplo +573001234567).';
  }
  if (step.value === 3) {
    if (items.value.length < 3) return 'Agrega al menos tres productos o servicios.';
    if (items.value.some((p) => !p.name.trim())) return 'Ponle nombre a cada producto o servicio.';
    if (mode.value !== 'quote' && items.value.some((p) => !(p.price > 0)))
      return 'Ponle precio a cada uno.';
  }
  if (step.value === 4 && mode.value === 'booking' && week.value.every((d) => d.closed))
    return 'Abre al menos un día de la semana.';
  if (
    step.value === 4 &&
    mode.value === 'booking' &&
    week.value.some((d) => !d.closed && d.closes <= d.opens)
  )
    return 'Revisa las horas: el cierre debe ser después de la apertura.';
  return '';
});
function next() {
  error.value = problems.value;
  if (!error.value) step.value++;
}

async function publish() {
  const errors = publicationErrors(design.value);
  if (errors.length) {
    error.value = errors.join(' ');
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    const id = await studio.create(design.value);
    const current = (await api<{ settings: StoreSettings }>('GET', `/plataforma/negocios/${id}`))
      .settings;
    const open = week.value.filter((d) => !d.closed);
    await api('PUT', `/plataforma/negocios/${id}/configuracion`, {
      ...current,
      ...cfg.value,
      opens: Math.min(...open.map((d) => d.opens), cfg.value.opens),
      closes: Math.max(...open.map((d) => d.closes), cfg.value.closes),
      week: mode.value === 'booking' ? week.value : undefined,
      latitude: pin.value?.[0] ?? null,
      longitude: pin.value?.[1] ?? null,
    });
    await studio.publish(id);
    await router.push('/panel');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
const modes: { id: BusinessMode; title: string; text: string; icon: unknown }[] = [
  {
    id: 'products',
    title: 'Vendo productos',
    text: 'Comida, ropa, artesanías… con carrito, recogida o domicilio.',
    icon: Package,
  },
  {
    id: 'booking',
    title: 'Servicios con reserva',
    text: 'Barberías, estilistas, manicure, spa… el cliente elige día y hora.',
    icon: CalendarDays,
  },
  {
    id: 'quote',
    title: 'Servicios por cotización',
    text: 'Plomería, contabilidad, eventos… el cliente pide y tú das el precio.',
    icon: FileText,
  },
];
</script>

<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">Configuración previa</p>
      <h1>Prepara tu emprendimiento</h1>
      <p class="muted">
        Seis pasos y tu negocio queda publicado en SucreIA. Podrás cambiar todo después.
      </p>
    </div>
  </div>
  <ol class="wz-steps" aria-label="Pasos">
    <li
      v-for="(s, i) in steps"
      :key="s"
      :class="{ on: i === step, done: i < step }"
      :aria-current="i === step ? 'step' : undefined"
    >
      <span>{{ i < step ? '✓' : i + 1 }}</span
      >{{ s }}
    </li>
  </ol>

  <section class="sx-card wz-body">
    <!-- 1. Datos -->
    <div v-if="step === 0" class="form-stack">
      <h2>Tu negocio</h2>
      <label
        >Nombre del negocio<input
          v-model="info.name"
          maxlength="80"
          placeholder="Ej.: Barbería Estilo Sabanero"
      /></label>
      <div class="wz-two">
        <label
          >Sector<select v-model="info.sector">
            <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option>
          </select></label
        >
        <label
          >Municipio<select v-model="info.municipality">
            <option v-for="m in municipalities" :key="m" :value="m">{{ m }}</option>
          </select></label
        >
      </div>
      <label
        >Descripción corta<textarea
          v-model="info.description"
          maxlength="220"
          placeholder="Qué haces y qué te hace especial."
        />
      </label>
      <div class="wz-two">
        <label
          >Dirección<input v-model="info.address" maxlength="160" placeholder="Calle 23 # 20-11"
        /></label>
        <label
          >WhatsApp (con código de país)<input
            v-model="info.whatsapp"
            maxlength="16"
            placeholder="+573001234567"
        /></label>
      </div>
    </div>

    <!-- 2. Tipo -->
    <div v-else-if="step === 1" class="form-stack">
      <h2>¿Cómo atiendes a tus clientes?</h2>
      <div class="wz-modes" role="radiogroup" aria-label="Tipo de negocio">
        <button
          v-for="m in modes"
          :key="m.id"
          type="button"
          role="radio"
          :aria-checked="mode === m.id"
          :class="{ on: mode === m.id }"
          @click="mode = m.id"
        >
          <component :is="m.icon" :size="30" />
          <strong>{{ m.title }}</strong>
          <span>{{ m.text }}</span>
        </button>
      </div>
    </div>

    <!-- 3. Fotos -->
    <div v-else-if="step === 2" class="form-stack">
      <h2>Tu imagen</h2>
      <p class="muted" style="margin: 0">
        Opcional, pero ayuda mucho: los negocios con foto reciben más visitas.
      </p>
      <div class="wz-two">
        <ImageField v-model="logo" label="Logo" />
        <ImageField v-model="cover" label="Foto de portada" />
      </div>
    </div>

    <!-- 4. Catálogo -->
    <div v-else-if="step === 3" class="form-stack">
      <h2>{{ mode === 'products' ? 'Tus productos' : 'Tus servicios' }}</h2>
      <p class="muted" style="margin: 0">
        Te dejamos ejemplos de tu sector: cámbialos por los tuyos (mínimo tres).
      </p>
      <article v-for="(p, i) in items" :key="p.id" class="wz-item">
        <label>Nombre<input v-model="p.name" maxlength="160" /></label>
        <label
          >{{ mode === 'quote' ? 'Precio de referencia (0 = a cotizar)' : 'Precio (COP)'
          }}<input v-model.number="p.price" type="number" min="0" step="500"
        /></label>
        <label v-if="mode === 'booking'"
          >Duración (min)<input
            v-model.number="p.duration"
            type="number"
            min="10"
            max="480"
            step="5"
        /></label>
        <button
          type="button"
          class="sx-btn sx-btn--ghost sx-btn--sm"
          :aria-label="`Quitar ${p.name || 'oferta'}`"
          @click="items.splice(i, 1)"
        >
          <Trash2 :size="15" />
        </button>
      </article>
      <button type="button" class="sx-btn sx-btn--outline" @click="add">
        <Plus :size="17" /> Agregar otro
      </button>
    </div>

    <!-- 5. Cobros, entregas u horarios -->
    <div v-else-if="step === 4" class="form-stack">
      <h2>{{ mode === 'booking' ? 'Horarios y cobros' : 'Cobros y entregas' }}</h2>
      <label
        >Instrucciones para transferencias (opcional)<textarea
          v-model="cfg.paymentInstructions"
          maxlength="700"
          placeholder="Nequi o banco, titular y número. Siempre puedes recibir efectivo."
        />
      </label>
      <template v-if="mode === 'products'">
        <fieldset>
          <legend><strong>Entregas</strong></legend>
          <label
            ><input type="checkbox" checked disabled /> El cliente puede recoger en el
            negocio</label
          >
          <label
            ><input v-model="cfg.delivery" type="checkbox" /> Ofrezco domicilio con los
            domiciliarios de SucreIA</label
          >
        </fieldset>
        <label v-if="cfg.delivery"
          >Tarifa del domicilio (COP)<input
            v-model.number="cfg.deliveryFee"
            type="number"
            min="0"
            step="500"
        /></label>
      </template>
      <template v-if="mode === 'booking'">
        <table class="wz-week">
          <thead>
            <tr>
              <th>Día</th>
              <th>Abierto</th>
              <th>Abre</th>
              <th>Cierra</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in week" :key="i">
              <td>{{ dayNames[i] }}</td>
              <td>
                <input
                  :checked="!d.closed"
                  type="checkbox"
                  :aria-label="`Abierto el ${dayNames[i]}`"
                  @change="d.closed = !($event.target as HTMLInputElement).checked"
                />
              </td>
              <td>
                <input
                  v-model.number="d.opens"
                  type="number"
                  min="0"
                  max="23"
                  :disabled="d.closed"
                  :aria-label="`Abre el ${dayNames[i]}`"
                />
              </td>
              <td>
                <input
                  v-model.number="d.closes"
                  type="number"
                  min="1"
                  max="24"
                  :disabled="d.closed"
                  :aria-label="`Cierra el ${dayNames[i]}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <label
          >¿Cuántas citas atiendes a la misma hora? (por ejemplo, dos barberos = 2)<input
            v-model.number="cfg.capacity"
            type="number"
            min="1"
            max="20"
        /></label>
      </template>
      <div>
        <span class="field-label"
          >Ubicación exacta (opcional): toca el mapa donde queda tu negocio</span
        >
        <SxMap
          pick
          :center="pin ?? center"
          :points="
            pin
              ? [{ lat: pin[0], lng: pin[1], kind: 'store', label: info.name || 'Mi negocio' }]
              : []
          "
          label="Mapa para ubicar el negocio"
          class="wz-map"
          @pick="(lat, lng) => (pin = [lat, lng])"
        />
      </div>
    </div>

    <!-- 6. Publicar -->
    <div v-else class="form-stack">
      <h2>Todo listo</h2>
      <ul class="wz-summary">
        <li>
          <Check :size="18" /> <strong>{{ info.name }}</strong> · {{ info.sector }} ·
          {{ info.municipality }}
        </li>
        <li><Check :size="18" /> {{ modes.find((m) => m.id === mode)!.title }}</li>
        <li>
          <Check :size="18" /> {{ items.length }}
          {{ mode === 'products' ? 'productos' : 'servicios' }}:
          {{ items.map((p) => `${p.name}${p.price ? ` (${currency(p.price)})` : ''}`).join(', ') }}
        </li>
        <li v-if="mode === 'products'">
          <Check :size="18" />
          {{
            cfg.delivery
              ? `Domicilio a ${currency(cfg.deliveryFee)}`
              : 'Solo recogida en el negocio'
          }}
        </li>
        <li v-if="mode === 'booking'">
          <Check :size="18" /> Abierto {{ week.filter((d) => !d.closed).length }} días ·
          {{ cfg.capacity ?? 1 }} cita(s) a la vez
        </li>
      </ul>
    </div>

    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <div class="wz-nav">
      <button
        v-if="step > 0"
        type="button"
        class="sx-btn sx-btn--ghost"
        :disabled="busy"
        @click="(step--, (error = ''))"
      >
        Atrás
      </button>
      <button v-if="step < steps.length - 1" type="button" class="sx-btn" @click="next">
        Continuar
      </button>
      <button v-else type="button" class="sx-btn" :disabled="busy" @click="publish">
        {{ busy ? 'Publicando…' : 'Publicar mi negocio' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.wz-steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}
.wz-steps li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: var(--muted);
}
.wz-steps span {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #eef2f7;
  font-weight: 700;
}
.wz-steps .on {
  color: var(--ink);
  font-weight: 600;
  box-shadow: 0 0 0 2px var(--green);
}
.wz-steps .on span,
.wz-steps .done span {
  background: var(--green);
  color: #fff;
}
.wz-body {
  max-width: 860px;
}
.wz-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}
.wz-modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.wz-modes button {
  display: grid;
  gap: 6px;
  justify-items: start;
  padding: 16px;
  border: 2px solid var(--line);
  border-radius: 16px;
  background: #fff;
  text-align: left;
  color: var(--ink);
}
.wz-modes button span {
  font-size: 13px;
  color: var(--muted);
}
.wz-modes button.on {
  border-color: var(--green);
  background: var(--green-soft);
}
.wz-modes svg {
  color: var(--green);
}
.wz-item {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: end;
}
.wz-week input[type='number'] {
  width: 70px;
  min-height: 36px;
  padding: 4px 8px;
  border: 1px solid #d7e0ec;
  border-radius: 8px;
}
.wz-map {
  height: 260px;
  margin-top: 8px;
}
.wz-summary {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.wz-summary li {
  display: flex;
  gap: 8px;
  align-items: start;
}
.wz-summary svg {
  color: var(--green);
  flex-shrink: 0;
  margin-top: 2px;
}
.wz-nav {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
@media (max-width: 720px) {
  .wz-two,
  .wz-modes,
  .wz-item {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
