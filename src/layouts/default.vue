<script setup lang="ts">
import { computed } from 'vue';
import {
  Compass,
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  Gift,
  GraduationCap,
  MapPin,
  Store,
  LayoutDashboard,
  Package,
  Truck,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  Leaf,
} from '@lucide/vue';
import { useDemo } from '@/lib/demo-store';
import { usePath } from '@/composables/path';

const customer = [
  { href: '/', label: 'Descubrir', icon: Compass },
  { href: '/buscar', label: 'Buscar negocios', icon: Search },
  { href: '/pedidos', label: 'Mis pedidos', icon: ShoppingBag },
  { href: '/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/puntos', label: 'SucrePuntos', icon: Gift },
  { href: '/escuela', label: 'Escuela emprendedora', icon: GraduationCap },
  { href: '/mapa', label: 'Explorar Sucre', icon: MapPin },
];
const merchant = [
  { href: '/panel', label: 'Resumen', icon: LayoutDashboard },
  { href: '/estudio', label: 'Estudio visual', icon: Store },
  { href: '/panel/pedidos', label: 'Pedidos y solicitudes', icon: ShoppingBag },
  { href: '/panel/productos', label: 'Productos y servicios', icon: Package },
  { href: '/panel/perfil', label: 'Mi negocio', icon: Store },
  { href: '/panel/descuentos', label: 'Descuentos', icon: Gift },
  { href: '/panel/configuracion', label: 'Configuración', icon: Settings },
];
const mobile = [
  { href: '/', label: 'Inicio', icon: Compass },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/perfil', label: 'Perfil', icon: UserRound },
];
const path = usePath();
const demo = useDemo();
const business = computed(
  () => path.value.startsWith('/panel') || path.value.startsWith('/estudio'),
);
const active = (href: string) => path.value === href;
</script>

<template>
  <div class="app">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <aside class="sidebar">
      <NuxtLink class="brand" to="/">
        <span class="brand-icon"><ShoppingBag :size="23" /></span>
        Sucre<span>IA</span>
      </NuxtLink>
      <p class="nav-label">{{ business ? 'ESPACIO DEL NEGOCIO' : 'DESCUBRE LO NUESTRO' }}</p>
      <nav aria-label="Navegación principal">
        <NuxtLink
          v-for="item in business ? merchant : customer"
          :key="item.href"
          :to="item.href"
          :class="['nav-link', { active: active(item.href) }]"
          :aria-current="active(item.href) ? 'page' : undefined"
        >
          <component :is="item.icon" :size="19" />
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="sidebar-invite">
        <span class="mini-leaf"><Leaf :size="22" /></span>
        <h3>Tu idea merece crecer.</h3>
        <p>Haz parte de la comunidad de emprendedores de Sucre.</p>
        <NuxtLink to="/estudio">Diseñar mi tienda <ArrowUpRight :size="16" /></NuxtLink>
      </div>
      <div class="sidebar-bottom">
        <NuxtLink to="/domiciliario"><Truck :size="17" /> Entregas</NuxtLink>
        <NuxtLink to="/admin"><ShieldCheck :size="17" /> Administración</NuxtLink>
        <NuxtLink to="/equipo">Guía del proyecto ↗</NuxtLink>
      </div>
      <span class="sidebar-footer">Hecho para nuestra tierra.</span>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <NuxtLink class="mobile-brand brand" to="/">Sucre<span>IA</span></NuxtLink>
        <span class="location"><MapPin :size="16" /> Sucre, Colombia</span>
        <div class="topbar-actions">
          <NuxtLink :class="!business ? 'view-switch selected' : 'view-switch'" to="/">
            Explorar
          </NuxtLink>
          <NuxtLink :class="business ? 'view-switch selected' : 'view-switch'" to="/panel">
            <Store :size="15" /> Mi negocio
          </NuxtLink>
          <NuxtLink class="avatar" to="/perfil" aria-label="Mi perfil">S</NuxtLink>
        </div>
      </header>
      <div class="demo-banner">
        <span class="live-dot" /> Prototipo del equipo
        <span>· Datos de ejemplo. Operaciones locales, sin pagos ni envíos reales.</span>
      </div>
      <p v-if="demo.storageError" role="status" class="notice">
        No se pudo recuperar o guardar la demo en este navegador. Puedes seguir explorando.
      </p>
      <main id="contenido" class="main">
        <slot />
      </main>
      <footer class="footer">
        SucreIA <span>Conectamos talento local con nuevas oportunidades.</span>
        <NuxtLink to="/equipo">Versión 0.3.0</NuxtLink>
      </footer>
    </div>
    <nav class="bottom-nav" aria-label="Navegación móvil">
      <NuxtLink
        v-for="item in mobile"
        :key="item.href"
        :to="item.href"
        :class="{ active: active(item.href) }"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
