// Política de uso y condiciones generales de SucreIA: el texto que se acepta al crear la cuenta
// (casilla del registro) y que muestra /terminos. Si cambia el contenido, cambia la versión: la
// cuenta guarda cuál aceptó (users.terms_version).

/** Versión vigente (fecha de publicación). */
export const USER_TERMS_VERSION = '2026-11-27';
export const USER_TERMS_DATE = '27 de noviembre de 2026';

export type TermsBlock =
  | { kind: 'p'; text: string }
  /** Párrafo destacado (en negrita en el documento original). */
  | { kind: 'note'; text: string }
  | { kind: 'list'; items: string[] }
  /** Lista con literales a), b), c)… */
  | { kind: 'letters'; items: string[] };

export interface TermsSection {
  id: string;
  title: string;
  blocks: TermsBlock[];
}

export const termsTitle = 'Política de uso y condiciones generales de SucreIA';
export const termsSubtitle = 'SucreIA – El ecosistema digital de emprendimientos de Sucre';

export const termsSections: TermsSection[] = [
  {
    id: 'presentacion',
    title: 'Presentación de SucreIA',
    blocks: [
      {
        kind: 'p',
        text: 'SucreIA es un ecosistema digital de emprendimiento del departamento de Sucre, Colombia, creado con el propósito de conectar a usuarios, consumidores y emprendedores mediante herramientas tecnológicas que faciliten la visibilidad, promoción, descubrimiento y contacto entre los participantes.',
      },
      {
        kind: 'p',
        text: 'La plataforma busca fortalecer el ecosistema empresarial y comercial del territorio, promoviendo el reconocimiento de los emprendimientos locales, sus productos y servicios, así como el desarrollo de oportunidades de conexión y colaboración.',
      },
      { kind: 'p', text: 'SucreIA podrá ofrecer funcionalidades como:' },
      {
        kind: 'list',
        items: [
          'Directorio de emprendimientos y negocios.',
          'Publicación de productos y servicios por categorías o sectores.',
          'Herramientas de búsqueda y exploración.',
          'Recomendaciones de la comunidad.',
          'Asistentes y funcionalidades basadas en inteligencia artificial.',
          'Información de contacto de los emprendimientos.',
          'Otras herramientas digitales orientadas a facilitar la conexión entre usuarios y emprendedores.',
        ],
      },
    ],
  },
  {
    id: 'naturaleza',
    title: 'Naturaleza y alcance de la plataforma',
    blocks: [
      {
        kind: 'p',
        text: 'SucreIA opera como una plataforma digital de conexión y visibilidad entre usuarios y emprendedores.',
      },
      {
        kind: 'p',
        text: 'Su función principal consiste en facilitar que los usuarios conozcan los emprendimientos registrados y puedan establecer contacto directo con ellos para solicitar información, consultar productos o servicios y, si así lo deciden, iniciar negociaciones o establecer relaciones comerciales.',
      },
      {
        kind: 'note',
        text: 'SucreIA no es, por regla general, el vendedor, productor, fabricante, distribuidor ni prestador de los productos o servicios publicados por los emprendedores.',
      },
      {
        kind: 'p',
        text: 'Salvo que se informe expresamente lo contrario para una funcionalidad específica, SucreIA:',
      },
      {
        kind: 'letters',
        items: [
          'No comercializa directamente los productos o servicios publicados por los emprendedores.',
          'No actúa como representante, agente comercial, mandatario o socio de los emprendimientos registrados.',
          'No participa como parte en las negociaciones o acuerdos comerciales que se establezcan entre usuarios y emprendedores.',
          'No recibe ni administra pagos derivados de las transacciones realizadas directamente entre usuarios y emprendedores.',
          'No interviene en la entrega, transporte, instalación, garantía, devolución o prestación de los productos y servicios ofrecidos por terceros.',
          'No garantiza que los usuarios y emprendedores lleguen a acuerdos comerciales.',
        ],
      },
      {
        kind: 'p',
        text: 'La utilización de SucreIA no crea una relación laboral, societaria, de representación, agencia o asociación entre la plataforma y los emprendedores registrados.',
      },
    ],
  },
  {
    id: 'emprendedores',
    title: 'Responsabilidad de los emprendedores',
    blocks: [
      {
        kind: 'p',
        text: 'Cada emprendedor registrado en SucreIA es responsable de la información que publica y de los productos o servicios que ofrece.',
      },
      { kind: 'p', text: 'En consecuencia, corresponde a cada emprendedor:' },
      {
        kind: 'list',
        items: [
          'Proporcionar información veraz, clara, suficiente y actualizada sobre su negocio.',
          'Publicar productos y servicios que pueda ofrecer legalmente.',
          'Informar correctamente precios, características, disponibilidad y condiciones comerciales.',
          'Cumplir las normas aplicables a su actividad económica.',
          'Atender directamente las consultas, solicitudes, reclamaciones y compromisos adquiridos con sus clientes.',
          'Cumplir las obligaciones relacionadas con garantías, calidad, seguridad, facturación, entrega y prestación de servicios, cuando sean aplicables.',
          'Respetar los derechos de los consumidores y de terceros.',
          'Contar con los permisos, registros, licencias o autorizaciones exigidos para desarrollar su actividad.',
        ],
      },
      {
        kind: 'p',
        text: 'SucreIA podrá solicitar información para identificar a los emprendedores y verificar aspectos relacionados con su registro, de acuerdo con la normativa aplicable.',
      },
      {
        kind: 'p',
        text: 'La publicación de un emprendimiento en SucreIA no constituye, por sí sola, una certificación de calidad, garantía comercial, aval institucional ni recomendación profesional por parte de la plataforma.',
      },
    ],
  },
  {
    id: 'usuarios',
    title: 'Responsabilidad de los usuarios',
    blocks: [
      {
        kind: 'p',
        text: 'Los usuarios se comprometen a utilizar SucreIA de manera responsable, legal y respetuosa.',
      },
      { kind: 'p', text: 'Cada usuario es responsable de:' },
      {
        kind: 'letters',
        items: [
          'La información que suministre al registrarse o utilizar la plataforma.',
          'Las comunicaciones que establezca con los emprendedores.',
          'Las decisiones comerciales que adopte a partir de la información consultada.',
          'La verificación de la identidad, condiciones comerciales y legitimidad del emprendimiento con el que decida contactar.',
          'La protección de sus credenciales de acceso y la seguridad de su cuenta.',
          'Los acuerdos, pagos, compras, contrataciones o compromisos que realice directamente con terceros.',
        ],
      },
      {
        kind: 'p',
        text: 'Se recomienda a los usuarios verificar previamente las condiciones de cada operación, incluyendo precios, medios de pago, características del producto, tiempos de entrega, garantías y políticas de devolución.',
      },
    ],
  },
  {
    id: 'limitacion',
    title: 'Limitación de responsabilidad de SucreIA',
    blocks: [
      {
        kind: 'p',
        text: 'SucreIA tiene como finalidad facilitar la conexión entre usuarios y emprendedores. Por tanto, en las relaciones comerciales que se establezcan directamente entre estos, cada participante actúa bajo su propia responsabilidad.',
      },
      {
        kind: 'p',
        text: 'En la medida permitida por la legislación colombiana, SucreIA no será responsable por:',
      },
      {
        kind: 'list',
        items: [
          'La calidad, idoneidad, seguridad, legalidad o disponibilidad de los productos y servicios ofrecidos por los emprendedores.',
          'La veracidad, exactitud, integridad o actualización de la información publicada por terceros, sin perjuicio de las obligaciones legales que correspondan a la plataforma.',
          'El incumplimiento de acuerdos comerciales celebrados directamente entre usuarios y emprendedores.',
          'La falta de entrega de productos o la prestación defectuosa o incompleta de servicios por parte de terceros.',
          'Los pagos, anticipos, transferencias o acuerdos económicos realizados directamente entre usuarios y emprendedores.',
          'Los daños, pérdidas o perjuicios derivados de actuaciones fraudulentas, engañosas, negligentes o ilícitas realizadas por usuarios o emprendedores.',
          'Las comunicaciones, negociaciones o acuerdos efectuados fuera de la plataforma.',
          'El uso indebido de la aplicación por parte de terceros, cuando dicho uso no sea atribuible a una acción u omisión de SucreIA que genere responsabilidad legal.',
        ],
      },
      {
        kind: 'p',
        text: 'La anterior limitación no excluye ni restringe las responsabilidades que legalmente puedan corresponder a SucreIA por sus propias actuaciones, por el tratamiento de datos personales, por incumplimientos de obligaciones legales o por cualquier otra responsabilidad que no pueda ser excluida mediante contrato.',
      },
    ],
  },
  {
    id: 'uso-indebido',
    title: 'Uso indebido de la aplicación',
    blocks: [
      { kind: 'p', text: 'Está prohibido utilizar SucreIA para:' },
      {
        kind: 'letters',
        items: [
          'Desarrollar actividades fraudulentas, engañosas o ilícitas.',
          'Publicar información falsa, engañosa, difamatoria o que induzca a error.',
          'Ofrecer productos o servicios cuya comercialización esté prohibida por la legislación colombiana.',
          'Suplantar la identidad de personas, empresas, instituciones o emprendimientos.',
          'Utilizar la plataforma para estafas, amenazas, acoso, extorsión o cualquier conducta que afecte a otros usuarios.',
          'Publicar contenido que infrinja derechos de autor, propiedad industrial, marcas o derechos de terceros.',
          'Obtener, recopilar o utilizar datos personales de otros usuarios sin autorización o sin fundamento legal.',
          'Intentar vulnerar la seguridad, disponibilidad o funcionamiento de la aplicación.',
          'Utilizar herramientas automatizadas para extraer información de la plataforma sin autorización.',
          'Utilizar las funcionalidades de inteligencia artificial para generar contenido ilícito, engañoso o perjudicial.',
        ],
      },
      {
        kind: 'p',
        text: 'SucreIA podrá adoptar medidas razonables frente a usos indebidos, incluyendo la revisión, ocultamiento o eliminación de publicaciones, la restricción de funcionalidades, la suspensión temporal o la cancelación de cuentas, según la gravedad de la situación y la normativa aplicable.',
      },
      {
        kind: 'p',
        text: 'Cuando corresponda, SucreIA podrá poner los hechos en conocimiento de las autoridades competentes.',
      },
    ],
  },
  {
    id: 'contenido',
    title: 'Publicaciones y contenido de terceros',
    blocks: [
      {
        kind: 'p',
        text: 'Los emprendedores y usuarios conservan la responsabilidad sobre el contenido que publiquen o compartan a través de SucreIA.',
      },
      {
        kind: 'p',
        text: 'Al publicar contenido, el usuario declara que cuenta con los derechos, permisos o autorizaciones necesarios para hacerlo.',
      },
      {
        kind: 'p',
        text: 'El usuario autoriza a SucreIA, de manera no exclusiva y durante el tiempo necesario para la operación de la plataforma, a alojar, reproducir técnicamente, mostrar y distribuir dicho contenido dentro de las funcionalidades de SucreIA, con el único propósito de prestar y promover los servicios de la aplicación.',
      },
      {
        kind: 'p',
        text: 'Esta autorización no implica transferencia de propiedad intelectual ni permite utilizar el contenido para finalidades distintas sin la autorización correspondiente, salvo que exista fundamento legal.',
      },
      {
        kind: 'p',
        text: 'SucreIA podrá retirar contenido cuando existan indicios razonables de infracción legal, vulneración de derechos de terceros o incumplimiento de estas condiciones.',
      },
    ],
  },
  {
    id: 'inteligencia-artificial',
    title: 'Funcionalidades de inteligencia artificial',
    blocks: [
      {
        kind: 'p',
        text: 'SucreIA podrá incorporar herramientas de inteligencia artificial para facilitar la búsqueda, clasificación, recomendación o exploración de emprendimientos, productos y servicios.',
      },
      {
        kind: 'p',
        text: 'Las respuestas, recomendaciones o resultados generados por estas herramientas tienen carácter informativo y de apoyo.',
      },
      {
        kind: 'p',
        text: 'SucreIA no garantiza que las recomendaciones generadas por inteligencia artificial sean completamente exactas, actualizadas, imparciales o adecuadas para todas las necesidades del usuario.',
      },
      {
        kind: 'p',
        text: 'Los usuarios deberán verificar directamente con los emprendedores la información relevante antes de tomar decisiones comerciales.',
      },
      {
        kind: 'p',
        text: 'Las funcionalidades de inteligencia artificial no constituyen asesoría jurídica, financiera, médica, técnica ni profesional especializada.',
      },
    ],
  },
  {
    id: 'disponibilidad',
    title: 'Disponibilidad y funcionamiento',
    blocks: [
      {
        kind: 'p',
        text: 'SucreIA procurará mantener la disponibilidad y el funcionamiento adecuado de la plataforma.',
      },
      {
        kind: 'p',
        text: 'Sin embargo, el usuario reconoce que pueden presentarse interrupciones, mantenimientos, errores técnicos, fallas de conectividad, actualizaciones o situaciones ajenas al control de SucreIA.',
      },
      {
        kind: 'p',
        text: 'En consecuencia, la plataforma no garantiza una disponibilidad permanente, ininterrumpida o libre de errores.',
      },
      {
        kind: 'p',
        text: 'SucreIA podrá modificar, actualizar, suspender o retirar funcionalidades cuando resulte necesario para mejorar el servicio, garantizar la seguridad, atender requerimientos legales o realizar labores de mantenimiento.',
      },
    ],
  },
  {
    id: 'datos-personales',
    title: 'Protección de datos personales',
    blocks: [
      {
        kind: 'p',
        text: 'El tratamiento de los datos personales de los usuarios y emprendedores se realizará de conformidad con la Ley 1581 de 2012, sus normas reglamentarias y demás disposiciones aplicables.',
      },
      {
        kind: 'p',
        text: 'SucreIA informará a los titulares sobre las finalidades del tratamiento, los derechos que les asisten y los mecanismos para ejercerlos, mediante su correspondiente Política de Tratamiento de Datos Personales.',
      },
      {
        kind: 'p',
        text: 'Los usuarios deberán abstenerse de publicar o compartir datos personales de terceros sin autorización o sin contar con una base legal que lo permita.',
      },
      {
        kind: 'p',
        text: 'La presente política de uso no reemplaza la Política de Tratamiento de Datos Personales ni las autorizaciones que legalmente deban obtenerse.',
      },
    ],
  },
  {
    id: 'reclamaciones',
    title: 'Reclamaciones y conflictos entre usuarios y emprendedores',
    blocks: [
      {
        kind: 'p',
        text: 'Las reclamaciones relacionadas con productos, servicios, pagos, entregas, garantías o acuerdos comerciales deberán ser dirigidas inicialmente al emprendedor que ofreció el producto o servicio, quien será responsable de atenderlas conforme a la legislación aplicable.',
      },
      {
        kind: 'p',
        text: 'SucreIA podrá facilitar canales de comunicación o recibir reportes relacionados con el uso de la plataforma, sin que ello implique asumir automáticamente la responsabilidad por la operación comercial celebrada entre las partes.',
      },
      {
        kind: 'p',
        text: 'La recepción de una reclamación no significa que SucreIA sea parte del contrato comercial ni que garantice la solución del conflicto.',
      },
      {
        kind: 'p',
        text: 'Lo anterior se entiende sin perjuicio de los derechos de los consumidores y de las competencias de las autoridades correspondientes.',
      },
    ],
  },
  {
    id: 'modificaciones',
    title: 'Modificaciones de la política',
    blocks: [
      {
        kind: 'p',
        text: 'SucreIA podrá actualizar esta política cuando sea necesario por razones operativas, tecnológicas, comerciales o legales.',
      },
      {
        kind: 'p',
        text: 'Las modificaciones serán publicadas en la aplicación o en los canales oficiales de SucreIA, indicando la fecha de actualización.',
      },
      {
        kind: 'p',
        text: 'Cuando los cambios afecten de manera significativa las condiciones de uso o los derechos de los usuarios, se procurará informar oportunamente y obtener la aceptación correspondiente cuando resulte legalmente exigible.',
      },
    ],
  },
  {
    id: 'aceptacion',
    title: 'Aceptación de las condiciones',
    blocks: [
      {
        kind: 'p',
        text: 'Al registrarse, acceder o utilizar SucreIA, el usuario declara que ha leído y comprendido esta Política de Uso y que acepta las condiciones aquí establecidas.',
      },
      {
        kind: 'p',
        text: 'Si el usuario no está de acuerdo con estas condiciones, deberá abstenerse de utilizar la plataforma.',
      },
    ],
  },
  {
    id: 'legislacion',
    title: 'Legislación aplicable',
    blocks: [
      {
        kind: 'p',
        text: 'La presente política se rige por las leyes de la República de Colombia, especialmente por las disposiciones aplicables en materia de protección al consumidor, protección de datos personales, comercio electrónico, propiedad intelectual y demás normas relacionadas.',
      },
      {
        kind: 'p',
        text: 'Cualquier controversia será atendida conforme a los mecanismos legales y jurisdiccionales establecidos en Colombia.',
      },
    ],
  },
];
