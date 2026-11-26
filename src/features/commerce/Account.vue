<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/lib/api';
import PageTitle from '@/components/PageTitle.vue';
import LogoutButton from '@/components/LogoutButton.vue';
import { useSession } from '@/lib/session';
import { usePlatform } from '@/lib/platform-store';
// Mi cuenta: datos, confirmación de la cuenta y accesos según el rol.
const name = ref(''),
  message = ref('');
async function save() {
  try {
    await api('PUT', '/auth/perfil', { name: name.value });
    await s.refresh();
    message.value = 'Nombre actualizado.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const s = useSession(),
  p = usePlatform();
</script>
<template>
  <PageTitle
    eyebrow="TU CUENTA"
    :title="`Hola, ${s.user?.name || ''}.`"
    description="Tus datos y tus espacios en SucreIA."
  />
  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <div class="two-columns">
    <section class="card form-stack">
      <h2>{{ s.user?.name }}</h2>
      <p>{{ s.user?.email }}</p>
      <span class="tag">{{
        s.user?.role === 'emprendedor'
          ? 'Emprendedor'
          : s.user?.role === 'admin'
            ? 'Administrador'
            : 'Cliente'
      }}</span>
      <p v-if="s.emailNotice && !s.user?.emailVerifiedAt" class="notice">{{ s.emailNotice }}</p>
      <span v-if="s.user?.emailVerifiedAt" class="tag">{{
        s.user.verifyChannel === 'sms' ? 'Celular verificado' : 'Correo verificado'
      }}</span
      ><NuxtLink v-else class="button secondary" to="/verificar-correo"
        >Confirmar mi cuenta →</NuxtLink
      ><NuxtLink to="/recuperar">Cambiar mi contraseña →</NuxtLink>
      <form class="form-stack" @submit.prevent="save">
        <label
          >Actualizar mi nombre<input
            v-model="name"
            :placeholder="s.user?.name"
            required
            maxlength="80" /></label
        ><button class="button secondary">Guardar nombre</button>
      </form>
      <LogoutButton />
    </section>
    <section class="card form-stack">
      <h2>Tu actividad</h2>
      <template v-if="s.user?.role === 'cliente'">
        <NuxtLink to="/pedidos">Mis compras y reservas →</NuxtLink>
        <NuxtLink to="/favoritos"
          >{{ p.data.value?.favorites.length ?? 0 }} negocios favoritos →</NuxtLink
        >
        <NuxtLink class="button" to="/emprender"
          >¿Quieres montar tu propio emprendimiento? →</NuxtLink
        >
      </template>
      <template v-else>
        <NuxtLink class="button" :to="s.user?.role === 'admin' ? '/admin' : '/panel'"
          >{{
            s.user?.role === 'admin' ? 'Ir a administración' : 'Gestionar mi negocio'
          }}
          →</NuxtLink
        >
        <NuxtLink to="/panel/negocios">Mis negocios →</NuxtLink>
        <NuxtLink to="/panel/configurar">Registrar otro emprendimiento →</NuxtLink>
      </template>
      <NuxtLink to="/pqrs">Peticiones, quejas y reclamos (PQRS) →</NuxtLink>
    </section>
  </div>
</template>
