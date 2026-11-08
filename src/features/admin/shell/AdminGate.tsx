import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AdminProvider } from '../AdminContext';
import type { StaffRole } from '../navigation';

/**
 * Access gate for the staff portal. The decision logic is unchanged from the original portal:
 *   1. auth still loading            → loading screen
 *   2. Supabase not configured       → setup explanation (no shared/hardcoded passwords, by design)
 *   3. not signed in                 → staff sign-in (signIn → refreshProfile)
 *   4. profile missing or customer   → "Access not authorised" + sign out
 *   5. staff role                    → portal (AdminProvider)
 * Sign-in, authorization and session logic are preserved while using shared visual components.
 */
const AdminGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading, signIn, signOut, refreshProfile } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = Boolean(profile?.role && profile.role !== 'customer');

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(form.email, form.password);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="container-page py-24 text-center text-slate-600">Loading administration portal…</div>;
  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-16"><div className="form-panel mx-auto max-w-xl">
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="mt-3 text-slate-600">
          Secure staff access cannot be enabled until the Supabase project is connected. Configure VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY, run the SQL migrations, create the first owner account and promote it to super_admin.
        </p>
        <a href="/" className="btn-outline mt-6">Back to website</a>
      </div></div>
    );
  }
  if (!user) {
    return (
      <form onSubmit={login} className="form-panel mx-auto my-16 max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Staff sign in</h1>
        <label className="form-label">
          Work email
          <input type="email" required autoComplete="username" className="form-control mt-1" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
        </label>
        <label className="form-label">
          Password
          <input type="password" required autoComplete="current-password" className="form-control mt-1" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} />
        </label>
        {error && <p role="alert" className="alert-error text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in to admin'}
        </button>
      </form>
    );
  }
  if (!allowed || !profile) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Access not authorised</h1>
        <p className="mt-2 text-slate-600">This account does not have a NexxaCraft staff role.</p>
        <button className="btn-outline mt-6" onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }
  return (
    <AdminProvider user={user} profile={profile} role={profile.role as StaffRole}>
      {children}
    </AdminProvider>
  );
};

export default AdminGate;
