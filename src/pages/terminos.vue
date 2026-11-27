<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { CalendarCheck, ChevronDown, Info, ListOrdered, MessageSquareText } from '@lucide/vue';
import { termsSections, termsSubtitle, termsTitle, USER_TERMS_DATE } from '@/domain/terms';
// Política de uso y condiciones generales de SucreIA: la que se acepta al crear la cuenta. Se
// abre en una pestaña aparte desde el registro. (Al crear un negocio se acepta además
// TERMS_VERSION, src/lib/studio-store.ts.)
definePageMeta({ layout: 'documento' });
useHead({ title: 'Política de uso y condiciones generales' });

const letter = (i: number) => String.fromCharCode(97 + i);
// Sección visible, para marcarla en el índice.
const current = ref(termsSections[0].id);
let observer: IntersectionObserver | null = null;
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) current.value = e.target.id;
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );
  for (const s of termsSections) {
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  }
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section class="tm-hero">
    <div class="tm-wrap">
      <p class="tm-eyebrow">Documento legal</p>
      <h1>{{ termsTitle }}</h1>
      <p class="tm-sub">{{ termsSubtitle }}</p>
      <p class="tm-date"><CalendarCheck :size="16" /> Vigente desde el {{ USER_TERMS_DATE }}</p>
    </div>
  </section>

  <div class="tm-wrap tm-layout">
    <nav class="tm-toc" aria-label="Contenido de la política">
      <details open>
        <summary>
          <ListOrdered :size="17" /> Contenido <ChevronDown :size="16" class="tm-chev" />
        </summary>
        <ol>
          <li v-for="(s, i) in termsSections" :key="s.id">
            <a :href="`#${s.id}`" :class="{ on: current === s.id }"
              ><span>{{ i + 1 }}</span> {{ s.title }}</a
            >
          </li>
        </ol>
      </details>
    </nav>

    <article class="tm-doc">
      <p class="tm-intro">
        <Info :size="18" aria-hidden="true" />
        <span
          >Al crear tu cuenta aceptas esta política. Léela con calma: explica qué es SucreIA, qué le
          corresponde a cada participante y cómo se protegen tus datos.</span
        >
      </p>
      <section v-for="(s, i) in termsSections" :id="s.id" :key="s.id" class="tm-section">
        <h2>
          <span class="tm-num">{{ i + 1 }}</span> {{ s.title }}
        </h2>
        <template v-for="(b, j) in s.blocks" :key="j">
          <p v-if="b.kind === 'p'">{{ b.text }}</p>
          <p v-else-if="b.kind === 'note'" class="tm-note">{{ b.text }}</p>
          <ul v-else-if="b.kind === 'list'" class="tm-list">
            <li v-for="item in b.items" :key="item">{{ item }}</li>
          </ul>
          <ol v-else class="tm-letters">
            <li v-for="(item, k) in b.items" :key="item">
              <span>{{ letter(k) }})</span> {{ item }}
            </li>
          </ol>
        </template>
      </section>
      <aside class="tm-help">
        <MessageSquareText :size="22" aria-hidden="true" />
        <div>
          <strong>¿Tienes preguntas sobre esta política?</strong>
          <p>
            Escríbenos desde <NuxtLink to="/pqrs">Peticiones, quejas y reclamos (PQRS)</NuxtLink>.
          </p>
        </div>
      </aside>
    </article>
  </div>
</template>

<style scoped>
.tm-wrap {
  width: min(1120px, 100% - 32px);
  margin: 0 auto;
}
.tm-hero {
  color: #fff;
  background:
    radial-gradient(circle at 90% -10%, #22b14c26 0 220px, transparent 221px),
    linear-gradient(120deg, var(--navy-900), var(--navy-700));
  padding: clamp(32px, 6vw, 56px) 0 clamp(48px, 8vw, 80px);
}
.tm-eyebrow {
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9be3b1;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
}
.tm-hero h1 {
  color: #fff;
  max-width: 22ch;
  margin: 0;
  font-size: clamp(28px, 4.5vw, 42px);
  line-height: 1.15;
}
.tm-sub {
  color: #dbe7ff;
  margin: 10px 0 18px;
  font-size: 16px;
}
.tm-date {
  color: #fff;
  background: #ffffff1f;
  border: 1px solid #ffffff38;
  border-radius: 999px;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
}
.tm-layout {
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: start;
  gap: 28px;
  margin-top: -34px;
  padding-bottom: 32px;
  display: grid;
}
.tm-toc {
  background: #fff;
  border-radius: 18px;
  padding: 16px 14px;
  position: sticky;
  top: 76px;
  /* El índice completo cabe en la pantalla: si no, se desplaza por dentro. */
  max-height: calc(100dvh - 96px);
  overflow-y: auto;
  scrollbar-width: thin;
  box-shadow: var(--shadow);
}
.tm-toc summary {
  color: var(--ink);
  cursor: pointer;
  align-items: center;
  gap: 8px;
  padding: 2px 6px 10px;
  font-weight: 700;
  list-style: none;
  display: flex;
}
.tm-toc summary::-webkit-details-marker {
  display: none;
}
.tm-chev {
  display: none;
}
.tm-toc ol {
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.tm-toc a {
  color: var(--text);
  border-radius: 10px;
  gap: 8px;
  padding: 7px 8px;
  font-size: 13px;
  line-height: 1.35;
  display: flex;
}
.tm-toc a span {
  color: var(--muted);
  text-align: right;
  flex: none;
  width: 18px;
  font-weight: 700;
}
.tm-toc a:hover {
  background: var(--bg);
}
.tm-toc a.on {
  color: var(--navy-900);
  background: var(--blue-soft);
  font-weight: 600;
}
.tm-toc a.on span {
  color: var(--blue);
}
.tm-doc {
  background: #fff;
  border-radius: 22px;
  padding: clamp(22px, 4vw, 44px);
  box-shadow: var(--shadow);
}
.tm-intro {
  color: var(--navy-900);
  background: var(--blue-soft);
  border-radius: 14px;
  gap: 10px;
  margin: 0 0 8px;
  padding: 14px 16px;
  font-size: 14.5px;
  line-height: 1.55;
  display: flex;
}
.tm-intro svg {
  color: var(--blue);
  flex: none;
  margin-top: 2px;
}
.tm-section {
  border-bottom: 1px solid var(--line);
  scroll-margin-top: 80px;
  padding: 26px 0 18px;
}
.tm-section:last-of-type {
  border-bottom: 0;
}
.tm-section h2 {
  color: var(--ink);
  align-items: center;
  gap: 12px;
  margin: 0 0 12px;
  font-size: clamp(18px, 2.4vw, 21px);
  line-height: 1.3;
  display: flex;
}
.tm-num {
  color: #fff;
  background: linear-gradient(135deg, var(--green), var(--green-dark));
  border-radius: 10px;
  flex: none;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: 15px;
  display: grid;
}
.tm-section p,
.tm-section li {
  color: var(--text);
  font-size: 15px;
  line-height: 1.7;
}
.tm-section p {
  margin: 0 0 12px;
}
.tm-note {
  color: var(--navy-900) !important;
  background: #fff8e6;
  border-left: 4px solid #f5b301;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 600;
}
.tm-list,
.tm-letters {
  gap: 8px;
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
  display: grid;
}
.tm-list li {
  padding-left: 22px;
  position: relative;
}
.tm-list li:before {
  content: '';
  background: var(--green);
  border-radius: 999px;
  width: 8px;
  height: 8px;
  position: absolute;
  top: 10px;
  left: 4px;
}
.tm-letters li {
  background: var(--bg);
  border-radius: 10px;
  gap: 10px;
  padding: 8px 12px;
  display: flex;
}
.tm-letters li span {
  color: var(--blue);
  flex: none;
  font-weight: 700;
}
.tm-help {
  background: var(--green-soft);
  border-radius: 16px;
  gap: 14px;
  margin-top: 18px;
  padding: 18px;
  display: flex;
}
.tm-help svg {
  color: var(--green-dark);
  flex: none;
}
.tm-help p {
  margin: 4px 0 0;
  color: var(--text);
}
.tm-help a {
  color: var(--blue);
  font-weight: 600;
}
@media (width<=900px) {
  .tm-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .tm-toc {
    max-height: none;
    position: static;
  }
  .tm-chev {
    margin-left: auto;
    display: inline;
  }
  .tm-toc details:not([open]) summary {
    padding-bottom: 2px;
  }
}
@media print {
  .tm-hero {
    color: #000;
    background: none;
    padding: 0 0 12px;
  }
  .tm-hero h1,
  .tm-sub,
  .tm-date,
  .tm-eyebrow {
    color: #000;
    background: none;
    border: 0;
    padding: 0;
  }
  .tm-layout {
    margin: 0;
    display: block;
  }
  .tm-toc,
  .tm-intro,
  .tm-help {
    display: none;
  }
  .tm-doc {
    box-shadow: none;
    padding: 0;
  }
}
</style>
