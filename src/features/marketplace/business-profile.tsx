'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Heart, MapPin, Star, Plus, MessageCircle, ArrowLeft } from 'lucide-react';
import type { Business } from '@/domain/types';
import { actionLabel, cartTotal, currency, whatsappUrl } from '@/domain/rules';
import { useDemo } from '@/lib/demo-store';
export function BusinessProfile({ business: b }: { business: Business }) {
  const store = useDemo();
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState('');
  const whatsapp = whatsappUrl(b.whatsapp, b.name);
  const ownCart = store.cart.filter((x) => x.businessId === b.id);
  const favorite = store.favorites.includes(b.id);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (b.mode === 'products') return;
    if (b.mode === 'booking' && new Date(`${date}T23:59:59`).getTime() < Date.now()) {
      setMessage('Elige una fecha de hoy en adelante.');
      return;
    }
    store.request({ businessId: b.id, businessName: b.name, mode: b.mode, detail, date });
    setOpen(false);
    setMessage('Solicitud de ejemplo guardada. Puedes verla en Mis pedidos.');
  }
  return (
    <>
      <Link className="back-link" href="/buscar">
        <ArrowLeft size={16} /> Volver a negocios
      </Link>
      <section className={`profile-hero ${b.theme}`}>
        <div>
          <span className="tag">{b.category}</span>
          <h1>
            {b.name}{' '}
            {b.verified && <BadgeCheck className="verified" aria-label="Verificado de ejemplo" />}
          </h1>
          <p>{b.description}</p>
          <div className="profile-meta">
            <span>
              <MapPin size={15} />
              {b.municipality}
            </span>
            <span>
              <Star size={15} />
              {b.rating} · ejemplo
            </span>
          </div>
        </div>
        <img src={`/art/${b.theme}.svg`} alt="" />
      </section>
      <div className="profile-toolbar">
        <span>{b.completed365} operaciones de ejemplo en los últimos 365 días</span>
        <button
          className="button subtle"
          onClick={() => store.toggleFavorite(b.id)}
          aria-pressed={favorite}
        >
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
          {favorite ? 'Guardado' : 'Guardar'}
        </button>
      </div>
      <div className="section-heading">
        <h2>
          {b.mode === 'products'
            ? 'Piezas y productos'
            : b.mode === 'booking'
              ? 'Servicios para ti'
              : 'Cuéntanos qué necesitas'}
        </h2>
        <span className="muted">
          {b.mode === 'quote' ? 'Propuesta según tu necesidad' : 'Una selección de este negocio'}
        </span>
      </div>
      <div className="product-grid">
        {b.products.map((product, i) => (
          <article className="product-card card" key={product.id}>
            <div className={`product-art ${b.theme}`}>
              <img
                style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
                src={`/art/${b.theme}.svg`}
                alt=""
              />
            </div>
            <h3>{product.name}</h3>
            <p className="muted small">{product.description}</p>
            <div className="row between">
              <strong>{currency(product.price)}</strong>
              {b.mode === 'products' ? (
                <button
                  className="icon-button"
                  aria-label={`Agregar ${product.name}`}
                  disabled={!store.ready}
                  onClick={() => {
                    try {
                      store.add({
                        businessId: b.id,
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                      });
                      setMessage(`${product.name} agregado al carrito.`);
                    } catch (error) {
                      setMessage((error as Error).message);
                    }
                  }}
                >
                  <Plus size={20} />
                </button>
              ) : (
                <button
                  className="text-button"
                  onClick={() => {
                    setDetail(product.name);
                    setOpen(true);
                  }}
                >
                  Elegir →
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {b.mode === 'quote' && (
        <div className="card">
          <h3>Una solución a tu medida</h3>
          <p className="muted">
            Describe el servicio, la ubicación y los detalles que el negocio necesita para preparar
            una propuesta.
          </p>
          <button className="button" onClick={() => setOpen(true)}>
            Preparar solicitud
          </button>
        </div>
      )}
      {open && (
        <form className="card form-stack request-form" onSubmit={submit}>
          <h2>{actionLabel(b.mode)}</h2>
          <label>
            Detalle de tu solicitud
            <textarea
              required
              minLength={3}
              maxLength={1000}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </label>
          {b.mode === 'booking' && (
            <label>
              Fecha preferida
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <span className="muted small">
                Sujeta a confirmación del negocio; esta demo no consulta disponibilidad.
              </span>
            </label>
          )}
          <div className="row">
            <button className="button" disabled={!store.ready}>
              Guardar solicitud de ejemplo
            </button>
            <button type="button" className="button subtle" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="notice">
          {message} <Link href="/pedidos">Ver pedidos →</Link>
        </p>
      )}
      <div className="profile-info card">
        <h3>Contacto y atención</h3>
        <p className="muted">
          El WhatsApp aparecerá aquí cuando el negocio configure su número real. Los perfiles de
          esta demo no contactan a terceros.
        </p>
        {whatsapp && (
          <a className="button secondary" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} /> WhatsApp de {b.name}
          </a>
        )}
      </div>
      <div className="sticky-action">
        <div>
          <strong>{b.mode === 'products' ? currency(cartTotal(ownCart)) : b.name}</strong>
          <span className="small muted">
            {b.mode === 'products'
              ? `${ownCart.reduce((n, x) => n + x.quantity, 0)} productos en tu carrito`
              : 'Solicitud sujeta a confirmación'}
          </span>
        </div>
        {b.mode === 'products' ? (
          <Link className="button" href="/carrito">
            {actionLabel(b.mode)} →
          </Link>
        ) : (
          <button className="button" onClick={() => setOpen(true)}>
            {actionLabel(b.mode)} →
          </button>
        )}
      </div>
    </>
  );
}
