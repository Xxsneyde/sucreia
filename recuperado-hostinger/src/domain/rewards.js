// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var REWARDS = {
  purchasePer: 1e3,
  review: 20,
  referral: 30,
  challenge: 50,
  eventMax: 100
};
var challenges = [
  { id: "tres-sectores", title: "Compra en 3 sectores distintos", goal: 3 },
  { id: "tres-resenas", title: "Publica 3 rese\xF1as", goal: 3 },
  { id: "aprendiz", title: "Completa 3 lecciones de la Escuela", goal: 3 }
];
var EVENT_CLAIM_DAYS = 7;
var REFERRAL_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
