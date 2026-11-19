<script setup lang="ts">
import { roleHome } from '@/domain/roles';
import { ShoppingBag, ArrowUpRight } from '@lucide/vue';
import { useSession } from '@/lib/session';
const session = useSession();
</script>
<template>
  <div class="public-shell">
    <a class="skip-link" href="#vitrina">Saltar a los negocios</a>
    <header class="public-header">
      <NuxtLink class="brand" to="/" aria-label="SucreIA, negocios publicados"
        ><span class="brand-icon"><ShoppingBag :size="23" /></span>Sucre<span>IA</span></NuxtLink
      >
      <NuxtLink
        v-if="session.user"
        class="public-access"
        :to="session.user ? roleHome(session.user.role) : '/inicio'"
        >Ir a mi espacio <ArrowUpRight :size="16"
      /></NuxtLink>
      <NuxtLink v-else class="public-access" to="/ingresar"
        >Ingresar <ArrowUpRight :size="16"
      /></NuxtLink>
    </header>
    <main id="vitrina" class="public-main"><slot /></main>
    <footer class="public-footer">
      <span>SucreIA · Negocios de nuestra tierra.</span
      ><NuxtLink to="/ingresar?cuenta=nueva&volver=/registro/negocio"
        >Publica tu negocio →</NuxtLink
      >
    </footer>
  </div>
</template>
<style scoped>
.public-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--paper);
}
.public-header {
  max-width: 1240px;
  margin: auto;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.public-access {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 18px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  font-weight: 700;
  color: var(--ink);
  transition:
    transform 0.18s ease-out,
    box-shadow 0.2s ease-out;
}
.public-access:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -14px rgba(15, 42, 35, 0.5);
}
.public-main {
  max-width: 1240px;
  margin: auto;
  padding: 24px 24px 64px;
}
.public-main {
  width: 100%;
  flex: 1;
}
.public-footer {
  margin-top: auto;
  padding: 28px max(24px, calc((100% - 1192px) / 2));
  background: var(--deep);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  font-size: 14px;
  color: #b9cbc2;
}
.public-footer a {
  color: var(--lime);
  font-weight: 700;
}
@media (max-width: 600px) {
  .public-header {
    padding: 18px;
  }
  .public-header .brand {
    font-size: 25px;
    gap: 6px;
  }
  .public-access {
    padding-inline: 12px;
    font-size: 13px;
  }
  .public-main {
    padding: 20px 18px 40px;
  }
  .public-footer {
    padding-inline: 18px;
    flex-direction: column;
  }
}
</style>
