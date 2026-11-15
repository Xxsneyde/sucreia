'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Heart, Smartphone, Monitor, PenLine, Check } from 'lucide-react';
import { useStudio } from '@/lib/studio-store';
import { useDemo } from '@/lib/demo-store';
import { type StoreProduct } from '@/domain/studio';
import { currency, cartTotal, actionLabel } from '@/domain/rules';
import { EmptyState } from '@/components/ui';
import { EditorModal } from './modal';
import { FullStore } from './store-renderer';
export function Storefront({ preview = false }: { preview?: boolean }) {
  const studio = useStudio();
  const demo = useDemo();
  const params = useSearchParams();
  const id = params.get('id') ?? studio.selectedId;
  const p = studio.projects.find((p) => p.id === id);
  const d = preview ? p?.draft : p?.published?.design;
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [showRequest, setShowRequest] = useState(false);
  const counted = useRef('');
  useEffect(() => {
    if (!preview && studio.ready && p?.published && counted.current !== id) {
      counted.current = id;
      studio.visit(id);
    }
  }, [preview, studio.ready, id, !!p?.published]);
  if (!studio.ready)
    return (
      <div className="studio-loading">
        <div className="loader" />
        Cargando esta historia…
      </div>
    );
  if (!d || !p)
    return (
      <EmptyState
        title="Esta tienda aún no está publicada"
        href="/estudio"
        label="Ir a mis tiendas"
      >
        Publica tu diseño desde el estudio para verlo aquí. Las tiendas locales están disponibles en
        el navegador donde se crearon.
      </EmptyState>
    );
  const items = demo.cart.filter((x) => x.businessId === id);
  const count = items.reduce((n, x) => n + x.quantity, 0);
  const favorite = demo.favorites.includes(id);
  function productAction(product: StoreProduct) {
    if (preview) {
      setNotice('Vista previa: publica la tienda para probar sus pedidos.');
      return;
    }
    if (d!.mode === 'products') {
      try {
        demo.add({
          businessId: id,
          productId: product.id,
          name: product.name,
          price: product.price,
        });
        setNotice(`${product.name} está en tu carrito.`);
      } catch (e) {
        setNotice((e as Error).message);
      }
    } else {
      setDetail(product.name);
      setShowRequest(true);
    }
  }
  function action() {
    if (preview) {
      document.getElementById('shop-catalog')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (d!.mode === 'products')
      document.getElementById('shop-catalog')?.scrollIntoView({ behavior: 'smooth' });
    else setShowRequest(true);
  }
  return (
    <div className={`storefront-page ${preview ? 'preview-page' : ''}`}>
      <header className="storefront-top">
        <Link href={preview ? `/estudio/editor?id=${id}` : '/buscar'}>
          <ArrowLeft size={16} />
          <span>{preview ? 'Volver al editor' : 'SucreIA'}</span>
        </Link>
        <span>{preview ? 'VISTA PREVIA · BORRADOR' : 'TIENDA LOCAL'}</span>
        <div>
          {preview ? (
            <>
              <div className="device-switch">
                <button
                  aria-label="Vista de escritorio"
                  className={device === 'desktop' ? 'active' : ''}
                  onClick={() => setDevice('desktop')}
                >
                  <Monitor size={16} />
                </button>
                <button
                  aria-label="Vista de celular"
                  className={device === 'mobile' ? 'active' : ''}
                  onClick={() => setDevice('mobile')}
                >
                  <Smartphone size={16} />
                </button>
              </div>
              <Link href={`/estudio/editor?id=${id}`}>
                <PenLine size={16} />
                <span>Seguir diseñando</span>
              </Link>
            </>
          ) : (
            <>
              <button
                aria-label={favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                aria-pressed={favorite}
                onClick={() => demo.toggleFavorite(id)}
              >
                <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
              </button>
              <Link href="/carrito">
                <ShoppingBag size={17} />
                {count}
              </Link>
            </>
          )}
        </div>
      </header>
      <div className={`storefront-frame ${device === 'mobile' ? 'mobile-frame' : ''}`}>
        <FullStore design={d} onProduct={productAction} onAction={action} />
      </div>
      {notice && (
        <div className="storefront-notice" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}
      {!preview && (
        <div className="storefront-orderbar">
          <div>
            <strong>{d.mode === 'products' ? currency(cartTotal(items)) : d.name}</strong>
            <span>
              {d.mode === 'products'
                ? `${count} productos · recogida en el negocio`
                : 'Solicitud local, sujeta a confirmación'}
            </span>
          </div>
          {d.mode === 'products' ? (
            <Link className="studio-primary" href="/carrito">
              {actionLabel(d.mode)} →
            </Link>
          ) : (
            <button className="studio-primary" onClick={() => setShowRequest(true)}>
              {actionLabel(d.mode)} →
            </button>
          )}
        </div>
      )}
      {showRequest && (
        <EditorModal title={actionLabel(d.mode)} onClose={() => setShowRequest(false)}>
          <form
            className="store-request-form studio-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (d.mode === 'products') return;
              const requested = `${date}T${time}`;
              if (d.mode === 'booking' && new Date(requested).getTime() < Date.now()) {
                setNotice('Elige una fecha y hora futuras.');
                return;
              }
              demo.request({
                businessId: id,
                businessName: d.name,
                mode: d.mode,
                detail,
                date: d.mode === 'booking' ? `${date} ${time}` : '',
              });
              setShowRequest(false);
              setNotice('Solicitud guardada. Puedes seguirla en Mis pedidos.');
            }}
          >
            <button
              type="button"
              className="request-close"
              onClick={() => setShowRequest(false)}
              aria-label="Cerrar solicitud"
            >
              ×
            </button>
            <span className="studio-eyebrow">{d.name}</span>
            <h2>{actionLabel(d.mode)}</h2>
            <label>
              ¿Qué necesitas?
              <textarea
                required
                minLength={3}
                maxLength={1000}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </label>
            {d.mode === 'booking' && (
              <div className="form-two">
                <label>
                  Fecha preferida
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label>
                  Hora preferida
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
              </div>
            )}
            <p className="field-help">
              Prueba local. El negocio puede confirmar o responder desde su panel. No se envían
              notificaciones externas.
            </p>
            <button className="studio-primary" disabled={!demo.ready}>
              Enviar solicitud local <Check size={16} />
            </button>
            <Link className="studio-text-button" href="/pedidos">
              Ver mis solicitudes →
            </Link>
          </form>
        </EditorModal>
      )}
    </div>
  );
}
