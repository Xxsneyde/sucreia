/** Descarga un archivo generado en el navegador (exportar diseño, etc.). */
export function downloadFile(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Reduce la imagen a 1200 px como máximo y la devuelve como data URL WebP. */
export async function readImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Elige una imagen JPG, PNG o WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 8 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba otro archivo JPG, PNG o WebP.');
  }
  if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) {
    bitmap.close();
    throw new Error('Elige una imagen de hasta 40 megapíxeles.');
  }
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/webp', 0.8);
    if (result.length > 1_400_000)
      throw new Error('La imagen es demasiado pesada. Prueba una más pequeña.');
    return result;
  } finally {
    bitmap.close();
  }
}
