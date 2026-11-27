<script setup lang="ts">
import { computed } from 'vue';
import { Copy } from '@lucide/vue';
import { dayNames, hourLabel, weekOrder, weekSummary, type DaySchedule } from '@/domain/platform';
// Horario de atención por días: atajos (lunes a viernes…), días que abre y horas de cada uno.
// El modelo es la semana de domingo (0) a sábado (6).
const week = defineModel<DaySchedule[]>({ required: true });
const opensAt = Array.from({ length: 24 }, (_, h) => h);
const closesAt = Array.from({ length: 24 }, (_, h) => h + 1);
const short = (day: number) => dayNames[day].slice(0, 3);
const openDays = computed(() => weekOrder.filter((d) => !week.value[d]?.closed));
const summary = computed(() => weekSummary(week.value));
function setDay(day: number, change: Partial<DaySchedule>) {
  week.value = week.value.map((d, i) => (i === day ? { ...d, ...change } : d));
}
function toggleDay(day: number) {
  setDay(day, { closed: !week.value[day].closed });
}
/** Abre solo esos días, con las horas del primer día abierto (o 8 a 6). */
function preset(days: number[]) {
  const first = week.value[openDays.value[0] ?? 1];
  const hours = first && !first.closed ? first : { opens: 8, closes: 18 };
  week.value = week.value.map((_, i) => ({
    closed: !days.includes(i),
    opens: hours.opens,
    closes: hours.closes,
  }));
}
const presets = [
  { label: 'Lunes a viernes', days: [1, 2, 3, 4, 5] },
  { label: 'Lunes a sábado', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Todos los días', days: [0, 1, 2, 3, 4, 5, 6] },
];
const isPreset = (days: number[]) =>
  openDays.value.length === days.length && days.every((d) => openDays.value.includes(d));
/** Copia las horas de un día a todos los días abiertos. */
function copyToAll(day: number) {
  const { opens, closes } = week.value[day];
  week.value = week.value.map((d) => (d.closed ? d : { ...d, opens, closes }));
}
</script>
<template>
  <fieldset class="wh">
    <legend>Horario de atención</legend>
    <p class="wh-help">Toca los días que abres y elige a qué hora abres y cierras.</p>
    <div class="wh-presets" role="group" aria-label="Atajos">
      <button
        v-for="p in presets"
        :key="p.label"
        type="button"
        :class="{ on: isPreset(p.days) }"
        :aria-pressed="isPreset(p.days)"
        @click="preset(p.days)"
      >
        {{ p.label }}
      </button>
    </div>
    <div class="wh-days" role="group" aria-label="Días que abre el negocio">
      <button
        v-for="d in weekOrder"
        :key="d"
        type="button"
        :class="{ on: !week[d].closed }"
        :aria-pressed="!week[d].closed"
        :aria-label="dayNames[d]"
        @click="toggleDay(d)"
      >
        {{ short(d) }}
      </button>
    </div>
    <ul v-if="openDays.length" class="wh-rows">
      <li v-for="(d, i) in openDays" :key="d">
        <strong>{{ dayNames[d] }}</strong>
        <label>
          <span class="sr-only">Abre el {{ dayNames[d] }}</span>
          <select
            :value="week[d].opens"
            @change="setDay(d, { opens: Number(($event.target as HTMLSelectElement).value) })"
          >
            <option v-for="h in opensAt" :key="h" :value="h">{{ hourLabel(h) }}</option>
          </select>
        </label>
        <span class="wh-to" aria-hidden="true">a</span>
        <label>
          <span class="sr-only">Cierra el {{ dayNames[d] }}</span>
          <select
            :value="week[d].closes"
            :class="{ bad: week[d].closes <= week[d].opens }"
            @change="setDay(d, { closes: Number(($event.target as HTMLSelectElement).value) })"
          >
            <option v-for="h in closesAt" :key="h" :value="h">
              {{ h === 24 ? 'Medianoche' : hourLabel(h) }}
            </option>
          </select>
        </label>
        <button
          v-if="i === 0 && openDays.length > 1"
          type="button"
          class="wh-copy"
          title="Usar estas horas en todos los días abiertos"
          @click="copyToAll(d)"
        >
          <Copy :size="14" /> <span>Igual para todos</span>
        </button>
      </li>
    </ul>
    <p v-else class="wh-empty">Elige al menos un día.</p>
    <p v-if="summary" class="wh-preview" aria-live="polite">
      <span>Así lo verán tus clientes:</span> {{ summary }}
    </p>
  </fieldset>
</template>

<style scoped>
.wh {
  border: 1px solid var(--line);
  background: #fbfdff;
  border-radius: 16px;
  gap: 12px;
  margin: 0;
  padding: 14px 16px 16px;
  display: grid;
}
.wh legend {
  color: var(--ink);
  padding: 0 6px;
  font-weight: 700;
}
.wh-empty,
.wh-help {
  color: var(--muted);
  margin: 0;
  font-size: 13px;
}
.wh-presets {
  flex-wrap: wrap;
  gap: 8px;
  display: flex;
}
.wh-presets button {
  border: 1.5px solid var(--field-border);
  min-height: 36px;
  color: var(--ink);
  background: #fff;
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 13px;
}
.wh-presets button.on {
  border-color: var(--blue);
  color: #0a2357;
  background: #f3f8fe;
  font-weight: 600;
}
.wh-days {
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  display: grid;
}
.wh-days button {
  border: 1.5px solid var(--field-border);
  min-width: 0;
  min-height: 44px;
  color: var(--muted);
  background: #fff;
  border-radius: 12px;
  padding: 0;
  font-weight: 700;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.wh-days button.on {
  border-color: var(--blue);
  background: var(--blue);
  color: #fff;
}
.wh-rows {
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.wh-rows li {
  grid-template-columns: 88px 130px auto 130px auto;
  justify-content: start;
  align-items: center;
  gap: 8px;
  display: grid;
}
.wh-rows strong {
  font-size: 14px;
}
.wh-rows label {
  min-width: 0;
  margin: 0;
  display: block;
}
.wh-rows select {
  border: 1.5px solid var(--field-border);
  background: #fff var(--chevron) no-repeat right 8px center/16px;
  appearance: none;
  border-radius: 12px;
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 4px 30px 4px 10px;
}
.wh-rows select:focus {
  border-color: var(--field-focus);
  box-shadow: var(--field-ring);
  outline: none;
}
.wh-rows select.bad {
  border-color: var(--red, #d93025);
}
.wh-to {
  color: var(--muted);
  font-size: 13px;
}
.wh-copy {
  color: var(--blue);
  background: 0 0;
  border-radius: 8px;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
}
.wh-preview {
  background: var(--green-soft);
  color: var(--ink);
  border-radius: 12px;
  margin: 0;
  padding: 10px 12px;
  font-size: 13.5px;
}
.wh-preview span {
  color: var(--muted);
  font-size: 12px;
  display: block;
}
@media (width<=520px) {
  .wh-rows {
    gap: 12px;
  }
  .wh-rows li {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 4px 8px;
  }
  .wh-copy,
  .wh-rows strong {
    grid-column: 1/-1;
  }
  .wh-copy {
    justify-self: start;
    padding-left: 0;
  }
  .wh-days button {
    min-height: 40px;
    font-size: 12.5px;
  }
}
</style>
