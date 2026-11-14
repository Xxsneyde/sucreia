import Link from 'next/link';
import { MapPin, GraduationCap, Truck } from 'lucide-react';
import { PageTitle, FeaturePlaceholder } from '@/components/ui';
import { businesses } from '@/data/demo';
export function School() {
  return (
    <>
      <PageTitle
        eyebrow="CRECEMOS CUANDO APRENDEMOS"
        title="Escuela del emprendedor"
        description="Un espacio para transformar tus ideas en nuevas oportunidades."
      />
      <div className="product-grid">
        {['Marketing digital', 'Finanzas para tu negocio', 'Ventas y atención al cliente'].map(
          (title, i) => (
            <article className="card course" key={title}>
              <GraduationCap size={32} />
              <span className="eyebrow">RUTA 0{i + 1}</span>
              <h2>{title}</h2>
              <p className="muted">
                Próximamente: lecciones prácticas y recursos para emprendedores.
              </p>
              <span className="tag">Contenido pendiente</span>
            </article>
          ),
        )}
      </div>
      <FeaturePlaceholder
        title="Tu ruta de aprendizaje"
        description="El equipo podrá conectar contenidos, progreso y recomendaciones personalizadas."
        items={[
          'Biblioteca de cursos',
          'Progreso por emprendedor',
          'Asistencia y recomendaciones de formación',
        ]}
      />
    </>
  );
}
export function MapDirectory() {
  return (
    <>
      <PageTitle
        eyebrow="EXPLORA NUESTRA TIERRA"
        title="El talento está cerca."
        description="Directorio por municipio. El mapa geográfico interactivo se integrará después."
      />
      <div className="two-columns">
        <section className="region-card">
          <MapPin size={46} />
          <h2>Sucre</h2>
          <p>Golfo de Morrosquillo · Sabanas · Montes de María · Mojana · San Jorge</p>
          <span className="tag">Directorio de ejemplo</span>
        </section>
        <section className="card">
          <h2>Negocios por municipio</h2>
          {businesses.map((b) => (
            <Link className="list-row" href={`/negocios/${b.id}`} key={b.id}>
              <MapPin size={20} />
              <div className="grow">
                <h3>{b.name}</h3>
                <span className="muted small">{b.municipality}</span>
              </div>
              →
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
export function Deliveries() {
  return (
    <>
      <PageTitle
        eyebrow="CONECTAMOS CADA ENTREGA"
        title="Espacio del domiciliario"
        description="Base del módulo de logística y seguimiento."
      />
      <section className="region-card">
        <Truck size={45} />
        <h2>Tu ruta comienza aquí.</h2>
        <p>Las entregas asignadas aparecerán al conectar el servicio logístico.</p>
      </section>
      <FeaturePlaceholder
        title="Próximas funciones"
        description="Este espacio requiere cuentas verificadas y asignación de pedidos desde el servidor."
        items={[
          'Aceptar y recoger un pedido',
          'Actualizar el estado de la entrega',
          'Confirmar entrega con PIN de un solo uso',
          'Contacto con el cliente y ubicación con consentimiento',
        ]}
      />
    </>
  );
}
