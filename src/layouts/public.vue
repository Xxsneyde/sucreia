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
  background: #f8faf7;
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
  padding: 8px 16px;
  border: 1px solid #bfcfc2;
  border-radius: 9px;
  font-weight: 600;
  color: #234c3c;
}
.public-main {
  max-width: 1240px;
  margin: auto;
  padding: 24px 24px 64px;
}
.public-footer {
  max-width: 1192px;
  margin: auto;
  padding: 24px 0;
  border-top: 1px solid #dce4d9;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  font-size: 13px;
  color: #4b6152;
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
    margin-inline: 18px;
    flex-direction: column;
  }
}
</style>
