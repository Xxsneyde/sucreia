// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var statusNames = {
  pending: "Recibido",
  preparing: "En preparaci\xF3n",
  ready: "Listo para entregar",
  dispatched: "En camino",
  quoted: "Cotizaci\xF3n enviada",
  accepted: "Aceptado / confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
  refunded: "Devuelto",
  no_show: "No asisti\xF3"
};
var dayNames = ["Domingo", "Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes", "S\xE1bado"];
function daySchedule(s, day) {
  return s.week?.[day] ?? { closed: false, opens: s.opens, closes: s.closes };
}
var defaultSettings = () => ({
  suspended: false,
  delivery: false,
  deliveryFee: 0,
  paymentInstructions: "",
  opens: 9,
  closes: 17,
  duration: 60,
  latitude: null,
  longitude: null,
  verification: "none",
  verificationNote: ""
});
var pqrsKinds = ["Petici\xF3n", "Queja", "Reclamo", "Sugerencia"];
var pqrsFileMimes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
var pqrsFileMaxBytes = 5 * 1024 * 1024;
var radicado = (id) => id.slice(0, 8).toUpperCase();
