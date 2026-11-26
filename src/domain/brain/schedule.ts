import { plain } from './text.ts';
import type { Week } from './types.ts';

export const dayIndex: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};
export const order = [1, 2, 3, 4, 5, 6, 0];
export const dayLabel = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export function daysIn(text: string): number[] {
  const t = plain(text);
  if (/todos los dias|toda la semana|diario|24 ?\/ ?7|lunes a domingo/.test(t)) return [...order];
  const found = [...t.matchAll(/(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/g)].map(
    (m) => dayIndex[m[1]],
  );
  if (!found.length) return [];
  const days = new Set<number>();
  const ranges = [
    ...t.matchAll(
      /(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s*(?:a|-|hasta|al)\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/g,
    ),
  ];
  for (const r of ranges) {
    const a = order.indexOf(dayIndex[r[1]]),
      b = order.indexOf(dayIndex[r[2]]);
    for (let i = a; i <= (b >= a ? b : b + 7); i++) days.add(order[i % 7]);
  }
  for (const d of found) days.add(d);
  return [...days];
}
export function hoursIn(text: string): [number, number] | null {
  const t = plain(text).replace(/\s+/g, ' ');
  const times = [
    ...t.matchAll(
      /(\d{1,2})(?:[:.](\d{2}))?\s*(a\.? ?m\.?|p\.? ?m\.?|m\.?(?![a-z])|del mediodia|de la tarde|de la noche|de la manana|h\b|hrs?\b)?/g,
    ),
  ].filter((m) => m[2] || m[3]);
  if (times.length < 2) return null;
  const toHour = (m: RegExpMatchArray) => {
    let h = Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
    const s = m[3] ?? '';
    if (/^p|tarde|noche/.test(s) && h < 12) h += 12;
    if (/^a|manana/.test(s) && h >= 12) h -= 12;
    return h;
  };
  const last = times[times.length - 1];
  const open = toHour(times[0]);
  let close = toHour(last);
  if (close === 0) close = 24;
  if (close <= open && !last[3]) close += 12;
  return open < close ? [open, close] : null;
}
/** «Lunes a sábado 8 a. m. a 6 p. m. · Domingo 9 a 1» → semana. */
export function parseHours(text: string | null | undefined): Week | null {
  if (!text?.trim()) return null;
  const week: Week = Array(7).fill(null);
  let any = false;
  let pending: number[] = [];
  for (const part of text.split(/[·;\n|]|\s-\s(?=[a-zA-ZáéíóúÁÉÍÓÚ])/)) {
    const days = daysIn(part);
    const hours = hoursIn(part);
    if (days.length && !hours) {
      pending = days;
      continue;
    }
    if (!hours) continue;
    const target = days.length ? days : pending.length ? pending : [...order];
    for (const d of target) week[d] = { closed: false, opens: hours[0], closes: hours[1] };
    pending = [];
    any = true;
  }
  return any ? week : null;
}
/** Día y hora en Colombia (UTC−5, sin horario de verano). */
export function bogota(date: Date): { day: number; hour: number } {
  const t = new Date(date.getTime() - 5 * 36e5);
  return { day: t.getUTCDay(), hour: t.getUTCHours() + t.getUTCMinutes() / 60 };
}
export function openAt(week: Week | null, date: Date): boolean | undefined {
  if (!week) return void 0;
  const { day, hour } = bogota(date);
  const d = week[day];
  if (!d || d.closed) return false;
  return hour >= d.opens && hour < d.closes;
}
export function opensOn(week: Week | null, day: number): boolean | undefined {
  if (!week) return void 0;
  const d = week[day];
  return !!d && !d.closed;
}
export function clock(hour: number): string {
  const h = Math.floor(hour) % 24,
    m = Math.round((hour - Math.floor(hour)) * 60);
  const label = `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
  if (h === 12 && m === 0) return '12:00 m.';
  return `${label} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}
