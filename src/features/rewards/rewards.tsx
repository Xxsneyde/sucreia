'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Gift, Check, ArrowRight } from 'lucide-react';
import { useDemo } from '@/lib/demo-store';
import { PageTitle } from '@/components/ui';
export function Rewards() {
  const store = useDemo();
  const [message, setMessage] = useState('');
  return (
    <>
      <PageTitle
        eyebrow="LO BUENO DE COMPRAR LOCAL"
        title="Cada compra cuenta."
        description="Prueba el ciclo de recompensas de SucreIA en tu plataforma local."
      />
      <section className="points-balance">
        <div>
          <span>TUS SUCREPUNTOS · SIMULACIÓN LOCAL</span>
          <h2>
            {store.points.toLocaleString('es-CO')} <small>puntos</small>
          </h2>
          <p>Ganas 100 puntos cuando un pedido de prueba pasa a entregado.</p>
        </div>
        <Gift size={75} />
      </section>
      <div className="two-columns">
        <section className="card coupon">
          <span className="tag">Bono de demostración</span>
          <strong>10%</strong>
          <h2>Un detalle para tu próxima compra.</h2>
          <p className="muted">
            Canjea 500 puntos por un descuento de un solo uso. Se aplica automáticamente al
            finalizar tu siguiente pedido local.
          </p>
          <button
            className="button"
            disabled={!store.ready || store.coupon || store.points < 500}
            onClick={() => {
              try {
                store.redeem();
                setMessage('Tu bono está listo. Se aplicará en el carrito.');
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            {store.coupon ? (
              <>
                <Check size={16} /> Bono disponible
              </>
            ) : (
              'Canjear por 500 puntos'
            )}
          </button>
          {store.coupon && (
            <Link className="text-button" href="/buscar">
              Encuentra algo especial <ArrowRight size={15} />
            </Link>
          )}
        </section>
        <section className="card">
          <h2>Así funciona esta prueba</h2>
          <ol className="checklist">
            <li>Elige un negocio y realiza un pedido local.</li>
            <li>Avanza sus estados desde el panel del negocio.</li>
            <li>Marca la entrega y recibe 100 puntos.</li>
            <li>Canjea un bono y úsalo en tu siguiente pedido.</li>
          </ol>
          <p className="muted small">
            Los puntos y descuentos son de simulación. Las reglas comerciales y su equivalencia en
            pesos se definirán antes de operar con dinero real.
          </p>
        </section>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}
