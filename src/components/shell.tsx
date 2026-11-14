'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  Gift,
  GraduationCap,
  MapPin,
  Store,
  LayoutDashboard,
  Package,
  Truck,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  Leaf,
} from 'lucide-react';
import { DemoProvider, useDemo } from '@/lib/demo-store';
const customer = [
  { href: '/', label: 'Descubrir', icon: Compass },
  { href: '/buscar', label: 'Buscar negocios', icon: Search },
  { href: '/pedidos', label: 'Mis pedidos', icon: ShoppingBag },
  { href: '/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/puntos', label: 'SucrePuntos', icon: Gift },
  { href: '/escuela', label: 'Escuela emprendedora', icon: GraduationCap },
  { href: '/mapa', label: 'Explorar Sucre', icon: MapPin },
];
const merchant = [
  { href: '/panel', label: 'Resumen', icon: LayoutDashboard },
  { href: '/panel/pedidos', label: 'Pedidos y solicitudes', icon: ShoppingBag },
  { href: '/panel/productos', label: 'Productos y servicios', icon: Package },
  { href: '/panel/perfil', label: 'Mi negocio', icon: Store },
  { href: '/panel/descuentos', label: 'Descuentos', icon: Gift },
  { href: '/panel/configuracion', label: 'Configuración', icon: Settings },
];
function Layout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const business = path.startsWith('/panel');
  const demo = useDemo();
  const active = (href: string) => path === href;
  return (
    <div className="app">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <ShoppingBag size={23} />
          </span>
          Sucre<span>IA</span>
        </Link>
        <p className="nav-label">{business ? 'ESPACIO DEL NEGOCIO' : 'DESCUBRE LO NUESTRO'}</p>
        <nav aria-label="Navegación principal">
          {(business ? merchant : customer).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${active(href) ? 'active' : ''}`}
              aria-current={active(href) ? 'page' : undefined}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-invite">
          <span className="mini-leaf">
            <Leaf size={22} />
          </span>
          <h3>Tu idea merece crecer.</h3>
          <p>Haz parte de la comunidad de emprendedores de Sucre.</p>
          <Link href="/registro/negocio">
            Crear mi negocio <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link href="/domiciliario">
            <Truck size={17} /> Entregas
          </Link>
          <Link href="/admin">
            <ShieldCheck size={17} /> Administración
          </Link>
          <Link href="/equipo">Guía del proyecto ↗</Link>
        </div>
        <span className="sidebar-footer">Hecho para nuestra tierra.</span>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link className="mobile-brand brand" href="/">
            Sucre<span>IA</span>
          </Link>
          <span className="location">
            <MapPin size={16} /> Sucre, Colombia
          </span>
          <div className="topbar-actions">
            <Link className={!business ? 'view-switch selected' : 'view-switch'} href="/">
              Explorar
            </Link>
            <Link className={business ? 'view-switch selected' : 'view-switch'} href="/panel">
              <Store size={15} /> Mi negocio
            </Link>
            <Link className="avatar" href="/perfil" aria-label="Mi perfil">
              S
            </Link>
          </div>
        </header>
        <div className="demo-banner">
          <span className="live-dot" /> Prototipo del equipo{' '}
          <span>· Datos de ejemplo. Operaciones locales, sin pagos ni envíos reales.</span>
        </div>
        {demo.storageError && (
          <p role="status" className="notice">
            No se pudo recuperar o guardar la demo en este navegador. Puedes seguir explorando.
          </p>
        )}
        <main id="contenido" className="main">
          {children}
        </main>
        <footer className="footer">
          SucreIA <span>Conectamos talento local con nuevas oportunidades.</span>
          <Link href="/equipo">Versión 0.1.0</Link>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {[
          { href: '/', label: 'Inicio', icon: Compass },
          { href: '/buscar', label: 'Buscar', icon: Search },
          { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
          { href: '/perfil', label: 'Perfil', icon: UserRound },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={active(href) ? 'active' : ''}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <Layout>{children}</Layout>
    </DemoProvider>
  );
}
