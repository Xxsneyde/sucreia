import type { Directive } from 'vue';

// v-reveal: el elemento aparece con una transición suave al entrar en pantalla.
// Sin JavaScript o con «reducir movimiento» se ve directamente (ver .reveal en home.css).
let observer: IntersectionObserver | undefined;
function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          observer?.unobserve(e.target);
        }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  return observer;
}
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`);
    // Lo que ya está en pantalla al cargar se anima de inmediato (sin parpadear oculto→visible).
    const inView = el.getBoundingClientRect().top < window.innerHeight;
    el.classList.add('reveal');
    if (inView || typeof IntersectionObserver === 'undefined')
      requestAnimationFrame(() => el.classList.add('is-visible'));
    else getObserver().observe(el);
  },
  unmounted(el) {
    observer?.unobserve(el);
  },
};
