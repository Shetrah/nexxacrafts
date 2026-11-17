import type { PortfolioProjectRow } from '@/types/db';
import { columnsOf, expectRows, expectRow, getClient } from './client';

const PORTFOLIO_COLUMNS = columnsOf<PortfolioProjectRow>()(
  'slug,title,category,client,summary,description,services,image_url,gallery_images,link_url,link_label,illustrative,featured,sort_order,is_active,created_at,updated_at',
);

export async function listPortfolioProjects(includeInactive = false): Promise<PortfolioProjectRow[]> {
  const client = getClient();
  let query = client.from('portfolio_projects').select(PORTFOLIO_COLUMNS);
  if (!includeInactive) query = query.eq('is_active', true);
  return expectRows<PortfolioProjectRow>(await query.order('sort_order').order('title'));
}

export async function getPortfolioProject(slug: string): Promise<PortfolioProjectRow | null> {
  const client = getClient();
  const { data, error } = await client.from('portfolio_projects').select(PORTFOLIO_COLUMNS).eq('slug', slug).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data as PortfolioProjectRow | null;
}

export type PortfolioProjectPatch = Partial<Pick<PortfolioProjectRow,
  'title' | 'category' | 'client' | 'summary' | 'description' | 'services' | 'image_url' | 'gallery_images' | 'link_url' | 'link_label' | 'illustrative' | 'featured' | 'sort_order' | 'is_active'>>;

export async function updatePortfolioProject(slug: string, patch: PortfolioProjectPatch): Promise<PortfolioProjectRow> {
  const client = getClient();
  const { data, error } = await client.from('portfolio_projects').update(patch).eq('slug', slug).select(PORTFOLIO_COLUMNS).single();
  if (error) throw error;
  return expectRow<PortfolioProjectRow>({ data, error: null });
}
