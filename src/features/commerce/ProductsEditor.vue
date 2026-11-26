<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ChevronDown, Plus, Send, Trash } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import { publicationErrors, thumbnail, type StoreProduct } from '@/domain/studio';
import { detailExample, detailFieldsFor } from '@/domain/product-details';
import type { CommerceStore } from '@/domain/platform';
import ImageField from '@/components/images/ImageField.vue';
import PageTitle from '@/components/PageTitle.vue';

// Productos y servicios del negocio activo: hasta tres fotos, precio, grupo, existencias,
// duración (reservas) y la ficha técnica sugerida según el sector.
const studio = useStudio();
const platform = usePlatform();
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) ?? studio.projects[0],
);
const d = computed(() => store.value?.draft);
const meta = ref<CommerceStore | null>(null);
const message = ref('');
watch(
  () => store.value?.id,
  async (id) => {
    if (!id) return;
    try {
      meta.value = await api<CommerceStore>('GET', `/plataforma/negocios/${id}`);
    } catch (e) {
      message.value = (e as Error).message;
    }
  },
  { immediate: true },
);
// Cada oferta se pliega; las incompletas se ven abiertas.
const toggled = ref<Record<string, boolean>>({});
const incomplete = (p: StoreProduct) =>
  !p.name.trim() || !p.image || (d.value?.mode !== 'quote' && !(p.price > 0));
const isOpen = (p: StoreProduct) => toggled.value[p.id] ?? incomplete(p);
function toggle(p: StoreProduct) {
  toggled.value = { ...toggled.value, [p.id]: !isOpen(p) };
}
function setProducts(products: StoreProduct[]) {
  if (store.value && d.value) studio.update(store.value.id, { ...d.value, products });
}
function patch(i: number, change: Partial<StoreProduct>) {
  setProducts(d.value!.products.map((p, j) => (j === i ? { ...p, ...change } : p)));
}
function add() {
  setProducts([
    ...d.value!.products,
    { id: crypto.randomUUID(), name: '', description: '', price: 0, image: '', category: '' },
  ]);
}
function remove(i: number) {
  setProducts(d.value!.products.filter((_, j) => j !== i));
}
async function stock(productId: string, value: string) {
  try {
    meta.value = await platform.run<CommerceStore>(
      'PUT',
      `/negocios/${store.value!.id}/inventario`,
      {
        productId,
        quantity: value === '' ? null : Number(value),
      },
    );
    message.value = 'Existencias actualizadas.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
/** Fotos 2 y 3 del producto. */
function setGallery(i: number, slot: number, src: string) {
  const list = [...(d.value!.products[i].gallery ?? [])];
  list[slot] = src;
  const kept = list.filter(Boolean).slice(0, 2);
  patch(i, { gallery: kept.length ? kept : undefined });
}
// --- Ficha técnica: características sugeridas del sector y otras que agregue la persona ------
const suggested = computed(() => detailFieldsFor(d.value?.category ?? ''));
function detailValue(p: StoreProduct, label: string) {
  return p.details?.find((x) => x.label === label)?.value ?? '';
}
const customDetails = (p: StoreProduct) =>
  (p.details ?? []).filter((x) => !suggested.value.includes(x.label));
function setCustom(i: number, j: number, change: Partial<{ label: string; value: string }>) {
  const p = d.value!.products[i];
  const custom = customDetails(p).map((x, k) => (k === j ? { ...x, ...change } : x));
  patch(i, {
    details: [
      ...(p.details ?? []).filter((x) => suggested.value.includes(x.label)),
      ...custom,
    ].slice(0, 8),
  });
}
function addCustom(i: number) {
  const p = d.value!.products[i];
  if ((p.details?.length ?? 0) >= 8) return;
  patch(i, { details: [...(p.details ?? []), { label: '', value: '' }] });
}
function removeCustom(i: number, j: number) {
  const p = d.value!.products[i];
  const custom = customDetails(p).filter((_, k) => k !== j);
  const all = [...(p.details ?? []).filter((x) => suggested.value.includes(x.label)), ...custom];
  patch(i, { details: all.length ? all : undefined });
}
/** Las sugeridas van primero y en su orden; una vacía se quita. */
function setSuggested(i: number, label: string, value: string) {
  const rest = (d.value!.products[i].details ?? []).filter((x) => x.label !== label);
  const all = value.trim() ? [...rest, { label, value }] : rest;
  const ordered = suggested.value
    .map((l) => all.find((x) => x.label === l))
    .filter((x): x is { label: string; value: string } => !!x)
    .concat(all.filter((x) => !suggested.value.includes(x.label)));
  patch(i, { details: ordered.length ? ordered.slice(0, 8) : undefined });
}
const errors = computed(() => (d.value ? publicationErrors(d.value) : []));
async function publish() {
  try {
    const result = await studio.publish(store.value!.id);
    if (!result.published) {
      message.value = 'Solicitud enviada. Administración revisará tu negocio antes de publicarlo.';
      return;
    }
    message.value = 'Catálogo publicado.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
/** Grupos ya usados, para sugerirlos al escribir. */
const groups = computed(() => [
  ...new Set(d.value?.products.map((p) => p.category?.trim()).filter(Boolean)),
]);
</script>

<template>
  <PageTitle
    eyebrow="Mi negocio"
    title="Productos y servicios"
    description="Agrega al menos tres ofertas con nombre, precio y hasta tres fotos. Completa la ficha para que el cliente sepa de qué está hecho cada uno."
  >
    <div v-if="d" class="pe-actions">
      <button type="button" class="sx-btn sx-btn--ghost" @click="add">
        <Plus :size="17" /> Agregar
      </button>
      <button type="button" class="sx-btn" :disabled="errors.length > 0" @click="publish">
        <Send :size="17" /> Publicar cambios
      </button>
    </div>
  </PageTitle>
  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <p v-if="!studio.ready" class="loader" role="status">Cargando…</p>
  <div v-else-if="!d" class="sx-card empty">
    <h2>Primero crea tu negocio</h2>
    <NuxtLink to="/panel/perfil" class="sx-btn">Ir a datos del negocio</NuxtLink>
  </div>
  <template v-else>
    <label v-if="studio.projects.length > 1" class="sx-card pe-pick">
      Emprendimiento
      <select
        :value="store!.id"
        @change="studio.select(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="p in studio.projects" :key="p.id" :value="p.id">
          {{ p.draft.name || 'Sin nombre' }} · {{ p.draft.products.length }}
          {{ p.draft.mode === 'products' ? 'productos' : 'servicios' }}
        </option>
      </select>
      <span class="field-help">Elige el negocio para ver y editar sus productos o servicios.</span>
    </label>
    <p v-if="errors.length" class="notice" role="alert">{{ errors.join(' ') }}</p>
    <datalist id="pe-grupos">
      <option v-for="g in groups" :key="g" :value="g" />
    </datalist>
    <div class="pe-list">
      <article
        v-for="(p, i) in d.products"
        :key="p.id"
        :class="['sx-card', 'pe-item', { open: isOpen(p) }]"
      >
        <h2 class="pe-head">
          <button
            type="button"
            class="pe-summary"
            :aria-expanded="isOpen(p)"
            :aria-controls="`oferta-${p.id}`"
            @click="toggle(p)"
          >
            <img v-if="p.image" :src="thumbnail(p.image)" alt="" width="48" height="48" />
            <span v-else class="pe-noimg" aria-hidden="true" />
            <span class="pe-summary-main">
              <strong>{{ p.name || 'Oferta sin nombre' }}</strong>
              <small
                >{{ p.category || 'Sin grupo' }} ·
                {{ p.price > 0 ? currency(p.price) : 'Precio por definir' }}</small
              >
            </span>
            <span v-if="incomplete(p)" class="pe-badge">Incompleto</span>
            <ChevronDown :size="20" class="pe-chevron" aria-hidden="true" />
          </button>
        </h2>
        <div v-show="isOpen(p)" :id="`oferta-${p.id}`" class="pe-body">
          <div class="pe-photos">
            <ImageField
              :label="`Foto principal de ${p.name || 'la oferta'}`"
              :model-value="p.image"
              @update:model-value="(v: string) => patch(i, { image: v })"
            />
            <div class="pe-extra">
              <ImageField
                v-for="slot in [0, 1]"
                :key="slot"
                :label="`Foto ${slot + 2}`"
                :model-value="p.gallery?.[slot] ?? ''"
                @update:model-value="(v: string) => setGallery(i, slot, v)"
              />
            </div>
            <div class="pe-preview" aria-label="Así lo verán tus clientes" role="group">
              <p class="pe-preview-title">Así lo verán tus clientes</p>
              <div class="pe-preview-card">
                <img v-if="p.image" :src="thumbnail(p.image)" alt="" />
                <div class="pe-preview-body">
                  <small v-if="p.category">{{ p.category }}</small>
                  <strong>{{ p.name || 'Nombre de la oferta' }}</strong>
                  <span v-if="p.details?.length" class="pe-preview-chips">
                    <span v-for="x in p.details.slice(0, 3)" :key="x.label">{{ x.value }}</span>
                  </span>
                  <b>{{ p.price > 0 ? currency(p.price) : 'A cotizar' }}</b>
                </div>
              </div>
            </div>
          </div>
          <div class="form-stack">
            <div class="pe-two">
              <label
                >Nombre<input
                  :value="p.name"
                  required
                  maxlength="160"
                  @input="patch(i, { name: ($event.target as HTMLInputElement).value })"
              /></label>
              <label
                >Grupo (opcional)<input
                  :value="p.category ?? ''"
                  list="pe-grupos"
                  maxlength="60"
                  placeholder="Ej.: Tortas"
                  @input="patch(i, { category: ($event.target as HTMLInputElement).value })"
              /></label>
            </div>
            <label
              >Descripción<textarea
                :value="p.description"
                rows="2"
                maxlength="600"
                @input="patch(i, { description: ($event.target as HTMLTextAreaElement).value })"
              />
            </label>
            <div class="pe-two">
              <label
                >{{ d.mode === 'quote' ? 'Precio de referencia (0 = a cotizar)' : 'Precio (COP)' }}
                <input
                  :value="p.price"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="100"
                  @input="
                    patch(i, {
                      price: Math.max(
                        0,
                        Math.round(Number(($event.target as HTMLInputElement).value) || 0),
                      ),
                    })
                  "
              /></label>
              <label v-if="d.mode === 'products'"
                >Unidades disponibles
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  :value="meta?.stock[p.id] ?? ''"
                  placeholder="Sin límite"
                  :disabled="!store?.published || platform.busy.value"
                  @change="stock(p.id, ($event.target as HTMLInputElement).value)"
                />
                <span v-if="!store?.published" class="field-help"
                  >Disponible cuando publiques tu negocio.</span
                ></label
              >
              <label v-if="d.mode === 'booking'"
                >Duración (minutos)
                <input
                  :value="p.duration ?? ''"
                  type="number"
                  min="10"
                  max="480"
                  step="5"
                  placeholder="La general de tu agenda"
                  @input="
                    patch(i, {
                      duration:
                        ($event.target as HTMLInputElement).value === ''
                          ? undefined
                          : Math.min(
                              480,
                              Math.max(
                                10,
                                Math.round(Number(($event.target as HTMLInputElement).value)),
                              ),
                            ),
                    })
                  "
              /></label>
            </div>
            <fieldset class="pe-details">
              <legend>
                Características del {{ d.mode === 'products' ? 'producto' : 'servicio' }}
              </legend>
              <p class="field-help">
                Lo que el cliente ve al abrirlo: tamaño, libras, porciones, de qué está hecho, qué
                incluye… Llena las que apliquen.
              </p>
              <div class="pe-two">
                <label v-for="label in suggested" :key="label"
                  >{{ label }}
                  <input
                    :value="detailValue(p, label)"
                    :placeholder="detailExample(label)"
                    maxlength="300"
                    @change="setSuggested(i, label, ($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
              <div v-for="(x, j) in customDetails(p)" :key="j" class="pe-custom">
                <label
                  ><span class="sr-only">Nombre de la característica</span
                  ><input
                    :value="x.label"
                    maxlength="60"
                    placeholder="Ej.: Relleno"
                    @change="setCustom(i, j, { label: ($event.target as HTMLInputElement).value })"
                /></label>
                <label
                  ><span class="sr-only">Valor de {{ x.label || 'la característica' }}</span
                  ><input
                    :value="x.value"
                    maxlength="300"
                    placeholder="Ej.: Arequipe"
                    @change="setCustom(i, j, { value: ($event.target as HTMLInputElement).value })"
                /></label>
                <button
                  type="button"
                  class="sx-btn sx-btn--ghost sx-btn--sm"
                  :aria-label="`Quitar ${x.label || 'característica'}`"
                  @click="removeCustom(i, j)"
                >
                  <Trash :size="14" />
                </button>
              </div>
              <button
                v-if="(p.details?.length ?? 0) < 8"
                type="button"
                class="sx-btn sx-btn--ghost sx-btn--sm pe-add-detail"
                @click="addCustom(i)"
              >
                <Plus :size="14" /> Agregar otra característica
              </button>
            </fieldset>
            <button type="button" class="sx-btn sx-btn--ghost sx-btn--sm pe-del" @click="remove(i)">
              <Trash :size="15" /> Quitar
            </button>
          </div>
        </div>
      </article>
    </div>
    <button type="button" class="sx-btn sx-btn--outline" style="margin-top: 16px" @click="add">
      <Plus :size="17" /> Agregar otra oferta
    </button>
  </template>
</template>

<style scoped>
.pe-actions {
  flex-wrap: wrap;
  gap: 10px;
  display: flex;
}
.pe-list {
  gap: 16px;
  display: grid;
}
.pe-item {
  padding: 0;
  overflow: hidden;
}
.pe-head {
  font-size: inherit;
  margin: 0;
}
.pe-summary {
  text-align: left;
  width: 100%;
  color: var(--ink);
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  display: flex;
}
.pe-summary:hover {
  background: #f8fbff;
}
.pe-noimg,
.pe-summary img {
  object-fit: cover;
  background: #eef3fa;
  border-radius: 10px;
  flex: none;
  width: 48px;
  height: 48px;
}
.pe-summary-main {
  flex: 1;
  gap: 2px;
  min-width: 0;
  display: grid;
}
.pe-summary-main strong {
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15.5px;
  overflow: hidden;
}
.pe-summary-main small {
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
}
.pe-badge {
  color: #9a3412;
  background: #fff4e5;
  border-radius: 999px;
  flex: none;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}
.pe-chevron {
  color: #6b7c96;
  flex: none;
  transition: transform 0.2s;
}
.pe-item.open .pe-chevron {
  transform: rotate(180deg);
}
.pe-body {
  border-top: 1px solid var(--line);
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  padding: 20px;
  display: grid;
}
.pe-preview {
  gap: 8px;
  margin-top: 6px;
  display: grid;
}
.pe-preview-title {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
}
.pe-preview-card {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 14px #102a5a0f;
}
.pe-preview-card img {
  aspect-ratio: 4/3;
  object-fit: cover;
  width: 100%;
  display: block;
}
.pe-preview-body {
  gap: 4px;
  padding: 12px;
  display: grid;
}
.pe-preview-body small {
  color: #475569;
  font-size: 11.5px;
  font-weight: 600;
}
.pe-preview-body strong {
  font-size: 14px;
  line-height: 1.3;
}
.pe-preview-chips {
  flex-wrap: wrap;
  gap: 4px;
  display: flex;
}
.pe-preview-chips span {
  color: #334155;
  background: #eef3fa;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
}
.pe-preview-body b {
  color: #0a2357;
  font-size: 15px;
}
.pe-two {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  display: grid;
}
.pe-del {
  place-self: flex-start start;
}
.pe-photos {
  align-content: start;
  gap: 10px;
  display: grid;
}
.pe-extra {
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  display: grid;
}
.pe-details {
  border: 1px solid var(--line);
  background: #fbfdff;
  border-radius: 14px;
  gap: 10px;
  margin: 0;
  padding: 12px 14px 14px;
  display: grid;
}
.pe-details legend {
  padding: 0 6px;
  font-weight: 700;
}
.pe-details .field-help {
  margin: 0;
}
.pe-custom {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  align-items: center;
  gap: 8px;
  display: grid;
}
.pe-add-detail {
  justify-self: start;
}
.pe-pick {
  gap: 6px;
  margin-bottom: 16px;
  font-weight: 600;
  display: grid;
}
.pe-pick select {
  border: 1.5px solid var(--field-border);
  background: #fff;
  border-radius: 12px;
  min-height: 44px;
  padding: 0 12px;
  font-weight: 600;
}
.pe-pick .field-help {
  margin: 0;
  font-weight: 400;
}
@media (width<=760px) {
  .pe-body,
  .pe-two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
