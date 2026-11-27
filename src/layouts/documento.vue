<script setup lang="ts">
import { Printer } from '@lucide/vue';
import SucreLogo from '@/components/sucre/SucreLogo.vue';
// Documentos para leer (Política de uso): sin el menú de la plataforma, con la marca arriba y la
// opción de imprimir o guardar en PDF. Se abre en una pestaña aparte desde el registro.
const print = () => window.print();
</script>

<template>
  <div class="dc">
    <a class="skip-link" href="#documento">Saltar al documento</a>
    <header class="dc-top">
      <NuxtLink to="/" class="dc-brand" aria-label="SucreIA, inicio">
        <SucreLogo :size="32" tone="dark" />
      </NuxtLink>
      <button type="button" class="dc-print" @click="print">
        <Printer :size="17" /> <span>Imprimir o guardar PDF</span>
      </button>
    </header>
    <main id="documento" class="dc-main"><slot /></main>
    <footer class="dc-foot">
      SucreIA · El ecosistema digital de emprendimientos de Sucre ·
      <NuxtLink to="/pqrs">PQRS</NuxtLink> ·
      <NuxtLink to="/quienes-somos">Quiénes somos</NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.dc {
  background: var(--bg);
  flex-direction: column;
  min-height: 100dvh;
  display: flex;
}
.dc-top {
  z-index: 20;
  background: #fff;
  border-bottom: 1px solid var(--line);
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px clamp(16px, 4vw, 40px);
  display: flex;
  position: sticky;
  top: 0;
}
.dc-brand {
  display: inline-flex;
}
.dc-print {
  color: var(--navy-800);
  border: 1px solid var(--line);
  border-radius: 999px;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  font-size: 13.5px;
  font-weight: 600;
  display: inline-flex;
}
.dc-print:hover {
  background: var(--bg);
}
.dc-main {
  flex: 1;
  width: 100%;
}
.dc-foot {
  color: var(--muted);
  text-align: center;
  padding: 22px 16px 28px;
  font-size: 13px;
}
.dc-foot a {
  color: var(--blue);
}
@media (width<=520px) {
  .dc-print span {
    display: none;
  }
}
@media print {
  .dc-top,
  .dc-foot,
  .skip-link {
    display: none;
  }
  .dc {
    background: #fff;
  }
}
</style>
