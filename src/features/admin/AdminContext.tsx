import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth, type UserProfile } from '@/context/AuthContext';
import { canAccessModule, navForRole, type AdminModuleId, type AdminNavItem, type StaffRole } from './navigation';

interface AdminContextValue {
  user: User;
  profile: UserProfile;
  role: StaffRole;
  /** Navigation entries this role may open. */
  nav: AdminNavItem[];
  can: (moduleId: AdminModuleId) => boolean;
  /**
   * Incremented by the top-bar "Refresh" action. Pages include it in their data-loading
   * dependencies (e.g. `useAsync(load, [refreshKey])`) so one click re-syncs the open view.
   */
  refreshKey: number;
  refresh: () => void;
  signOut: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

/** Rendered only after AdminGate has confirmed a signed-in user with a staff role. */
export const AdminProvider: React.FC<{ user: User; profile: UserProfile; role: StaffRole; children: React.ReactNode }> = ({ user, profile, role, children }) => {
  const { signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const value = useMemo<AdminContextValue>(
    () => ({
      user,
      profile,
      role,
      nav: navForRole(role),
      can: (moduleId) => canAccessModule(role, moduleId),
      refreshKey,
      refresh,
      signOut,
    }),
    [user, profile, role, refreshKey, refresh, signOut],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside the staff portal (AdminProvider).');
  return value;
}
