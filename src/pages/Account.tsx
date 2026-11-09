import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, UserRound, LogOut, ShieldCheck, PackageSearch, Loader2, MailCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Logo } from '../components/brand/Logo';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';
type AccountOrder = { id: string; reference: string; status: string; payment_status: string; created_at: string };

function authErrorMessage(error: unknown, mode: AuthMode): string {
  if (error && typeof error === 'object') {
    const detail = error as { message?: string; status?: number; code?: string };
    if (detail.message && /domain is not verified|verify your domain/i.test(detail.message)) {
      return 'Resend rejected the sender address because its domain is not verified. Verify a domain in Resend, then use a From address on that domain in Supabase SMTP settings.';
    }
    if (detail.status && detail.status >= 500) {
      const action = mode === 'signup'
        ? 'Check Supabase Auth logs for an email SMTP/template error or a failing on_auth_user_created database trigger.'
        : 'Check Supabase Auth logs for the server-side cause.';
      return `Supabase Auth returned a server error (${detail.status}). ${action}${detail.code ? ` Error code: ${detail.code}.` : ''}`;
    }
    if (detail.message) return detail.message;
  }
  return 'Authentication failed. Please try again.';
}

const Account: React.FC = () => {
  const { user, profile, loading, signIn, signUp, resendSignupConfirmation, signOut, requestPasswordReset, updatePassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(() => new URLSearchParams(window.location.search).get('mode') === 'reset' ? 'reset' : 'signin');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(new URLSearchParams(window.location.search).has('confirmed') ? 'Your email is confirmed. You can now sign in.' : '');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setError('');
        setMessage('Choose a new password for your account.');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;
    supabase.from('orders').select('id,reference,status,payment_status,created_at').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setOrders((data || []) as AccountOrder[]));
  }, [user]);

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setAccountCreated(false);
    setShowPassword(false);
    setError('');
    setMessage('');
    if (nextMode !== 'reset' && window.location.search.includes('mode=reset')) window.history.replaceState({}, '', '/account');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signin') {
        await signIn(form.email, form.password);
      } else if (mode === 'signup') {
        await signUp({ name: form.name, email: form.email, password: form.password, phone: form.phone });
        setConfirmationPending(true);
        setAccountCreated(true);
        setForm(current => ({ ...current, password: '' }));
        setMessage('Registration received. Check your inbox for a confirmation email before signing in.');
      } else if (mode === 'forgot') {
        await requestPasswordReset(form.email, `${window.location.origin}/account?mode=reset`);
        setMessage('If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.');
      } else {
        await updatePassword(form.password);
        await signOut();
        setForm(current => ({ ...current, password: '' }));
        setMode('signin');
        window.history.replaceState({}, '', '/account');
        setMessage('Your password has been updated. Sign in with your new password.');
      }
    } catch (err) {
      setError(authErrorMessage(err, mode));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="container-shell py-24 text-center">Loading your account…</div>;
  if (!isSupabaseConfigured) return <div className="container-shell py-16"><div className="max-w-2xl mx-auto form-panel"><div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><UserRound/></div><h1 className="text-2xl font-extrabold mt-5">Customer account</h1><p className="text-slate-500 mt-2">The customer account system is ready in the application, but Supabase has not been connected in this environment. Add your Supabase project URL and anon key to enable secure accounts, orders and cross-device access.</p><div className="mt-6 bg-slate-50 rounded-xl p-4 text-sm"><p className="font-bold">Required environment variables</p><code className="block mt-2">VITE_SUPABASE_URL</code><code className="block mt-1">VITE_SUPABASE_ANON_KEY</code></div><Link to="/services" className="btn-primary mt-6">Continue browsing services</Link></div></div>;

  if (user && mode !== 'reset') return <div className="container-shell py-14"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="eyebrow">CUSTOMER WORKSPACE</div><h1 className="page-title mt-2">Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.</h1><p className="text-slate-500 mt-2">Manage your submitted orders and account details.</p></div><button onClick={() => signOut()} className="btn-outline"><LogOut size={16}/> Sign out</button></div><div className="grid md:grid-cols-3 gap-4 mt-9"><div className="metric-card"><span className="text-sm text-slate-500">Signed in as</span><strong className="block mt-2 break-all">{user.email}</strong></div><div className="metric-card"><span className="text-sm text-slate-500">Account role</span><strong className="block mt-2 capitalize">{profile?.role?.replace(/_/g, ' ') || 'Customer'}</strong></div><div className="metric-card"><span className="text-sm text-slate-500">Your orders</span><strong className="block text-2xl mt-2">{orders.length}</strong></div></div><div className="form-panel mt-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Recent orders</h2><Link to="/services" className="text-link">Start another order <ArrowRight size={15}/></Link></div>{orders.length === 0 ? <div className="py-12 text-center"><p className="text-slate-500">No orders have been submitted yet.</p><Link to="/services" className="btn-primary mt-5">Explore services</Link></div> : <div className="mt-5 overflow-x-auto"><table className="data-table"><thead><tr><th>Reference</th><th>Status</th><th>Payment</th><th>Submitted</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td className="font-semibold">{order.reference}</td><td><span className="status-pill">{order.status?.replace(/_/g, ' ')}</span></td><td>{order.payment_status}</td><td>{new Date(order.created_at).toLocaleDateString()}</td><td><Link to={`/track/${encodeURIComponent(order.reference)}`} className="text-link whitespace-nowrap"><PackageSearch size={15}/> Track</Link></td></tr>)}</tbody></table></div>}</div></div>;

  const title = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password';
  const description = mode === 'forgot' ? 'We’ll email you a secure link to reset your password.' : mode === 'reset' ? 'Use a strong password you have not used before.' : 'Keep your quotations, orders and files in one place.';
  return <section className="auth-experience">
    <div className="auth-glow auth-glow-blue" aria-hidden="true"/><div className="auth-glow auth-glow-red" aria-hidden="true"/><div className="auth-inner container-shell py-10 md:py-16"><div className="auth-grid">
      <div className="auth-story">
        <Link to="/" className="auth-brand" aria-label="NexxaCraft home"><Logo variant="wordmark" className="h-10 w-auto" title="NexxaCraft"/></Link>
        <div className="auth-story-copy"><span className="auth-kicker"><span/> CUSTOMER WORKSPACE</span><h1>Good work moves forward <span>together.</span></h1><p>Sign in to keep your quotations, orders and project updates in one easy place.</p>
          <div className="auth-benefits"><div><span><ShieldCheck size={17}/></span><p><strong>Private by design</strong><small>Your account and project details stay yours.</small></p></div><div><span><PackageSearch size={17}/></span><p><strong>Progress at a glance</strong><small>Follow your orders from brief to delivery.</small></p></div></div>
        </div>
        <p className="auth-story-foot">DESIGN <i/> PRINT <i/> BUILD <b>·</b> NEXXACRAFT</p>
      </div>
      <div className={`auth-glass-card${accountCreated ? ' auth-confirmation-card' : ''}`}>{accountCreated ? <div className="auth-confirmation-content" role="status">
          <div className="auth-confirmation-icon"><MailCheck size={28}/></div>
          <p className="auth-confirmation-kicker">WELCOME TO NEXXACRAFT</p>
          <h2>Your account is ready, {form.name.trim().split(/\s+/)[0] || 'there'}.</h2>
          <p className="auth-confirmation-copy">We sent a confirmation link to <strong>{form.email}</strong>. Confirm your email to unlock your customer workspace.</p>
          <div className="auth-confirmation-note"><span className="auth-confirmation-dot"/><span>Check your inbox and spam folder for the NexxaCraft confirmation email.</span></div>
          {error && <p role="alert" className="auth-alert-error">{error}</p>}
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await resendSignupConfirmation(form.email); setMessage('A fresh confirmation link has been sent. Check your inbox and spam folder.'); } catch (err) { setError(err instanceof Error ? err.message : 'Could not resend the confirmation email.'); } finally { setBusy(false); } }} className="btn-outline auth-confirmation-resend">{busy ? 'Sending…' : 'Resend confirmation email'}</button>
          <button type="button" onClick={() => changeMode('signin')} className="btn-primary auth-submit">Continue to sign in <ArrowRight size={17}/></button>
        </div> : <><div className="auth-card-heading"><div className="auth-mode-icon">{mode === 'forgot' ? <MailCheck size={22}/> : mode === 'reset' ? <KeyRound size={22}/> : <ShieldCheck size={22}/>}</div><div><h2>{title}</h2><p>{description}</p></div></div>
        <form onSubmit={submit} className="auth-form">{mode === 'signup' && <><div><label className="form-label" htmlFor="account-name">Full name *</label><input id="account-name" className="form-control" required autoComplete="name" value={form.name} onChange={e => update('name', e.target.value)}/></div><div><label className="form-label" htmlFor="account-phone">Phone number</label><input id="account-phone" className="form-control" autoComplete="tel" value={form.phone} onChange={e => update('phone', e.target.value)}/></div></>}{mode !== 'reset' && <div><label className="form-label" htmlFor="account-email">Email address *</label><input id="account-email" type="email" className="form-control" autoComplete="email" required value={form.email} onChange={e => update('email', e.target.value)}/></div>}{mode !== 'forgot' && <div><label className="form-label" htmlFor="account-password">{mode === 'reset' ? 'New password *' : 'Password *'}</label><div className="auth-password-control"><input id="account-password" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete={mode === 'reset' ? 'new-password' : mode === 'signin' ? 'current-password' : 'new-password'} className="form-control" required value={form.password} onChange={e => update('password', e.target.value)}/><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}<span>{showPassword ? 'Hide' : 'Show'}</span></button></div></div>}{error && <p role="alert" className="auth-alert-error">{error}</p>}{message && <p role="status" className="auth-alert-success"><CheckCircle2 size={17} className="shrink-0"/>{message}</p>}{confirmationPending && <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await resendSignupConfirmation(form.email); setMessage('A fresh confirmation link has been sent. Check your inbox and spam folder.'); } catch (err) { setError(err instanceof Error ? err.message : 'Could not resend the confirmation email.'); } finally { setBusy(false); } }} className="auth-text-button">Resend confirmation email</button>}<button disabled={busy} className="btn-primary auth-submit">{busy ? <><Loader2 size={17} className="animate-spin"/> Please wait…</> : mode === 'signin' ? 'Sign in to your account' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>{mode === 'signin' && <div className="auth-forgot"><button type="button" onClick={() => changeMode('forgot')}>Forgot password?</button></div>}<p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : mode === 'signin' ? 'New to NexxaCraft?' : 'Remember your password?'} <button type="button" onClick={() => changeMode(mode === 'signup' || mode === 'forgot' || mode === 'reset' ? 'signin' : 'signup')}>{mode === 'signup' || mode === 'forgot' || mode === 'reset' ? 'Sign in' : 'Create an account'}</button></p></form>
      </>}</div>
    </div></div>
  </section>;
};

export default Account;
