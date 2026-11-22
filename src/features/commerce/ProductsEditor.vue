<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Plus, Send, Trash2 } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import { publicationErrors, type StoreDesign, type StoreProduct } from '@/domain/studio';
import type { CommerceStore } from '@/domain/platform';
import ImageField from '@/components/images/ImageField.vue';
import PageTitle from '@/components/PageTitle.vue';

// Productos y servicios: nombre, grupo, precio, foto y existencias de cada oferta.
const studio = useStudio();
const p = usePlatform();
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
function setProducts(products: StoreProduct[]) {
  if (store.value && d.value)
    studio.update(store.value.id, { ...d.value, products } as StoreDesign);
}
function edit(i: number, patch: Partial<StoreProduct>) {
  const list = d.value!.products.map((x, j) => (j === i ? { ...x, ...patch } : x));
  setProducts(list);
}
function addProduct() {
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
    meta.value = await p.run('PUT', `/negocios/${store.value!.id}/inventario`, {
      productId,
      quantity: value === '' ? null : Number(value),
    });
    message.value = 'Existencias actualizadas.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const errors = computed(() => (d.value ? publicationErrors(d.value) : []));
async function publish() {
  try {
    await studio.publish(store.value!.id);
    message.value = 'Catálogo publicado.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const groups = computed(() => [
  ...new Set(d.value?.products.map((x) => x.category?.trim()).filter(Boolean)),
]);
</script>
<template>
  <PageTitle
    eyebrow="Mi negocio"
    title="Productos y servicios"
    description="Agrega al menos tres ofertas con nombre, precio y foto. Agrúpalas para que el cliente filtre (Tortas, Postres…)."
  >
    <div v-if="d" class="pe-actions">
      <button type="button" class="sx-btn sx-btn--ghost" @click="addProduct">
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
    <p v-if="errors.length" class="notice" role="alert">{{ errors.join(' ') }}</p>
    <datalist id="pe-grupos"><option v-for="g in groups" :key="g" :value="g" /></datalist>
    <div class="pe-list">
      <article v-for="(item, i) in d.products" :key="item.id" class="sx-card pe-item">
        <ImageField
          :label="`Foto de ${item.name || 'la oferta'}`"
          :model-value="item.image"
          @update:model-value="edit(i, { image: $event })"
        />
        <div class="form-stack">
          <div class="pe-two">
            <label
              >Nombre<input
                :value="item.name"
                required
                maxlength="160"
                @input="edit(i, { name: ($event.target as HTMLInputElement).value })"
            /></label>
            <label
              >Grupo (opcional)<input
                :value="item.category ?? ''"
                list="pe-grupos"
                maxlength="60"
                placeholder="Ej.: Tortas"
                @input="edit(i, { category: ($event.target as HTMLInputElement).value })"
            /></label>
          </div>
          <label
            >Descripción<textarea
              :value="item.description"
              rows="2"
              maxlength="600"
              @input="edit(i, { description: ($event.target as HTMLTextAreaElement).value })"
            />
          </label>
          <div class="pe-two">
            <label
              >{{ d.mode === 'quote' ? 'Precio de referencia (0 = a cotizar)' : 'Precio (COP)' }}
              <input
                :value="item.price"
                type="number"
                min="0"
                max="1000000000"
                step="100"
                @input="
                  edit(i, {
                    price: Math.max(
                      0,
                      Math.round(Number(($event.target as HTMLInputElement).value) || 0),
                    ),
                  })
                "
              />
            </label>
            <label v-if="d.mode === 'products'"
              >Unidades disponibles
              <input
                type="number"
                min="0"
                max="1000000"
                :value="meta?.stock[item.id] ?? ''"
                placeholder="Sin límite"
                :disabled="!store?.published || p.busy.value"
                @change="stock(item.id, ($event.target as HTMLInputElement).value)"
              />
              <span v-if="!store?.published" class="field-help"
                >Disponible cuando publiques tu negocio.</span
              >
            </label>
            <label v-if="d.mode === 'booking'"
              >Duración (minutos)
              <input
                :value="item.duration ?? ''"
                type="number"
                min="10"
                max="480"
                step="5"
                placeholder="La general de tu agenda"
                @input="
                  edit(i, {
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
              />
            </label>
          </div>
          <button type="button" class="sx-btn sx-btn--ghost sx-btn--sm pe-del" @click="remove(i)">
            <Trash2 :size="15" /> Quitar
          </button>
        </div>
      </article>
    </div>
    <button
      type="button"
      class="sx-btn sx-btn--outline"
      style="margin-top: 16px"
      @click="addProduct"
    >
      <Plus :size="17" /> Agregar otra oferta
    </button>
  </template>
</template>
<style scoped>
.pe-actions {
  display: flex;
  gap: 10px;
}
.pe-list {
  display: grid;
  gap: 16px;
}
.pe-item {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
}
.pe-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.pe-del {
  justify-self: start;
}
@media (max-width: 760px) {
  .pe-item,
  .pe-two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
