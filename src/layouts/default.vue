<script setup lang="ts">
import { usePlatform } from '@/lib/platform-store';
import LogoutButton from '@/components/LogoutButton.vue';
import { computed, onMounted, ref } from 'vue';
import {
  Compass,
  Bell,
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
import { useSession } from '@/lib/session';
import { usePath } from '@/composables/path';

const customer = [
  { href: '/inicio', label: 'Descubrir', icon: Compass },
  { href: '/buscar', label: 'Buscar negocios', icon: Search },
  { href: '/pedidos', label: 'Mis pedidos', icon: ShoppingBag },
  { href: '/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/puntos', label: 'SucrePuntos', icon: Gift },
  { href: '/escuela', label: 'Escuela emprendedora', icon: GraduationCap },
  { href: '/mapa', label: 'Explorar Sucre', icon: MapPin },
  { href: '/asistente', label: 'Asistente de catálogo', icon: Search },
  { href: '/notificaciones', label: 'Notificaciones', icon: Gift },
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
  { href: '/inicio', label: 'Inicio', icon: Compass },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/perfil', label: 'Perfil', icon: UserRound },
];
const path = usePath();
const platform = usePlatform();
const session = useSession();
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
const initial = computed(() => session.user?.name.trim().slice(0, 1).toUpperCase() || 'S');
const business = computed(
  () => path.value.startsWith('/panel') || path.value.startsWith('/estudio'),
);
const active = (href: string) => path.value === href;
</script>

<template>
  <div v-if="mounted && session.ready && session.user" class="app">
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
        <NuxtLink v-if="session.user?.role === 'admin'" to="/admin"
          ><ShieldCheck :size="17" /> Administración</NuxtLink
        >
        <NuxtLink to="/equipo">Guía del proyecto ↗</NuxtLink>
      </div>
      <span class="sidebar-footer">Hecho para nuestra tierra.</span>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <NuxtLink class="mobile-brand brand" to="/">Sucre<span>IA</span></NuxtLink>
        <span class="location"><MapPin :size="16" /> Sucre, Colombia</span>
        <div class="topbar-actions">
          <NuxtLink :class="!business ? 'view-switch selected' : 'view-switch'" to="/inicio">
            Explorar
          </NuxtLink>
          <NuxtLink
            :class="business ? 'view-switch selected' : 'view-switch'"
            to="/estudio"
            aria-label="Mi negocio"
          >
            <Store :size="15" /> <span>Mi negocio</span>
          </NuxtLink>
          <NuxtLink v-if="session.ready && !session.user" class="session-enter" to="/ingresar"
            >Ingresar</NuxtLink
          >
          <NuxtLink
            v-if="session.user"
            class="avatar"
            :to="session.user ? '/perfil' : '/ingresar'"
            :aria-label="session.user ? `Mi perfil: ${session.user.name}` : 'Ingresar'"
            >{{ initial }}</NuxtLink
          >
          <NuxtLink
            to="/notificaciones"
            class="notification-link"
            :aria-label="`Notificaciones: ${platform.unread.value} sin leer`"
            ><Bell :size="18" /><span v-if="platform.unread.value">{{
              platform.unread.value
            }}</span></NuxtLink
          >
          <LogoutButton v-if="session.user" />
        </div>
      </header>
      <div class="demo-banner">
        <span class="live-dot" /> SucreIA · Comunidad local
        <span>· Pagos confirmados por cada negocio. Sin cobros automáticos.</span>
      </div>
      <main id="contenido" class="main" :inert="session.ending">
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
  <div v-else class="studio-loading" role="status">Comprobando tu acceso…</div>
</template>

<style scoped>
.session-enter {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 9px;
  background: var(--green);
  color: white;
  font-weight: 700;
}
.topbar-actions {
  min-width: 0;
}
@media (max-width: 1100px) {
  .topbar .location {
    display: none;
  }
}
@media (max-width: 800px) {
  .topbar .view-switch:first-child {
    display: none;
  }
  .topbar .view-switch {
    min-width: 44px;
    min-height: 44px;
    justify-content: center;
    padding: 8px;
  }
  .topbar .view-switch span {
    display: none;
  }
}
@media (max-width: 380px) {
  .topbar {
    padding-inline: 12px;
  }
  .topbar-actions {
    gap: 6px;
  }
  .topbar .avatar {
    display: none;
  }
}
.notification-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 44px;
}
.notification-link span {
  position: absolute;
  top: 0;
  right: 0;
  background: #246a4e;
  color: white;
  font-size: 10px;
  min-width: 16px;
  border-radius: 20px;
  text-align: center;
}
@media (max-width: 600px) {
  .topbar .avatar {
    display: none;
  }
}
</style>
