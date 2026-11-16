import { ref } from 'vue';
import type { StoreDesign } from '@/domain/studio';
import { api } from './api';
export interface LibraryImage {
  id: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  references: number;
  createdAt: string;
}
export const imageUploads = ref(0);
export async function uploadImage(data: string) {
  return (await api<{ image: LibraryImage }>('POST', '/imagenes', { data })).image.url;
}

/** Tras iniciar sesión, sube las fotos del configurador por separado para no enviar un JSON enorme. */
export async function prepareDesignImages(design: StoreDesign): Promise<StoreDesign> {
  const copy: StoreDesign = JSON.parse(JSON.stringify(design));
  const uploaded = new Map<string, string>();
  async function convert(url: string) {
    if (!url.startsWith('data:')) return url;
    if (!uploaded.has(url)) uploaded.set(url, await uploadImage(url));
    return uploaded.get(url)!;
  }
  copy.logo = await convert(copy.logo);
  copy.content.heroImage = await convert(copy.content.heroImage);
  copy.content.storyImage = await convert(copy.content.storyImage);
  for (const p of copy.products) p.image = await convert(p.image);
  return copy;
}
