// Documentos que el emprendedor adjunta al registrar su negocio para la revisión de la administración.

export type PersonType = 'natural' | 'juridica';
export type DocumentKind = 'identidad' | 'rut' | 'camara';

export const documentKinds: { id: DocumentKind; label: string; hint: string }[] = [
  {
    id: 'identidad',
    label: 'Documento de identidad',
    hint: 'Cédula del titular o del representante legal, en PDF con ambas caras.',
  },
  { id: 'rut', label: 'RUT', hint: 'Registro Único Tributario actualizado.' },
  {
    id: 'camara',
    label: 'Cámara de Comercio',
    hint: 'Certificado de existencia y representación legal (jurídica) o matrícula mercantil (natural).',
  },
];

/** Solo la cédula es obligatoria; el RUT y la Cámara de Comercio son opcionales. */
export function requiredDocuments(_type: PersonType): DocumentKind[] {
  return ['identidad'];
}
/** Todos los documentos que se pueden adjuntar. */
export function allDocuments(_type: PersonType): DocumentKind[] {
  return documentKinds.map((d) => d.id);
}
export const optionalDocument = (type: PersonType, kind: DocumentKind) =>
  !requiredDocuments(type).includes(kind);

export const documentMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const;
export const documentMaxBytes = 4 * 1024 * 1024;
/** Formatos que acepta cada documento: la cédula solo en PDF. */
export const mimesFor = (kind: DocumentKind): readonly string[] =>
  kind === 'identidad' ? ['application/pdf'] : documentMimes;
export const acceptFor = (kind: DocumentKind) => mimesFor(kind).join(',');
export const formatsFor = (kind: DocumentKind) =>
  kind === 'identidad' ? 'PDF' : 'PDF, JPG, PNG o WEBP';

export function missingDocuments(type: PersonType, docs: { kind: string }[]): DocumentKind[] {
  const have = new Set(docs.map((d) => d.kind));
  return requiredDocuments(type).filter((k) => !have.has(k));
}
