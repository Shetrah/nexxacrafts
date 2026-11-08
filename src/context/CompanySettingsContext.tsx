import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { COMPANY_SETTING_DEFAULTS, loadPublicCompanySettings } from '@/lib/api/settings';
import { supabase } from '@/lib/supabase';

const PublicCompanySettingsContext = createContext<Record<string, string>>(COMPANY_SETTING_DEFAULTS);

export function CompanySettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>(COMPANY_SETTING_DEFAULTS);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    loadPublicCompanySettings()
      .then((saved) => { if (active) setSettings({ ...COMPANY_SETTING_DEFAULTS, ...saved }); })
      .catch((error) => console.error('Unable to load public company settings', error));
    return () => { active = false; };
  }, []);

  const value = useMemo(() => settings, [settings]);
  return <PublicCompanySettingsContext.Provider value={value}>{children}</PublicCompanySettingsContext.Provider>;
}

export function useCompanySettings() {
  return useContext(PublicCompanySettingsContext);
}
