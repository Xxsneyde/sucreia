<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Bot,
  ChartNoAxesColumn,
  GraduationCap,
  Handshake,
  Search,
  Settings,
  Shirt,
  ShoppingCart,
  Star,
  Store,
  Target,
  TreePalm,
  Truck,
  Users,
  Utensils,
} from '@lucide/vue';
import { useSession } from '@/lib/session';
import { roleHome } from '@/domain/roles';
import SucreLogo from '@/components/sucre/SucreLogo.vue';

// Portada (diapositiva 1 de la presentación).
definePageMeta({ layout: false });
useHead({ title: 'El ecosistema digital de emprendimientos de Sucre' });
const router = useRouter();
const session = useSession();
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
  void session.load();
});
const query = ref('');
const search = () =>
  router.push({ path: '/buscar', query: query.value.trim() ? { q: query.value.trim() } : {} });
const features = [
  { icon: Bot, text: 'IA para tu negocio', color: '#7c3aed', to: '/escuela' },
  { icon: ShoppingCart, text: 'Compra y vende local', color: '#16a34a', to: '/buscar' },
  { icon: Truck, text: 'Entregas en todo Sucre', color: '#f59e0b', to: '/logistica' },
  { icon: GraduationCap, text: 'Formación y asesoría', color: '#1d4ed8', to: '/escuela' },
  { icon: Star, text: 'SucrePuntos\ny descuentos', color: '#f5b301', to: '/puntos' },
];
const tiles = [
  { icon: Utensils, text: 'Gastronomía', color: '#f59e0b', sector: 'Gastronomía y Alimentos' },
  { icon: Shirt, text: 'Moda', color: '#9333ea', sector: 'Moda y Confección' },
  { icon: TreePalm, text: 'Turismo', color: '#16a34a', sector: 'Turismo y Hospedaje' },
  { icon: Settings, text: 'Servicios', color: '#2563eb', sector: 'Servicios Profesionales' },
];
</script>

<template>
  <div class="lp">
    <header class="lp-top">
      <nav aria-label="Acceso">
        <NuxtLink class="lp-link" to="/buscar">Explorar negocios</NuxtLink>
        <NuxtLink v-if="mounted && session.user" class="lp-cta" :to="roleHome(session.user.role)"
          >Ir a mi espacio</NuxtLink
        >
        <template v-else>
          <NuxtLink class="lp-link" to="/ingresar">Iniciar sesión</NuxtLink>
          <NuxtLink class="lp-cta" to="/ingresar?cuenta=nueva">Registrarse</NuxtLink>
        </template>
      </nav>
    </header>

    <main class="lp-hero">
      <img
        class="lp-people"
        src="/sucre/portada-personas.webp"
        alt="Emprendedores de Sucre frente a la catedral de Sincelejo"
      />
      <img class="lp-sunset" src="/sucre/fondo-tolu.webp" alt="" />

      <section class="lp-center">
        <h1 class="lp-brand">
          <SucreLogo :size="92" />
          <span>El ecosistema digital de<br />emprendimientos de Sucre</span>
        </h1>

        <div class="lp-devices">
          <div class="lp-laptop">
            <div class="lp-screen">
              <SucreLogo :size="30" tone="dark" />
              <form class="lp-search" role="search" @submit.prevent="search">
                <Search :size="15" />
                <input
                  v-model="query"
                  aria-label="¿Qué producto o servicio necesitas?"
                  placeholder="¿Qué producto o servicio necesitas?"
                />
                <button type="submit" aria-label="Buscar">›</button>
              </form>
              <div class="lp-tiles">
                <NuxtLink
                  v-for="t in tiles"
                  :key="t.text"
                  :to="{ path: '/buscar', query: { sector: t.sector } }"
                  class="lp-tile"
                >
                  <component :is="t.icon" :size="26" :style="{ color: t.color }" />
                  {{ t.text }}
                </NuxtLink>
              </div>
              <div class="lp-photos" aria-hidden="true">
                <img src="/sucre/demo-pescado.webp" alt="" />
                <img src="/sucre/demo-artesanias.webp" alt="" />
                <img src="/sucre/demo-ensenada.webp" alt="" />
              </div>
            </div>
            <div class="lp-base" />
          </div>
          <div class="lp-phone" aria-hidden="true">
            <div class="lp-phone-top"><span>✦</span><ShoppingCart :size="14" /></div>
            <div class="lp-phone-store">
              <Store :size="44" />
              <ShoppingCart :size="26" />
            </div>
            <NuxtLink to="/buscar" class="lp-phone-buy" tabindex="-1">Comprar</NuxtLink>
          </div>
        </div>
      </section>

      <ul class="lp-features">
        <li v-for="f in features" :key="f.text">
          <NuxtLink :to="f.to">
            <component
              :is="f.icon"
              :size="34"
              :style="{ color: f.color }"
              :fill="f.icon === Star ? f.color : 'none'"
            />
            <span class="flow-pre">{{ f.text }}</span>
          </NuxtLink>
        </li>
      </ul>
    </main>

    <section class="lp-goal" aria-labelledby="lp-objetivo">
      <div class="lp-goal-text">
        <h2 id="lp-objetivo"><Target :size="40" /> Objetivo</h2>
        <p>Conectar, fortalecer y hacer crecer los emprendimientos del departamento.</p>
      </div>
      <div class="lp-goal-item"><Users :size="44" /><strong>Más clientes</strong></div>
      <div class="lp-goal-item"><ChartNoAxesColumn :size="44" /><strong>Más ventas</strong></div>
      <div class="lp-goal-item"><Handshake :size="44" /><strong>Más oportunidades</strong></div>
      <img class="lp-map" src="/sucre/silueta-sucre.webp" alt="" />
    </section>
  </div>
</template>

<style scoped>
.lp {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 85% 22%, rgba(255, 190, 120, 0.55), transparent 32%),
    linear-gradient(180deg, #0d3b8f 0%, #1f63c4 34%, #5fa4e6 62%, #9fd4ef 82%, #c7ecd6 100%);
}
.lp-top {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: flex-end;
  padding: 16px 28px 0;
}
.lp-top nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lp-link {
  padding: 10px 14px;
  font-weight: 600;
  color: #fff;
}
.lp-cta {
  padding: 10px 20px;
  border-radius: 999px;
  background: linear-gradient(90deg, #2bbd55, #1a9e45);
  font-weight: 600;
  color: #fff;
  box-shadow: 0 8px 20px rgba(16, 163, 74, 0.35);
}
.lp-hero {
  position: relative;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 0.9fr);
  align-items: center;
  gap: 24px;
  padding: 0 28px 120px;
}
.lp-people {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 70px;
  width: min(36vw, 520px);
  height: calc(100% - 70px);
  object-fit: cover;
  object-position: top;
  mask-image: linear-gradient(90deg, #000 78%, transparent), linear-gradient(#000 82%, transparent);
  mask-composite: intersect;
}
.lp-sunset {
  position: absolute;
  top: 0;
  right: 0;
  width: min(34vw, 480px);
  mask-image:
    linear-gradient(270deg, #000 60%, transparent), linear-gradient(#000 70%, transparent);
  mask-composite: intersect;
  opacity: 0.95;
}
.lp-center {
  position: relative;
  z-index: 2;
  grid-column: 2;
  display: grid;
  justify-items: center;
  gap: 18px;
  text-align: center;
}
.lp-brand {
  display: grid;
  justify-items: center;
  gap: 8px;
  color: #fff;
}
.lp-brand > span {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 600;
  line-height: 1.25;
  text-shadow: 0 2px 12px rgba(5, 25, 70, 0.45);
}
.lp-devices {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  padding-right: 70px;
}
.lp-laptop {
  width: min(100%, 440px);
}
.lp-screen {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 14px 16px 16px;
  border: 10px solid #1d2433;
  border-radius: 16px 16px 4px 4px;
  background:
    radial-gradient(circle at 90% 0%, rgba(43, 189, 85, 0.35), transparent 40%),
    linear-gradient(180deg, #ffffff, #eef6ff);
}
.lp-search {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 92%;
  padding: 5px 6px 5px 12px;
  border: 1px solid #cfe0f3;
  border-radius: 999px;
  background: #fff;
  color: #64748b;
}
.lp-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  font-size: 11.5px;
}
.lp-search button {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #16a34a;
  font-weight: 700;
}
.lp-tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}
.lp-tile {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 8px 2px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(16, 42, 90, 0.12);
  font-size: 11px;
  font-weight: 600;
  color: #0f1f3d;
}
.lp-photos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  width: 100%;
}
.lp-photos img {
  width: 100%;
  aspect-ratio: 1.6;
  object-fit: cover;
  border-radius: 8px;
}
.lp-base {
  height: 14px;
  margin: 0 -26px;
  border-radius: 0 0 18px 18px;
  background: linear-gradient(180deg, #c5ccd8, #8b95a7);
}
.lp-phone {
  position: absolute;
  right: 0;
  bottom: -6px;
  display: grid;
  justify-items: center;
  gap: 12px;
  width: 130px;
  padding: 12px 10px 14px;
  border: 7px solid #1d2433;
  border-radius: 22px;
  background: linear-gradient(180deg, #f5f9ff, #e4efff);
  color: #16a34a;
}
.lp-phone-top {
  display: flex;
  justify-content: space-between;
  width: 100%;
  color: #1d4ed8;
}
.lp-phone-store {
  display: grid;
  justify-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(16, 42, 90, 0.12);
}
.lp-phone-buy {
  padding: 6px 18px;
  border-radius: 999px;
  background: linear-gradient(90deg, #2bbd55, #1a9e45);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.lp-features {
  position: relative;
  z-index: 2;
  grid-column: 3;
  display: grid;
  gap: 12px;
  margin: 70px 0 0;
  padding: 0;
  list-style: none;
}
.lp-features a {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 64px;
  padding: 10px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 26px rgba(10, 35, 87, 0.2);
  font-size: clamp(15px, 1.3vw, 19px);
  font-weight: 600;
  line-height: 1.2;
  color: #0f1f3d;
  transition: transform 0.15s ease-out;
}
.lp-features a:hover {
  transform: translateX(-4px);
}
.lp-goal {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr)) 170px;
  align-items: center;
  gap: 18px;
  margin-top: -70px;
  padding: 60px 28px 26px;
  background: #fff;
  clip-path: ellipse(120% 100% at 50% 100%);
}
.lp-goal h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  color: #16a34a;
}
.lp-goal-text p {
  margin: 6px 0 0;
  max-width: 340px;
  font-size: 17px;
  color: #1e293b;
}
.lp-goal-item {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding-left: 18px;
  border-left: 1px solid #d5deea;
  color: #16a34a;
}
.lp-goal-item strong {
  font-size: 18px;
  font-weight: 600;
  color: #0f1f3d;
}
.lp-map {
  width: 170px;
  margin: -90px 0 -26px;
  mask-image: radial-gradient(circle at 60% 55%, #000 55%, transparent 72%);
}
@media (max-width: 1100px) {
  .lp-hero {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 100px;
  }
  .lp-center,
  .lp-features {
    grid-column: 1;
  }
  .lp-people {
    position: relative;
    bottom: auto;
    width: 70%;
    margin: 0 auto -40px;
    order: 3;
  }
  .lp-features {
    margin: 0;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .lp-goal {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .lp-goal-text {
    grid-column: 1 / -1;
  }
  .lp-goal-item:nth-of-type(2) {
    border-left: 0;
  }
  .lp-map {
    display: none;
  }
}
@media (max-width: 560px) {
  .lp-top {
    padding: 12px 14px 0;
  }
  .lp-top nav .lp-link + .lp-link {
    display: none;
  }
  .lp-hero {
    padding: 0 14px 90px;
  }
  .lp-devices {
    padding-right: 0;
  }
  .lp-phone {
    display: none;
  }
  .lp-people {
    width: 100%;
  }
  .lp-goal {
    grid-template-columns: 1fr;
    padding: 50px 18px 24px;
    clip-path: none;
    border-radius: 30px 30px 0 0;
  }
  .lp-goal-item {
    border-left: 0;
    padding-left: 0;
  }
}
</style>
