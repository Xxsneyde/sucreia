<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
  ArrowRight,
  GraduationCap,
  Map,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Zap,
} from '@lucide/vue';
import { score, useDirectory } from '@/lib/directory';
import { usePlatform } from '@/lib/platform-store';
import { useSession } from '@/lib/session';
import { isMerchant } from '@/domain/roles';
import PageBanner from '@/components/sucre/PageBanner.vue';
import SearchBox from '@/components/sucre/SearchBox.vue';
import SectorStrip from '@/components/sucre/SectorStrip.vue';
import BusinessCard from '@/components/sucre/BusinessCard.vue';

// Inicio: resumen de todo lo que ofrece la plataforma con los datos reales.
const directory = useDirectory();
const p = usePlatform();
onMounted(() => void directory.load(true));
const featured = computed(() =>
  [...directory.stores.value]
    .sort((a, b) => score(b) - score(a) || b.completed365 - a.completed365)
    .slice(0, 3),
);
const points = computed(() => p.data.value?.points ?? 0);
// La Escuela es para emprendedores; a los clientes se les invita a abrir su negocio.
const session = useSession();
const merchant = computed(() => !!session.user && isMerchant(session.user.role));
</script>
<template>
  <PageBanner
    title="Bienvenido a"
    highlight="SucreIA"
    text="El ecosistema digital de emprendimientos de Sucre: compra local, aprende y haz crecer tu negocio."
  >
    <SearchBox />
  </PageBanner>

  <section class="hf-block" aria-labelledby="hf-sector">
    <div class="sx-head">
      <h2 id="hf-sector">Explora por sector</h2>
      <NuxtLink class="sx-link" to="/sectores"
        >Ver todos los sectores <ArrowRight :size="16"
      /></NuxtLink>
    </div>
    <SectorStrip links />
  </section>

  <div class="hf-grid">
    <section aria-labelledby="hf-dest">
      <div class="sx-head">
        <h2 id="hf-dest">Emprendimientos destacados</h2>
        <NuxtLink class="sx-link" to="/buscar">Ver todos <ArrowRight :size="16" /></NuxtLink>
      </div>
      <p v-if="!directory.ready.value" class="loader" role="status">Cargando emprendimientos…</p>
      <div v-else-if="featured.length" class="hf-cards">
        <BusinessCard v-for="b in featured" :key="b.id" :business="b" />
      </div>
      <div v-else class="sx-card empty">
        <div class="empty-symbol">🌱</div>
        <h2>Todavía no hay emprendimientos publicados</h2>
        <p>Los negocios aparecerán aquí cuando sus dueños los publiquen.</p>
      </div>
    </section>
    <aside class="hf-side">
      <NuxtLink to="/puntos" class="sx-card hf-points">
        <img src="/sucre/puntos-moneda.webp" alt="" width="64" height="64" />
        <div>
          <strong>Mis SucrePuntos</strong>
          <span class="hf-num">{{ points.toLocaleString('es-CO') }}</span>
          <span class="small muted">¡Canjéalos por descuentos!</span>
        </div>
      </NuxtLink>
      <NuxtLink v-if="merchant" to="/escuela" class="sx-card hf-tile">
        <GraduationCap :size="30" />
        <div>
          <strong>Escuela del Emprendedor con IA</strong
          ><span class="small muted">Tu ruta de aprendizaje personalizada.</span>
        </div>
      </NuxtLink>
      <NuxtLink v-else to="/panel/configurar" class="sx-card hf-tile hf-invite">
        <GraduationCap :size="30" />
        <div>
          <strong>¿Quieres emprender?</strong
          ><span class="small muted"
            >Abre tu negocio en SucreIA y aprende con la Escuela del Emprendedor IA.</span
          >
        </div>
      </NuxtLink>
      <NuxtLink to="/mapa" class="sx-card hf-tile">
        <Map :size="30" />
        <div>
          <strong>Mapa de emprendimientos</strong
          ><span class="small muted">Descubre negocios por subregión.</span>
        </div>
      </NuxtLink>
      <NuxtLink to="/recomendaciones" class="sx-card hf-tile">
        <Sparkles :size="30" />
        <div>
          <strong>Recomendaciones IA</strong
          ><span class="small muted">Negocios elegidos para ti.</span>
        </div>
      </NuxtLink>
    </aside>
  </div>

  <NuxtLink to="/domiciliario" class="hf-logistics">
    <img src="/sucre/repartidor.webp" alt="" />
    <div>
      <h2><Truck :size="30" /> Logística y Entregas Colaborativas</h2>
      <p>
        Recibe tus compras en casa con domiciliarios locales y sigue tu pedido en el mapa. ¿Tienes
        moto o bicicleta? Reparte y gana por cada entrega.
      </p>
      <ul>
        <li><Zap :size="24" /> Entregas rápidas en todo Sucre</li>
        <li><Users :size="24" /> Transportadores locales verificados</li>
        <li><ShieldCheck :size="24" /> Seguimiento en tiempo real</li>
      </ul>
    </div>
  </NuxtLink>
</template>
<style scoped>
.hf-block {
  margin-bottom: 22px;
}
.hf-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
  margin-bottom: 22px;
}
.hf-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}
.hf-side {
  display: grid;
  gap: 14px;
}
.hf-points,
.hf-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--ink);
}
.hf-points div,
.hf-tile div {
  display: grid;
}
.hf-num {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--navy-800);
}
.hf-tile svg {
  color: var(--green);
}
.hf-logistics {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(90deg, #e6f1ff, #f4f8ff);
  box-shadow: var(--shadow);
  color: var(--text);
}
.hf-logistics img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hf-logistics > div {
  padding: 20px 22px;
}
.hf-logistics h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
}
.hf-logistics h2 svg,
.hf-logistics li svg {
  color: var(--green);
}
.hf-logistics ul {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 12px 0 0;
  padding: 12px;
  list-style: none;
  border-radius: 14px;
  background: #fff;
}
.hf-logistics li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--ink);
}
@media (max-width: 1000px) {
  .hf-grid,
  .hf-logistics {
    grid-template-columns: minmax(0, 1fr);
  }
  .hf-logistics ul {
    grid-template-columns: 1fr;
  }
}
.hf-invite {
  border: 2px dashed var(--green);
}
</style>
