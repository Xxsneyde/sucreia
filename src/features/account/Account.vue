<script setup lang="ts">
import { ref } from 'vue';
import LogoutButton from '@/components/LogoutButton.vue';
import PageTitle from '@/components/PageTitle.vue';
import { useDemo } from '@/lib/demo-store';
import { useSession } from '@/lib/session';
const store = useDemo();
const session = useSession();
const confirm = ref(false);
function reset() {
  store.reset();
  confirm.value = false;
}
</script>

<template>
  <PageTitle
    eyebrow="TU ESPACIO"
    :title="`Hola, ${session.user?.name || store.profileName}.`"
    :description="
      session.user
        ? 'Tu cuenta y tus espacios en SucreIA.'
        : 'Explora como visitante o ingresa para gestionar tu negocio.'
    "
  />
  <div class="two-columns">
    <section class="card">
      <div class="profile-avatar">{{ session.user?.name.slice(0, 1).toUpperCase() || 'S' }}</div>
      <h2>Comunidad SucreIA</h2>
      <p class="muted">
        {{
          session.user
            ? 'Gestiona tu cuenta, verifica tu correo y entra a tu tienda.'
            : 'Tu perfil de demostración en este navegador.'
        }}
      </p>
      <label v-if="!session.user" class="local-name-field">
        ¿Cómo te llamas?
        <input
          maxlength="50"
          :value="store.profileName"
          @input="store.setProfileName(($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="profile-stats">
        <NuxtLink to="/pedidos"
          ><strong>{{ store.orders.length }}</strong> pedidos</NuxtLink
        >
        <NuxtLink to="/favoritos"
          ><strong>{{ store.favorites.length }}</strong> favoritos</NuxtLink
        >
      </div>
      <div v-if="session.user" class="account-session">
        <p v-if="session.emailNotice && !session.user.emailVerifiedAt" class="notice" role="status">
          {{ session.emailNotice }}
        </p>
        <p>
          <strong>{{ session.user.name }}</strong> · {{ session.user.email }}
          <span class="tag">{{ session.user.role }}</span>
        </p>
        <p v-if="session.user.emailVerifiedAt" class="tag">Correo verificado</p>
        <NuxtLink v-else class="button secondary" to="/verificar-correo"
          >Verificar mi correo →</NuxtLink
        >
        <LogoutButton />
      </div>
      <NuxtLink v-else class="button" to="/ingresar">Ingresar o crear cuenta →</NuxtLink>
    </section>
    <section class="card">
      <h2>Explora cada espacio</h2>
      <div class="link-list">
        <NuxtLink to="/panel">Mi negocio →</NuxtLink>
        <NuxtLink to="/estudio">Mi estudio visual →</NuxtLink>
        <NuxtLink to="/domiciliario">Entregas →</NuxtLink>
        <NuxtLink to="/equipo">Guía del equipo →</NuxtLink>
      </div>
      <button class="text-button" @click="confirm = true">Restablecer datos de demostración</button>
      <div v-if="confirm" class="notice">
        <p>
          Se restablecerán pedidos, carrito, puntos, lecciones y favoritos. Tus tiendas del estudio
          se conservan.
        </p>
        <button class="button secondary" @click="reset">Restablecer demo</button>
        <button class="button subtle" @click="confirm = false">Cancelar</button>
      </div>
    </section>
  </div>
</template>
