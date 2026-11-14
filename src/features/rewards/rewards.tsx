import Link from 'next/link';
import { ArrowUpRight, Gift } from 'lucide-react';
import { PageTitle } from '@/components/ui';
export function Rewards() {
  return (
    <>
      <PageTitle
        eyebrow="COMPRAR LOCAL TIENE SU RECOMPENSA"
        title="Tus SucrePuntos"
        description="Un espacio para encontrar beneficios y apoyar a nuestros negocios."
      />
      <section className="points-balance">
        <div>
          <span>SALDO DE DEMOSTRACIÓN</span>
          <h2>
            2.850 <small>puntos</small>
          </h2>
          <p>Equivalencia en pesos pendiente de definir por el equipo.</p>
        </div>
        <Gift size={80} />
      </section>
      <div className="section-heading">
        <h2>Bonos para descubrir</h2>
        <span className="muted">Ejemplos de presentación</span>
      </div>
      <div className="product-grid">
        {[
          {
            name: 'Delicias de Sucre',
            id: 'delicias-de-sucre',
            discount: '20%',
            text: 'Un detalle dulce para tu próxima visita.',
          },
          {
            name: 'Raíces de Sucre',
            id: 'raices-de-sucre',
            discount: '15%',
            text: 'Lleva contigo una pieza de nuestra tierra.',
          },
        ].map((b) => (
          <article className="card coupon" key={b.id}>
            <span className="tag">Bono de ejemplo</span>
            <strong>{b.discount}</strong>
            <h3>{b.name}</h3>
            <p className="muted">{b.text}</p>
            <Link className="text-button" href={`/negocios/${b.id}`}>
              Visitar negocio <ArrowUpRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      <p className="muted small">
        El canje, las condiciones y las reglas para acumular puntos se conectarán en una próxima
        etapa.
      </p>
    </>
  );
}
