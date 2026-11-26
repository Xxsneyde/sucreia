// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var dayNames2 = [
  [/\bdomingo/, 0],
  [/\blunes/, 1],
  [/\bmartes/, 2],
  [/\bmiercoles/, 3],
  [/\bjueves/, 4],
  [/\bviernes/, 5],
  [/\bsabado/, 6]
];
var ordinals = [
  [/\b(primer[oa]?|1(ro|ra|°|º)?)\b/, 0],
  [/\b(segund[oa]|2(do|da|°|º)?)\b/, 1],
  [/\b(tercer[oa]?|3(ro|ra|°|º)?)\b/, 2],
  [/\b(cuart[oa]|4(to|ta|°|º)?)\b/, 3],
  [/\b(ultim[oa])\b/, 9]
];
var conditionWords = new Set(
  "barato barata baratos baratas economico economica economicos economicas precio precios costo costos cuesta cuestan vale valen valor plata pesos peso mil lucas barra barras millon millones k mejor mejores recomendado recomendada recomendados bueno buenos buenas mejores valorado valorada valorados calificado calificada calificados top caro cara caros caras costoso abierto abierta abiertos abiertas abren abre ahorita ahora hoy manana tarde noche momento domicilio domicilios envio envios llevan entregan entrega casa personas persona gente invitados porciones porcion para cerca cercano cercanos cercana mio mi ubicacion promocion promociones descuento descuentos oferta ofertas verificado verificados verificada reservar reserva reservas cita citas agendar turno cotizar cotizacion presupuesto comprar compro pedir pedido horario horarios hora telefono numero celular whatsapp direccion ubicado ubicada queda donde pago pagos pagar metodo nequi daviplata transferencia efectivo tarjeta productos producto servicios servicio catalogo menu carta que dicen opiniones resenas comentarios instagram facebook tiktok redes otro otra otros otras mas menos lista opciones opcion alguno alguna ver muestrame mostrar dime dame informacion sobre acerca negocio negocios tienda tiendas lugar lugares sitio sitios emprendimiento emprendimientos domingo lunes martes miercoles jueves viernes sabado semana fin dias dia segundo segunda tercero tercera primero primera cuarto cuarta ultimo ultima y tambien igual solo solamente quiero busco necesito algo".split(" ")
);
var ambiguousSubcategories = /* @__PURE__ */ new Set([
  "domicilios",
  "variedades",
  "distribuidoras",
  "recreacion",
  "arquitectura",
  "ingenieria",
  "agricultura",
  "calzado",
  "joyerias"
]);
function understand(question) {
  const q = plain(question).replace(/[¿?¡!.,;:]+/g, " ").replace(/\s+/g, " ").trim();
  const query = {
    terms: [],
    town: "",
    region: "",
    sector: "",
    subcategory: "",
    mode: "",
    delivery: false,
    maxPrice: 0,
    minPrice: 0,
    people: 0,
    openNow: false,
    day: -1,
    sort: "relevance",
    promo: false,
    verified: false,
    near: false
  };
  const base = { query, kind: "search", attribute: null, pick: -1, followUp: false, more: false };
  if (!q) return { ...base, kind: "empty" };
  const count = q.split(" ").length;
  if (count <= 4 && /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|que mas|que hubo|saludos)\b/.test(q))
    return { ...base, kind: "greeting" };
  if (count <= 5 && /\b(gracias|muchas gracias|mil gracias|te agradezco)\b/.test(q)) return { ...base, kind: "thanks" };
  if (count <= 4 && /^(chao|adios|hasta luego|nos vemos|bye)\b/.test(q)) return { ...base, kind: "bye" };
  const placeWords = /* @__PURE__ */ new Set();
  for (const m of [...municipalities].sort((a, b) => b.length - a.length)) {
    const pm = plain(m);
    const hit = m === "Sucre" ? /municipio de sucre|sucre sucre/.test(q) : new RegExp(`\\b${pm}\\b`).test(q);
    if (hit) {
      query.town = m;
      pm.split(" ").forEach((w) => placeWords.add(w));
      break;
    }
  }
  if (!query.town)
    for (const r of subregions) {
      const pr = plain(r.id);
      if (q.includes(pr) || pr.includes("golfo") && /\bgolfo\b/.test(q) || pr.includes("montes") && /\bmontes de maria\b/.test(q)) {
        query.region = r.id;
        pr.split(" ").forEach((w) => placeWords.add(w));
        break;
      }
    }
  if (/\b(cerca de mi|cerca a mi|cercano a mi|por aqui|mas cerca|cerca de donde estoy|a mi alrededor)\b/.test(q)) {
    query.near = true;
    query.sort = "near";
  }
  const qRoots = new Set(q.split(" ").map(stem));
  for (const s of sectors) {
    for (const sub of subcategoriesFor(s.id)) {
      if (ambiguousSubcategories.has(plain(sub))) continue;
      const roots = plain(sub).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !["de", "del", "los", "las", "para", "con", "y"].includes(w)).map(stem);
      if (roots.length && roots.join("").length > 5 && roots.every((r) => qRoots.has(r))) {
        query.subcategory = sub;
        query.sector = s.id;
        break;
      }
    }
    if (query.sector) break;
  }
  if (/\b(reserv|cita|agend|turno|cupo)/.test(q)) query.mode = "booking";
  else if (/\b(cotiz|presupuesto)/.test(q)) query.mode = "quote";
  if (/\b(domicilio|a casa|envio|envian|llevan|me lo traen|entregan|delivery)/.test(q)) query.delivery = true;
  if (/\b(promocion|descuento|oferta|rebaja|en promo)/.test(q)) query.promo = true;
  if (/\bverificad/.test(q)) query.verified = true;
  if (/\b(abierto|abierta|abiertos|abiertas|atienden|atiende|abre|abren)\b.*\b(ahora|ya|ahorita|en este momento|hoy)\b|\b(ahora|ahorita|ya)\b.*\babiert/.test(q) || /\babiertos? ahora\b|\babierto ya\b/.test(q))
    query.openNow = true;
  for (const [re, d] of dayNames2) if (re.test(q)) query.day = d;
  if (/\bfin de semana\b/.test(q)) query.day = 6;
  if (/\b(barat|economic|precio bajo|buen precio|menos caro|mas barat|lo mas barato)/.test(q)) query.sort = "cheap";
  else if (/\b(mejor|recomend|valorad|calificad|top|famos|bueno|buena)/.test(q)) query.sort = "best";
  else if (/\b(caro|costoso|lujo|premium)\b/.test(q)) query.sort = "expensive";
  const between = /entre\s*\$?\s*([\d.,]+|[a-z]+)\s*(mil|k|lucas)?\s*y\s*\$?\s*([\d.,]+|[a-z]+)\s*(mil|k|lucas|millones?)?/.exec(q);
  if (between) {
    const scale = between[2] ?? between[4];
    query.minPrice = readAmount(between[1], scale) || 0;
    query.maxPrice = readAmount(between[3], between[4] ?? scale) || 0;
  } else {
    const max = /(menos de|hasta|maximo|max|no mas de|por debajo de|que no pase de|presupuesto de|tengo)\s*\$?\s*([\d.,]+|[a-z]+)\s*(mil|k|lucas|barras?|millon|millones)?/.exec(q);
    if (max) {
      const n = readAmount(max[2], max[3]);
      if (Number.isFinite(n) && n > 0) query.maxPrice = n < 1e3 && !max[3] ? n * 1e3 : n;
    }
    const min = /(mas de|desde|minimo|por encima de)\s*\$?\s*([\d.,]+|[a-z]+)\s*(mil|k|lucas|millon|millones)?/.exec(q);
    if (min && !/(personas|porciones|invitados)/.test(q.slice(min.index, min.index + 30))) {
      const n = readAmount(min[2], min[3]);
      if (Number.isFinite(n) && n > 0) query.minPrice = n < 1e3 && !min[3] ? n * 1e3 : n;
    }
  }
  const people = /(?:para|de|somos)\s*([\d]{1,3}|[a-z]+)\s*(personas|porciones|invitados|gente|ninos|pax)/.exec(q);
  if (people) {
    const n = readAmount(people[1]);
    if (Number.isFinite(n) && n > 0) query.people = n;
  }
  let attribute = null;
  if (/\b(horario|hora|abre|abren|cierra|cierran|atienden hasta|a que horas?)\b/.test(q) && !query.openNow) attribute = "hours";
  else if (/\b(telefono|numero|celular|llamar|contacto)\b/.test(q)) attribute = "phone";
  else if (/\b(whatsapp|wasap|wpp)\b/.test(q)) attribute = "whatsapp";
  else if (/\b(direccion|donde queda|donde esta|ubicad|como llego|ubicacion)\b/.test(q)) attribute = "address";
  else if (/\b(pago|pagar|nequi|daviplata|transferencia|efectivo|tarjeta)\b/.test(q)) attribute = "payment";
  else if (/\b(que dicen|opinion|resena|comentario|calificacion|estrellas|es bueno|son buenos)\b/.test(q)) attribute = "reviews";
  else if (/\b(instagram|facebook|tiktok|redes)\b/.test(q)) attribute = "social";
  else if (/\b(que (productos|servicios|venden|ofrecen|tienen|hay)|catalogo|menu|carta)\b/.test(q)) attribute = "products";
  else if (/\b(cuanto (cuesta|vale|valen|cuestan|sale|salen)|precio de|que precio)\b/.test(q)) attribute = "price";
  else if (/\b(hace|hacen|tiene|tienen|hay|ofrece|ofrecen)\s+(domicilios?|envios?|entregas?)\b|\b(llevan a|envian a)\b/.test(q)) attribute = "delivery";
  else if (/\b(promocion|descuento|oferta)/.test(q) && /\b(tiene|hay|tienen|alguna|algun)\b/.test(q)) attribute = "promo";
  else if (/\b(que es|quienes son|cuentame de|hablame de|informacion de|info de)\b/.test(q)) attribute = "about";
  let pick2 = -1;
  for (const [re, i] of ordinals) if (re.test(q)) pick2 = i;
  query.terms = q.split(" ").filter(
    (w) => w.length > 1 && !stopwords.has(w) && !conditionWords.has(w) && !placeWords.has(w) && !/^\d+[a-z]*$/.test(w) && !["de", "del", "la", "las", "los", "el", "en"].includes(w)
  ).map(stem);
  const followUp = !query.terms.length && count <= 6 && (/^(y|e|tambien|igual|pero|ahora|mejor|y si|que tal)\b/.test(q) || /\b(mas barat|mas economic|mejor calificad|otr[oa]s?|mas opciones|otra opcion|abiertos?|con domicilio|y en|mas cerca)\b/.test(q) || !!query.town || !!query.region || query.sort !== "relevance" || query.openNow || query.delivery || query.day >= 0 || query.maxPrice > 0);
  const more = /^(mas|otros|otras|ver mas|muestrame mas|mas opciones|siguientes?|algo mas|que mas hay)$/.test(q) || /\b(muestrame mas|ver mas|mas resultados|mas opciones)\b/.test(q);
  return { ...base, attribute, pick: pick2, followUp: followUp || more, more };
}
