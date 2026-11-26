// Ficha técnica de productos y servicios: características sugeridas según el sector del negocio.
import { sectorFor } from './sectors.ts';

const bySector: Record<string, string[]> = {
  'Gastronomía y alimentos': [
    'Tamaño',
    'Peso o libras',
    'Porciones',
    'Ingredientes',
    'Sabores disponibles',
    'Alérgenos',
    'Tiempo de preparación',
  ],
  'Bebidas y licorerías': ['Presentación', 'Contenido', 'Grado de alcohol', 'Origen'],
  'Agro y agroindustria': ['Origen', 'Presentación', 'Peso / unidad', 'Cosecha'],
  'Moda y confección': ['Material', 'Tallas', 'Colores', 'Cuidados'],
  'Belleza y bienestar': ['Duración', 'Incluye', 'Productos que se usan', 'Recomendaciones'],
  'Salud y farmacia': ['Presentación', 'Indicaciones', 'Requiere fórmula', 'Laboratorio'],
  'Tecnología y digital': ['Marca / modelo', 'Especificaciones', 'Garantía', 'Incluye'],
  'Construcción y ferretería': ['Material', 'Medidas', 'Marca', 'Uso recomendado'],
  'Turismo y hospedaje': ['Capacidad', 'Incluye', 'Duración', 'Punto de encuentro'],
  'Decoración y artículos para el hogar': ['Material', 'Medidas', 'Colores', 'Hecho a mano'],
  'Floristerías y regalos': ['Contenido', 'Tamaño', 'Personalización', 'Tiempo de entrega'],
  'Mascotas y animales': ['Para', 'Presentación', 'Ingredientes / material', 'Recomendaciones'],
  'Fotografía y producción audiovisual': [
    'Duración',
    'Entregables',
    'Incluye',
    'Tiempo de entrega',
  ],
  'Eventos y entretenimiento': ['Capacidad', 'Duración', 'Incluye', 'Requisitos'],
  'Educación y formación': ['Modalidad', 'Duración', 'Dirigido a', 'Certificado'],
};
/** Para los demás sectores. */
const general = ['Material / composición', 'Tamaño o presentación', 'Incluye', 'Garantía'];

const examples: Record<string, string> = {
  Tamaño: 'Ej.: pequeña, mediana o grande',
  'Peso o libras': 'Ej.: 2 libras',
  Porciones: 'Ej.: 10 porciones',
  Ingredientes: 'Ej.: harina, cacao, leche',
  'Sabores disponibles': 'Ej.: chocolate, vainilla, tres leches',
  Alérgenos: 'Ej.: contiene gluten y lácteos',
  'Tiempo de preparación': 'Ej.: 2 días de anticipación',
  Tallas: 'Ej.: S, M, L, XL',
  Colores: 'Ej.: negro, blanco, beige',
  Material: 'Ej.: algodón 100 %',
  Medidas: 'Ej.: 40 × 30 cm',
  Duración: 'Ej.: 45 minutos',
  Incluye: 'Ej.: lavado y secado',
};
/** Ejemplo para el campo de una característica ('' si no hay). */
export const detailExample = (label: string): string => examples[label] ?? '';

/** Características sugeridas para el sector de una categoría guardada. */
export function detailFieldsFor(category: string): string[] {
  return bySector[sectorFor(category).id] ?? general;
}

/** Quita espacios y las características vacías (máximo ocho). */
export function cleanDetails(
  details: { label: string; value: string }[] | undefined,
): { label: string; value: string }[] {
  return (details ?? [])
    .map((d) => ({ label: d.label.trim(), value: d.value.trim() }))
    .filter((d) => d.label && d.value)
    .slice(0, 8);
}
