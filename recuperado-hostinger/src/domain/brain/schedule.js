// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var dayIndex = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6
};
var order = [1, 2, 3, 4, 5, 6, 0];
var dayLabel = ["domingo", "lunes", "martes", "mi\xE9rcoles", "jueves", "viernes", "s\xE1bado"];
function daysIn(text2) {
  const t = plain(text2);
  if (/todos los dias|toda la semana|diario|24 ?\/ ?7|lunes a domingo/.test(t)) return [...order];
  const found = [...t.matchAll(/(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/g)].map(
    (m) => dayIndex[m[1]]
  );
  if (!found.length) return [];
  const days = /* @__PURE__ */ new Set();
  const ranges = [
    ...t.matchAll(
      /(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s*(?:a|-|hasta|al)\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/g
    )
  ];
  for (const r of ranges) {
    const a = order.indexOf(dayIndex[r[1]]), b = order.indexOf(dayIndex[r[2]]);
    for (let i = a; i <= (b >= a ? b : b + 7); i++) days.add(order[i % 7]);
  }
  for (const d of found) days.add(d);
  return [...days];
}
function hoursIn(text2) {
  const t = plain(text2).replace(/\s+/g, " ");
  const times = [
    ...t.matchAll(
      /(\d{1,2})(?:[:.](\d{2}))?\s*(a\.? ?m\.?|p\.? ?m\.?|m\.?(?![a-z])|del mediodia|de la tarde|de la noche|de la manana|h\b|hrs?\b)?/g
    )
  ].filter((m) => m[2] || m[3]);
  if (times.length < 2) return null;
  const toHour = (m) => {
    let h = Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
    const s = m[3] ?? "";
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
function parseHours(text2) {
  if (!text2?.trim()) return null;
  const week = Array(7).fill(null);
  let any = false;
  let pending = [];
  for (const part of text2.split(/[·;\n|]|\s-\s(?=[a-zA-ZáéíóúÁÉÍÓÚ])/)) {
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
function bogota(date) {
  const t = new Date(date.getTime() - 5 * 36e5);
  return { day: t.getUTCDay(), hour: t.getUTCHours() + t.getUTCMinutes() / 60 };
}
function openAt(week, date) {
  if (!week) return void 0;
  const { day, hour } = bogota(date);
  const d = week[day];
  if (!d || d.closed) return false;
  return hour >= d.opens && hour < d.closes;
}
function opensOn(week, day) {
  if (!week) return void 0;
  const d = week[day];
  return !!d && !d.closed;
}
function clock(hour) {
  const h = Math.floor(hour) % 24, m = Math.round((hour - Math.floor(hour)) * 60);
  const label = `${h % 12 || 12}:${String(m).padStart(2, "0")}`;
  if (h === 12 && m === 0) return "12:00 m.";
  return `${label} ${h < 12 ? "a. m." : "p. m."}`;
}
