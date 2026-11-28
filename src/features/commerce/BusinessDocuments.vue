<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { CircleAlert, CircleCheck, FileText } from '@lucide/vue';
import { api } from '@/lib/api';
import {
  allDocuments,
  documentKinds,
  acceptFor,
  formatsFor,
  mimesFor,
  optionalDocument,
  type DocumentKind,
  type PersonType,
} from '@/domain/documents';
// Documentos del registro del negocio (solo los ve la administración).
const props = defineProps<{ storeId: string }>();
interface Documents {
  legalType: PersonType;
  documents: { kind: DocumentKind; name: string; mime: string; uploadedAt: string }[];
}
const data = ref<Documents | null>(null);
const message = ref('');
const uploading = ref('');
async function load() {
  if (!props.storeId) return;
  try {
    data.value = await api<Documents>('GET', `/plataforma/negocios/${props.storeId}/documentos`);
  } catch (e) {
    message.value = (e as Error).message;
  }
}
onMounted(load);
watch(() => props.storeId, load);
const kinds = computed(() =>
  documentKinds.filter((d) => allDocuments(data.value?.legalType ?? 'natural').includes(d.id)),
);
const uploaded = (kind: DocumentKind) => data.value?.documents.find((d) => d.kind === kind);
async function setType(legalType: PersonType) {
  try {
    data.value = await api<Documents>('PUT', `/plataforma/negocios/${props.storeId}/tipo-legal`, {
      legalType,
    });
  } catch (e) {
    message.value = (e as Error).message;
  }
}
function upload(kind: DocumentKind, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!mimesFor(kind).includes(file.type))
    return (message.value = `Sube el documento en ${formatsFor(kind)}.`);
  if (file.size > 4 * 1024 * 1024) return (message.value = 'Máximo 4 MB por documento.');
  const reader = new FileReader();
  reader.onload = async () => {
    uploading.value = kind;
    try {
      data.value = await api<Documents>(
        'PUT',
        `/plataforma/negocios/${props.storeId}/documentos/${kind}`,
        { name: file.name, data: String(reader.result) },
      );
      message.value = 'Documento guardado.';
    } catch (err) {
      message.value = (err as Error).message;
    } finally {
      uploading.value = '';
    }
  };
  reader.readAsDataURL(file);
}
</script>
<template>
  <section class="sx-card bd">
    <h2><FileText :size="20" /> Documentos del registro</h2>
    <p class="muted">
      Solo los ve la administración de SucreIA. La cédula va en PDF; los demás, en PDF o imagen.
      Máximo 4 MB.
    </p>
    <div v-if="data" class="bd-type" role="radiogroup" aria-label="Tipo de persona">
      <label
        ><input type="radio" :checked="data.legalType === 'natural'" @change="setType('natural')" />
        Persona natural</label
      >
      <label
        ><input
          type="radio"
          :checked="data.legalType === 'juridica'"
          @change="setType('juridica')"
        />
        Persona jurídica</label
      >
    </div>
    <ul v-if="data" class="bd-list">
      <li v-for="d in kinds" :key="d.id">
        <CircleCheck v-if="uploaded(d.id)" :size="18" class="ok" />
        <CircleAlert v-else :size="18" class="bad" />
        <span>
          <strong
            >{{ d.label
            }}<template v-if="optionalDocument(data.legalType, d.id)"> (opcional)</template></strong
          >
          <small>{{ uploaded(d.id)?.name ?? d.hint }}</small>
        </span>
        <label class="sx-btn sx-btn--outline sx-btn--sm"
          >{{ uploading === d.id ? 'Subiendo…' : uploaded(d.id) ? 'Reemplazar' : 'Adjuntar' }}
          <input
            class="sr-only"
            type="file"
            :accept="acceptFor(d.id)"
            :aria-label="`Adjuntar ${d.label}`"
            :disabled="!!uploading"
            @change="upload(d.id, $event)"
        /></label>
      </li>
    </ul>
    <p v-if="message" role="status" class="small">{{ message }}</p>
  </section>
</template>

<style scoped>
.bd h2 {
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: 18px;
  display: flex;
}
.bd-type {
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 12px 0;
  display: flex;
}
.bd-list {
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.bd-list li {
  background: var(--bg);
  border-radius: 12px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  display: flex;
}
.bd-list span {
  flex: 1;
  min-width: 0;
  display: grid;
}
.bd-list small {
  color: var(--muted);
  overflow-wrap: anywhere;
}
.bd-list label {
  cursor: pointer;
  flex: none;
}
.ok {
  color: var(--green-dark);
}
.bad,
.ok {
  flex: none;
}
.bad {
  color: #d97706;
}
</style>
