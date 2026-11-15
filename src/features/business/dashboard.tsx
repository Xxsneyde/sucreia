'use client';
import Link from 'next/link';
import { ArrowUpRight, CircleDollarSign, ShoppingBag, Package, Truck, Eye } from 'lucide-react';
import { useDemo } from '@/lib/demo-store';
import { useStudio } from '@/lib/studio-store';
import {
  StoreSelector,
  RequestManager,
  LocalCatalog,
  LocalBusinessProfile,
} from './local-management';
import { businesses } from '@/data/demo';
import { currency, orderSteps } from '@/domain/rules';
import { PageTitle, FeaturePlaceholder } from '@/components/ui';
export function Dashboard() {
  const { orders: allOrders } = useDemo();
  const studio = useStudio();
  const orders = allOrders.filter((o) => !studio.selectedId || o.businessId === studio.selectedId);
  const today = new Date().toLocaleDateString('es-CO');
  const sales = orders
    .filter(
      (o) =>
        new Date(o.deliveredAt ?? o.createdAt).toLocaleDateString('es-CO') === today &&
        o.status === 'delivered',
    )
    .reduce((n, o) => n + o.total, 0);
  const stats = [
    {
      label: 'Ventas del día',
      value: currency(sales),
      icon: CircleDollarSign,
      note: 'Pedidos de demo entregados hoy',
    },
    {
      label: 'Pedidos nuevos',
      value: orders.filter((o) => o.status === 'received').length,
      icon: ShoppingBag,
      note: 'Esperando confirmación',
    },
    {
      label: 'Por despachar',
      value: orders.filter((o) => o.status === 'preparing').length,
      icon: Package,
      note: 'En preparación',
    },
    {
      label: 'Por entregar',
      value: orders.filter((o) => o.status === 'dispatched').length,
      icon: Truck,
      note: 'En camino',
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="EL PULSO DE TU NEGOCIO"
        title="Vamos a seguir creciendo."
        description="Un vistazo a lo que pasa hoy en tu emprendimiento."
        action={
          <Link className="button" href="/panel/perfil">
            Ver mi negocio <ArrowUpRight size={17} />
          </Link>
        }
      />
      <StoreSelector />
      <div className="studio-dashboard-shortcut">
        <div>
          <span className="studio-eyebrow">TU MARCA, TU ESPACIO</span>
          <h2>Diseña algo que se sienta tuyo.</h2>
          <p>Tu editor visual y tus tiendas, en un solo lugar.</p>
        </div>
        <Link className="studio-primary" href="/estudio">
          Abrir mi estudio →
        </Link>
      </div>
      <div className="notice">
        Panel de demostración: filtra las operaciones locales por negocio. Las cuentas y permisos
        reales se implementarán al conectar el servidor.
      </div>
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, note }) => (
          <article className="card stat" key={label}>
            <div className="row between">
              <span>{label}</span>
              <Icon size={20} />
            </div>
            <strong>{value}</strong>
            <span className="small muted">{note}</span>
          </article>
        ))}
      </div>
      <div className="two-columns">
        <section className="card">
          <div className="section-heading">
            <h2>Últimos pedidos</h2>
            <Link href="/panel/pedidos" className="text-button">
              Ver todos →
            </Link>
          </div>
          {orders.slice(0, 4).map((o) => (
            <div className="list-row" key={o.id}>
              <span className="item-icon">
                <ShoppingBag size={20} />
              </span>
              <div className="grow">
                <h3>{o.businessName}</h3>
                <p className="small muted">
                  {o.id} · {orderSteps.find((s) => s.status === o.status)?.label}
                </p>
              </div>
              <strong>{currency(o.total)}</strong>
            </div>
          ))}
        </section>
        <section className="card">
          <span className="tag">
            <Eye size={14} /> Ejemplo de analítica
          </span>
          <h2>Productos más vistos</h2>
          {['Bolso de caña flecha', 'Torta de chocolate', 'Sombrero artesanal'].map((name, i) => (
            <div className="ranking" key={name}>
              <span>0{i + 1}</span>
              <div className="grow">
                <p>{name}</p>
                <div className="bar">
                  <i style={{ width: `${90 - i * 25}%` }} />
                </div>
              </div>
              <strong>{[124, 98, 62][i]}</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="growth-banner">
        <div>
          <p className="eyebrow">TU SIGUIENTE PASO</p>
          <h2>Dale personalidad a tu vitrina.</h2>
          <p>Comienza con la configuración de tu negocio.</p>
        </div>
        <Link className="button secondary" href="/estudio">
          Abrir editor visual →
        </Link>
      </section>
    </>
  );
}
export function BusinessOrders() {
  const store = useDemo();
  const studio = useStudio();
  return (
    <>
      <PageTitle
        eyebrow="GESTIÓN DEL NEGOCIO"
        title="Pedidos y solicitudes"
        description="Prueba el recorrido de un pedido dentro de la demo."
      />
      <StoreSelector />
      {store.orders
        .filter((o) => !studio.selectedId || o.businessId === studio.selectedId)
        .map((o) => (
          <section className="card list-row" key={o.id}>
            <div className="grow">
              <h2>{o.id}</h2>
              <p>
                {o.businessName} · {currency(o.total)}
              </p>
              <span className="tag">{orderSteps.find((s) => s.status === o.status)?.label}</span>
            </div>
            <button
              className="button secondary"
              disabled={o.status === 'delivered'}
              onClick={() => store.advance(o.id)}
            >
              {o.status === 'delivered' ? 'Entregado' : 'Avanzar estado de demo →'}
            </button>
          </section>
        ))}
      <RequestManager />
    </>
  );
}
export function ProductManagement() {
  return <LocalCatalog />;
}
export function BusinessSettings({
  section,
}: {
  section: 'perfil' | 'descuentos' | 'configuracion';
}) {
  if (section === 'perfil' || section === 'configuracion') return <LocalBusinessProfile />;
  return (
    <>
      <PageTitle
        eyebrow="BENEFICIOS LOCALES"
        title="Promociones que acercan"
        description="Prueba el canje de puntos y el descuento aplicado en el carrito."
      />
      <section className="card">
        <h2>Bono de bienvenida · 10%</h2>
        <p>
          La plataforma local permite canjear 500 puntos por un bono de un solo uso. Los clientes
          reciben 100 puntos al completar un pedido.
        </p>
        <Link className="button" href="/puntos">
          Probar SucrePuntos →
        </Link>
        <p className="muted small">
          La creación de campañas propias por negocio se implementará con sus reglas comerciales.
        </p>
      </section>
    </>
  );
}
