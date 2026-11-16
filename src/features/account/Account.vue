<script setup lang="ts">
import { ref } from 'vue';
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
    :title="`Hola, ${store.profileName}.`"
    description="Estás navegando con un perfil de demostración."
  />
  <div class="two-columns">
    <section class="card">
      <div class="profile-avatar">S</div>
      <h2>Comunidad SucreIA</h2>
      <p class="muted">Tu perfil local, sin contraseña ni conexión a servicios externos.</p>
      <label class="local-name-field">
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
        <p>
          <strong>{{ session.user.name }}</strong> · {{ session.user.email }}
          <span class="tag">{{ session.user.role }}</span>
        </p>
        <button class="button secondary" type="button" @click="session.logout()">
          Cerrar sesión
        </button>
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
