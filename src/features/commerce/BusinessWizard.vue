<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarDays, Check, FileText, Package, Plus, Trash } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { api } from '@/lib/api';
import { currentLocation } from '@/lib/location';
import {
  createDesign,
  publicationErrors,
  type StoreDesign,
  type StoreProduct,
} from '@/domain/studio';
import {
  municipalities,
  sectorArtwork,
  sectors,
  sentenceCase,
  subcategoriesFor,
  subregionFor,
} from '@/domain/sectors';
import { centers } from '@/domain/geo';
import {
  defaultSettings,
  weekSummary,
  type DaySchedule,
  type StoreSettings,
} from '@/domain/platform';
import { currency } from '@/domain/rules';
import {
  allDocuments,
  documentKinds,
  documentMimes,
  optionalDocument,
  type DocumentKind,
  type PersonType,
} from '@/domain/documents';
import { detailExample, detailFieldsFor } from '@/domain/product-details';
import type { BusinessMode } from '@/domain/types';
import ImageField from '@/components/images/ImageField.vue';
import SxMap from '@/components/maps/SxMap.vue';
import WeekHoursPicker from '@/components/business/WeekHoursPicker.vue';
import PhoneField from '@/components/PhoneField.vue';
import { normalizePhone } from '@/domain/phone';

// Registro del emprendimiento en siete pasos. Al enviarlo, la administración revisa los datos y
// documentos y, al aprobarlo, el negocio aparece en SucreIA. Con `standalone` va en su propia
// pestaña (/registro-negocio) y al final ofrece cerrarla.
const props = withDefaults(defineProps<{ standalone?: boolean }>(), { standalone: false });
const studio = useStudio();
const router = useRouter();
const steps = [
  'Tu negocio',
  'Cómo atiendes',
  'Logo y portada',
  'Catálogo',
  'Ubicación y cupos',
  'Documentos',
  'Enviar',
];
const step = ref(0);
const error = ref('');
const busy = ref(false);
const acceptTerms = ref(false);
const basics = ref({
  name: '',
  sector: sectors[0].id,
  municipality: 'Sincelejo',
  description: '',
  subcategory: '',
  address: '',
  whatsapp: '',
});
const mode = ref<BusinessMode>('products');
const logo = ref('');
const cover = ref('');
const products = ref<StoreProduct[]>([]);
/** Ejemplos del sector, para que la persona los cambie por los suyos. */
function sampleProducts() {
  const sample = createDesign(basics.value.sector, basics.value.name || 'Mi negocio');
  products.value = sample.products.map((p) => ({
    ...p,
    image: '',
    price: mode.value === 'quote' ? 0 : p.price,
    ...(mode.value === 'booking' ? { duration: 30 } : {}),
  }));
}
watch([() => basics.value.sector, mode], sampleProducts, { immediate: true });
watch(
  () => basics.value.sector,
  () => {
    basics.value.subcategory = '';
  },
);
const detailFields = computed(() => detailFieldsFor(basics.value.sector));
const detailValue = (p: StoreProduct, label: string) =>
  p.details?.find((x) => x.label === label)?.value ?? '';
function setDetail(p: StoreProduct, label: string, value: string) {
  const rest = (p.details ?? []).filter((x) => x.label !== label);
  const all = value.trim() ? [...rest, { label, value: value.trim() }] : rest;
  p.details = all.length
    ? detailFields.value
        .map((l) => all.find((x) => x.label === l))
        .filter((x): x is { label: string; value: string } => !!x)
        .slice(0, 8)
    : undefined;
}
function addProduct() {
  products.value.push({
    id: crypto.randomUUID(),
    name: '',
    description: '',
    price: 0,
    image: '',
    ...(mode.value === 'booking' ? { duration: 30 } : {}),
  });
}
const settings = ref<StoreSettings>({
  ...defaultSettings(),
  opens: 8,
  closes: 18,
  duration: 30,
  capacity: 1,
});
/** Lunes a viernes de 8 a 6, sábado de 8 a 2 y domingo cerrado. */
const week = ref<DaySchedule[]>(
  Array.from({ length: 7 }, (_, d) => ({ closed: d === 0, opens: 8, closes: d === 6 ? 14 : 18 })),
);
const hours = computed(() => weekSummary(week.value));
const townCenter = computed(() => centers[basics.value.municipality] ?? centers.Sincelejo);
// --- Ubicación del negocio ------------------------------------------------------------------
const locationNote = ref('');
async function useMyLocation() {
  locationNote.value = 'Buscando tu ubicación…';
  try {
    const here = await currentLocation();
    point.value = [here.lat, here.lng];
    locationNote.value =
      here.accuracy > 200
        ? `Ubicación aproximada (±${Math.round(here.accuracy)} m): mueve el punto si hace falta.`
        : 'Confirma que el punto corresponde al negocio.';
  } catch (e) {
    locationNote.value = (e as Error).message;
  }
}
const latInput = ref('');
const lngInput = ref('');
function applyCoordinates() {
  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);
  if (
    !latInput.value.trim() ||
    !lngInput.value.trim() ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    locationNote.value = 'Revisa ambas coordenadas.';
  else {
    point.value = [lat, lng];
    locationNote.value = 'Punto actualizado.';
  }
}
const point = ref<[number, number] | null>(null);
watch(
  () => basics.value.municipality,
  () => {
    point.value = null;
    latInput.value = '';
    lngInput.value = '';
  },
);
// --- Documentos -------------------------------------------------------------------------------
const personType = ref<PersonType>('natural');
const files = ref<Partial<Record<DocumentKind, { name: string; data: string }>>>({});
const neededDocuments = computed(() =>
  documentKinds.filter((d) => allDocuments(personType.value).includes(d.id)),
);
function attach(kind: DocumentKind, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!(documentMimes as readonly string[]).includes(file.type)) {
    error.value = 'Sube el documento en PDF, JPG, PNG o WEBP.';
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    error.value = 'Cada documento debe pesar máximo 4 MB.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    files.value = { ...files.value, [kind]: { name: file.name, data: String(reader.result) } };
    error.value = '';
  };
  reader.readAsDataURL(file);
}
const activate = ref(true);
const sent = ref(false);
function closeTab() {
  window.close();
  setTimeout(() => {
    if (!window.closed) void router.push('/panel');
  }, 150);
}
/** Negocio ya creado (si un envío falló a mitad de camino, se reintenta sobre el mismo). */
const createdId = ref('');
watch(point, (p) => {
  if (p) {
    latInput.value = String(p[0]);
    lngInput.value = String(p[1]);
  }
});
const design = computed<StoreDesign>(() => {
  const d = createDesign(basics.value.sector, sentenceCase(basics.value.name));
  d.subcategory = basics.value.subcategory;
  d.municipality = basics.value.municipality;
  d.description = basics.value.description.trim();
  d.hours = hours.value;
  d.address = basics.value.address.trim();
  d.whatsapp = basics.value.whatsapp.trim();
  d.mode = mode.value;
  d.logo = logo.value;
  d.content.heroImage = cover.value || sectorArtwork(basics.value.sector);
  d.content.heroTitle = d.name;
  d.content.storyText = d.description || d.content.storyText;
  d.products = products.value.map((p) => ({ ...p, image: p.image || d.content.heroImage }));
  return d;
});
// Tamaño real de cada imagen (para exigir 360 × 360 px como mínimo).
const MIN_SIDE = 360;
const sizes = ref<Record<string, [number, number]>>({});
watch(
  () => [logo.value, cover.value, ...products.value.map((p) => p.image)],
  (sources) => {
    for (const src of sources)
      if (src && !sizes.value[src] && typeof Image !== 'undefined') {
        const img = new Image();
        img.onload = () => {
          sizes.value = { ...sizes.value, [src]: [img.naturalWidth, img.naturalHeight] };
        };
        img.src = src;
      }
  },
  { immediate: true, deep: true },
);
const tooSmall = (src: string) => {
  const size = sizes.value[src];
  return !!size && (size[0] < MIN_SIDE || size[1] < MIN_SIDE);
};
/** Lo que falta en el paso actual ('' = puede continuar). */
const stepError = computed(() => {
  if (step.value === 0) {
    if (!basics.value.name.trim()) return 'Escribe el nombre de tu negocio.';
    if (week.value.every((d) => d.closed)) return 'Elige al menos un día de atención.';
    if (week.value.some((d) => !d.closed && d.closes <= d.opens))
      return 'Revisa el horario: la hora de cierre debe ser después de la de apertura.';
    if (!basics.value.address.trim()) return 'Escribe la dirección del negocio.';
    if (!normalizePhone(basics.value.whatsapp))
      return 'Revisa el WhatsApp: elige el país y escribe el número completo. Por ahí te llegan las compras.';
  }
  if (step.value === 2 && (!logo.value || !cover.value))
    return 'Sube el logo y la foto de portada (mínimo 360 × 360 px, mejor horizontal).';
  if (step.value === 2 && (tooSmall(logo.value) || tooSmall(cover.value)))
    return `El logo y la portada deben medir al menos ${MIN_SIDE} × ${MIN_SIDE} px.`;
  if (step.value === 3) {
    if (products.value.length < 3) return 'Agrega al menos tres productos o servicios.';
    if (products.value.some((p) => !p.name.trim()))
      return 'Ponle nombre a cada producto o servicio.';
    if (products.value.some((p) => !p.description.trim()))
      return 'Describe cada producto o servicio (cómo es, de qué está hecho).';
    if (products.value.some((p) => !p.image)) return 'Agrega una foto a cada producto o servicio.';
    const small = products.value.find((p) => tooSmall(p.image));
    if (small)
      return `La foto de «${small.name}» es muy pequeña: usa una de al menos ${MIN_SIDE} × ${MIN_SIDE} px.`;
    if (mode.value !== 'quote' && products.value.some((p) => !(p.price > 0)))
      return 'Ponle precio a cada uno.';
  }
  if (step.value === 5) {
    const missing = neededDocuments.value.filter(
      (d) => !files.value[d.id] && !optionalDocument(personType.value, d.id),
    );
    if (missing.length) return `Adjunta: ${missing.map((d) => d.label).join(', ')}.`;
  }
  if (
    step.value === 4 &&
    (latInput.value !== (point.value ? String(point.value[0]) : '') ||
      lngInput.value !== (point.value ? String(point.value[1]) : ''))
  )
    return 'Confirma la ubicación con «Ubicar coordenadas».';
  return '';
});
function next() {
  error.value = stepError.value;
  if (!error.value) step.value++;
}
async function submit() {
  if (!acceptTerms.value) {
    error.value = 'Acepta los términos para continuar.';
    return;
  }
  const problems = publicationErrors(design.value);
  if (problems.length) {
    error.value = problems.join(' ');
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    const id = createdId.value || (await studio.create(design.value, acceptTerms.value));
    if (createdId.value) studio.update(id, design.value);
    createdId.value = id;
    const current = (await api<{ settings: StoreSettings }>('GET', `/plataforma/negocios/${id}`))
      .settings;
    const open = week.value.filter((d) => !d.closed);
    await api('PUT', `/plataforma/negocios/${id}/configuracion`, {
      ...current,
      ...settings.value,
      opens: open.length ? Math.min(...open.map((d) => d.opens)) : settings.value.opens,
      closes: open.length ? Math.max(...open.map((d) => d.closes)) : settings.value.closes,
      week: mode.value === 'booking' ? week.value : undefined,
      latitude: point.value?.[0] ?? null,
      longitude: point.value?.[1] ?? null,
    });
    await api('PUT', `/plataforma/negocios/${id}/tipo-legal`, { legalType: personType.value });
    for (const kind of allDocuments(personType.value)) {
      const file = files.value[kind];
      if (file) await api('PUT', `/plataforma/negocios/${id}/documentos/${kind}`, file);
    }
    if (activate.value) await studio.publish(id);
    else await studio.saveBeforeLogout();
    sent.value = true;
    window.scrollTo({ top: 0 });
    // Avisa a la pestaña que abrió el registro (panel, Mis negocios…).
    try {
      new BroadcastChannel('sucreia').postMessage({ type: 'registro-enviado', id });
    } catch {
      // Navegador sin BroadcastChannel: la otra pestaña se actualiza al volver a ella.
    }
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
  <section v-if="sent" class="sx-card wz-done" role="status">
    <span class="wz-done-icon"><Check :size="34" /></span>
    <h1>¡Registro enviado!</h1>
    <p>
      La administración de SucreIA revisará los datos y documentos de
      <strong>{{ basics.name }}</strong
      >. Te avisaremos en tus notificaciones cuando tu negocio aparezca en la plataforma.
    </p>
    <div v-if="props.standalone" class="wz-done-actions">
      <button type="button" class="sx-btn" @click="closeTab">Cerrar esta pestaña</button>
      <NuxtLink class="sx-btn sx-btn--outline" to="/panel">Ir a mi panel</NuxtLink>
    </div>
    <div v-else class="wz-done-actions">
      <NuxtLink class="sx-btn" to="/panel">Ver mi emprendimiento</NuxtLink>
      <NuxtLink class="sx-btn sx-btn--outline" to="/panel/negocios">Mis negocios</NuxtLink>
    </div>
  </section>
  <template v-else>
    <div class="page-title">
      <div>
        <p class="eyebrow">
          {{ props.standalone ? 'Paso 2 de 2 · Registro del emprendimiento' : 'Mi negocio' }}
        </p>
        <h1>{{ props.standalone ? 'Registra tu emprendimiento' : 'Registrar emprendimiento' }}</h1>
        <p class="muted">
          Llena todos los datos y adjunta los documentos. La administración de SucreIA los revisa y,
          al aprobarlos, tu negocio aparece en la plataforma.
        </p>
      </div>
    </div>
    <div class="wz-layout">
      <nav class="sx-card wz-side" aria-label="Pasos del registro">
        <p class="wz-side-title">Registro del negocio</p>
        <ol class="wz-steps">
          <li
            v-for="(s, i) in steps"
            :key="s"
            :class="{ on: i === step, done: i < step }"
            :aria-current="i === step ? 'step' : undefined"
          >
            <span>{{ i < step ? '✓' : i + 1 }}</span
            ><em>{{ s }}</em>
          </li>
        </ol>
      </nav>
      <section class="sx-card wz-body">
        <div class="wz-bar">
          <p class="wz-progress">Paso {{ step + 1 }} de {{ steps.length }}</p>
          <div
            class="wz-track"
            role="progressbar"
            :aria-valuenow="step + 1"
            aria-valuemin="1"
            :aria-valuemax="steps.length"
            aria-label="Avance del registro"
          >
            <i :style="{ width: `${((step + 1) / steps.length) * 100}%` }" />
          </div>
        </div>

        <div v-if="step === 0" class="form-stack">
          <h2>Tu negocio</h2>
          <label
            >Nombre del negocio<input
              v-model="basics.name"
              maxlength="80"
              placeholder="Ej.: Barbería Estilo Sabanero"
          /></label>
          <div class="wz-two">
            <label
              >Sector<select v-model="basics.sector">
                <option v-for="s in sectors" :key="s.id" :value="s.id">
                  {{ sentenceCase(s.id) }}
                </option>
              </select></label
            >
            <label
              >Municipio<select v-model="basics.municipality">
                <option v-for="m in municipalities" :key="m" :value="m">{{ m }}</option>
              </select></label
            >
          </div>
          <label
            >Subcategoría<select v-model="basics.subcategory">
              <option value="">Sin especificar</option>
              <option v-for="s in subcategoriesFor(basics.sector)" :key="s">{{ s }}</option>
            </select></label
          >
          <p class="muted">Subregión · {{ subregionFor(basics.municipality)?.id }}</p>
          <label
            >Descripción corta<textarea
              v-model="basics.description"
              maxlength="220"
              placeholder="Qué haces y qué te hace especial."
            />
          </label>
          <div class="wz-two">
            <label
              >Dirección<input
                v-model="basics.address"
                maxlength="160"
                placeholder="Calle 23 # 20-11"
            /></label>
            <PhoneField
              v-model="basics.whatsapp"
              label="WhatsApp"
              required
              help="Elige el país: aquí te llegan los pedidos."
            />
          </div>
          <WeekHoursPicker v-model="week" />
        </div>

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

        <div v-else-if="step === 2" class="form-stack">
          <h2>Logo y portada</h2>
          <p class="muted" style="margin: 0">
            Obligatorios. Usa imágenes de al menos 360 × 360 px; la portada, preferiblemente
            horizontal.
          </p>
          <div class="wz-two">
            <ImageField v-model="logo" label="Logo" crop />
            <ImageField v-model="cover" label="Foto de portada" />
          </div>
        </div>

        <div v-else-if="step === 3" class="form-stack">
          <h2>{{ mode === 'products' ? 'Tus productos' : 'Tus servicios' }}</h2>
          <p class="muted" style="margin: 0">
            Te dejamos ejemplos de tu sector: cámbialos por los tuyos (mínimo tres). Cada uno
            necesita nombre, descripción, precio y una foto de al menos 360 × 360 px.
          </p>
          <article v-for="(p, i) in products" :key="p.id" class="wz-item">
            <h3 class="wz-item-title">
              {{ mode === 'products' ? 'Producto' : 'Servicio' }} {{ i + 1 }}
            </h3>
            <label>Nombre<input v-model="p.name" maxlength="160" /></label>
            <label
              >{{ mode === 'quote' ? 'Precio de referencia (0 = a cotizar)' : 'Precio (COP)'
              }}<input v-model.number="p.price" type="number" min="0" step="500"
            /></label>
            <label
              >{{
                mode === 'quote'
                  ? 'Alcance del servicio y datos necesarios para cotizar'
                  : 'Descripción breve'
              }}<textarea v-model="p.description" maxlength="600" />
            </label>
            <ImageField
              v-model="p.image"
              :label="mode === 'products' ? 'Foto del producto' : 'Foto del servicio'"
            />
            <fieldset class="wz-details">
              <legend>Características (opcional)</legend>
              <label v-for="label in detailFields" :key="label"
                >{{ label }}
                <input
                  :value="detailValue(p, label)"
                  :placeholder="detailExample(label)"
                  maxlength="300"
                  @change="setDetail(p, label, ($event.target as HTMLInputElement).value)"
                />
              </label>
            </fieldset>
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
              @click="products.splice(i, 1)"
            >
              <Trash :size="15" />
            </button>
          </article>
          <button type="button" class="sx-btn sx-btn--outline" @click="addProduct">
            <Plus :size="17" /> Agregar otro
          </button>
        </div>

        <div v-else-if="step === 4" class="form-stack">
          <h2>{{ mode === 'booking' ? 'Días, horas y cupos' : 'Ubicación' }}</h2>
          <template v-if="mode === 'booking'">
            <p class="field-help" style="margin: 0">
              Las reservas usan el horario que elegiste en el paso 1: {{ hours }}.
            </p>
            <label
              >¿Cuántas citas atiendes a la misma hora? (por ejemplo, dos barberos = 2)<input
                v-model.number="settings.capacity"
                type="number"
                min="1"
                max="20"
            /></label>
          </template>
          <fieldset class="wz-box">
            <legend>Ubicación exacta (opcional)</legend>
            <p class="field-help">
              Toca el mapa donde queda tu negocio, usa tu ubicación actual o escribe las
              coordenadas.
            </p>
            <button type="button" class="sx-btn sx-btn--outline wz-fit" @click="useMyLocation">
              Usar mi ubicación actual
            </button>
            <p v-if="locationNote" role="status" class="field-help">{{ locationNote }}</p>
            <div class="wz-two">
              <label
                >Latitud<input v-model="latInput" type="number" step="any" min="-90" max="90"
              /></label>
              <label
                >Longitud<input v-model="lngInput" type="number" step="any" min="-180" max="180"
              /></label>
            </div>
            <button type="button" class="sx-btn sx-btn--outline wz-fit" @click="applyCoordinates">
              Ubicar coordenadas
            </button>
            <p v-if="point">
              Latitud {{ point[0].toFixed(6) }} · Longitud {{ point[1].toFixed(6) }}
            </p>
            <SxMap
              pick
              :center="point ?? townCenter"
              :points="
                point
                  ? [
                      {
                        lat: point[0],
                        lng: point[1],
                        kind: 'store',
                        label: basics.name || 'Mi negocio',
                      },
                    ]
                  : []
              "
              label="Mapa para ubicar el negocio"
              class="wz-map"
              @pick="(lat: number, lng: number) => (point = [lat, lng])"
            />
          </fieldset>
        </div>

        <div v-else-if="step === 5" class="form-stack">
          <h2>Documentos para la revisión</h2>
          <p class="muted" style="margin: 0">
            La administración de SucreIA los revisa antes de publicar tu negocio. Solo los ve la
            administración. PDF, JPG, PNG o WEBP de máximo 4 MB.
          </p>
          <fieldset class="wz-legal">
            <legend><strong>Tipo de persona</strong></legend>
            <label
              ><input v-model="personType" type="radio" value="natural" /> Persona natural</label
            >
            <label
              ><input v-model="personType" type="radio" value="juridica" /> Persona jurídica
              (empresa)</label
            >
          </fieldset>
          <ul class="wz-docs">
            <li v-for="d in neededDocuments" :key="d.id">
              <div>
                <strong
                  >{{ d.label
                  }}<em v-if="optionalDocument(personType, d.id)" class="wz-optional">
                    Opcional · si la tienes</em
                  ></strong
                >
                <small>{{ d.hint }}</small>
                <small v-if="files[d.id]" class="wz-doc-ok"
                  ><Check :size="14" /> {{ files[d.id]!.name }}</small
                >
              </div>
              <label class="sx-btn sx-btn--outline sx-btn--sm"
                >{{ files[d.id] ? 'Cambiar' : 'Adjuntar' }}
                <input
                  class="sr-only"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  :aria-label="`Adjuntar ${d.label}`"
                  @change="attach(d.id, $event)"
              /></label>
            </li>
          </ul>
        </div>

        <div v-else class="form-stack">
          <h2>Todo listo</h2>
          <div class="wz-box wz-checks">
            <label class="wz-check"
              ><input v-model="activate" type="checkbox" /><span
                >Activar el negocio para que aparezca en búsquedas cuando sea aprobado</span
              ></label
            >
            <label class="wz-check"
              ><input v-model="acceptTerms" type="checkbox" required /><span
                >Acepto los
                <NuxtLink to="/terminos" target="_blank">términos y condiciones</NuxtLink> del
                negocio.</span
              ></label
            >
          </div>
          <h3 class="wz-sub">Resumen</h3>
          <ul class="wz-summary">
            <li>
              <Check :size="18" />
              <span
                ><strong>{{ basics.name }}</strong> · {{ basics.sector }} ·
                {{ basics.municipality }}</span
              >
            </li>
            <li>
              <Check :size="18" /> <span>Horario: {{ hours }}</span>
            </li>
            <li><Check :size="18" /> {{ modes.find((m) => m.id === mode)!.title }}</li>
            <li>
              <Check :size="18" />
              {{ products.length }} {{ mode === 'products' ? 'productos' : 'servicios' }}:
              {{
                products
                  .map((p) => `${p.name}${p.price ? ` (${currency(p.price)})` : ''}`)
                  .join(', ')
              }}
            </li>
            <li>
              <Check :size="18" />
              Documentos:
              {{
                neededDocuments
                  .filter((d) => files[d.id])
                  .map((d) => d.label)
                  .join(', ')
              }}
            </li>
            <li v-if="mode === 'products'">
              <Check :size="18" /> Las compras llegan a tu WhatsApp {{ basics.whatsapp }}
            </li>
            <li v-if="mode === 'booking'">
              <Check :size="18" />
              Abierto {{ week.filter((d) => !d.closed).length }} días ·
              {{ settings.capacity ?? 1 }} cita(s) a la vez
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
            @click="
              step--;
              error = '';
            "
          >
            Atrás
          </button>
          <button v-if="step < steps.length - 1" type="button" class="sx-btn" @click="next">
            Continuar
          </button>
          <button v-else type="button" class="sx-btn" :disabled="busy" @click="submit">
            {{ busy ? 'Guardando…' : activate ? 'Enviar a revisión' : 'Guardar inactivo' }}
          </button>
        </div>
      </section>
    </div>
  </template>
</template>

<style scoped>
.wz-done {
  text-align: center;
  justify-items: center;
  gap: 12px;
  max-width: 560px;
  margin: 40px auto;
  padding: 34px 24px;
  display: grid;
}
.wz-done-icon {
  background: var(--green-soft);
  width: 72px;
  height: 72px;
  color: var(--green-dark);
  border-radius: 50%;
  place-items: center;
  display: grid;
}
.wz-done h1 {
  margin: 0;
}
.wz-done p {
  color: var(--text);
  margin: 0;
}
.wz-done-actions {
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}
.wz-done-actions,
.wz-legal {
  flex-wrap: wrap;
  display: flex;
}
.wz-legal {
  gap: 8px 22px;
}
.wz-docs {
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.wz-docs li {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 14px;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  display: flex;
}
.wz-docs li div {
  gap: 2px;
  display: grid;
}
.wz-optional {
  margin-left: 6px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
}
.wz-docs small,
.wz-optional {
  color: var(--muted);
}
.wz-docs .wz-doc-ok {
  color: var(--green-dark);
  align-items: center;
  gap: 4px;
  font-weight: 600;
  display: inline-flex;
}
.wz-docs label {
  cursor: pointer;
  flex: none;
}
.wz-layout {
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
  display: flex;
}
.wz-side {
  flex: 220px;
  max-width: 270px;
  padding: 18px 12px;
  position: sticky;
  top: 90px;
}
.wz-side-title {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
  margin: 0 10px 10px;
  font-size: 12px;
  font-weight: 600;
}
.wz-steps {
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
}
.wz-bar {
  gap: 8px;
  margin-bottom: 20px;
  display: grid;
}
.wz-track {
  background: #e5ecf5;
  border-radius: 6px;
  height: 6px;
  overflow: hidden;
}
.wz-track i {
  background: var(--blue);
  border-radius: 6px;
  height: 100%;
  transition: width 0.3s;
  display: block;
}
.wz-steps li {
  color: #475569;
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
}
.wz-steps em {
  font-style: normal;
}
.wz-progress {
  color: var(--blue);
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.wz-steps span {
  color: #64748b;
  background: #fff;
  border: 1.5px solid #cbd5e1;
  border-radius: 50%;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 12.5px;
  font-weight: 600;
  display: grid;
}
.wz-steps .on {
  color: #0a2357;
  background: #eef4fd;
  font-weight: 600;
}
.wz-steps .on span {
  color: #fff;
  background: #0a2357;
  border-color: #0a2357;
}
.wz-steps .done span {
  color: #fff;
  background: #15803d;
  border-color: #15803d;
}
.wz-body {
  flex: 999 560px;
  min-width: 0;
  max-width: 860px;
}
.wz-two {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  display: grid;
}
.wz-modes {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  display: grid;
}
.wz-modes button {
  text-align: left;
  color: var(--ink);
  background: #fff;
  border: 1.5px solid #d3deec;
  border-radius: 14px;
  justify-items: start;
  gap: 6px;
  padding: 16px;
  font-weight: 600;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    box-shadow 0.15s;
  display: grid;
}
.wz-modes button:hover:not(.on) {
  border-color: #b6c6dc;
}
.wz-modes button span {
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.45;
}
.wz-modes button.on {
  border-color: var(--blue);
  background: #f3f8fe;
  box-shadow: 0 0 0 3px #1565c01a;
}
.wz-modes svg {
  color: #6b7c96;
}
.wz-modes button.on svg {
  color: var(--blue);
}
.wz-item {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: 16px 18px;
  padding: 20px;
  display: grid;
  box-shadow: 0 1px 2px #102a5a0a;
}
.wz-item > label:has(textarea) {
  grid-column: 1/-1;
}
.wz-item > button {
  grid-column: 1/-1;
  justify-self: end;
}
.wz-details {
  background: #f8fbff;
  border: 1.5px dashed #c9d6e7;
  border-radius: 14px;
  grid-column: 1/-1;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 14px 16px 16px;
  display: grid;
}
.wz-details legend {
  padding: 0 6px;
  font-size: 13px;
  font-weight: 700;
}
.wz-item-title {
  color: var(--green-dark);
  grid-column: 1/-1;
  margin: 0;
  font-size: 14px;
}
.wz-box {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 16px;
  gap: 14px;
  margin: 6px 0 0;
  padding: 20px;
  display: grid;
  box-shadow: 0 1px 2px #102a5a0a;
}
.wz-box legend {
  color: var(--ink);
  padding: 0 6px;
  font-weight: 700;
}
.wz-box .field-help {
  margin: 0;
}
.wz-fit {
  justify-self: start;
}
.wz-checks {
  gap: 14px;
}
.wz-check {
  align-items: flex-start;
  gap: 10px;
  font-weight: 500;
  line-height: 1.4;
  display: flex !important;
}
.wz-check input {
  width: 19px;
  height: 19px;
  accent-color: var(--blue);
  flex: none;
  margin-top: 1px;
}
.wz-sub {
  margin: 8px 0 0;
  font-size: 15px;
}
.wz-map {
  height: 260px;
  margin-top: 8px;
}
.wz-summary {
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.wz-summary li {
  align-items: flex-start;
  gap: 10px;
  line-height: 1.45;
  display: flex;
}
.wz-summary li span {
  overflow-wrap: anywhere;
  min-width: 0;
}
.wz-summary svg {
  color: var(--green);
  flex-shrink: 0;
  margin-top: 2px;
}
.wz-nav {
  border-top: 1px solid var(--line);
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
  padding-top: 18px;
  display: flex;
}
@media (width<=900px) {
  .wz-side {
    flex-basis: 100%;
    max-width: none;
    padding: 8px;
    position: static;
  }
  .wz-side-title,
  .wz-steps li:not(.on) em {
    display: none;
  }
  .wz-steps {
    scrollbar-width: none;
    flex-flow: row;
    gap: 6px;
    padding: 2px;
    overflow-x: auto;
  }
  .wz-steps li {
    flex: none;
    padding: 4px;
  }
  .wz-steps li.on {
    padding-right: 12px;
  }
}
@media (width<=720px) {
  .wz-item,
  .wz-modes,
  .wz-two {
    grid-template-columns: minmax(0, 1fr);
  }
  .wz-docs li {
    flex-wrap: wrap;
  }
  .wz-nav {
    z-index: 5;
    background: #fff;
    padding: 10px 0;
    position: sticky;
    bottom: 0;
  }
}
</style>
