// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var definitions = [
  {
    id: "Gastronom\xEDa y Alimentos",
    lines: ["Gastronom\xEDa", "y Alimentos"],
    icon: "utensils",
    color: "#16a34a",
    area: "Gastronom\xEDa"
  },
  {
    id: "Turismo y Hospedaje",
    lines: ["Turismo", "y Hospedaje"],
    icon: "bed",
    color: "#2563eb",
    area: "Turismo"
  },
  {
    id: "Moda y Confecci\xF3n",
    lines: ["Moda", "y Confecci\xF3n"],
    icon: "shirt",
    color: "#9333ea",
    area: "Moda"
  },
  {
    id: "Belleza y Bienestar",
    lines: ["Belleza", "y Bienestar"],
    icon: "flower",
    color: "#db2777",
    area: "Belleza"
  },
  {
    id: "Salud y Farmacia",
    lines: ["Salud", "y Farmacia"],
    icon: "cross",
    color: "#16a34a",
    area: "Salud"
  },
  {
    id: "Tecnolog\xEDa y Digital",
    lines: ["Tecnolog\xEDa", "y Digital"],
    icon: "laptop",
    color: "#2563eb",
    area: "Servicios"
  },
  {
    id: "Construcci\xF3n y Ferreter\xEDa",
    lines: ["Construcci\xF3n", "y Ferreter\xEDa"],
    icon: "hardhat",
    color: "#ea580c",
    area: "Servicios"
  },
  {
    id: "Agro y Agroindustria",
    lines: ["Agro y", "Agroindustria"],
    icon: "sprout",
    color: "#16a34a",
    area: "Otro"
  },
  {
    id: "Servicios Profesionales",
    lines: ["Servicios", "Profesionales"],
    icon: "briefcase",
    color: "#9333ea",
    area: "Servicios"
  },
  {
    id: "Comercio y tiendas",
    lines: ["Comercio", "y tiendas"],
    icon: "store",
    color: "#0891b2",
    area: "Otro"
  },
  {
    id: "Transporte y log\xEDstica",
    lines: ["Transporte", "y log\xEDstica"],
    icon: "truck",
    color: "#475569",
    area: "Servicios"
  },
  {
    id: "Fotograf\xEDa y producci\xF3n audiovisual",
    lines: ["Fotograf\xEDa", "y producci\xF3n audiovisual"],
    icon: "camera",
    color: "#7c3aed",
    area: "Servicios"
  },
  {
    id: "Florister\xEDas y regalos",
    lines: ["Florister\xEDas", "y regalos"],
    icon: "gift",
    color: "#db2777",
    area: "Artesan\xEDas"
  },
  {
    id: "Mascotas y animales",
    lines: ["Mascotas", "y animales"],
    icon: "paw",
    color: "#b45309",
    area: "Otro"
  },
  {
    id: "Bebidas y licorer\xEDas",
    lines: ["Bebidas", "y licorer\xEDas"],
    icon: "wine",
    color: "#be123c",
    area: "Gastronom\xEDa"
  },
  {
    id: "Decoraci\xF3n y art\xEDculos para el hogar",
    lines: ["Decoraci\xF3n", "y art\xEDculos para el hogar"],
    icon: "sofa",
    color: "#0d9488",
    area: "Artesan\xEDas"
  },
  {
    id: "Eventos y entretenimiento",
    lines: ["Eventos", "y entretenimiento"],
    icon: "party",
    color: "#ea580c",
    area: "Servicios"
  },
  {
    id: "Educaci\xF3n y formaci\xF3n",
    lines: ["Educaci\xF3n", "y formaci\xF3n"],
    icon: "graduation",
    color: "#1d4ed8",
    area: "Servicios"
  },
  {
    id: "Servicios personales y dom\xE9sticos",
    lines: ["Servicios", "personales y dom\xE9sticos"],
    icon: "spray",
    color: "#4d7c0f",
    area: "Servicios"
  },
  {
    id: "Otros Sectores",
    lines: ["Otros", "Sectores"],
    icon: "more",
    color: "#475569",
    area: "Otro"
  }
];
var sectors = definitions.map((s) => ({
  ...s,
  id: sentenceCase(s.id),
  lines: [s.lines[0], s.lines[1].toLocaleLowerCase("es")]
}));
var legacy = {
  Gastronom\u00EDa: "Gastronom\xEDa y Alimentos",
  Turismo: "Turismo y Hospedaje",
  Moda: "Moda y Confecci\xF3n",
  Artesan\u00EDas: "Moda y Confecci\xF3n",
  Belleza: "Belleza y Bienestar",
  Salud: "Salud y Farmacia",
  Servicios: "Servicios Profesionales",
  Otro: "Otros Sectores"
};
function sectorFor(category) {
  const id = Object.hasOwn(legacy, category) ? legacy[category] : category;
  return sectors.find((s) => sentenceCase(s.id) === sentenceCase(id)) ?? sectors[sectors.length - 1];
}
var subregions = [
  {
    id: "Golfo de Morrosquillo",
    color: "#8b5cf6",
    municipalities: ["Cove\xF1as", "Palmito", "San Onofre", "Santiago de Tol\xFA", "Tol\xFA Viejo"]
  },
  {
    id: "Sabanas",
    color: "#f59e0b",
    municipalities: [
      "Buenavista",
      "Corozal",
      "El Roble",
      "Galeras",
      "Los Palmitos",
      "Sampu\xE9s",
      "San Juan de Betulia",
      "San Pedro",
      "Sinc\xE9"
    ]
  },
  {
    id: "Montes de Mar\xEDa",
    color: "#3b82f6",
    municipalities: ["Chal\xE1n", "Colos\xF3", "Morroa", "Ovejas", "Sincelejo"]
  },
  {
    id: "Mojana",
    color: "#22c55e",
    municipalities: ["Guaranda", "Majagual", "Sucre"]
  },
  {
    id: "San Jorge",
    color: "#ec4899",
    municipalities: ["Caimito", "La Uni\xF3n", "San Benito Abad", "San Marcos"]
  }
];
var municipalities = subregions.flatMap((s) => s.municipalities).sort((a, b) => a.localeCompare(b, "es"));
var aliases = {
  Toluviejo: "Tol\xFA Viejo",
  "San Antonio de Palmito": "Palmito",
  Tol\u00FA: "Santiago de Tol\xFA",
  "San Benito": "San Benito Abad"
};
function subregionFor(municipality) {
  const name = aliases[municipality.trim()] ?? municipality.trim();
  return subregions.find((s) => s.municipalities.includes(name)) ?? null;
}
function sentenceCase(value) {
  const text2 = value.trim().toLocaleLowerCase("es");
  return text2.charAt(0).toLocaleUpperCase("es") + text2.slice(1);
}
function sectorArtwork(category) {
  const key = sentenceCase(sectorFor(category).id);
  if (!Object.hasOwn(catalog, key)) return "/art/service.svg";
  const slug = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replaceAll(" ", "-");
  return "/art/sectores/" + slug + ".svg";
}
function subcategoriesFor(category) {
  return catalog[sentenceCase(sectorFor(category).id)] ?? [];
}
