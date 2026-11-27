import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
/**
 * Carrusel que avanza solo cada `ms` milisegundos (se detiene con la pestaña oculta, si la
 * persona pidió menos movimiento o si hay menos de dos elementos).
 */
export function useCarousel(count: Ref<number>, ms = 5000) {
  const index = ref(0);
  let timer: ReturnType<typeof setInterval> | undefined;
  let paused = false;
  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined;
  }
  function start() {
    stop();
    if (paused || reducedMotion() || count.value < 2) return;
    timer = setInterval(() => {
      if (!document.hidden) index.value = (index.value + 1) % count.value;
    }, ms);
  }
  function go(i: number) {
    if (count.value < 1) return;
    index.value = ((i % count.value) + count.value) % count.value;
    start();
  }
  watch(count, (n) => {
    if (index.value >= n) index.value = 0;
    start();
  });
  onMounted(start);
  onBeforeUnmount(stop);
  return {
    index,
    go,
    next: () => go(index.value + 1),
    prev: () => go(index.value - 1),
    pause: () => {
      paused = true;
      stop();
    },
    resume: () => {
      paused = false;
      start();
    },
  };
}
