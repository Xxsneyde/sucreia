// Lo que devuelve GET /api/plataforma/admin (solo administradores).
import type { BusinessMode } from '@/domain/types';
import type { Courier, StoreSettings } from '@/domain/platform';
import type { DocumentKind, PersonType } from '@/domain/documents';

export interface AdminStore {
  id: string;
  name: string;
  /** pending = esperando la aprobación del registro. */
  registration: 'none' | 'pending' | 'approved' | 'rejected';
  /** Datos enviados a revisión (o el borrador, si no hay solicitud). */
  details: {
    name: string;
    category: string;
    subcategory: string;
    municipality: string;
    description: string;
    whatsapp: string;
    phone: string;
    email: string;
    address: string;
    hours: string;
    mode: BusinessMode;
    logo: string;
    cover: string;
    products: { name: string; price: number; image: string; description: string }[];
  };
  ownerId: string;
  owner?: {
    name: string;
    email: string;
    document_number: string | null;
    home_address: string | null;
  };
  legalType: PersonType;
  documents: { kind: DocumentKind; name: string; mime: string; uploadedAt: string }[];
  missing: DocumentKind[];
  published: boolean;
  settings: StoreSettings;
}
export interface AdminData {
  stores: AdminStore[];
  pqrs: {
    id: string;
    kind: string;
    email: string;
    name: string;
    message: string;
    status: string;
  }[];
  couriers: Courier[];
  users: number;
  audit: { action: string; target: string; note: string; at: string }[];
}
