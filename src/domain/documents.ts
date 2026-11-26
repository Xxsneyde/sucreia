// Documentos que el emprendedor adjunta al registrar su negocio para la revisión de la administración.

export type PersonType = 'natural' | 'juridica';
export type DocumentKind = 'identidad' | 'rut' | 'bancario' | 'camara';

export const documentKinds: { id: DocumentKind; label: string; hint: string }[] = [
  {
    id: 'identidad',
    label: 'Documento de identidad',
    hint: 'Cédula del titular o del representante legal (ambas caras).',
  },
  { id: 'rut', label: 'RUT', hint: 'Registro Único Tributario actualizado.' },
  {
    id: 'bancario',
    label: 'Certificado bancario',
    hint: 'De la persona natural o jurídica, con no más de 30 días.',
  },
  {
    id: 'camara',
    label: 'Cámara de Comercio',
    hint: 'Certificado de existencia y representación legal (jurídica) o matrícula mercantil (natural).',
  },
];

/** Obligatorios: la Cámara de Comercio solo para persona jurídica. */
export function requiredDocuments(type: PersonType): DocumentKind[] {
  return type === 'juridica'
    ? ['identidad', 'rut', 'bancario', 'camara']
    : ['identidad', 'rut', 'bancario'];
}
/** Todos los documentos que se pueden adjuntar (para persona natural la Cámara es opcional). */
export function allDocuments(_type: PersonType): DocumentKind[] {
  return documentKinds.map((d) => d.id);
}
export const optionalDocument = (type: PersonType, kind: DocumentKind) =>
  !requiredDocuments(type).includes(kind);

export const documentMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const;
export const documentMaxBytes = 4 * 1024 * 1024;

export function missingDocuments(type: PersonType, docs: { kind: string }[]): DocumentKind[] {
  const have = new Set(docs.map((d) => d.kind));
  return requiredDocuments(type).filter((k) => !have.has(k));
}
