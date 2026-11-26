// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var styleIds = [
  "minimalista",
  "brutalista",
  "editorial",
  "organico",
  "elegante",
  "moderno",
  "retro"
];
var sans = 'system-ui, -apple-system, "Segoe UI", sans-serif';
var serif = 'Georgia, "Times New Roman", serif';
var styles = {
  minimalista: {
    id: "minimalista",
    name: "Minimalista",
    description: "Espacio, orden y nada que distraiga. Transmite claridad y seriedad.",
    fonts: {
      heading: `"DM Sans Variable", ${sans}`,
      body: `"DM Sans Variable", ${sans}`,
      label: "DM Sans"
    },
    radius: 4,
    spacing: 1.15
  },
  brutalista: {
    id: "brutalista",
    name: "Brutalista",
    description: "Bordes gruesos, contraste alto y mucha personalidad. Imposible de ignorar.",
    fonts: {
      heading: `"Archivo Black", ${sans}`,
      body: `"Space Grotesk Variable", ${sans}`,
      label: "Archivo Black + Space Grotesk"
    },
    radius: 0,
    spacing: 1
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Como una revista: t\xEDtulos con car\xE1cter y una historia bien contada.",
    fonts: {
      heading: `"Fraunces Variable", ${serif}`,
      body: `"Inter Variable", ${sans}`,
      label: "Fraunces + Inter"
    },
    radius: 2,
    spacing: 1.1
  },
  organico: {
    id: "organico",
    name: "Org\xE1nico",
    description: "Formas suaves y tonos de la tierra. Cercano, c\xE1lido y artesanal.",
    fonts: {
      heading: `"Young Serif", ${serif}`,
      body: `"Nunito Sans Variable", ${sans}`,
      label: "Young Serif + Nunito Sans"
    },
    radius: 28,
    spacing: 1.05
  },
  elegante: {
    id: "elegante",
    name: "Elegante",
    description: "Detalles finos y mucho aire. Para marcas que cuidan cada detalle.",
    fonts: {
      heading: `"Cormorant Garamond Variable", ${serif}`,
      body: `"Jost Variable", ${sans}`,
      label: "Cormorant Garamond + Jost"
    },
    radius: 0,
    spacing: 1.2
  },
  moderno: {
    id: "moderno",
    name: "Moderno",
    description: "Profesional y directo, con la informaci\xF3n siempre a la vista.",
    fonts: {
      heading: `"Manrope Variable", ${sans}`,
      body: `"Manrope Variable", ${sans}`,
      label: "Manrope"
    },
    radius: 14,
    spacing: 1
  },
  retro: {
    id: "retro",
    name: "Retro",
    description: "Con aire de tienda de barrio de toda la vida: alegre y memorable.",
    fonts: {
      heading: `"Abril Fatface", ${serif}`,
      body: `"Work Sans Variable", ${sans}`,
      label: "Abril Fatface + Work Sans"
    },
    radius: 10,
    spacing: 1
  }
};
var areas = [
  {
    id: "Artesan\xEDas",
    theme: "craft",
    mode: "products",
    products: [
      { name: "Bolso de ca\xF1a flecha", description: "Tejido a mano, color natural.", price: 85e3 },
      { name: "Sombrero vueltiao", description: "Tradici\xF3n que se lleva puesta.", price: 12e4 },
      { name: "Canasto de iraca", description: "Una pieza \xFAnica para tu hogar.", price: 45e3 }
    ],
    copy: {
      heroTitle: "Hecho a mano,\nhecho para durar.",
      heroText: "Piezas tejidas en {municipio} con fibras naturales y la paciencia de quien conoce su oficio.",
      catalogTitle: "Piezas de la colecci\xF3n",
      catalogText: "Cada pieza es \xFAnica: puede variar un poco en color y forma.",
      storyTitle: "Detr\xE1s de cada pieza",
      storyText: "En {nombre} trabajamos con t\xE9cnicas que pasan de generaci\xF3n en generaci\xF3n. Comprarnos es apoyar el talento de Sucre.",
      promises: [
        "Hecho a mano en Sucre",
        "Precios claros en pesos",
        "Hablas directo con quien lo hace"
      ],
      contactTitle: "Vis\xEDtanos o escr\xEDbenos",
      contactText: "Te contamos c\xF3mo se hace cada pieza y te ayudamos a elegir."
    },
    choices: [
      {
        style: "organico",
        colors: { primary: "#3d5a3c", background: "#f7f1e6", text: "#2b2a22", accent: "#e4d3b4" }
      },
      {
        style: "editorial",
        colors: { primary: "#8a3b1f", background: "#fbf8f2", text: "#1f1b16", accent: "#efe3cf" }
      },
      {
        style: "minimalista",
        colors: { primary: "#1d1d1b", background: "#ffffff", text: "#1d1d1b", accent: "#f2eee7" }
      }
    ]
  },
  {
    id: "Gastronom\xEDa",
    theme: "food",
    mode: "products",
    products: [
      {
        name: "Torta artesanal",
        description: "Para celebrar, por porci\xF3n o entera.",
        price: 45e3
      },
      { name: "Caja de cupcakes", description: "Seis unidades, sabores surtidos.", price: 35e3 },
      { name: "Pasabocas surtidos", description: "Bandeja para compartir.", price: 6e4 }
    ],
    copy: {
      heroTitle: "Sabor de casa,\nhecho hoy.",
      heroText: "Preparamos todo al momento en {municipio}, con ingredientes frescos y recetas propias.",
      catalogTitle: "Nuestro men\xFA",
      catalogText: "Haz tu pedido y te avisamos cuando est\xE9 listo.",
      storyTitle: "Cocinamos como en casa",
      storyText: "{nombre} naci\xF3 en una cocina familiar. Hoy seguimos cocinando igual: con calma, con cari\xF1o y sin atajos.",
      promises: ["Preparado el mismo d\xEDa", "Ingredientes frescos", "Precios claros en pesos"],
      contactTitle: "Haz tu pedido",
      contactText: "Escr\xEDbenos para pedidos especiales, eventos y celebraciones."
    },
    choices: [
      {
        style: "retro",
        colors: { primary: "#b8321b", background: "#fff5e1", text: "#2a1a12", accent: "#f2b84b" }
      },
      {
        style: "organico",
        colors: { primary: "#7a4b23", background: "#fbf3e8", text: "#2e2117", accent: "#ecd2ae" }
      },
      {
        style: "brutalista",
        colors: { primary: "#c2410c", background: "#fffdf5", text: "#111111", accent: "#ffd23f" }
      }
    ]
  },
  {
    id: "Belleza",
    theme: "beauty",
    mode: "booking",
    products: [
      { name: "Corte y estilo", description: "Asesor\xEDa, lavado y peinado.", price: 35e3 },
      { name: "Manicure y pedicure", description: "Cuidado completo con esmaltado.", price: 4e4 },
      { name: "Peinado de ocasi\xF3n", description: "Para bodas, grados y eventos.", price: 7e4 }
    ],
    copy: {
      heroTitle: "Un momento\nsolo para ti.",
      heroText: "Atenci\xF3n con cita en {municipio}, sin afanes y con productos de calidad.",
      catalogTitle: "Servicios",
      catalogText: "Elige tu servicio y reserva el d\xEDa que prefieras.",
      storyTitle: "Te cuidamos de verdad",
      storyText: "En {nombre} creemos que sentirse bien empieza por ser escuchado. Cada cita es a tu ritmo.",
      promises: [
        "Atenci\xF3n con cita",
        "Herramientas desinfectadas",
        "Precios claros antes de empezar"
      ],
      contactTitle: "Reserva tu cita",
      contactText: "Te confirmamos la disponibilidad y te esperamos."
    },
    choices: [
      {
        style: "elegante",
        colors: { primary: "#7d5a44", background: "#faf6f1", text: "#2a2320", accent: "#ebe0d3" }
      },
      {
        style: "minimalista",
        colors: { primary: "#2b2b2b", background: "#ffffff", text: "#222222", accent: "#f6ebe8" }
      },
      {
        style: "editorial",
        colors: { primary: "#963a58", background: "#fdf8f6", text: "#2a1d22", accent: "#f3e1e6" }
      }
    ]
  },
  {
    id: "Servicios",
    theme: "service",
    mode: "quote",
    products: [
      { name: "Mantenimiento", description: "Revisi\xF3n y ajuste preventivo.", price: 0 },
      { name: "Instalaci\xF3n", description: "Montaje con materiales garantizados.", price: 0 },
      { name: "Diagn\xF3stico", description: "Revisamos y te explicamos qu\xE9 hacer.", price: 0 }
    ],
    copy: {
      heroTitle: "Trabajo bien hecho,\na la primera.",
      heroText: "Cu\xE9ntanos qu\xE9 necesitas en {municipio} y te enviamos una propuesta clara, sin sorpresas.",
      catalogTitle: "Lo que hacemos",
      catalogText: "Cada trabajo empieza con una cotizaci\xF3n sin compromiso.",
      storyTitle: "As\xED trabajamos",
      storyText: "En {nombre} cumplimos lo que acordamos: precio, tiempo y limpieza. Si algo cambia, te avisamos antes.",
      promises: [
        "Cotizaci\xF3n sin compromiso",
        "Precio acordado antes de empezar",
        "Respondemos el mismo d\xEDa"
      ],
      contactTitle: "Pide tu cotizaci\xF3n",
      contactText: "Describe el trabajo y te respondemos con una propuesta."
    },
    choices: [
      {
        style: "moderno",
        colors: { primary: "#1f5fbf", background: "#f6f8fb", text: "#142133", accent: "#dce8f8" }
      },
      {
        style: "brutalista",
        colors: { primary: "#2341e6", background: "#f4f1ea", text: "#0f0f0f", accent: "#ffe14d" }
      },
      {
        style: "minimalista",
        colors: { primary: "#0f3d3e", background: "#ffffff", text: "#121212", accent: "#edf3f2" }
      }
    ]
  },
  {
    id: "Moda",
    theme: "beauty",
    mode: "products",
    products: [
      { name: "Vestido de lino", description: "Fresco, tallas S a XL.", price: 14e4 },
      { name: "Camisa bordada", description: "Bordado a mano, algod\xF3n.", price: 95e3 },
      {
        name: "Sandalias de cuero",
        description: "Hechas en Sucre, tallas 35 a 41.",
        price: 11e4
      }
    ],
    copy: {
      heroTitle: "Ropa con\nidentidad propia.",
      heroText: "Dise\xF1amos y confeccionamos en {municipio} prendas pensadas para el clima y para durar.",
      catalogTitle: "Nueva colecci\xF3n",
      catalogText: "Preg\xFAntanos por tallas y colores disponibles.",
      storyTitle: "Hecho aqu\xED, con criterio",
      storyText: "{nombre} es moda local: telas escogidas, costuras cuidadas y piezas que no vas a ver en todas partes.",
      promises: ["Confecci\xF3n local", "Asesor\xEDa de tallas", "Precios claros en pesos"],
      contactTitle: "Escr\xEDbenos",
      contactText: "Te ayudamos con tallas, medidas y apartados."
    },
    choices: [
      {
        style: "editorial",
        colors: { primary: "#111111", background: "#f7f4ef", text: "#111111", accent: "#e8ded2" }
      },
      {
        style: "brutalista",
        colors: { primary: "#d6002a", background: "#ffffff", text: "#0a0a0a", accent: "#ffc2d9" }
      },
      {
        style: "elegante",
        colors: { primary: "#c9a46a", background: "#151413", text: "#f2ede4", accent: "#2a2724" }
      }
    ]
  },
  {
    id: "Turismo",
    theme: "service",
    mode: "booking",
    products: [
      {
        name: "Tour por el Golfo",
        description: "D\xEDa completo, transporte incluido.",
        price: 18e4
      },
      { name: "Ruta gastron\xF3mica", description: "Medio d\xEDa con degustaciones.", price: 9e4 },
      { name: "Paseo en lancha", description: "Dos horas, chaleco incluido.", price: 75e3 }
    ],
    copy: {
      heroTitle: "Conoce Sucre\ncon quien lo vive.",
      heroText: "Recorridos desde {municipio} con gu\xEDas locales, grupos peque\xF1os y salidas confirmadas.",
      catalogTitle: "Experiencias",
      catalogText: "Reserva la fecha y te confirmamos cupo y punto de encuentro.",
      storyTitle: "Gu\xEDas de aqu\xED",
      storyText: "En {nombre} te mostramos los lugares que nos gustan, con respeto por la comunidad y la naturaleza.",
      promises: ["Gu\xEDas locales", "Grupos peque\xF1os", "Confirmaci\xF3n antes de pagar"],
      contactTitle: "Planea tu salida",
      contactText: "Cu\xE9ntanos fecha y n\xFAmero de personas."
    },
    choices: [
      {
        style: "organico",
        colors: { primary: "#1f6f5c", background: "#f4f8f2", text: "#1c2b26", accent: "#d3e6d7" }
      },
      {
        style: "editorial",
        colors: { primary: "#0d5c75", background: "#fbf8f1", text: "#13232a", accent: "#f2e3c4" }
      },
      {
        style: "moderno",
        colors: { primary: "#00707f", background: "#f5fafb", text: "#10262b", accent: "#d2eef1" }
      }
    ]
  },
  {
    id: "Salud",
    theme: "service",
    mode: "booking",
    products: [
      { name: "Consulta general", description: "Valoraci\xF3n y recomendaciones.", price: 6e4 },
      { name: "Terapia f\xEDsica", description: "Sesi\xF3n de 45 minutos.", price: 55e3 },
      {
        name: "Control de seguimiento",
        description: "Para pacientes con tratamiento.",
        price: 4e4
      }
    ],
    copy: {
      heroTitle: "Atenci\xF3n cercana\ny responsable.",
      heroText: "Consultas con cita en {municipio}. Te explicamos todo con calma y en palabras claras.",
      catalogTitle: "Servicios",
      catalogText: "Reserva tu cita; te confirmamos el horario.",
      storyTitle: "Tu bienestar primero",
      storyText: "En {nombre} atendemos con tiempo, escuchamos y te acompa\xF1amos durante todo el proceso.",
      promises: ["Atenci\xF3n con cita", "Informaci\xF3n clara", "Precios claros antes de la consulta"],
      contactTitle: "Agenda tu cita",
      contactText: "Escr\xEDbenos y te ayudamos a encontrar un horario."
    },
    choices: [
      {
        style: "moderno",
        colors: { primary: "#11796b", background: "#f6faf9", text: "#12302b", accent: "#d6eee9" }
      },
      {
        style: "minimalista",
        colors: { primary: "#1e4f7a", background: "#ffffff", text: "#14202b", accent: "#edf3f8" }
      },
      {
        style: "organico",
        colors: { primary: "#4a7345", background: "#f6f8f1", text: "#222d20", accent: "#dde8cf" }
      }
    ]
  },
  {
    id: "Otro",
    theme: "craft",
    mode: "products",
    products: [
      {
        name: "Producto destacado",
        description: "Describe aqu\xED tu producto principal.",
        price: 5e4
      },
      { name: "Segundo producto", description: "Cuenta qu\xE9 lo hace especial.", price: 35e3 },
      { name: "Tercer producto", description: "Agrega una foto propia.", price: 25e3 }
    ],
    copy: {
      heroTitle: "Talento de Sucre,\ncerca de ti.",
      heroText: "Un emprendimiento de {municipio} hecho con dedicaci\xF3n y atenci\xF3n personal.",
      catalogTitle: "Lo que ofrecemos",
      catalogText: "Preg\xFAntanos lo que necesites antes de pedir.",
      storyTitle: "Qui\xE9nes somos",
      storyText: "{nombre} es un emprendimiento local. Nos importa hacer bien las cosas y atenderte como te gustar\xEDa.",
      promises: ["Emprendimiento local", "Atenci\xF3n personal", "Precios claros en pesos"],
      contactTitle: "Hablemos",
      contactText: "Escr\xEDbenos y te respondemos lo antes posible."
    },
    choices: [
      {
        style: "minimalista",
        colors: { primary: "#222222", background: "#ffffff", text: "#1b1b1b", accent: "#f1f1ee" }
      },
      {
        style: "moderno",
        colors: { primary: "#3949ab", background: "#f6f7fb", text: "#161a33", accent: "#dfe3f6" }
      },
      {
        style: "editorial",
        colors: { primary: "#7a3e2a", background: "#fbf8f3", text: "#1e1a16", accent: "#ece2d2" }
      }
    ]
  }
];
var areaNames = areas.map((a) => a.id);
function areaFor(category) {
  return areas.find((a) => a.id === category) ?? areas.find((a) => a.id === sectorFor(category).area) ?? areas[areas.length - 1];
}
function fill(text2, name, municipality) {
  return text2.replaceAll("{nombre}", name.trim() || "nuestro negocio").replaceAll("{municipio}", municipality.trim() || "Sucre");
}
