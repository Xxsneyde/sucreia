// Reglas de las contraseñas nuevas (registro y recuperación). Las mismas en el sitio (lista que
// se marca mientras se escribe) y en el servidor (que las vuelve a comprobar). Las contraseñas
// que ya existen siguen sirviendo para ingresar: las reglas aplican al crear o cambiar una.

export interface PasswordRule {
  id: 'length' | 'letter' | 'number' | 'symbol';
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_MIN = 8;

export const passwordRules: PasswordRule[] = [
  {
    id: 'length',
    label: `Mínimo ${PASSWORD_MIN} caracteres`,
    test: (p) => [...p].length >= PASSWORD_MIN,
  },
  { id: 'letter', label: 'Al menos una letra', test: (p) => /\p{L}/u.test(p) },
  { id: 'number', label: 'Al menos un número', test: (p) => /\p{N}/u.test(p) },
  {
    id: 'symbol',
    label: 'Al menos un carácter especial (por ejemplo ! # $ - _ . @)',
    // Cualquier cosa que no sea letra, número ni espacio.
    test: (p) => /[^\p{L}\p{N}\s]/u.test(p),
  },
];

/** Qué le falta a la contraseña ('' = cumple todas las reglas). */
export function passwordProblem(password: string): string {
  const missing = passwordRules.filter((r) => !r.test(password));
  if (!missing.length) return '';
  return `La contraseña necesita: ${missing.map((r) => r.label.toLowerCase()).join(', ')}.`;
}
