<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Trash2, ChevronDown } from '@lucide/vue';
import { currency } from '@/domain/rules';
import type { StoreProduct } from '@/domain/studio';
import type { BusinessMode } from '@/domain/types';
import ImageField from './ImageField.vue';
const props = defineProps<{ products: StoreProduct[]; mode: BusinessMode }>();
const emit = defineEmits<{ update: [products: StoreProduct[]] }>();
const open = ref(props.products[0]?.id ?? '');
const value = (e: Event) => (e.target as HTMLInputElement).value;
function patch(id: string, change: Partial<StoreProduct>) {
  emit(
    'update',
    props.products.map((p) => (p.id === id ? { ...p, ...change } : p)),
  );
}
function add() {
  const id = crypto.randomUUID();
  emit('update', [...props.products, { id, name: '', description: '', price: 0, image: '' }]);
  open.value = id;
}
</script>

<template>
  <div class="product-editor-list">
    <div v-for="(p, i) in products" :key="p.id" class="product-editor-item">
      <button
        class="product-editor-heading"
        type="button"
        :aria-expanded="open === p.id"
        @click="open = open === p.id ? '' : p.id"
      >
        <img v-if="p.image" :src="p.image" alt="" />
        <span v-else>{{ i + 1 }}</span>
        <div>
          <strong>{{ p.name || 'Nuevo producto' }}</strong>
          <small>{{ mode === 'quote' ? 'Bajo cotización' : currency(p.price) }}</small>
        </div>
        <ChevronDown :size="15" />
      </button>
      <div v-if="open === p.id" class="studio-form">
        <label>
          Nombre del {{ mode === 'products' ? 'producto' : 'servicio' }}
          <input maxlength="160" :value="p.name" @input="patch(p.id, { name: value($event) })" />
        </label>
        <label>
          Descripción
          <textarea
            maxlength="1000"
            :value="p.description"
            @input="patch(p.id, { description: value($event) })"
          />
        </label>
        <label v-if="mode !== 'quote'">
          Precio en pesos (COP)
          <input
            type="number"
            min="0"
            max="1000000000"
            step="100"
            :value="p.price"
            @input="patch(p.id, { price: Math.min(1e9, Math.max(0, Number(value($event)))) })"
          />
        </label>
        <ImageField
          :label="`Foto de ${p.name || 'producto'}`"
          :model-value="p.image"
          @update:model-value="(image: string) => patch(p.id, { image })"
        />
        <button
          type="button"
          class="studio-text-button danger"
          @click="
            emit(
              'update',
              products.filter((x) => x.id !== p.id),
            )
          "
        >
          <Trash2 :size="14" /> Quitar del catálogo
        </button>
      </div>
    </div>
    <button
      class="studio-secondary full"
      type="button"
      :disabled="products.length >= 60"
      @click="add"
    >
      <Plus :size="16" /> Agregar {{ mode === 'products' ? 'producto' : 'servicio' }}
    </button>
  </div>
</template>
