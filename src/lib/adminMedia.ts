import { supabase } from '@/lib/supabase';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Uploads a site image to the public bucket; Storage policies still require an admin session. */
export async function uploadSiteImage(area: 'services' | 'portfolio', key: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Connect Supabase before uploading images.');
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 8 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'image';
  const path = `${area}/${key}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('site-media').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl;
}
