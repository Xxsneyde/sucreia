<script setup lang="ts">
import { computed, ref } from 'vue';
import { GraduationCap } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import { useDemo } from '@/lib/demo-store';
import { lessons } from './lessons';
const store = useDemo();
const active = ref<string | null>(null);
const answer = ref<number | null>(null);
const feedback = ref('');
const lesson = computed(() => lessons.find((l) => l.id === active.value));
function open(id: string) {
  active.value = id;
  answer.value = null;
  feedback.value = '';
}
function check() {
  if (!lesson.value) return;
  if (answer.value === lesson.value.correct) {
    store.completeLesson(lesson.value.id);
    feedback.value = '¡Listo! Completaste esta lección. Ponlo en práctica en tu tienda.';
  } else feedback.value = 'Revisa la lección e inténtalo de nuevo.';
}
</script>

<template>
  <PageTitle
    eyebrow="CRECEMOS CUANDO APRENDEMOS"
    title="Pequeños pasos. Grandes ideas."
    description="Tres lecciones prácticas para preparar tu primera tienda."
  />
  <div class="learning-progress">
    <span>{{ store.completedLessons.length }} de {{ lessons.length }} lecciones completadas</span>
    <progress :max="lessons.length" :value="store.completedLessons.length" />
  </div>
  <div class="product-grid">
    <article v-for="(l, i) in lessons" :key="l.id" class="card course">
      <GraduationCap :size="30" />
      <span class="eyebrow">LECCIÓN 0{{ i + 1 }}</span>
      <h2>{{ l.title }}</h2>
      <span class="muted small">3 minutos · ejercicio práctico</span>
      <button class="button secondary" @click="open(l.id)">
        {{ store.completedLessons.includes(l.id) ? 'Volver a leer ✓' : 'Comenzar lección →' }}
      </button>
    </article>
  </div>
  <section v-if="lesson" class="card lesson-card">
    <h2>{{ lesson.title }}</h2>
    <p>{{ lesson.content }}</p>
    <div class="notice">
      <strong>Tu turno</strong>
      <p>{{ lesson.exercise }}</p>
    </div>
    <h3>{{ lesson.question }}</h3>
    <div class="lesson-options">
      <label v-for="(a, i) in lesson.answers" :key="a">
        <input v-model="answer" type="radio" name="lesson-answer" :value="i" />
        {{ a }}
      </label>
    </div>
    <button class="button" :disabled="answer === null" @click="check">Comprobar respuesta</button>
    <p v-if="feedback" role="status" class="notice">{{ feedback }}</p>
    <NuxtLink class="text-button" to="/estudio">Ir a mi estudio →</NuxtLink>
  </section>
</template>
