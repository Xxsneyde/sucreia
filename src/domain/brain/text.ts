/** Minúsculas sin tildes; conserva la ñ. */
export function plain(text: string): string {
  return text
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'ñ');
}
export const stopwords = new Set(
  'a al algo alguien cual cuales estan esta estas estos esos esas algun alguna alguno algunos ahi aqui asi aun ayuda ayudame bien bueno buena buenos buenas busco buscar buscando cerca como con conseguir consigo cual cuales cuando cuanto da dame de decir del desde donde dos e el ella ellos en encontrar entre era es esa ese eso esta este esto estoy favor fue ha hace hacer hay hola hoy la las le les lo los mas me mi mis mismo muy necesito necesitaria ni no nos nosotros o otra otro para pero poco podria por porfa porque puede puedo pues que quien quiero quisiera recomiendas recomienda se sea ser si sin sobre son su sus tal tambien te tengo tiene tienen tienes todo todos tu tus un una unas uno unos usted ustedes va vamos venden vende ver vi y ya yo sucre'.split(
    ' ',
  ),
);
/** Raíz aproximada: quita plurales y diminutivos. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 6 && /(ito|ita|itos|itas|cito|cita)$/.test(w)) w = w.replace(/c?it[oa]s?$/, 'o');
  if (w.length > 4 && w.endsWith('ces')) return w.slice(0, -3) + 'z';
  if (w.length > 4 && /[^aeiou]es$/.test(w) && !/(mes|tres)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !/(is|us)$/.test(w)) return w.slice(0, -1);
  return w;
}
export function words(text: string): string[] {
  return plain(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 1 && !stopwords.has(w) && !/^\d+$/.test(w))
    .map(stem);
}
export const groups = [
  ['torta', 'pastel', 'ponque', 'queque', 'bizcocho', 'reposteria', 'pasteleria', 'cake'],
  ['cupcake', 'magdalena', 'ponquecito', 'reposteria'],
  ['postre', 'dulce', 'reposteria', 'pasteleria', 'merengon', 'flan', 'gelatina'],
  ['pasaboca', 'pasabocas', 'picada', 'bocadillo', 'refrigerio', 'fiambre'],
  [
    'comida',
    'restaurante',
    'almuerzo',
    'almorzar',
    'corrientazo',
    'plato',
    'comida tipica',
    'comer',
    'cenar',
    'cena',
  ],
  ['desayuno', 'cafeteria', 'panaderia', 'arepa', 'empanada'],
  ['arepa', 'arepa de huevo', 'frito', 'friterie', 'buñuelo', 'carimañola'],
  ['cafe', 'cafeteria', 'tinto', 'capuchino'],
  ['pan', 'panaderia', 'pandebono', 'pan de bono'],
  ['hamburguesa', 'comida rapida', 'perro caliente', 'salchipapa'],
  ['pizza', 'pizzeria', 'comida rapida'],
  ['helado', 'heladeria', 'paleta', 'raspado'],
  ['jugo', 'jugueria', 'fruteria', 'batido', 'limonada'],
  ['pescado', 'mariscos', 'mojarra', 'sierra', 'ceviche', 'cazuela', 'pescaderia'],
  ['mote', 'mote de queso', 'sopa', 'sancocho'],
  ['cerveza', 'licoreria', 'bebida', 'licor', 'trago', 'ron', 'aguardiente'],
  ['barberia', 'barbero', 'corte', 'barba', 'cabello', 'pelo', 'peluqueria'],
  ['peluqueria', 'estilista', 'cabello', 'pelo', 'tinte', 'cepillado', 'alisado'],
  ['uña', 'manicure', 'pedicure', 'esmalte', 'acrilico', 'semipermanente'],
  ['maquillaje', 'belleza', 'cosmetico', 'cejas', 'pestañas'],
  ['masaje', 'spa', 'relajacion', 'bienestar', 'facial'],
  ['ropa', 'moda', 'confeccion', 'prenda', 'camisa', 'vestido', 'blusa', 'pantalon', 'boutique'],
  ['zapato', 'calzado', 'tenis', 'sandalia', 'chancla'],
  ['mochila', 'artesania', 'tejido', 'bolso', 'wayuu'],
  ['sombrero', 'vueltiao', 'artesania', 'caña flecha'],
  ['celular', 'telefono movil', 'tecnologia', 'smartphone', 'accesorio'],
  ['computador', 'portatil', 'tecnologia', 'pc'],
  ['reparar', 'reparacion', 'mantenimiento', 'tecnico', 'arreglo', 'arreglar'],
  ['hotel', 'hospedaje', 'hostal', 'cabaña', 'alojamiento', 'dormir', 'habitacion', 'posada'],
  ['playa', 'turismo', 'tour', 'paseo', 'excursion', 'lancha', 'isla'],
  ['medicina', 'farmacia', 'drogueria', 'remedio', 'medicamento'],
  ['doctor', 'medico', 'salud', 'consultorio', 'odontologo', 'dentista'],
  ['perro', 'gato', 'mascota', 'veterinaria', 'concentrado', 'peluqueria canina'],
  ['flor', 'floristeria', 'ramo', 'arreglo floral', 'detalle', 'regalo'],
  ['regalo', 'detalle', 'ancheta', 'desayuno sorpresa', 'sorpresa'],
  ['fiesta', 'evento', 'decoracion', 'sonido', 'cumpleaños', 'boda', 'quince', 'globo'],
  ['foto', 'fotografia', 'fotografo', 'video', 'filmacion', 'sesion'],
  ['clase', 'curso', 'educacion', 'tutoria', 'refuerzo', 'taller', 'capacitacion'],
  ['plomero', 'plomeria', 'fuga', 'tuberia'],
  ['electricista', 'electricidad', 'electrico', 'instalacion electrica'],
  ['cemento', 'ferreteria', 'construccion', 'material', 'bloque', 'varilla'],
  ['pintura', 'pintor', 'ferreteria'],
  ['contador', 'contabilidad', 'impuesto', 'declaracion de renta', 'asesoria contable'],
  ['abogado', 'juridico', 'asesoria legal', 'derecho'],
  ['limpieza', 'aseo', 'domestico', 'lavanderia'],
  ['queso', 'lacteo', 'suero', 'leche', 'quesillo'],
  ['fruta', 'fruteria', 'verdura', 'agro', 'cosecha', 'ñame', 'yuca'],
  ['mueble', 'carpinteria', 'madera', 'decoracion', 'hogar'],
  ['carro', 'moto', 'taller', 'mecanico', 'lavadero', 'repuesto'],
];
export const synonymMap = new Map<string, Set<string>>();
for (const group of groups) {
  const roots = group.map((g) => plain(g).split(/\s+/).map(stem).join(' '));
  for (const r of roots) {
    const set = synonymMap.get(r) ?? new Set<string>();
    for (const other of roots) if (other !== r) set.add(other);
    synonymMap.set(r, set);
  }
}
export function synonymsOf(root: string): string[] {
  return [...(synonymMap.get(root) ?? [])];
}
export function trigrams(word: string): Set<string> {
  const w = `  ${word} `;
  const set = new Set<string>();
  for (let i = 0; i < w.length - 2; i++) set.add(w.slice(i, i + 3));
  return set;
}
/** Parecido entre dos palabras (0 a 1) por trigramas; tolera errores de escritura. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = trigrams(a),
    tb = trigrams(b);
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return (2 * common) / (ta.size + tb.size);
}
export const numberWords: Record<string, number> = {
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  veinticinco: 25,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
};
/** «20 mil», «veinte lucas», «1.5 millones» → número. */
export function readAmount(raw: string, scale?: string): number {
  const t = plain(raw).trim();
  const n = numberWords[t] ?? Number(t.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return NaN;
  const s = plain(scale ?? '');
  if (/^(mil|k|lucas?|barras?)$/.test(s)) return n * 1e3;
  if (/^(millon|millones|palo|palos)$/.test(s)) return n * 1e6;
  return n;
}
