// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var documentKinds = [
  {
    id: "identidad",
    label: "Documento de identidad",
    hint: "C\xE9dula del titular o del representante legal (ambas caras)."
  },
  { id: "rut", label: "RUT", hint: "Registro \xDAnico Tributario actualizado." },
  {
    id: "bancario",
    label: "Certificado bancario",
    hint: "De la persona natural o jur\xEDdica, con no m\xE1s de 30 d\xEDas."
  },
  {
    id: "camara",
    label: "C\xE1mara de Comercio",
    hint: "Certificado de existencia y representaci\xF3n legal (jur\xEDdica) o matr\xEDcula mercantil (natural)."
  }
];
function requiredDocuments(type) {
  return type === "juridica" ? ["identidad", "rut", "bancario", "camara"] : ["identidad", "rut", "bancario"];
}
var documentMimes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
var documentMaxBytes = 4 * 1024 * 1024;
function missingDocuments(type, docs) {
  const have = new Set(docs.map((d) => d.kind));
  return requiredDocuments(type).filter((k) => !have.has(k));
}
