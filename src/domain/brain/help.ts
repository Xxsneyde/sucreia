import { plain } from './text.ts';
import type { BrainRole, Reply } from './types.ts';

interface HelpTopic {
  roles: BrainRole[];
  /** Grupos de frases: cada grupo con alguna coincidencia suma un punto. */
  keys: string[][];
  /** Puntos necesarios (1 si falta). */
  min?: number;
  answer: Reply;
}

export const merchant: BrainRole[] = ['emprendedor', 'admin'];
export const everyone: BrainRole[] = ['cliente', 'emprendedor', 'admin', 'visitante'];
export const buyers: BrainRole[] = ['cliente', 'emprendedor', 'visitante'];
/** Ayuda sobre cómo usar SucreIA, según el rol de quien pregunta. */
export const topics: HelpTopic[] = [
  {
    roles: everyone,
    keys: [
      [
        'que es sucreia',
        'quienes son',
        'para que sirve',
        'como funciona sucreia',
        'que hace sucreia',
      ],
    ],
    answer: {
      text: 'SucreIA es el ecosistema digital de emprendimientos de Sucre: aquí encuentras negocios de los 26 municipios, ves sus productos y servicios con precios y fotos, y les compras o reservas directamente. Los emprendedores publican su negocio gratis después de una revisión de la administración.',
      cta: { label: 'Explorar negocios', href: '/buscar' },
    },
  },
  {
    roles: buyers,
    keys: [
      ['como', 'donde', 'puedo'],
      [
        'compro',
        'comprar',
        'hago un pedido',
        'hacer un pedido',
        'pido',
        'carrito',
        'pagar',
        'pago',
      ],
    ],
    min: 2,
    answer: {
      text: 'Entra al negocio, agrega los productos al carrito y toca «Comprar por WhatsApp»: se abre el chat del negocio con tu pedido listo. El pago (efectivo, Nequi, transferencia…) y la entrega o el domicilio los acuerdas directamente con el emprendedor.',
      cta: { label: 'Ver mis compras', href: '/pedidos' },
    },
  },
  {
    roles: buyers,
    keys: [
      ['como', 'donde', 'puedo'],
      [
        'reservo',
        'reservar',
        'agendar',
        'agendo',
        'pedir cita',
        'sacar cita',
        'cotizar',
        'cotizacion',
      ],
    ],
    min: 2,
    answer: {
      text: 'En los negocios de servicios (barberías, spa, técnicos…) entra a su página y toca «Reservar» o «Cotizar». Eliges el servicio, el día y la hora disponibles, y el negocio confirma. Tus reservas quedan en «Mis reservas».',
      cta: { label: 'Mis reservas', href: '/solicitudes' },
    },
  },
  {
    roles: buyers,
    keys: [
      ['como', 'donde', 'puedo'],
      [
        'califico',
        'calificar',
        'valorar',
        'opinar',
        'dejar una resena',
        'dejo una resena',
        'poner estrellas',
      ],
    ],
    min: 2,
    answer: {
      text: 'Puedes calificar un producto que compraste: abre el producto en la página del negocio y, abajo, elige de 1 a 5 estrellas y escribe tu opinión. Para reseñar el negocio, ve a su página, pestaña «Reseñas», y toca «Añadir reseña» (solo cuentas de cliente).',
      cta: { label: 'Mis compras', href: '/pedidos' },
    },
  },
  {
    roles: ['cliente', 'visitante'],
    keys: [
      ['como', 'quiero', 'puedo', 'donde'],
      [
        'vender',
        'montar mi',
        'registrar mi',
        'publicar mi',
        'mi negocio',
        'mi emprendimiento',
        'ser emprendedor',
        'emprender',
      ],
    ],
    min: 2,
    answer: {
      text: 'Puedes publicar tu emprendimiento en SucreIA: registras los datos del negocio, el horario, fotos, catálogo y documentos (cédula, RUT y certificado bancario). La administración lo revisa y, al aprobarlo, aparece en la plataforma.',
      cta: { label: 'Montar mi emprendimiento', href: '/emprender' },
    },
  },
  {
    roles: merchant,
    keys: [
      ['registr', 'crear', 'nuevo negocio', 'otro negocio', 'montar'],
      ['negocio', 'emprendimiento', 'tienda'],
    ],
    min: 2,
    answer: {
      text: 'Para registrar un negocio: «Registrar emprendimiento» en el menú. Llenas los datos, el horario, las fotos, el catálogo y los documentos, y lo envías. La administración lo revisa y te avisa por notificación.',
      cta: { label: 'Registrar emprendimiento', href: '/panel/configurar' },
    },
  },
  {
    roles: merchant,
    keys: [
      ['producto', 'servicio', 'catalogo', 'precio', 'foto'],
      ['agreg', 'edit', 'cambi', 'subir', 'quit', 'borr', 'pong', 'actualiz'],
    ],
    min: 2,
    answer: {
      text: 'Tus productos o servicios se editan desde «Mis negocios» → «Gestionar productos del negocio». Cada uno lleva nombre, descripción, precio, hasta 3 fotos y sus características (tamaño, libras, porciones…). Al terminar, toca «Publicar cambios».',
      cta: { label: 'Ir a Mis negocios', href: '/panel/negocios' },
    },
  },
  {
    roles: merchant,
    keys: [
      [
        'dato',
        'nombre',
        'direccion',
        'whatsapp',
        'horario',
        'logo',
        'portada',
        'redes',
        'instagram',
        'facebook',
        'tiktok',
        'descripcion',
      ],
      ['cambi', 'edit', 'actualiz', 'pong', 'agreg', 'donde'],
    ],
    min: 2,
    answer: {
      text: 'Los datos del negocio (nombre, dirección, WhatsApp, horario, logo, portada y redes sociales) se cambian en «Mis negocios» → «Gestionar datos del negocio». Los cambios se guardan solos; luego toca «Publicar cambios».',
      cta: { label: 'Ir a Mis negocios', href: '/panel/negocios' },
    },
  },
  {
    roles: merchant,
    keys: [
      [
        'rechaz',
        'revision',
        'aprob',
        'pendiente',
        'estado',
        'demora',
        'cuando aparece',
        'no aparece',
        'publicad',
      ],
    ],
    answer: {
      text: 'Cada registro pasa por la revisión de la administración. El estado aparece en «Mis negocios» (En revisión, Publicado o Registro rechazado). Si lo rechazaron, el motivo te llega en Notificaciones: corrige lo que te indiquen en «Gestionar datos del negocio» o en los documentos y vuelve a enviarlo.',
      cta: { label: 'Ver mis notificaciones', href: '/notificaciones' },
    },
  },
  {
    roles: merchant,
    keys: [
      ['documento', 'rut', 'cedula', 'camara de comercio', 'certificado', 'bancario', 'legal'],
    ],
    answer: {
      text: 'Los documentos son: cédula, RUT y certificado bancario; la Cámara de Comercio es obligatoria para persona jurídica y opcional para persona natural. Van en PDF, JPG, PNG o WEBP de máximo 4 MB, y solo los ve la administración. Se cambian desde el panel del negocio.',
      cta: { label: 'Ir a Mis negocios', href: '/panel/negocios' },
    },
  },
  {
    roles: merchant,
    keys: [
      ['pedido', 'venta', 'orden', 'compra', 'reserva', 'cita', 'solicitud', 'cotizacion'],
      ['recib', 'ver', 'llega', 'donde', 'mis', 'cliente'],
    ],
    min: 2,
    answer: {
      text: 'Los pedidos llegan a tu WhatsApp con el carrito del cliente, y quedan anotados en el panel de tu negocio («Mis negocios» → «Gestionar»). Las reservas y las solicitudes de cotización están en su propio apartado del menú.',
      cta: { label: 'Ir a Mis negocios', href: '/panel/negocios' },
    },
  },
  {
    roles: merchant,
    keys: [
      ['promocion', 'descuento', 'oferta', 'resena', 'valoracion', 'calificacion', 'estrella'],
    ],
    answer: {
      text: 'En «Promociones y reseñas» creas descuentos y ves lo que opinan tus clientes. Cada producto también tiene su propia valoración, que solo pueden dar quienes lo compraron.',
      cta: { label: 'Promociones y reseñas', href: '/panel/descuentos' },
    },
  },
  {
    roles: ['admin'],
    keys: [['aprob', 'revis', 'rechaz', 'registro', 'nuevo negocio', 'pendiente']],
    answer: {
      text: 'Los registros nuevos están en «Aprobación de negocios»: ahí ves los datos, documentos y catálogo de cada uno, y lo apruebas o rechazas con un motivo que le llega al emprendedor.',
      cta: { label: 'Aprobación de negocios', href: '/admin' },
    },
  },
  {
    roles: ['admin'],
    keys: [['export', 'excel', 'descarg', 'reporte', 'informe', 'listado']],
    answer: {
      text: 'En «Negocios aprobados» filtra o marca los negocios que quieras y toca «Exportar a Excel»: descarga la información legal (titular, cédula, tipo de persona, documentos, contacto y estado) de los negocios elegidos.',
      cta: { label: 'Negocios aprobados', href: '/admin/negocios' },
    },
  },
  {
    roles: ['admin'],
    keys: [['verific', 'insignia', 'chulo', 'sello']],
    answer: {
      text: 'La insignia de verificado se da al aprobar un registro o desde «Negocios aprobados» → «Revisar». Aparece junto al nombre del negocio en toda la plataforma.',
      cta: { label: 'Negocios aprobados', href: '/admin/negocios' },
    },
  },
  {
    roles: ['admin'],
    keys: [['pqrs', 'queja', 'reclamo', 'peticion', 'sugerencia', 'caso']],
    answer: {
      text: 'Las PQRS están en el menú «PQRS», agrupadas por persona y separadas en Pendientes, Casos abiertos y Resueltos. Al responder, la persona recibe una notificación; cuando se resuelve, usa «Cerrar caso».',
      cta: { label: 'Ir a PQRS', href: '/admin/pqrs' },
    },
  },
  {
    roles: ['cliente', 'emprendedor'],
    keys: [['pqrs', 'queja', 'reclamo', 'peticion', 'sugerencia', 'problema']],
    answer: {
      text: 'Puedes enviar una petición, queja, reclamo o sugerencia desde «PQRS». La administración te responde por notificación y puedes contestar en el mismo caso.',
      cta: { label: 'Enviar una PQRS', href: '/pqrs' },
    },
  },
  {
    roles: ['cliente', 'emprendedor', 'visitante'],
    keys: [['contrasena', 'clave', 'olvide', 'recuperar', 'entrar', 'iniciar sesion', 'acceso']],
    answer: {
      text: 'Si olvidaste tu contraseña, usa «¿Olvidaste tu contraseña?» en la página de ingreso: te llega un enlace al correo que dura 30 minutos. Si entraste con Google, usa otra vez el botón de Google.',
      cta: { label: 'Recuperar contraseña', href: '/recuperar' },
    },
  },
];
export function answerHelp(question: string, role: BrainRole): Reply | undefined {
  const q = ` ${plain(question)} `;
  let best: { points: number; topic: HelpTopic } | undefined;
  for (const topic of topics) {
    if (!topic.roles.includes(role)) continue;
    const points = topic.keys.filter((group) => group.some((k) => q.includes(k))).length;
    if (points >= (topic.min ?? 1) && (!best || points > best.points))
      best = { points: points, topic };
  }
  return best?.topic.answer;
}
