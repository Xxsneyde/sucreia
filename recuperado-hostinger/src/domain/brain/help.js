// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var merchant = ["emprendedor", "admin"];
var everyone = ["cliente", "emprendedor", "admin", "visitante"];
var buyers = ["cliente", "emprendedor", "visitante"];
var topics = [
  {
    roles: everyone,
    keys: [["que es sucreia", "quienes son", "para que sirve", "como funciona sucreia", "que hace sucreia"]],
    answer: {
      text: "SucreIA es el ecosistema digital de emprendimientos de Sucre: aqu\xED encuentras negocios de los 26 municipios, ves sus productos y servicios con precios y fotos, y les compras o reservas directamente. Los emprendedores publican su negocio gratis despu\xE9s de una revisi\xF3n de la administraci\xF3n.",
      cta: { label: "Explorar negocios", href: "/buscar" }
    }
  },
  {
    roles: buyers,
    keys: [["como", "donde", "puedo"], ["compro", "comprar", "hago un pedido", "hacer un pedido", "pido", "carrito", "pagar", "pago"]],
    min: 2,
    answer: {
      text: "Entra al negocio, agrega los productos al carrito y toca \xABComprar por WhatsApp\xBB: se abre el chat del negocio con tu pedido listo. El pago (efectivo, Nequi, transferencia\u2026) y la entrega o el domicilio los acuerdas directamente con el emprendedor.",
      cta: { label: "Ver mis compras", href: "/pedidos" }
    }
  },
  {
    roles: buyers,
    keys: [["como", "donde", "puedo"], ["reservo", "reservar", "agendar", "agendo", "pedir cita", "sacar cita", "cotizar", "cotizacion"]],
    min: 2,
    answer: {
      text: "En los negocios de servicios (barber\xEDas, spa, t\xE9cnicos\u2026) entra a su p\xE1gina y toca \xABReservar\xBB o \xABCotizar\xBB. Eliges el servicio, el d\xEDa y la hora disponibles, y el negocio confirma. Tus reservas quedan en \xABMis reservas\xBB.",
      cta: { label: "Mis reservas", href: "/solicitudes" }
    }
  },
  {
    roles: buyers,
    keys: [["como", "donde", "puedo"], ["califico", "calificar", "valorar", "opinar", "dejar una resena", "dejo una resena", "poner estrellas"]],
    min: 2,
    answer: {
      text: "Puedes calificar un producto que compraste: abre el producto en la p\xE1gina del negocio y, abajo, elige de 1 a 5 estrellas y escribe tu opini\xF3n. Para rese\xF1ar el negocio, ve a su p\xE1gina, pesta\xF1a \xABRese\xF1as\xBB, y toca \xABA\xF1adir rese\xF1a\xBB (solo cuentas de cliente).",
      cta: { label: "Mis compras", href: "/pedidos" }
    }
  },
  {
    roles: ["cliente", "visitante"],
    keys: [["como", "quiero", "puedo", "donde"], ["vender", "montar mi", "registrar mi", "publicar mi", "mi negocio", "mi emprendimiento", "ser emprendedor", "emprender"]],
    min: 2,
    answer: {
      text: "Puedes publicar tu emprendimiento en SucreIA: registras los datos del negocio, el horario, fotos, cat\xE1logo y documentos (c\xE9dula, RUT y certificado bancario). La administraci\xF3n lo revisa y, al aprobarlo, aparece en la plataforma.",
      cta: { label: "Montar mi emprendimiento", href: "/emprender" }
    }
  },
  {
    roles: merchant,
    keys: [
      ["registr", "crear", "nuevo negocio", "otro negocio", "montar"],
      ["negocio", "emprendimiento", "tienda"]
    ],
    min: 2,
    answer: {
      text: "Para registrar un negocio: \xABRegistrar emprendimiento\xBB en el men\xFA. Llenas los datos, el horario, las fotos, el cat\xE1logo y los documentos, y lo env\xEDas. La administraci\xF3n lo revisa y te avisa por notificaci\xF3n.",
      cta: { label: "Registrar emprendimiento", href: "/panel/configurar" }
    }
  },
  {
    roles: merchant,
    keys: [
      ["producto", "servicio", "catalogo", "precio", "foto"],
      ["agreg", "edit", "cambi", "subir", "quit", "borr", "pong", "actualiz"]
    ],
    min: 2,
    answer: {
      text: "Tus productos o servicios se editan desde \xABMis negocios\xBB \u2192 \xABGestionar productos del negocio\xBB. Cada uno lleva nombre, descripci\xF3n, precio, hasta 3 fotos y sus caracter\xEDsticas (tama\xF1o, libras, porciones\u2026). Al terminar, toca \xABPublicar cambios\xBB.",
      cta: { label: "Ir a Mis negocios", href: "/panel/negocios" }
    }
  },
  {
    roles: merchant,
    keys: [
      [
        "dato",
        "nombre",
        "direccion",
        "whatsapp",
        "horario",
        "logo",
        "portada",
        "redes",
        "instagram",
        "facebook",
        "tiktok",
        "descripcion"
      ],
      ["cambi", "edit", "actualiz", "pong", "agreg", "donde"]
    ],
    min: 2,
    answer: {
      text: "Los datos del negocio (nombre, direcci\xF3n, WhatsApp, horario, logo, portada y redes sociales) se cambian en \xABMis negocios\xBB \u2192 \xABGestionar datos del negocio\xBB. Los cambios se guardan solos; luego toca \xABPublicar cambios\xBB.",
      cta: { label: "Ir a Mis negocios", href: "/panel/negocios" }
    }
  },
  {
    roles: merchant,
    keys: [
      [
        "rechaz",
        "revision",
        "aprob",
        "pendiente",
        "estado",
        "demora",
        "cuando aparece",
        "no aparece",
        "publicad"
      ]
    ],
    answer: {
      text: "Cada registro pasa por la revisi\xF3n de la administraci\xF3n. El estado aparece en \xABMis negocios\xBB (En revisi\xF3n, Publicado o Registro rechazado). Si lo rechazaron, el motivo te llega en Notificaciones: corrige lo que te indiquen en \xABGestionar datos del negocio\xBB o en los documentos y vuelve a enviarlo.",
      cta: { label: "Ver mis notificaciones", href: "/notificaciones" }
    }
  },
  {
    roles: merchant,
    keys: [
      ["documento", "rut", "cedula", "camara de comercio", "certificado", "bancario", "legal"]
    ],
    answer: {
      text: "Los documentos son: c\xE9dula, RUT y certificado bancario; la C\xE1mara de Comercio es obligatoria para persona jur\xEDdica y opcional para persona natural. Van en PDF, JPG, PNG o WEBP de m\xE1ximo 4 MB, y solo los ve la administraci\xF3n. Se cambian desde el panel del negocio.",
      cta: { label: "Ir a Mis negocios", href: "/panel/negocios" }
    }
  },
  {
    roles: merchant,
    keys: [
      ["pedido", "venta", "orden", "compra", "reserva", "cita", "solicitud", "cotizacion"],
      ["recib", "ver", "llega", "donde", "mis", "cliente"]
    ],
    min: 2,
    answer: {
      text: "Los pedidos llegan a tu WhatsApp con el carrito del cliente, y quedan anotados en el panel de tu negocio (\xABMis negocios\xBB \u2192 \xABGestionar\xBB). Las reservas y las solicitudes de cotizaci\xF3n est\xE1n en su propio apartado del men\xFA.",
      cta: { label: "Ir a Mis negocios", href: "/panel/negocios" }
    }
  },
  {
    roles: merchant,
    keys: [
      ["promocion", "descuento", "oferta", "resena", "valoracion", "calificacion", "estrella"]
    ],
    answer: {
      text: "En \xABPromociones y rese\xF1as\xBB creas descuentos y ves lo que opinan tus clientes. Cada producto tambi\xE9n tiene su propia valoraci\xF3n, que solo pueden dar quienes lo compraron.",
      cta: { label: "Promociones y rese\xF1as", href: "/panel/descuentos" }
    }
  },
  {
    roles: ["admin"],
    keys: [["aprob", "revis", "rechaz", "registro", "nuevo negocio", "pendiente"]],
    answer: {
      text: "Los registros nuevos est\xE1n en \xABAprobaci\xF3n de negocios\xBB: ah\xED ves los datos, documentos y cat\xE1logo de cada uno, y lo apruebas o rechazas con un motivo que le llega al emprendedor.",
      cta: { label: "Aprobaci\xF3n de negocios", href: "/admin" }
    }
  },
  {
    roles: ["admin"],
    keys: [["export", "excel", "descarg", "reporte", "informe", "listado"]],
    answer: {
      text: "En \xABNegocios aprobados\xBB filtra o marca los negocios que quieras y toca \xABExportar a Excel\xBB: descarga la informaci\xF3n legal (titular, c\xE9dula, tipo de persona, documentos, contacto y estado) de los negocios elegidos.",
      cta: { label: "Negocios aprobados", href: "/admin/negocios" }
    }
  },
  {
    roles: ["admin"],
    keys: [["verific", "insignia", "chulo", "sello"]],
    answer: {
      text: "La insignia de verificado se da al aprobar un registro o desde \xABNegocios aprobados\xBB \u2192 \xABRevisar\xBB. Aparece junto al nombre del negocio en toda la plataforma.",
      cta: { label: "Negocios aprobados", href: "/admin/negocios" }
    }
  },
  {
    roles: ["admin"],
    keys: [["pqrs", "queja", "reclamo", "peticion", "sugerencia", "caso"]],
    answer: {
      text: "Las PQRS est\xE1n en el men\xFA \xABPQRS\xBB, agrupadas por persona y separadas en Pendientes, Casos abiertos y Resueltos. Al responder, la persona recibe una notificaci\xF3n; cuando se resuelve, usa \xABCerrar caso\xBB.",
      cta: { label: "Ir a PQRS", href: "/admin/pqrs" }
    }
  },
  {
    roles: ["cliente", "emprendedor"],
    keys: [["pqrs", "queja", "reclamo", "peticion", "sugerencia", "problema"]],
    answer: {
      text: "Puedes enviar una petici\xF3n, queja, reclamo o sugerencia desde \xABPQRS\xBB. La administraci\xF3n te responde por notificaci\xF3n y puedes contestar en el mismo caso.",
      cta: { label: "Enviar una PQRS", href: "/pqrs" }
    }
  },
  {
    roles: ["cliente", "emprendedor", "visitante"],
    keys: [["contrasena", "clave", "olvide", "recuperar", "entrar", "iniciar sesion", "acceso"]],
    answer: {
      text: "Si olvidaste tu contrase\xF1a, usa \xAB\xBFOlvidaste tu contrase\xF1a?\xBB en la p\xE1gina de ingreso: te llega un enlace al correo que dura 30 minutos. Si entraste con Google, usa otra vez el bot\xF3n de Google.",
      cta: { label: "Recuperar contrase\xF1a", href: "/recuperar" }
    }
  }
];
function answerHelp(question, role) {
  const q = ` ${plain(question)} `;
  let best2;
  for (const topic of topics) {
    if (!topic.roles.includes(role)) continue;
    const points2 = topic.keys.filter((group) => group.some((k) => q.includes(k))).length;
    if (points2 >= (topic.min ?? 1) && (!best2 || points2 > best2.points)) best2 = { points: points2, topic };
  }
  return best2?.topic.answer;
}
