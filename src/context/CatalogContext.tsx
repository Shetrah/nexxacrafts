import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { listServiceRecords } from '@/lib/api/services';
import { services as defaultServices, type ServiceDefinition, type ServiceField } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';

const CatalogContext = createContext<readonly ServiceDefinition[]>(defaultServices);

function fromRecord(row: Awaited<ReturnType<typeof listServiceRecords>>[number], base?: ServiceDefinition): ServiceDefinition {
  return {
    ...base,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    pricingMode: row.pricing_mode,
    allowFileUploads: row.allow_file_uploads ?? base?.allowFileUploads ?? false,
    fields: Array.isArray(row.fields) ? row.fields as unknown as ServiceField[] : base?.fields ?? [],
    tagline: base?.tagline ?? `Made to fit your ${row.category.toLowerCase()} project.`,
    turnaround: base?.turnaround ?? 'Confirmed after review',
    icon: base?.icon ?? 'Sparkles',
    image: row.image_url ?? base?.image ?? 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<readonly ServiceDefinition[]>(defaultServices);

  useEffect(() => {
    if (!supabase) { setCatalog(defaultServices); return; }
    let active = true;
    const reload = () => void listServiceRecords()
      .then((rows) => {
        if (!active) return;
        const base = new Map(defaultServices.map((service) => [service.slug, service]));
        const activeRows = rows.filter((row) => row.is_active);
        setCatalog(activeRows.map((row) => fromRecord(row, base.get(row.slug))));
      })
      .catch((error: unknown) => console.error('Unable to load the service catalogue', error));
    reload();
    window.addEventListener('nexxacraft:catalog-updated', reload);
    return () => { active = false; window.removeEventListener('nexxacraft:catalog-updated', reload); };
  }, []);

  const value = useMemo(() => catalog, [catalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
