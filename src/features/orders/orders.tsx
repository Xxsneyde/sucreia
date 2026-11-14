'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Check, Package, Clock } from 'lucide-react';
import { useDemo } from '@/lib/demo-store';
import { currency, cartTotal, orderSteps } from '@/domain/rules';
import { EmptyState, PageTitle } from '@/components/ui';
export function Cart() {
  const store = useDemo();
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <>
      <PageTitle
        eyebrow="TU SELECCIÓN"
        title="Un paso más cerca"
        description="Revisa los productos de tu pedido de ejemplo."
      />
      {!store.cart.length ? (
        <EmptyState title="Tu carrito está esperando" href="/buscar">
          Descubre algo especial en los negocios de Sucre.
        </EmptyState>
      ) : (
        <div className="two-columns">
          <section className="card">
            {store.cart.map((item) => (
              <div className="list-row" key={item.productId}>
                <span className="item-icon">
                  <Package size={22} />
                </span>
                <div className="grow">
                  <h3>{item.name}</h3>
                  <p className="muted">
                    {item.quantity} × {currency(item.price)}
                  </p>
                </div>
                <strong>{currency(item.price * item.quantity)}</strong>
                <button
                  className="icon-button subtle"
                  aria-label={`Quitar ${item.name}`}
                  onClick={() => store.remove(item.productId)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button className="text-button" onClick={store.clear}>
              Vaciar carrito
            </button>
          </section>
          <aside className="card summary">
            <h2>Resumen del pedido</h2>
            <div className="row between">
              <span>Productos</span>
              <strong>{currency(cartTotal(store.cart))}</strong>
            </div>
            <p className="muted small">
              Demo con recogida en el negocio. Los costos de domicilio y métodos de pago se
              integrarán después.
            </p>
            <button
              className="button full"
              disabled={!store.ready}
              onClick={() => {
                try {
                  store.checkout();
                  router.push('/pedidos');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Crear pedido de ejemplo →
            </button>
            {error && <p role="alert">{error}</p>}
            <Link className="text-button" href="/buscar">
              Seguir explorando
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
export function Orders() {
  const { orders, requests } = useDemo();
  return (
    <>
      <PageTitle
        eyebrow="CADA PASO, MÁS CERCA"
        title="Tus pedidos y solicitudes"
        description="Consulta compras, citas y cotizaciones en un solo lugar."
      />
      <div className="order-list">
        {orders.map((order) => (
          <article className="card" key={order.id}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">{order.id}</span>
                <h2>{order.businessName}</h2>
              </div>
              <span className="tag">{currency(order.total)}</span>
            </div>
            <div className="timeline">
              {orderSteps.map((step, index) => {
                const current = orderSteps.findIndex((x) => x.status === order.status);
                return (
                  <div
                    key={step.status}
                    className={index <= current ? 'timeline-step done' : 'timeline-step'}
                  >
                    <span>{index <= current ? <Check size={16} /> : index + 1}</span>
                    <p>{step.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="row between">
              <span className="small muted">
                {order.lines.map((x) => `${x.quantity} ${x.name}`).join(' · ')}
              </span>
              <Link className="text-button" href={`/negocios/${order.businessId}`}>
                Ver negocio →
              </Link>
            </div>
            <p className="small muted">
              El tiempo estimado, el repartidor y el PIN estarán disponibles al conectar entregas
              reales.
            </p>
          </article>
        ))}
        {requests.map((request) => (
          <article className="card" key={request.id}>
            <div className="row between">
              <h2>{request.businessName}</h2>
              <span className="tag">
                <Clock size={14} /> Pendiente
              </span>
            </div>
            <p>
              {request.mode === 'booking' ? 'Cita / reserva' : 'Cotización'} · {request.detail}
            </p>
            {request.date && <p>Fecha preferida: {request.date}</p>}
            <p className="muted small">Solicitud de demostración, sin envío al negocio.</p>
          </article>
        ))}
        {!orders.length && !requests.length && (
          <EmptyState title="Todo empieza con un descubrimiento" href="/buscar">
            Tus pedidos y solicitudes aparecerán aquí.
          </EmptyState>
        )}
      </div>
    </>
  );
}
