// Reglas de SucrePuntos (las aplica el servidor: server/rewards.ts).

/** Puntos por cada forma de ganar. Las compras dan 1 punto por cada $1.000 sin domicilio. */
export const REWARDS = {
  purchasePer: 1000,
  review: 20,
  referral: 30,
  challenge: 50,
  eventMax: 100,
} as const;

export interface Challenge {
  id: 'tres-sectores' | 'tres-resenas' | 'aprendiz';
  title: string;
  goal: number;
}
/** Retos que se cumplen con la actividad real de la cuenta (cada uno se premia una vez). */
export const challenges: Challenge[] = [
  { id: 'tres-sectores', title: 'Compra en 3 sectores distintos', goal: 3 },
  { id: 'tres-resenas', title: 'Publica 3 reseñas', goal: 3 },
  { id: 'aprendiz', title: 'Completa 3 lecciones de la Escuela', goal: 3 },
];
export interface ChallengeProgress extends Challenge {
  progress: number;
  done: boolean;
}

/** Feria o evento de Sucre: se confirma la asistencia con el código que se entrega allí. */
export interface SucreEvent {
  id: string;
  title: string;
  place: string;
  municipality: string;
  /** Día del evento (AAAA-MM-DD, hora de Colombia). */
  date: string;
  points: number;
  attended: boolean;
}
/** Días después del evento en los que todavía se puede registrar la asistencia. */
export const EVENT_CLAIM_DAYS = 7;

/** Niveles según el saldo de puntos. */
export const levels = [
  { name: 'Explorador', from: 0 },
  { name: 'Emprendedor', from: 4000 },
  { name: 'Embajador', from: 10000 },
] as const;
export function levelFor(points: number) {
  const i = levels.findLastIndex((l) => points >= l.from);
  return { level: levels[i], next: levels[i + 1] ?? null };
}

/** Código de referidos: 6 caracteres sin letras ni números que se confundan. */
export const REFERRAL_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
