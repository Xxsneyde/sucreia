import { PageTitle } from '@/components/ui';
const modules = [
  ['Catálogo y búsqueda', 'Navegable con filtros', 'features/marketplace'],
  ['Carrito y pedidos', 'Flujo local de demostración', 'features/orders'],
  ['Panel del negocio', 'Indicadores y cambios de estado de demo', 'features/business'],
  [
    'Configurador de negocios',
    'Recorrido y borrador; plantillas pendientes',
    'features/onboarding',
  ],
  ['SucrePuntos', 'Pantalla base; reglas y canje pendientes', 'features/rewards'],
  ['Autenticación y perfil', 'Accesos de demo; autenticación pendiente', 'features/account'],
  [
    'Escuela, territorio y entregas',
    'Pantallas base; integraciones pendientes',
    'features/community',
  ],
  ['Administración', 'Pantallas base; permisos pendientes', 'features/admin'],
];
export function ProjectGuide() {
  return (
    <>
      <PageTitle
        eyebrow="CONSTRUIMOS EN EQUIPO"
        title="Una base, muchas manos."
        description="Mapa del esqueleto de SucreIA y del trabajo que viene."
      />
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Estado</th>
                <th>Carpeta en src/</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m[0]}>
                  {m.map((v) => (
                    <td key={v}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="two-columns">
        <section className="card">
          <h2>Una tarea, una rama</h2>
          <ol className="checklist">
            <li>Registrar la tarea en GitHub Issues.</li>
            <li>Crear una rama feature/nombre-de-la-tarea.</li>
            <li>Trabajar en el módulo correspondiente.</li>
            <li>Ejecutar npm run check.</li>
            <li>Abrir un pull request y pedir revisión.</li>
            <li>Integrar después de aprobar y pasar las comprobaciones.</li>
          </ol>
        </section>
        <section className="card">
          <h2>Siguiente etapa</h2>
          <p>
            Desarrollar el configurador de negocios: registro progresivo, carga de logo y ofertas,
            reglas de diseño, vista previa y publicación.
          </p>
          <p className="muted">
            La arquitectura, los contratos de datos y las tareas propuestas están documentados en el
            repositorio.
          </p>
          <span className="tag">React · TypeScript · Next.js</span>
        </section>
      </div>
    </>
  );
}
