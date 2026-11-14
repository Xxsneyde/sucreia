import type { Business, Order } from '@/domain/types';
export const businesses: Business[] = [
  {
    id: 'raices-de-sucre',
    name: 'Raíces de Sucre',
    category: 'Artesanías',
    municipality: 'Sincelejo',
    description:
      'Piezas que cuentan nuestra historia. Bolsos y accesorios tejidos a mano, con fibras naturales y mucho corazón.',
    mode: 'products',
    theme: 'craft',
    verified: true,
    completed365: 128,
    rating: 4.9,
    whatsapp: null,
    products: [
      {
        id: 'bolso',
        name: 'Bolso de caña flecha',
        description: 'Tejido a mano · color natural',
        price: 85000,
      },
      {
        id: 'sombrero',
        name: 'Sombrero artesanal',
        description: 'Tradición que se lleva puesta',
        price: 120000,
      },
      {
        id: 'canasto',
        name: 'Canasto de iraca',
        description: 'Una pieza única para tu hogar',
        price: 45000,
      },
    ],
  },
  {
    id: 'delicias-de-sucre',
    name: 'Delicias de Sucre',
    category: 'Gastronomía',
    municipality: 'Sincelejo',
    description:
      'Sabores de casa para compartir. Repostería artesanal, pasabocas y pequeños momentos felices.',
    mode: 'products',
    theme: 'food',
    verified: true,
    completed365: 346,
    rating: 4.8,
    whatsapp: null,
    products: [
      {
        id: 'torta',
        name: 'Torta de chocolate',
        description: 'Para compartir · 10 porciones',
        price: 85000,
      },
      {
        id: 'cupcakes',
        name: 'Caja de cupcakes',
        description: '6 unidades recién horneadas',
        price: 20000,
      },
      { id: 'pasabocas', name: 'Pasabocas surtidos', description: '25 unidades', price: 25000 },
    ],
  },
  {
    id: 'alma-estudio',
    name: 'Alma Estudio',
    category: 'Belleza',
    municipality: 'Corozal',
    description:
      'Un espacio para cuidarte. Cortes, peinados y tratamientos con atención personalizada.',
    mode: 'booking',
    theme: 'beauty',
    verified: false,
    completed365: 42,
    rating: 4.9,
    whatsapp: null,
    products: [
      {
        id: 'corte',
        name: 'Corte y estilo',
        description: '45 minutos · atención con cita',
        price: 35000,
      },
      { id: 'tratamiento', name: 'Tratamiento capilar', description: '60 minutos', price: 65000 },
      {
        id: 'peinado',
        name: 'Peinado especial',
        description: 'Consulta disponibilidad',
        price: 50000,
      },
    ],
  },
  {
    id: 'soluciones-caribe',
    name: 'Soluciones Caribe',
    category: 'Servicios',
    municipality: 'Sincelejo',
    description:
      'Mantenimiento e instalación de aires acondicionados. Cuéntanos qué necesitas y recibe una propuesta.',
    mode: 'quote',
    theme: 'service',
    verified: false,
    completed365: 67,
    rating: 4.7,
    whatsapp: null,
    products: [],
  },
];
export const demoOrders: Order[] = [
  {
    id: 'SC-1024',
    businessId: 'delicias-de-sucre',
    businessName: 'Delicias de Sucre',
    total: 85000,
    lines: [
      {
        businessId: 'delicias-de-sucre',
        productId: 'torta',
        name: 'Torta de chocolate',
        price: 85000,
        quantity: 1,
      },
    ],
    status: 'preparing',
    createdAt: '2026-11-13T15:00:00-05:00',
  },
];
