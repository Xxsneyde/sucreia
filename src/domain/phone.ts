// Teléfonos de cualquier país, guardados en formato internacional (E.164): «+» + indicativo +
// número, sin espacios. Colombia es el país por defecto; un celular colombiano escrito sin
// indicativo (3001234567) se sigue entendiendo como +57, como en los datos anteriores.
// Lo usan el sitio (campo de teléfono) y el servidor (SMS).

export interface Country {
  /** Código ISO de dos letras. */
  iso: string;
  name: string;
  /** Indicativo sin «+». */
  dial: string;
  /** Dígitos del número nacional (sin indicativo): mínimo y máximo. */
  digits: [number, number];
}

/** Colombia primero; luego los países más cercanos y los de origen más frecuente. */
export const countries: Country[] = [
  { iso: 'CO', name: 'Colombia', dial: '57', digits: [10, 10] },
  { iso: 'VE', name: 'Venezuela', dial: '58', digits: [10, 10] },
  { iso: 'EC', name: 'Ecuador', dial: '593', digits: [8, 9] },
  { iso: 'PE', name: 'Perú', dial: '51', digits: [8, 9] },
  { iso: 'PA', name: 'Panamá', dial: '507', digits: [7, 8] },
  { iso: 'MX', name: 'México', dial: '52', digits: [10, 10] },
  { iso: 'US', name: 'Estados Unidos', dial: '1', digits: [10, 10] },
  { iso: 'CA', name: 'Canadá', dial: '1', digits: [10, 10] },
  { iso: 'ES', name: 'España', dial: '34', digits: [9, 9] },
  { iso: 'AR', name: 'Argentina', dial: '54', digits: [10, 11] },
  { iso: 'BO', name: 'Bolivia', dial: '591', digits: [8, 8] },
  { iso: 'BR', name: 'Brasil', dial: '55', digits: [10, 11] },
  { iso: 'CL', name: 'Chile', dial: '56', digits: [9, 9] },
  { iso: 'CR', name: 'Costa Rica', dial: '506', digits: [8, 8] },
  { iso: 'CU', name: 'Cuba', dial: '53', digits: [8, 8] },
  { iso: 'DO', name: 'República Dominicana', dial: '1', digits: [10, 10] },
  { iso: 'SV', name: 'El Salvador', dial: '503', digits: [8, 8] },
  { iso: 'GT', name: 'Guatemala', dial: '502', digits: [8, 8] },
  { iso: 'HN', name: 'Honduras', dial: '504', digits: [8, 8] },
  { iso: 'NI', name: 'Nicaragua', dial: '505', digits: [8, 8] },
  { iso: 'PY', name: 'Paraguay', dial: '595', digits: [9, 9] },
  { iso: 'PR', name: 'Puerto Rico', dial: '1', digits: [10, 10] },
  { iso: 'UY', name: 'Uruguay', dial: '598', digits: [8, 8] },
  { iso: 'DE', name: 'Alemania', dial: '49', digits: [10, 11] },
  { iso: 'FR', name: 'Francia', dial: '33', digits: [9, 9] },
  { iso: 'IT', name: 'Italia', dial: '39', digits: [9, 10] },
  { iso: 'PT', name: 'Portugal', dial: '351', digits: [9, 9] },
  { iso: 'GB', name: 'Reino Unido', dial: '44', digits: [10, 10] },
];
export const DEFAULT_COUNTRY = 'CO';
export const countryOf = (iso: string) =>
  countries.find((c) => c.iso === iso) ?? countries.find((c) => c.iso === DEFAULT_COUNTRY)!;

/**
 * Separa un teléfono guardado en país y número nacional. Acepta «+573001234567»,
 * «573001234567» (como guarda los SMS el servidor) y «3001234567» (celular colombiano sin
 * indicativo). El indicativo +1 se lee como Estados Unidos.
 */
export function splitPhone(value: string | null | undefined): { iso: string; national: string } {
  const raw = (value ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { iso: DEFAULT_COUNTRY, national: '' };
  if (!raw.startsWith('+') && /^3\d{9}$/.test(digits)) return { iso: 'CO', national: digits };
  // El indicativo más largo que coincida (507 antes que 50…).
  const match = [...countries]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => digits.startsWith(c.dial) && digits.length > c.dial.length + 5);
  if (match)
    return {
      iso: match.dial === '1' ? 'US' : match.iso,
      national: digits.slice(match.dial.length),
    };
  return { iso: DEFAULT_COUNTRY, national: digits };
}

/** País y número nacional → «+573001234567». Vacío si no hay número. */
export function joinPhone(iso: string, national: string): string {
  const digits = national.replace(/\D/g, '');
  return digits ? `+${countryOf(iso).dial}${digits}` : '';
}

/** Qué le falta al número para el país elegido ('' = está bien). */
export function phoneProblem(iso: string, national: string): string {
  const country = countryOf(iso);
  const digits = national.replace(/\D/g, '');
  const [min, max] = country.digits;
  if (!digits) return 'Escribe el número.';
  if (digits.length < min || digits.length > max)
    return min === max
      ? `En ${country.name} el número tiene ${min} dígitos (sin el indicativo).`
      : `En ${country.name} el número tiene de ${min} a ${max} dígitos (sin el indicativo).`;
  if (country.iso === 'CO' && !/^[36]/.test(digits))
    return 'En Colombia el número empieza por 3 (celular) o por 60 (fijo).';
  return '';
}

/**
 * Teléfono normalizado a E.164 («+584121234567») o null si no es válido. Un celular colombiano
 * sin indicativo se completa con +57. Acepta espacios, guiones y paréntesis.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (!raw.trim().startsWith('+') && /^3\d{9}$/.test(digits)) return `+57${digits}`;
  const { iso, national } = splitPhone(`+${digits}`);
  return phoneProblem(iso, national) ? null : joinPhone(iso, national);
}

/** «+57 *** 4567»: a dónde se envió un código sin mostrar el número completo. */
export function maskPhone(phone: string): string {
  const { iso, national } = splitPhone(phone.startsWith('+') ? phone : `+${phone}`);
  return `+${countryOf(iso).dial} *** ${national.slice(-4)}`;
}
