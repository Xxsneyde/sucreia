<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Plus,
  ArrowUpRight,
  Upload,
  Copy,
  MoreHorizontal,
  PenLine,
  Sparkles,
  Trash2,
  Download,
} from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { parseDesignFile, designFile, styles } from '@/domain/studio';
import { areas, styleIds } from '@/domain/designs';
import { downloadFile } from './files';
import EditorModal from './EditorModal.vue';

const studio = useStudio();
const router = useRouter();
const upload = ref<HTMLInputElement | null>(null);
const message = ref('');
const deleteId = ref('');

function open(create: () => string) {
  try {
    router.push(`/estudio/gestionar?id=${create()}`);
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function importFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > 12_000_000) throw new Error('El archivo supera los 12 MB.');
    const design = parseDesignFile(await file.text());
    open(() => studio.create(design));
  } catch (error) {
    message.value = (error as Error).message;
  }
}
function remove() {
  studio.remove(deleteId.value);
  deleteId.value = '';
}
// Muestra de cada estilo con la paleta de la primera área que lo usa.
const showcase = styleIds.map((id) => {
  const area = areas.find((a) => a.choices.some((c) => c.style === id))!;
  return {
    style: styles[id],
    area: area.id,
    colors: area.choices.find((c) => c.style === id)!.colors,
  };
});
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
</script>

<template>
  <div class="studio-home">
    <div class="studio-home-heading">
      <div>
        <span class="studio-eyebrow">TU PEQUEÑO GRAN ESTUDIO</span>
        <h1>Las buenas ideas<br />merecen <em>un gran espacio.</em></h1>
        <p>Diseña, prueba y dale vida a tu negocio. A tu manera.</p>
      </div>
      <NuxtLink class="studio-primary" to="/registro/negocio">
        <Plus :size="17" /> Crear una tienda
      </NuxtLink>
    </div>
    <section class="studio-welcome">
      <div>
        <span class="studio-badge"><Sparkles :size="13" /> PRESENTAMOS ESTUDIO SUCREIA</span>
        <h2>Tu imaginación.<br />Tu próxima tienda.</h2>
        <p>
          Cuéntanos a qué te dedicas y te mostramos tu página lista en siete estilos, cada uno con
          su tipografía. Tú eliges el que más se parece a tu negocio.
        </p>
        <NuxtLink to="/registro/negocio">Empieza a crear <ArrowUpRight :size="17" /></NuxtLink>
      </div>
      <div class="welcome-editor-art" aria-hidden="true">
        <div class="mini-editor-top">
          <span>● ● ●</span>
          <span>Tu espacio creativo ✦</span>
        </div>
        <div class="mini-editor-body">
          <div class="mini-editor-tools"><i /><i /><i /><i /></div>
          <div class="mini-editor-page">
            <span>RAÍCES DE SUCRE</span>
            <div>
              <h3>Lo auténtico<br />siempre<br /><em>se siente.</em></h3>
              <img src="/art/craft.svg" alt="" />
            </div>
            <section><i /><i /><i /></section>
          </div>
          <div class="mini-editor-colors"><i /><i /><i /></div>
        </div>
        <span class="mini-editor-cursor">↖ Tu próxima gran idea</span>
      </div>
    </section>
    <div class="studio-section-title">
      <div>
        <h2>Tus espacios</h2>
        <p>
          {{
            studio.projects.length
              ? 'Cada uno, una historia por contar.'
              : 'Tu primera tienda empieza aquí.'
          }}
        </p>
      </div>
      <button class="studio-secondary" :disabled="!studio.ready" @click="upload?.click()">
        <Upload :size="15" /> Importar diseño
      </button>
      <input ref="upload" type="file" accept=".json" hidden @change="importFile" />
    </div>
    <p v-if="message" role="status" class="notice">{{ message }}</p>
    <p v-if="studio.error" class="field-error">
      {{ studio.error }} <button @click="studio.retry()">Reintentar</button>
    </p>
    <div class="studio-projects">
      <article v-for="p in studio.projects" :key="p.id" class="studio-project">
        <NuxtLink
          class="project-preview"
          :to="`/estudio/gestionar?id=${p.id}`"
          :style="{ background: p.draft.colors.background, color: p.draft.colors.text }"
        >
          <span>{{ p.draft.name }}</span>
          <div :style="{ background: p.draft.colors.accent }">
            <h3 :style="{ fontFamily: styles[p.draft.style].fonts.heading }">
              {{ p.draft.content.heroTitle || p.draft.name }}
            </h3>
            <img :src="p.draft.content.heroImage || '/art/craft.svg'" alt="" />
          </div>
          <section>
            <i
              v-for="product in p.draft.products.slice(0, 3)"
              :key="product.id"
              :style="{ background: p.draft.colors.accent }"
            >
              <img v-if="product.image" :src="product.image" alt="" />
            </i>
          </section>
          <span class="project-hover"><PenLine :size="17" /> Abrir editor</span>
        </NuxtLink>
        <div class="project-details">
          <div>
            <h3>{{ p.draft.name || 'Sin nombre' }}</h3>
            <span :class="['project-state', { published: p.published }]">
              <i />
              {{ p.published ? 'Publicada localmente' : 'Borrador' }}
            </span>
          </div>
          <details class="project-menu">
            <summary :aria-label="`Opciones de ${p.draft.name}`">
              <MoreHorizontal :size="20" />
            </summary>
            <div>
              <button @click="open(() => studio.duplicate(p.id))">
                <Copy :size="14" /> Duplicar
              </button>
              <button @click="downloadFile(`${p.draft.name}.sucreia.json`, designFile(p.draft))">
                <Download :size="14" /> Exportar
              </button>
              <button @click="deleteId = p.id"><Trash2 :size="14" /> Eliminar</button>
            </div>
          </details>
        </div>
        <div class="project-bottom">
          <small>{{ shortDate(p.updatedAt) }} · {{ p.draft.products.length }} ofertas</small>
          <NuxtLink v-if="p.published" :to="`/tienda?id=${p.id}`">
            Visitar tienda <ArrowUpRight :size="14" />
          </NuxtLink>
          <NuxtLink v-else :to="`/estudio/gestionar?id=${p.id}`">Seguir creando →</NuxtLink>
        </div>
      </article>
      <NuxtLink class="new-project-tile" to="/registro/negocio">
        <span><Plus :size="28" /></span>
        <h3>Una nueva historia</h3>
        <p>Crea otro negocio o explora una idea.</p>
      </NuxtLink>
    </div>
    <div class="studio-section-title">
      <div>
        <h2>Siete estilos para elegir</h2>
        <p>Según tu área te recomendamos tres, pero puedes elegir cualquiera.</p>
      </div>
      <span class="studio-small-tag">Con tipografía propia</span>
    </div>
    <div class="studio-template-grid">
      <NuxtLink v-for="s in showcase" :key="s.style.id" to="/registro/negocio">
        <div :style="{ background: s.colors.accent, color: s.colors.primary }">
          <span :style="{ fontFamily: s.style.fonts.heading }">Aa</span>
          <small>{{ s.style.fonts.label }}</small>
        </div>
        <section>
          <strong>{{ s.style.name }}</strong>
          <ArrowUpRight :size="15" />
        </section>
        <p>{{ s.style.description }}</p>
      </NuxtLink>
    </div>
    <EditorModal v-if="deleteId" title="¿Eliminar esta tienda?" @close="deleteId = ''">
      <p>
        Se eliminarán su borrador, publicación y versiones. Los pedidos existentes se conservan.
        Puedes exportar una copia antes de continuar.
      </p>
      <button class="studio-primary full" @click="remove">Eliminar tienda local</button>
    </EditorModal>
  </div>
</template>
