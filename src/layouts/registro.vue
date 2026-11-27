<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { X } from '@lucide/vue';
import { useSession } from '@/lib/session';
import SucreLogo from '@/components/sucre/SucreLogo.vue';
// Pestaña aparte para registrar el negocio: solo el formulario, sin el menú de la plataforma.
const session = useSession();
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
  void session.load();
});
/** Cierra la pestaña; si el navegador no lo permite (no la abrió SucreIA), vuelve al panel. */
function closeTab() {
  window.close();
  setTimeout(() => {
    if (!window.closed) window.location.href = '/panel';
  }, 150);
}
</script>
<template>
  <div class="rg">
    <a class="skip-link" href="#registro">Saltar al formulario</a>
    <header class="rg-top">
      <div class="rg-brand">
        <SucreLogo :size="34" />
        <span class="rg-title">Registro de tu emprendimiento</span>
      </div>
      <button type="button" class="rg-close" @click="closeTab">
        <X :size="18" /> <span>Cerrar pestaña</span>
      </button>
    </header>
    <main id="registro" class="rg-main" :inert="session.ending">
      <slot v-if="mounted" />
      <p v-else class="loader" role="status">Comprobando tu acceso…</p>
    </main>
    <footer class="rg-foot">
      SucreIA revisa cada registro antes de publicarlo. Tus documentos solo los ve la
      administración.
      <NuxtLink to="/terminos" target="_blank">Términos y condiciones</NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.rg {
  background:
    radial-gradient(circle at 0 0, #22b14c14 0 220px, transparent 221px),
    linear-gradient(180deg, #f6f9fe, var(--bg));
  flex-direction: column;
  min-height: 100dvh;
  display: flex;
}
.rg-top {
  z-index: 20;
  background: linear-gradient(90deg, var(--navy-900), var(--navy-700));
  color: #fff;
  justify-content: space-between;
  gap: 12px;
  padding: 12px clamp(16px, 4vw, 40px);
  position: sticky;
  top: 0;
  box-shadow: 0 4px 18px #0a235733;
}
.rg-brand,
.rg-top {
  align-items: center;
  display: flex;
}
.rg-brand {
  gap: 14px;
  min-width: 0;
}
.rg-title {
  white-space: nowrap;
  text-overflow: ellipsis;
  border-left: 1px solid #ffffff4d;
  padding-left: 14px;
  font-weight: 600;
  overflow: hidden;
}
.rg-close {
  color: #fff;
  border: 1px solid #ffffff59;
  border-radius: 999px;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-weight: 600;
  display: inline-flex;
}
.rg-close:hover {
  background: #ffffff1f;
}
.rg-main {
  flex: 1;
  width: min(100%, 940px);
  margin: 0 auto;
  padding: 26px clamp(14px, 4vw, 32px) 40px;
}
.rg-foot {
  text-align: center;
  color: var(--muted);
  padding: 16px clamp(16px, 4vw, 40px) 24px;
  font-size: 12.5px;
}
@media (width<=560px) {
  .rg-close span,
  .rg-title {
    display: none;
  }
  .rg-close {
    padding: 8px;
  }
}
</style>
