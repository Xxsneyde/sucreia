<script setup lang="ts">
import { ArrowUpRight, ShoppingBag } from '@lucide/vue';
import { useSession } from '@/lib/session';
const session = useSession();
</script>
<template>
  <div class="auth-shell">
    <a class="skip-link" href="#acceso">Saltar al formulario</a>
    <header class="auth-header">
      <NuxtLink class="brand" to="/" aria-label="SucreIA, inicio"
        ><span class="brand-icon"><ShoppingBag :size="23" /></span>Sucre<span>IA</span></NuxtLink
      >
      <NuxtLink class="auth-explore" to="/">Explorar negocios <ArrowUpRight :size="16" /></NuxtLink>
    </header>
    <aside class="auth-story" aria-label="Comunidad SucreIA">
      <p class="auth-kicker">HECHO PARA NUESTRA TIERRA</p>
      <h2>Lo que haces<br />merece <em>su lugar.</em></h2>
      <p>
        Conecta con el talento de Sucre. Descubre negocios locales o dale a tu emprendimiento una
        página propia.
      </p>
      <img src="/art/craft.svg" width="360" height="260" alt="" />
      <span class="auth-signature">De Sucre, para todos.</span>
    </aside>
    <main id="acceso" class="auth-content" :inert="session.ending">
      <slot />
    </main>
    <footer class="auth-footer">SucreIA · Talento local, nuevas oportunidades.</footer>
  </div>
</template>
<style scoped>
.auth-shell {
  min-height: 100dvh;
  padding: 32px clamp(20px, 6vw, 96px) 24px;
  background: #f3f5ed;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 480px);
  align-items: center;
  column-gap: clamp(32px, 6vw, 100px);
  row-gap: 40px;
}
.auth-header {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.auth-explore {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  min-height: 44px;
  font-size: 14px;
}
.auth-story {
  padding-block: 24px;
}
.auth-kicker {
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 700;
  color: #45644f;
}
.auth-story h2 {
  font-size: clamp(42px, 5vw, 72px);
  letter-spacing: -2.5px;
  line-height: 1.06;
  font-weight: 600;
  margin-block: 20px 24px;
}
.auth-story em {
  font-family: Georgia, serif;
  font-weight: 400;
  color: #246a4e;
}
.auth-story > p:not(.auth-kicker) {
  max-width: 380px;
  font-size: 16px;
  color: #465c50;
}
.auth-story img {
  display: block;
  width: min(100%, 360px);
  height: auto;
  max-height: 240px;
  object-fit: contain;
  margin-block: 24px;
}
.auth-signature {
  font-family: Georgia, serif;
  font-size: 18px;
  color: #426b50;
}
.auth-content {
  min-width: 0;
  padding: clamp(24px, 3vw, 40px);
  background: #fff;
  border: 1px solid #dce3d6;
  border-radius: 20px;
}
.auth-content :deep(.page-title) {
  margin: 0 0 28px;
}
.auth-content :deep(h1) {
  font-size: clamp(28px, 3vw, 36px);
  letter-spacing: -1px;
}
.auth-content :deep(.auth-card) {
  margin: 0;
  max-width: none;
  border: 0;
  padding: 0;
  box-shadow: none;
  border-radius: 0;
}
.auth-content :deep(.muted),
.auth-content :deep(.eyebrow),
.auth-content :deep(.auth-tabs button),
.auth-content :deep(.auth-roles span) {
  color: #526356;
}
.auth-content :deep(.auth-tabs button.active) {
  color: var(--ink);
}
.auth-content :deep(.button) {
  min-height: 48px;
}
.auth-content :deep(.notice) {
  margin-top: 20px;
}
.auth-footer {
  grid-column: 1 / -1;
  color: #526356;
  font-size: 12px;
}
@media (max-width: 800px) {
  .auth-shell {
    grid-template-columns: minmax(0, 1fr);
    padding: 20px 20px 24px;
    row-gap: 24px;
    align-content: start;
  }
  .auth-story {
    display: none;
  }
  .auth-content {
    width: min(100%, 480px);
    justify-self: center;
  }
  .auth-footer {
    text-align: center;
  }
}
@media (max-width: 380px) {
  .auth-shell {
    padding-inline: 12px;
  }
  .auth-content {
    padding: 20px;
  }
  .auth-explore {
    font-size: 12px;
    gap: 4px;
  }
  .auth-header .brand {
    font-size: 23px;
    gap: 5px;
  }
}
</style>
