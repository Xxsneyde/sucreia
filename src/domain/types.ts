export type BusinessMode = 'products' | 'booking' | 'quote';
export type OrderStatus = 'received' | 'preparing' | 'dispatched' | 'delivered';
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}
export interface Business {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  municipality: string;
  description: string;
  mode: BusinessMode;
  theme: 'craft' | 'food' | 'beauty' | 'service';
  verified: boolean;
  completed365: number;
  rating: number;
  whatsapp: string | null;
  products: Product[];
  local?: boolean;
  cover?: string;
  logo?: string;
  /** Número de reseñas publicadas (solo en el listado de la API). */
  reviewCount?: number;
  address?: string;
  hours?: string;
  /** Precio más bajo del catálogo (0 si no hay productos). */
  minPrice?: number;
}
export interface CartLine {
  businessId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}
export interface Order {
  id: string;
  businessId: string;
  businessName: string;
  total: number;
  lines: CartLine[];
  status: OrderStatus;
  createdAt: string;
  discount?: number;
  deliveredAt?: string;
}
export interface ServiceRequest {
  id: string;
  businessId: string;
  businessName: string;
  mode: 'booking' | 'quote';
  detail: string;
  date: string;
  status: 'pending' | 'confirmed' | 'quoted' | 'accepted' | 'completed' | 'cancelled';
  quoteAmount?: number;
}
export interface BusinessDraft {
  name: string;
  category: string;
  mode: BusinessMode;
  style: string;
  description: string;
}
