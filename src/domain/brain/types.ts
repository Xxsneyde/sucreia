// Tipos del Asistente SucreIA: lo que sabe de cada negocio, cómo entiende una pregunta y
// cómo responde. La base se arma en el servidor (server/brain.ts) con los negocios publicados.
import type { BusinessMode } from '../types.ts';

export type BrainRole = 'cliente' | 'emprendedor' | 'admin' | 'visitante';

/** Horario de un día (horas en decimal: 13.5 = 1:30 p. m.). */
export interface DayHours {
  closed: boolean;
  opens: number;
  closes: number;
}
/** Semana de domingo (0) a sábado (6); null = ese día no se sabe. */
export type Week = (DayHours | null)[];

export interface BrainProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Grupo del catálogo («Tortas», «Postres»…). */
  group: string;
  details: { label: string; value: string }[];
  image: string;
  rating: number | null;
  ratingCount: number;
  /** Para cuántas personas rinde, si lo dice el producto. */
  serves: number | null;
}

export interface BrainStore {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  municipality: string;
  region: string;
  mode: BusinessMode;
  description: string;
  address: string;
  whatsapp: string;
  phone: string;
  email: string;
  hours: string;
  week: Week | null;
  delivery: boolean;
  deliveryFee: number;
  rating: number | null;
  reviewCount: number;
  verified: boolean;
  discount: number;
  promotions: { title: string; percent: number; expires: string }[];
  lat: number | null;
  lng: number | null;
  logo: string;
  cover: string;
  social: { instagram?: string; facebook?: string; tiktok?: string };
  reviews: { name: string; rating: number; comment: string }[];
  products: BrainProduct[];
}

/** Documento del índice: un negocio (product = -1) o uno de sus productos. */
export interface BrainDoc {
  store: number;
  product: number;
}
export interface Posting {
  doc: number;
  weight: number;
}
export interface Knowledge {
  stores: BrainStore[];
  docs: BrainDoc[];
  index: Map<string, Posting[]>;
  vocab: string[];
  names: { store: number; text: string; roots: string[] }[];
}
/** Coincidencia de búsqueda de un negocio, con el puntaje de cada producto. */
export interface StoreHit {
  store: number;
  score: number;
  product: number;
  matched: number;
  products: Map<number, number>;
}

export type Sort = 'relevance' | 'cheap' | 'best' | 'expensive' | 'near';
export interface Query {
  terms: string[];
  town: string;
  region: string;
  sector: string;
  subcategory: string;
  mode: BusinessMode | '';
  delivery: boolean;
  maxPrice: number;
  minPrice: number;
  people: number;
  openNow: boolean;
  /** Día pedido (0 = domingo); -1 = ninguno. */
  day: number;
  sort: Sort;
  promo: boolean;
  verified: boolean;
  near: boolean;
}
export type Attribute =
  | 'hours'
  | 'phone'
  | 'whatsapp'
  | 'address'
  | 'payment'
  | 'reviews'
  | 'social'
  | 'products'
  | 'price'
  | 'delivery'
  | 'promo'
  | 'about';
export interface Understood {
  query: Query;
  kind: 'search' | 'empty' | 'greeting' | 'thanks' | 'bye';
  attribute: Attribute | null;
  /** Posición pedida en la lista anterior («el segundo»); 9 = el último; -1 = ninguna. */
  pick: number;
  followUp: boolean;
  more: boolean;
}

export interface BrainLink {
  label: string;
  href: string;
  sub?: string;
  image?: string;
}
export interface Reply {
  text: string;
  links?: BrainLink[];
  cta?: BrainLink;
  chips?: string[];
}
/** Lo que el asistente recuerda de la conversación para entender «el segundo», «más baratos»… */
export interface BrainContext {
  query?: Query;
  results?: string[];
  products?: Record<string, string>;
  shown?: number;
  focus?: string;
}
export interface AnswerOptions {
  role: BrainRole;
  now?: Date;
  location?: { lat: number; lng: number } | null;
  /** Página de un negocio: el asistente responde sobre ese negocio. */
  store?: string;
  /** Estado de los negocios del emprendedor. */
  myStores?: { id?: string; name: string; status: string; note?: string }[];
  /** Resumen para el administrador. */
  admin?: { pending: number; approved: number; pqrsPending: number };
}
export interface Candidate {
  store: BrainStore;
  product: BrainProduct | null;
  score: number;
  distance: number | null;
  open: boolean | undefined;
}
