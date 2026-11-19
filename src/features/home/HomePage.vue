<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Gift,
  KeyRound,
  MapPin,
  Menu,
  MessageCircle,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  X,
} from '@lucide/vue';
import type { Business } from '@/domain/types';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { roleHome } from '@/domain/roles';
import { businessHref, createDesign, styles } from '@/domain/studio';
import { areas, styleIds } from '@/domain/designs';
import { vReveal } from '@/composables/reveal';
import PublicDirectory from '@/features/directory/PublicDirectory.vue';
import HeroSlider from './HeroSlider.vue';
import type { Slide } from './slides';
import PagePreview from './PagePreview.vue';

const session = useSession();
const router = useRouter();
const mounted = ref(false);
const stores = shallowRef<Business[]>([]);
const loaded = ref(false);

// --- Datos reales del directorio -------------------------------------------------------------
onMounted(async () => {
  mounted.value = true;
  try {
    stores.value = (await api<{ stores: Business[] }>('GET', '/tiendas')).stores;
  } catch {
    stores.value = [];
  } finally {
    loaded.value = true;
  }
});
const municipalities = computed(() => new Set(stores.value.map((s) => s.municipality)).size);
const offers = computed(() => stores.value.reduce((n, s) => n + s.products.length, 0));
const byArea = (area: string) => stores.value.filter((s) => s.category === area).length;

// --- Diseños de ejemplo (se muestran como ejemplo, nunca como negocios reales) ---------------
const exampleNames: Record<string, string> = {
  Artesanías: 'Tu taller',
  Gastronomía: 'Tu cocina',
  Belleza: 'Tu salón',
  Servicios: 'Tus servicios',
  Moda: 'Tu marca',
  Turismo: 'Tus experiencias',
  Salud: 'Tu consultorio',
  Otro: 'Tu emprendimiento',
};
const example = (area: string, choice = 0) => {
  const d = createDesign(area, exampleNames[area] ?? 'Tu negocio', choice);
  return { design: d, style: styles[d.style].name, area };
};
const heroExamples = [
  example('Gastronomía', 0),
  example('Belleza', 0),
  example('Artesanías', 0),
  example('Moda', 1),
  example('Servicios', 0),
];
const slides = computed<Slide[]>(() => {
  const real: Slide[] = stores.value.slice(0, 4).map((business) => ({ kind: 'store', business }));
  const fill: Slide[] = heroExamples
    .slice(0, Math.max(2, 5 - real.length))
    .map((e) => ({ kind: 'example', ...e }));
  return [...real, ...fill];
});
// Un ejemplo de cada estilo, con la paleta del área que lo recomienda.
const styleShowcase = styleIds.map((id) => {
  const area = areas.find((a) => a.choices.some((c) => c.style === id))!;
  const choice = area.choices.findIndex((c) => c.style === id);
  return { id, ...example(area.id, choice) };
});

// --- Portada: palabra que cambia -------------------------------------------------------------
const words = ['hecho a mano.', 'recién horneado.', 'a un mensaje.', 'cerca de ti.'];
const word = ref(0);
let wordTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    wordTimer = setInterval(() => (word.value = (word.value + 1) % words.length), 2600);
});

// --- Cifras que suben al aparecer ------------------------------------------------------------
const facts = computed(() =>
  stores.value.length
    ? [
        {
          n: stores.value.length,
          label: stores.value.length === 1 ? 'negocio publicado' : 'negocios publicados',
        },
        { n: offers.value, label: 'productos y servicios' },
        {
          n: municipalities.value,
          label: municipalities.value === 1 ? 'municipio' : 'municipios con tiendas',
        },
        { n: 7, label: 'estilos de diseño' },
      ]
    : [
        { n: 26, label: 'municipios de Sucre para llegar' },
        { n: 8, label: 'áreas de negocio' },
        { n: 7, label: 'estilos de diseño' },
        { n: 3, label: 'formas de atender: venta, citas y cotización' },
      ],
);
const shown = ref<number[]>([0, 0, 0, 0]);
const factsEl = ref<HTMLElement | null>(null);
let factsObserver: IntersectionObserver | undefined;
function countUp() {
  const target = facts.value.map((f) => f.n);
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / 1400);
    const ease = 1 - (1 - k) ** 3;
    shown.value = target.map((n) => Math.round(n * ease));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
onMounted(() => {
  if (!factsEl.value) return;
  factsObserver = new IntersectionObserver((e) => {
    if (e[0]?.isIntersecting && loaded.value) {
      countUp();
      factsObserver?.disconnect();
    }
  });
  const wait = setInterval(() => {
    if (loaded.value) {
      clearInterval(wait);
      factsObserver?.observe(factsEl.value!);
    }
  }, 100);
});

// --- Cabecera: sólida al bajar y menú de celular --------------------------------------------
const scrolled = ref(false);
const menuOpen = ref(false);
const onScroll = () => (scrolled.value = window.scrollY > 24);
onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  clearInterval(wordTimer);
  factsObserver?.disconnect();
});

// --- Buscar desde la portada ----------------------------------------------------------------
const query = ref('');
function search() {
  router.push({ path: '/buscar', query: query.value.trim() ? { q: query.value.trim() } : {} });
}

// --- Carrusel de negocios destacados ---------------------------------------------------------
const rail = ref<HTMLElement | null>(null);
const slideRail = (dir: number) =>
  rail.value?.scrollBy({ left: dir * rail.value.clientWidth * 0.8, behavior: 'smooth' });

// --- Cómo funciona ---------------------------------------------------------------------------
const audience = ref<'compras' | 'negocio'>('compras');
const steps = {
  compras: [
    {
      icon: Search,
      title: 'Descubre',
      text: 'Busca por producto, categoría o municipio. No necesitas cuenta para mirar.',
    },
    {
      icon: ShoppingBag,
      title: 'Pide o reserva',
      text: 'Arma tu pedido, agenda una cita o pide una cotización en la página del negocio.',
    },
    {
      icon: MessageCircle,
      title: 'Acuerda el pago',
      text: 'Pagas directo al negocio: efectivo o transferencia. Sin cobros automáticos.',
    },
    {
      icon: KeyRound,
      title: 'Recibe con tu PIN',
      text: 'Entregas confirmadas con un PIN que solo tú conoces. Después puedes dejar tu reseña.',
    },
  ],
  negocio: [
    {
      icon: Store,
      title: 'Cuéntanos de ti',
      text: 'Nombre, área, municipio y tu historia. Sin conocimientos de diseño.',
    },
    {
      icon: Palette,
      title: 'Elige tu diseño',
      text: 'Te mostramos tu página en 7 estilos con tus propios productos. Escoges uno.',
    },
    {
      icon: Sparkles,
      title: 'Publica',
      text: 'Tu tienda queda visible para todo Sucre con su propio enlace para compartir.',
    },
    {
      icon: Bell,
      title: 'Atiende y crece',
      text: 'Recibe pedidos, citas y cotizaciones en tu panel. Promociones y puntos incluidos.',
    },
  ],
};
const community = [
  {
    icon: GraduationCap,
    title: 'Escuela emprendedora',
    text: 'Lecciones cortas sobre catálogo, costos y atención, con constancia al terminar.',
    to: '/escuela',
  },
  {
    icon: Gift,
    title: 'SucrePuntos',
    text: 'Quien compra suma puntos por pedidos completados y los canjea en bonos de los negocios.',
    to: '/puntos',
  },
  {
    icon: Truck,
    title: 'Entregas locales',
    text: 'Domiciliarios aprobados por la comunidad, con entrega confirmada por PIN.',
    to: '/domiciliario',
  },
  {
    icon: ShieldCheck,
    title: 'Negocios verificados',
    text: 'La administración revisa identidad y contacto antes de otorgar el sello.',
    to: '/buscar',
  },
];
const faqs = [
  {
    q: '¿Necesito una cuenta para comprar?',
    a: 'Para mirar tiendas y productos no. Para hacer un pedido, reservar o cotizar sí: así el negocio sabe a quién atender y tú puedes seguir el estado.',
  },
  {
    q: '¿Cómo se paga?',
    a: 'Directamente al negocio, en efectivo o transferencia, según lo que ofrezca. SucreIA no hace cobros automáticos ni guarda datos de tarjetas.',
  },
  {
    q: '¿Cómo publico mi negocio?',
    a: 'Crea una cuenta de emprendedor, cuéntanos a qué te dedicas, agrega tus productos y elige uno de los 7 diseños. Puedes publicarla en minutos y cambiarla cuando quieras.',
  },
  {
    q: '¿Puedo cambiar el diseño después?',
    a: 'Sí. Desde «Mi tienda» cambias de estilo, textos, fotos y catálogo. Los cambios se ven cuando vuelves a publicar.',
  },
  {
    q: '¿Qué significa el sello de verificado?',
    a: 'Que la administración revisó la identidad y el contacto del negocio. Si cambian esos datos, se revisan de nuevo.',
  },
];
const startHref = '/ingresar?cuenta=nueva&volver=/registro/negocio';
const spaceHref = computed(() => (session.user ? roleHome(session.user.role) : '/ingresar'));
</script>

<template>
  <div class="hp">
    <a class="skip-link" href="#negocios">Saltar a los negocios</a>

    <!-- Cabecera -->
    <header :class="['hp-header', { solid: scrolled || menuOpen }]">
      <div class="hp-wrap hp-header-row">
        <NuxtLink class="hp-brand" to="/" aria-label="SucreIA, inicio">
          <span class="hp-brand-icon"><ShoppingBag :size="20" /></span
          ><span class="hp-brand-name">Sucre<b>IA</b></span>
        </NuxtLink>
        <nav :class="['hp-nav', { open: menuOpen }]" aria-label="Secciones">
          <a href="#negocios" @click="menuOpen = false">Negocios</a>
          <a href="#como-funciona" @click="menuOpen = false">Cómo funciona</a>
          <a href="#estilos" @click="menuOpen = false">Para emprendedores</a>
          <a href="#comunidad" @click="menuOpen = false">Comunidad</a>
          <a href="#preguntas" @click="menuOpen = false">Preguntas</a>
          <NuxtLink v-if="!(mounted && session.user)" class="hp-nav-cta" :to="startHref">
            Crear mi tienda
          </NuxtLink>
        </nav>
        <!-- Siempre visible (también en celular, fuera del menú plegable). -->
        <NuxtLink v-if="mounted && session.user" class="hp-account" :to="spaceHref">
          Ir a mi espacio
        </NuxtLink>
        <NuxtLink v-else class="hp-account" to="/ingresar">Ingresar</NuxtLink>
        <button
          class="hp-menu"
          type="button"
          :aria-expanded="menuOpen"
          aria-label="Menú"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="22" />
          <Menu v-else :size="22" />
        </button>
      </div>
    </header>

    <main>
      <!-- Portada -->
      <section class="hp-hero">
        <div class="hp-blob hp-blob-a" aria-hidden="true" />
        <div class="hp-blob hp-blob-b" aria-hidden="true" />
        <div class="hp-wrap hp-hero-grid">
          <div class="hp-hero-copy">
            <p class="hp-eyebrow"><span class="hp-dot" /> La vitrina digital de Sucre</p>
            <h1>
              Lo mejor de Sucre,
              <span class="hp-rotator" aria-live="polite">
                <em v-for="(w, i) in words" :key="w" :class="{ on: i === word }">{{ w }}</em>
              </span>
            </h1>
            <p class="hp-lead">
              Descubre negocios de nuestra tierra, pide lo que necesitas y apoya el talento local. Y
              si tienes un emprendimiento, crea tu propia tienda en minutos.
            </p>
            <form class="hp-search" role="search" @submit.prevent="search">
              <Search :size="20" />
              <input
                v-model="query"
                type="search"
                aria-label="Buscar en SucreIA"
                placeholder="Busca tortas, sombreros, peluquerías…"
              />
              <button class="hp-btn">Buscar</button>
            </form>
            <div class="hp-hero-actions">
              <a class="hp-btn hp-btn-dark" href="#negocios"
                >Explorar negocios <ArrowRight :size="17"
              /></a>
              <NuxtLink class="hp-btn-ghost" :to="startHref">Tengo un negocio →</NuxtLink>
            </div>
          </div>
          <div class="hp-hero-media">
            <HeroSlider :slides="slides" />
          </div>
        </div>
      </section>

      <!-- Municipios -->
      <div class="hp-marquee" aria-label="Pensado para todo Sucre">
        <div class="hp-marquee-track">
          <span v-for="n in 2" :key="n" class="hp-marquee-group">
            <template
              v-for="m in [
                'Sincelejo',
                'Corozal',
                'Santiago de Tolú',
                'Coveñas',
                'San Marcos',
                'Sampués',
                'Morroa',
                'Majagual',
                'San Onofre',
                'Sincé',
                'Ovejas',
                'Los Palmitos',
                'Guaranda',
                'San Pedro',
              ]"
              :key="m + n"
              ><b>{{ m }}</b
              ><i>✦</i></template
            >
          </span>
        </div>
      </div>

      <!-- Cifras -->
      <section ref="factsEl" class="hp-wrap hp-facts" aria-label="SucreIA en cifras">
        <div v-for="(f, i) in facts" :key="f.label" v-reveal="i * 90" class="hp-fact">
          <strong>{{ shown[i] }}</strong>
          <span>{{ f.label }}</span>
        </div>
      </section>

      <!-- Categorías -->
      <section class="hp-wrap hp-section" aria-labelledby="hp-cat">
        <div v-reveal class="hp-section-head">
          <p class="hp-kicker">Explora por área</p>
          <h2 id="hp-cat">Todo lo que se hace en Sucre, <em>en un solo lugar.</em></h2>
        </div>
        <div class="hp-cats">
          <NuxtLink
            v-for="(a, i) in areas"
            :key="a.id"
            v-reveal="i * 60"
            class="hp-cat"
            :to="{ path: '/buscar', query: { categoria: a.id } }"
            :style="{
              '--cat-bg': a.choices[0].colors.accent,
              '--cat-ink': a.choices[0].colors.primary,
            }"
          >
            <img :src="`/art/${a.theme}.svg`" alt="" loading="lazy" />
            <strong>{{ a.id }}</strong>
            <span>{{
              loaded && byArea(a.id)
                ? `${byArea(a.id)} ${byArea(a.id) === 1 ? 'negocio' : 'negocios'}`
                : 'Ver negocios'
            }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Destacados -->
      <section class="hp-featured" aria-labelledby="hp-dest">
        <div class="hp-wrap">
          <div v-reveal class="hp-section-head hp-row">
            <div>
              <p class="hp-kicker">Recién publicados</p>
              <h2 id="hp-dest">Negocios que ya están <em>en SucreIA.</em></h2>
            </div>
            <div v-if="stores.length > 2" class="hp-rail-ctrl">
              <button type="button" aria-label="Anteriores" @click="slideRail(-1)">
                <ChevronLeft :size="20" />
              </button>
              <button type="button" aria-label="Siguientes" @click="slideRail(1)">
                <ChevronRight :size="20" />
              </button>
            </div>
          </div>
          <div v-if="!loaded" class="hp-rail">
            <div v-for="n in 3" :key="n" class="hp-store hp-skeleton" />
          </div>
          <div v-else-if="stores.length" ref="rail" class="hp-rail">
            <NuxtLink
              v-for="(s, i) in stores"
              :key="s.id"
              v-reveal="Math.min(i, 4) * 80"
              class="hp-store"
              :to="businessHref(s.id)"
            >
              <div class="hp-store-img">
                <img :src="s.cover || `/art/${s.theme}.svg`" alt="" loading="lazy" />
                <span>{{ s.category }}</span>
              </div>
              <div class="hp-store-body">
                <h3>
                  {{ s.name }}
                  <BadgeCheck
                    v-if="s.verified"
                    :size="17"
                    aria-label="Verificado"
                    class="hp-verified"
                  />
                </h3>
                <p><MapPin :size="14" /> {{ s.municipality }}, Sucre</p>
                <p class="hp-store-desc">{{ s.description }}</p>
                <span class="hp-store-link">Ver tienda <ArrowUpRight :size="15" /></span>
              </div>
            </NuxtLink>
          </div>
          <div v-else v-reveal class="hp-first">
            <Sparkles :size="28" />
            <div>
              <h3>La primera tienda de esta vitrina puede ser la tuya.</h3>
              <p>
                Todavía no hay negocios publicados. Publica el tuyo y aparecerá aquí para todo
                Sucre.
              </p>
            </div>
            <NuxtLink class="hp-btn" :to="startHref">Publicar mi negocio</NuxtLink>
          </div>
        </div>
      </section>

      <!-- Cómo funciona -->
      <section id="como-funciona" class="hp-wrap hp-section" aria-labelledby="hp-how">
        <div v-reveal class="hp-section-head hp-center">
          <p class="hp-kicker">Cómo funciona</p>
          <h2 id="hp-how">Simple para quien compra. <em>Simple para quien vende.</em></h2>
          <div class="hp-tabs" role="tablist">
            <button
              role="tab"
              type="button"
              :aria-selected="audience === 'compras'"
              :class="{ on: audience === 'compras' }"
              @click="audience = 'compras'"
            >
              Quiero comprar
            </button>
            <button
              role="tab"
              type="button"
              :aria-selected="audience === 'negocio'"
              :class="{ on: audience === 'negocio' }"
              @click="audience = 'negocio'"
            >
              Tengo un negocio
            </button>
          </div>
        </div>
        <ol :key="audience" class="hp-steps">
          <li v-for="(s, i) in steps[audience]" :key="s.title" :style="{ '--i': i }">
            <span class="hp-step-n">{{ i + 1 }}</span>
            <component :is="s.icon" :size="26" class="hp-step-icon" />
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </section>

      <!-- Estilos -->
      <section id="estilos" class="hp-styles" aria-labelledby="hp-est">
        <div class="hp-wrap hp-styles-grid">
          <div v-reveal class="hp-styles-copy">
            <p class="hp-kicker light">Para emprendedores</p>
            <h2 id="hp-est">Tu página, <em>en siete estilos.</em></h2>
            <p>
              Cuéntanos a qué te dedicas y te mostramos tu tienda lista en minimalista, brutalista,
              editorial, orgánico, elegante, moderno y retro, cada uno con su propia tipografía. Con
              tus productos y tu historia. Tú eliges.
            </p>
            <ul>
              <li>Se adapta a celular y computador</li>
              <li>Catálogo, citas o cotizaciones</li>
              <li>Cámbialo cuando quieras</li>
            </ul>
            <NuxtLink class="hp-btn hp-btn-lime" :to="startHref"
              >Crear mi tienda gratis <ArrowRight :size="17"
            /></NuxtLink>
          </div>
          <div class="hp-gallery" aria-label="Ejemplos de diseño">
            <div class="hp-gallery-track">
              <figure
                v-for="(s, i) in [...styleShowcase, ...styleShowcase]"
                :key="i"
                class="hp-shot"
              >
                <div class="hp-shot-frame"><PagePreview :design="s.design" /></div>
                <figcaption>
                  <strong>{{ s.style }}</strong>
                  <span :style="{ fontFamily: styles[s.id].fonts.heading }">Aa</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <!-- Directorio completo -->
      <section
        id="negocios"
        class="hp-wrap hp-section hp-directory"
        aria-label="Directorio de negocios"
      >
        <div v-reveal class="hp-section-head">
          <p class="hp-kicker">Directorio</p>
          <h2>Encuentra lo nuestro. <em>Conoce quién lo hace.</em></h2>
        </div>
        <PublicDirectory embedded />
      </section>

      <!-- Comunidad -->
      <section id="comunidad" class="hp-community" aria-labelledby="hp-com">
        <div class="hp-wrap">
          <div v-reveal class="hp-section-head hp-center">
            <p class="hp-kicker">Más que una tienda</p>
            <h2 id="hp-com">Una comunidad que <em>crece contigo.</em></h2>
          </div>
          <div class="hp-features">
            <NuxtLink
              v-for="(f, i) in community"
              :key="f.title"
              v-reveal="i * 90"
              class="hp-feature"
              :to="f.to"
            >
              <span class="hp-feature-icon"><component :is="f.icon" :size="24" /></span>
              <h3>{{ f.title }}</h3>
              <p>{{ f.text }}</p>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Manifiesto -->
      <section class="hp-manifesto">
        <div class="hp-wrap">
          <p v-reveal>
            Cada compra local es una historia que sigue.
            <em
              >El sombrero de un artesano de Sampués, la torta de una vecina de Corozal, el tour de
              un guía de Tolú.</em
            >
          </p>
        </div>
      </section>

      <!-- Preguntas -->
      <section id="preguntas" class="hp-wrap hp-section hp-faq-grid" aria-labelledby="hp-faq">
        <div v-reveal class="hp-section-head">
          <p class="hp-kicker">Preguntas frecuentes</p>
          <h2 id="hp-faq">Lo que todos <em>preguntan.</em></h2>
          <p class="hp-muted">
            ¿Te queda otra duda? Escríbele directamente al negocio desde su página.
          </p>
        </div>
        <div class="hp-faq">
          <details v-for="(f, i) in faqs" :key="f.q" v-reveal="i * 60" :open="i === 0">
            <summary>{{ f.q }}<span aria-hidden="true">+</span></summary>
            <p>{{ f.a }}</p>
          </details>
        </div>
      </section>

      <!-- Cierre -->
      <section class="hp-wrap">
        <div v-reveal class="hp-cta">
          <div>
            <h2>Tu negocio merece <em>su propio lugar.</em></h2>
            <p>Crea tu tienda, elige tu diseño y empieza a recibir pedidos de todo Sucre.</p>
          </div>
          <div class="hp-cta-actions">
            <NuxtLink class="hp-btn hp-btn-lime" :to="startHref"
              >Crear mi tienda <ArrowRight :size="17"
            /></NuxtLink>
            <a class="hp-btn-ghost light" href="#negocios">Ver negocios</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="hp-footer">
      <div class="hp-wrap hp-footer-grid">
        <div>
          <NuxtLink class="hp-brand" to="/"
            ><span class="hp-brand-icon"><ShoppingBag :size="20" /></span
            ><span class="hp-brand-name">Sucre<b>IA</b></span></NuxtLink
          >
          <p>La comunidad digital de los emprendimientos de Sucre. Hecho para nuestra tierra.</p>
        </div>
        <nav aria-label="Comprar">
          <h3>Comprar</h3>
          <NuxtLink to="/buscar">Buscar negocios</NuxtLink>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#preguntas">Preguntas frecuentes</a>
        </nav>
        <nav aria-label="Vender">
          <h3>Vender</h3>
          <NuxtLink :to="startHref">Crear mi tienda</NuxtLink>
          <a href="#estilos">Estilos de diseño</a>
          <NuxtLink to="/ingresar">Ingresar</NuxtLink>
        </nav>
        <nav aria-label="Comunidad">
          <h3>Comunidad</h3>
          <NuxtLink to="/escuela">Escuela emprendedora</NuxtLink>
          <NuxtLink to="/puntos">SucrePuntos</NuxtLink>
          <NuxtLink to="/domiciliario">Quiero repartir</NuxtLink>
        </nav>
      </div>
      <div class="hp-wrap hp-footer-base">
        <span>© SucreIA · Sincelejo, Sucre, Colombia</span>
        <span>Pagos acordados con cada negocio. Sin cobros automáticos.</span>
      </div>
    </footer>
  </div>
</template>
