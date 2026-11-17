import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Logo } from '@/components/brand/Logo';
import { AdminProvider } from '../AdminContext';
import type { StaffRole } from '../navigation';

const AdminGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading, signIn, signOut, refreshProfile } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const allowed = Boolean(profile?.role && profile.role !== 'customer');

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await signIn(form.email, form.password); await refreshProfile(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="admin-auth-screen"><div className="admin-auth-loader" role="status">Loading your secure workspace…</div></div>;
  if (!isSupabaseConfigured) return <div className="admin-auth-screen"><div className="admin-auth-card max-w-xl"><Logo variant="wordmark" className="h-8 w-auto"/><h1 className="mt-8 text-2xl font-extrabold">Connect your secure workspace</h1><p className="mt-3 text-sm leading-6 text-slate-500">Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, apply the SQL migrations, then create the first owner account and promote it to admin.</p><Link to="/" className="btn-primary mt-6">Back to website <ArrowRight size={16}/></Link></div></div>;

  if (!user) return <main className="admin-auth-screen">
    <div className="admin-auth-orb admin-auth-orb-one"/><div className="admin-auth-orb admin-auth-orb-two"/>
    <div className="admin-auth-top"><Link to="/" aria-label="NexxaCraft home"><Logo variant="wordmark" tone="inverse" className="h-8 w-auto"/></Link><span className="admin-auth-secure"><LockKeyhole size={14}/> SECURE STAFF ACCESS</span></div>
    <div className="admin-auth-layout">
      <section className="admin-auth-intro"><div className="admin-auth-kicker"><Sparkles size={15}/> NEXXACRAFT WORKSPACE</div><h1>Make great work <span>move forward.</span></h1><p>Your team’s projects, customers and production pipeline come together in one calm, focused workspace.</p><div className="admin-auth-points"><div><span><ShieldCheck size={17}/></span><p><strong>Protected access</strong><small>Only approved team accounts can continue.</small></p></div><div><span><ActivityIcon/></span><p><strong>Everything in sync</strong><small>Stay close to the work that matters today.</small></p></div></div><p className="admin-auth-foot">DESIGN <i/> PRINT <i/> BUILD <b>·</b> NEXXACRAFT</p></section>
      <form onSubmit={login} className="admin-auth-card">
        <div className="admin-auth-card-icon"><LockKeyhole size={22}/></div><p className="admin-auth-card-kicker">STAFF PORTAL</p><h2>Welcome back.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your NexxaCraft team account.</p>
        <label className="admin-auth-label" htmlFor="admin-email">Work email</label><input id="admin-email" type="email" required autoComplete="username" placeholder="you@company.com" className="admin-auth-input" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}/>
        <label className="admin-auth-label mt-5" htmlFor="admin-password">Password</label><div className="admin-auth-password"><input id="admin-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Enter your password" className="admin-auth-input" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
        {error && <p role="alert" className="admin-auth-error">{error}</p>}
        <button className="admin-auth-submit" disabled={busy}>{busy ? 'Signing in…' : <>Enter workspace <ArrowRight size={17}/></>}</button>
        <p className="mt-5 text-center text-xs text-slate-400">Your access is protected by NexxaCraft account security.</p>
      </form>
    </div>
    <div className="admin-auth-bottom"><span>© {new Date().getFullYear()} NexxaCraft</span><span>Built for teams who make things matter.</span></div>
  </main>;

  if (!allowed || !profile) return <div className="admin-auth-screen"><div className="admin-auth-card max-w-lg text-center"><div className="admin-auth-card-icon mx-auto"><ShieldCheck size={23}/></div><h1 className="mt-5 text-2xl font-extrabold">Access not authorised</h1><p className="mt-2 text-sm text-slate-500">This account does not have a NexxaCraft staff role.</p><button className="btn-outline mt-6" onClick={() => signOut()}>Sign out</button></div></div>;
  return <AdminProvider user={user} profile={profile} role={profile.role as StaffRole}>{children}</AdminProvider>;
};

function ActivityIcon() { return <span className="admin-activity-icon" aria-hidden="true"/>; }

export default AdminGate;
