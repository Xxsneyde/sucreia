// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
function generateContent(area, name, municipality, description = "") {
  const c = area.copy;
  const f = (t) => fill(t, name, municipality);
  const art = `/art/${area.theme}.svg`;
  return {
    heroTitle: f(c.heroTitle),
    heroText: f(c.heroText),
    heroImage: art,
    catalogTitle: f(c.catalogTitle),
    catalogText: f(c.catalogText),
    storyTitle: f(c.storyTitle),
    // La historia propia del emprendedor tiene prioridad sobre el texto de ejemplo.
    storyText: description.trim() || f(c.storyText),
    storyImage: art,
    promises: [...c.promises],
    contactTitle: f(c.contactTitle),
    contactText: f(c.contactText)
  };
}
function publicationErrors(d) {
  const errors = [];
  if (!d.name.trim()) errors.push("Escribe el nombre de tu negocio.");
  if (!d.municipality.trim()) errors.push("Indica tu municipio.");
  if (d.products.length < 3) errors.push("Agrega al menos tres productos o servicios.");
  if (d.products.some((p) => !p.name.trim() || !Number.isSafeInteger(p.price) || p.price < 0))
    errors.push("Revisa los nombres y precios del cat\xE1logo.");
  if (new Set(d.products.map((p) => p.id)).size !== d.products.length)
    errors.push("Los productos deben tener identificadores distintos.");
  if (!d.content.heroTitle.trim()) errors.push("Escribe el t\xEDtulo principal de tu p\xE1gina.");
  if (d.whatsapp && !/^\+?[1-9]\d{9,14}$/.test(d.whatsapp))
    errors.push("El WhatsApp debe incluir c\xF3digo de pa\xEDs y solo n\xFAmeros.");
  return errors;
}
function publishProject(project, at = (/* @__PURE__ */ new Date()).toISOString()) {
  const errors = publicationErrors(project.draft);
  if (errors.length) throw new Error(errors.join(" "));
  const version = {
    id: crypto.randomUUID(),
    at,
    design: structuredClone(project.draft)
  };
  return {
    ...project,
    published: version,
    versions: [version, ...project.versions].slice(0, 8),
    updatedAt: at
  };
}
function toBusiness(p) {
  if (!p.published) return null;
  const d = p.published.design;
  return {
    id: p.id,
    name: d.name,
    category: d.category,
    subcategory: d.subcategory,
    municipality: d.municipality,
    description: d.description || d.content.heroText,
    mode: d.mode,
    theme: areaFor(d.category).theme,
    verified: false,
    completed365: 0,
    rating: 0,
    whatsapp: d.whatsapp || null,
    products: d.products,
    local: true,
    cover: d.content.heroImage,
    logo: d.logo,
    address: d.address,
    hours: d.hours,
    minPrice: d.products.length ? Math.min(...d.products.map((x) => x.price)) : 0
  };
}
function registrationErrors(d) {
  const real = (src) => !!src && !src.startsWith("/art/");
  const errors = [];
  if (!d.name.trim()) errors.push("Falta el nombre del negocio.");
  if (!d.address.trim()) errors.push("Falta la direcci\xF3n del negocio.");
  if (!/^\+?[1-9]\d{9,14}$/.test(d.whatsapp))
    errors.push("Falta un WhatsApp v\xE1lido con c\xF3digo de pa\xEDs.");
  if (!real(d.logo)) errors.push("Falta el logo.");
  if (!real(d.content.heroImage)) errors.push("Falta la foto de portada.");
  if (d.products.length < 3) errors.push("Agrega al menos tres productos o servicios.");
  if (d.products.some((p) => !p.description.trim()))
    errors.push("Cada producto o servicio necesita una descripci\xF3n.");
  if (d.products.some((p) => !real(p.image)))
    errors.push("Cada producto o servicio necesita su foto.");
  if (d.mode !== "quote" && d.products.some((p) => !(p.price > 0)))
    errors.push("Cada producto o servicio necesita su precio.");
  return errors;
}
function businessHref(id) {
  return `/tienda?id=${encodeURIComponent(id)}`;
}
var sectorImages = new Set(sectors.map((s) => sectorArtwork(s.id)));
function validImage(value) {
  return typeof value === "string" && value.length < 15e5 && (value === "" || sectorImages.has(value) || /^\/art\/(craft|food|beauty|service|hero)\.svg$/.test(value) || /^\/api\/imagenes\/[a-f0-9]{64}\.webp$/.test(value) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value));
}
function record(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function short(v, max = 5e3) {
  return typeof v === "string" && v.length <= max;
}
function isContent(v) {
  if (!record(v)) return false;
  return ["heroTitle", "catalogTitle", "storyTitle", "contactTitle"].every((k) => short(v[k], 300)) && ["heroText", "catalogText", "storyText", "contactText"].every((k) => short(v[k])) && validImage(v.heroImage) && validImage(v.storyImage) && Array.isArray(v.promises) && v.promises.length <= 6 && v.promises.every((p) => short(p, 120));
}
function isDesign(v) {
  if (!record(v) || !["products", "booking", "quote"].includes(String(v.mode)) || !styleIds.includes(v.style) || !record(v.colors))
    return false;
  if (!["name", "category", "municipality", "description", "whatsapp", "address", "hours"].every(
    (k) => short(v[k])
  ) || v.subcategory !== void 0 && v.subcategory !== "" && (typeof v.subcategory !== "string" || !subcategoriesFor(String(v.category)).includes(v.subcategory)) || !["phone", "email", "instagram", "facebook", "tiktok"].every(
    (k) => v[k] === void 0 || short(v[k], 200)
  ))
    return false;
  if (!["primary", "background", "text", "accent"].every(
    (k) => typeof v.colors[k] === "string" && /^#[a-f\d]{6}$/i.test(String(v.colors[k]))
  ))
    return false;
  if (!validImage(v.logo) || !isContent(v.content)) return false;
  if (!Array.isArray(v.products) || v.products.length > 60 || !v.products.every(
    (p) => record(p) && short(p.id, 100) && short(p.name, 160) && short(p.description) && typeof p.price === "number" && Number.isFinite(p.price) && p.price >= 0 && p.price <= 1e9 && validImage(p.image) && (p.category === void 0 || short(p.category, 60)) && (p.gallery === void 0 || Array.isArray(p.gallery) && p.gallery.length <= 2 && p.gallery.every((g) => g !== "" && validImage(g))) && (p.details === void 0 || Array.isArray(p.details) && p.details.length <= 8 && p.details.every((d) => record(d) && short(d.label, 60) && short(d.value, 300))) && (p.duration === void 0 || typeof p.duration === "number" && Number.isInteger(p.duration) && p.duration >= 10 && p.duration <= 480)
  ))
    return false;
  return new Set(v.products.map((p) => p.id)).size === v.products.length;
}
var legacyStyle = {
  raices: "organico",
  sabor: "retro",
  alma: "elegante",
  pulso: "moderno"
};
function upgradeDesign(v) {
  if (!record(v) || "content" in v || !Array.isArray(v.blocks)) return v;
  const blocks = v.blocks.filter(record);
  const block = (kind) => blocks.find((b) => b.kind === kind);
  const area = areaFor(String(v.category ?? ""));
  const base = generateContent(area, String(v.name ?? ""), String(v.municipality ?? ""));
  const text2 = (b, key, fallback) => b && typeof b[key] === "string" && b[key] ? b[key] : fallback;
  const benefits = block("benefits");
  const promises = benefits ? String(benefits.text ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 3) : [];
  const { blocks: _blocks, template, font: _font, radius: _radius, spacing: _spacing, ...rest } = v;
  return {
    ...rest,
    style: legacyStyle[String(template)] ?? area.choices[0].style,
    content: {
      heroTitle: text2(block("hero"), "title", base.heroTitle),
      heroText: text2(block("hero"), "text", base.heroText),
      heroImage: text2(block("hero"), "image", base.heroImage),
      catalogTitle: text2(block("catalog"), "title", base.catalogTitle),
      catalogText: text2(block("catalog"), "text", base.catalogText),
      storyTitle: text2(block("story"), "title", base.storyTitle),
      storyText: text2(block("story"), "text", base.storyText),
      storyImage: text2(block("story"), "image", base.storyImage),
      promises: promises.length === 3 ? promises : base.promises,
      contactTitle: text2(block("contact"), "title", base.contactTitle),
      contactText: text2(block("contact"), "text", base.contactText)
    }
  };
}
