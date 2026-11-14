import { PageTitle, FeaturePlaceholder } from '@/components/ui';
export function Admin() {
  return (
    <>
      <PageTitle
        eyebrow="CUIDAMOS LA COMUNIDAD"
        title="Administración de SucreIA"
        description="Estructura del área administrativa. No contiene datos privados ni acciones reales."
      />
      <div className="two-columns">
        <FeaturePlaceholder
          title="Negocios y verificación"
          description="Revisar solicitudes y gestionar la distinción de negocio verificado."
          items={[
            'Solicitudes pendientes',
            'Evidencia y criterios de verificación',
            'Historial de decisiones',
          ]}
        />
        <FeaturePlaceholder
          title="Operación de la plataforma"
          description="Herramientas para el equipo responsable de SucreIA."
          items={[
            'Gestión de categorías y municipios',
            'Moderación y atención de reportes',
            'Reglas de SucrePuntos y promociones',
          ]}
        />
      </div>
      <div className="notice">
        Antes de conectar datos reales, este módulo necesita autenticación, permisos de
        administrador y registro de auditoría en el servidor.
      </div>
    </>
  );
}
