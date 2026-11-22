<script setup lang="ts">
import { useSession } from '@/lib/session';
// Acceso de la presentación (diapositiva 2): imagen a la izquierda, formulario a la derecha.
const session = useSession();
</script>
<template>
  <div class="ax">
    <a class="skip-link" href="#acceso">Saltar al formulario</a>
    <NuxtLink to="/buscar" class="ax-art" aria-label="Explorar los negocios de SucreIA">
      <img
        src="/sucre/acceso-panel.webp"
        alt="SucreIA, el ecosistema digital de emprendimientos de Sucre: negocios con asistente IA, productos y servicios por sector, recomendaciones de la comunidad e impulso a los emprendedores."
      />
    </NuxtLink>
    <main id="acceso" class="ax-main" :inert="session.ending">
      <div class="ax-inner"><slot /></div>
    </main>
  </div>
</template>
<style scoped>
.ax {
  display: grid;
  grid-template-columns: min(calc(100dvh * 1.066), 58vw) minmax(0, 1fr);
  min-height: 100dvh;
  background: #fff;
}
.ax-art {
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow: hidden;
  background: #0d2f72;
}
.ax-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: left center;
}
.ax-main {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  padding: 40px clamp(20px, 5vw, 72px);
  background:
    radial-gradient(circle at 100% 100%, rgba(21, 101, 192, 0.1) 0 120px, transparent 121px),
    radial-gradient(circle at 100% 100%, rgba(21, 101, 192, 0.06) 0 200px, transparent 201px),
    linear-gradient(180deg, #fbfdff, #f3f7fd);
}
.ax-inner {
  width: min(100%, 480px);
  min-width: 0;
}
@media (max-width: 900px) {
  .ax {
    grid-template-columns: minmax(0, 1fr);
  }
  .ax-art {
    position: relative;
    height: 210px;
  }
  .ax-art img {
    object-position: 30% 30%;
  }
}
</style>
