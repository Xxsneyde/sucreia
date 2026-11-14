'use client';
import Link from 'next/link';
import { ArrowUpRight, CircleDollarSign, ShoppingBag, Package, Truck, Eye } from 'lucide-react';
import { useDemo } from '@/lib/demo-store';
import { businesses } from '@/data/demo';
import { currency, orderSteps } from '@/domain/rules';
import { PageTitle, FeaturePlaceholder } from '@/components/ui';
export function Dashboard() {
  const { orders } = useDemo();
  const today = new Date().toLocaleDateString('es-CO');
  const sales = orders
    .filter(
      (o) =>
        new Date(o.createdAt).toLocaleDateString('es-CO') === today && o.status === 'delivered',
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
      <div className="notice">
        Panel de demostración: muestra las operaciones locales de todos los negocios de ejemplo. El
        aislamiento por empresa se implementará con autenticación.
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
        <Link className="button secondary" href="/registro/negocio">
          Configurar mi negocio →
        </Link>
      </section>
    </>
  );
}
export function BusinessOrders() {
  const store = useDemo();
  return (
    <>
      <PageTitle
        eyebrow="GESTIÓN DEL NEGOCIO"
        title="Pedidos y solicitudes"
        description="Prueba el recorrido de un pedido dentro de la demo."
      />
      {store.orders.map((o) => (
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
      <FeaturePlaceholder
        title="Citas y cotizaciones"
        description={`${store.requests.length} solicitudes locales registradas. La gestión de disponibilidad y las propuestas se conectarán en esta área.`}
        items={[
          'Confirmar o reprogramar reservas',
          'Preparar y enviar una cotización',
          'Registrar aceptación del cliente',
        ]}
      />
    </>
  );
}
export function ProductManagement() {
  return (
    <>
      <PageTitle
        eyebrow="TU CATÁLOGO"
        title="Productos y servicios"
        description="Base del módulo de catálogo. Edición e inventario pendientes de implementar."
      />
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Negocio</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {businesses.flatMap((b) =>
                b.products.map((p) => (
                  <tr key={`${b.id}-${p.id}`}>
                    <td>{p.name}</td>
                    <td>{b.name}</td>
                    <td>{currency(p.price)}</td>
                    <td>
                      <span className="tag">Ejemplo</span>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function BusinessSettings({
  section,
}: {
  section: 'perfil' | 'descuentos' | 'configuracion';
}) {
  const { draft } = useDemo();
  const content = {
    perfil: {
      title: 'La identidad de tu negocio',
      description: draft.name
        ? `Borrador guardado: ${draft.name}`
        : 'Completa el asistente para preparar tu primera vitrina.',
      items: [
        'Logo, portada y descripción',
        'Municipio, horarios y WhatsApp',
        'Verificación y actividad de los últimos 365 días',
      ],
    },
    descuentos: {
      title: 'Promociones que acercan clientes',
      description: 'Espacio reservado para crear y administrar promociones.',
      items: ['Vigencia y condiciones', 'Productos participantes', 'Bonos y SucrePuntos'],
    },
    configuracion: {
      title: 'Todo en su lugar',
      description: 'Configuración operativa del emprendimiento.',
      items: [
        'Datos de contacto y miembros del equipo',
        'Métodos de pago y datos bancarios',
        'Cobertura, entregas y notificaciones',
      ],
    },
  }[section];
  return (
    <>
      <PageTitle eyebrow="GESTIÓN DEL NEGOCIO" title={content.title} />
      <FeaturePlaceholder {...content} />
      {section === 'perfil' && (
        <Link className="button" href="/registro/negocio">
          Continuar configuración →
        </Link>
      )}
    </>
  );
}
