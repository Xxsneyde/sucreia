'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty card" role="alert">
      <h1>No pudimos cargar esta pantalla</h1>
      <p>Inténtalo nuevamente.</p>
      <button className="button" onClick={reset}>
        Volver a intentar
      </button>
    </div>
  );
}
