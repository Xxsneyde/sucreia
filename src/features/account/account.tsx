'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/ui';
import { useDemo } from '@/lib/demo-store';
export function Account() {
  const { reset, favorites, orders } = useDemo();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="TU ESPACIO"
        title="Hola, explorador."
        description="Estás navegando con un perfil de demostración."
      />
      <div className="two-columns">
        <section className="card">
          <div className="profile-avatar">S</div>
          <h2>Comunidad SucreIA</h2>
          <p className="muted">Sin sesión real iniciada.</p>
          <div className="profile-stats">
            <Link href="/pedidos">
              <strong>{orders.length}</strong> pedidos
            </Link>
            <Link href="/favoritos">
              <strong>{favorites.length}</strong> favoritos
            </Link>
          </div>
          <Link className="button" href="/ingresar">
            Acceso a la plataforma →
          </Link>
        </section>
        <section className="card">
          <h2>Explora cada espacio</h2>
          <div className="link-list">
            <Link href="/panel">Mi negocio →</Link>
            <Link href="/registro/negocio">Configurar un emprendimiento →</Link>
            <Link href="/domiciliario">Entregas →</Link>
            <Link href="/equipo">Guía del equipo →</Link>
          </div>
          <button className="text-button" onClick={() => setConfirm(true)}>
            Restablecer datos de demostración
          </button>
          {confirm && (
            <div className="notice">
              <p>Se borrarán el carrito, las solicitudes, los favoritos y el borrador local.</p>
              <button
                className="button secondary"
                onClick={() => {
                  reset();
                  setConfirm(false);
                }}
              >
                Restablecer demo
              </button>
              <button className="button subtle" onClick={() => setConfirm(false)}>
                Cancelar
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function SignIn() {
  return (
    <>
      <PageTitle
        eyebrow="BIENVENIDO A SUCREIA"
        title="Un lugar para conectar."
        description="La autenticación está prevista para la siguiente etapa."
      />
      <section className="card auth-card">
        <h2>Acceso de demostración</h2>
        <p className="muted">
          Elige el espacio que quieres explorar. Esta selección no crea cuentas ni concede permisos
          reales.
        </p>
        <div className="form-stack">
          <Link className="button" href="/">
            Explorar como cliente →
          </Link>
          <Link className="button secondary" href="/panel">
            Explorar como emprendedor →
          </Link>
          <Link className="text-button" href="/registro/negocio">
            Preparar mi negocio
          </Link>
        </div>
      </section>
    </>
  );
}
