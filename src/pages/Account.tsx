import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, CalendarDays, CheckCircle2, CircleDollarSign, Eye, EyeOff, KeyRound, Loader2, LogOut, Mail, MailCheck, PackageSearch, Pencil, Phone, Receipt, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Logo } from '../components/brand/Logo';
import { updateMyProfile } from '@/lib/api/profiles';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';
type AccountOrder = { id: string; reference: string; status: string; payment_status: string; created_at: string };
type AccountInvoice = { id: string; invoice_number: string; total: number; amount_paid: number; status: string; created_at: string };

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
  const { user, profile, loading, signIn, signUp, resendSignupConfirmation, signOut, refreshProfile, requestPasswordReset, updatePassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(() => new URLSearchParams(window.location.search).get('mode') === 'reset' ? 'reset' : 'signin');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [invoices, setInvoices] = useState<AccountInvoice[]>([]);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const verificationCallbackHandled = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', company: '' });
  const [editProfile, setEditProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') !== '1') return;
    if (loading || verificationCallbackHandled.current) return;
    if (!user?.email_confirmed_at) {
      verificationCallbackHandled.current = true;
      setMode('signin');
      setMessage('Email confirmation was completed. Sign in to continue.');
      window.history.replaceState({}, '', '/account');
      return;
    }

    verificationCallbackHandled.current = true;
    const confirmedEmail = user.email ?? '';
    setMode('signin');
    setAccountCreated(false);
    setBusy(true);
    setError('');
    setMessage('Your email is verified. Sending your account confirmation email…');
    window.history.replaceState({}, '', '/account');
    void (async () => {
      let deliveryMessage = '';
      try {
        if (!supabase) throw new Error('Email delivery is unavailable.');
        const { data, error: invokeError } = await supabase.functions.invoke('contact-email', { body: { kind: 'account_verified' } });
        if (invokeError) {
          const response = (invokeError as typeof invokeError & { context?: Response }).context;
          const body = response ? await response.clone().json().catch(() => null) : null;
          throw new Error(body?.error || invokeError.message || 'The account confirmation email could not be sent.');
        }
        if (data?.error || data?.emailSent !== true) throw new Error(data?.error || 'The account confirmation email could not be confirmed.');
        deliveryMessage = 'A confirmation email has been sent to your inbox.';
      } catch (sendError) {
        deliveryMessage = sendError instanceof Error ? `We could not send the follow-up email (${sendError.message}).` : 'We could not send the follow-up email.';
      }
      try { await signOut(); } catch { /* Still take the customer to the sign-in form. */ }
      setForm(current => ({ ...current, email: confirmedEmail, password: '' }));
      setMode('signin');
      setMessage(`Email verified successfully. ${deliveryMessage} You can now sign in.`);
      setBusy(false);
    })();
  }, [loading, signOut, user]);

  useEffect(() => {
    setProfileForm({ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '', company: profile?.company ?? '' });
  }, [profile]);

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
    supabase.from('invoices').select('id,invoice_number,total,amount_paid,status,created_at').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setInvoices(((data || []) as AccountInvoice[]).filter(invoice => !['draft','void'].includes(invoice.status))));
  }, [user]);

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const updateProfileField = (key: keyof typeof profileForm, value: string) => setProfileForm(current => ({ ...current, [key]: value }));
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setProfileSaving(true); setProfileError(''); setProfileMessage('');
    try {
      await updateMyProfile(user.id, profileForm);
      await refreshProfile();
      setEditProfile(false);
      setProfileMessage('Your profile details have been saved.');
    } catch (err) { setProfileError(err instanceof Error ? err.message : 'Could not save profile details.'); }
    finally { setProfileSaving(false); }
  };
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
        await signUp({ name: form.name, email: form.email, password: form.password, phone: form.phone, company: form.company });
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

  if (user && mode !== 'reset') {
    const initials = (profile?.full_name || user.email || 'NC').split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
    const outstanding = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.amount_paid)), 0);
    const money = (amount: number) => `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return <div className="client-portal-page">
      <div className="container-shell py-8 sm:py-12">
        <header className="client-portal-hero">
          <div className="client-portal-orb" aria-hidden="true" />
          <div className="client-portal-hero-top"><span className="client-portal-kicker"><span/> CUSTOMER WORKSPACE</span><button type="button" onClick={() => signOut()} className="client-portal-signout"><LogOut size={16}/> Sign out</button></div>
          <div className="client-portal-identity"><div className="client-avatar">{initials || <UserRound size={28}/>}</div><div><p className="text-sm text-blue-100/75">Welcome back</p><h1>{profile?.full_name || user.email?.split('@')[0] || 'Client'}</h1><p className="client-portal-email"><Mail size={14}/>{user.email}</p></div></div>
          <p className="client-portal-intro">Your orders, invoices and account details in one clear workspace.</p>
        </header>

        <div className="client-portal-stats"><article><span><PackageSearch size={18}/></span><div><small>Orders</small><strong>{orders.length}</strong></div></article><article><span><Receipt size={18}/></span><div><small>Invoices</small><strong>{invoices.length}</strong></div></article><article><span><CircleDollarSign size={18}/></span><div><small>Balance due</small><strong>{money(outstanding)}</strong></div></article></div>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[.78fr_1.5fr]">
          <aside className="client-portal-panel overflow-hidden">
            <div className="client-panel-heading"><div><p className="client-panel-eyebrow">ACCOUNT DETAILS</p><h2>Your profile</h2></div>{!editProfile&&<button type="button" className="client-edit-button" onClick={()=>{setProfileError('');setProfileMessage('');setEditProfile(true);}}><Pencil size={15}/> Edit profile</button>}</div>
            {profileError&&<p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}{profileMessage&&<p role="status" className="mx-5 mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{profileMessage}</p>}
            {editProfile?<form onSubmit={saveProfile} className="client-profile-form"><label>Full name<input required value={profileForm.full_name} onChange={e=>updateProfileField('full_name',e.target.value)} className="form-control" autoComplete="name"/></label><label>Phone number<input value={profileForm.phone} onChange={e=>updateProfileField('phone',e.target.value)} className="form-control" autoComplete="tel"/></label><label>Company or organisation<input value={profileForm.company} onChange={e=>updateProfileField('company',e.target.value)} className="form-control" autoComplete="organization"/></label><label>Email address<span className="client-readonly-email"><Mail size={15}/>{user.email}<small>Account email</small></span></label><div className="flex justify-end gap-2 pt-2"><button type="button" disabled={profileSaving} onClick={()=>{setEditProfile(false);setProfileForm({full_name:profile?.full_name??'',phone:profile?.phone??'',company:profile?.company??''});setProfileError('');}} className="btn-outline">Cancel</button><button type="submit" disabled={profileSaving} className="btn-primary">{profileSaving?<Loader2 className="animate-spin" size={16}/>:<Save size={16}/>} Save profile</button></div></form>:<div className="client-profile-details"><div><span><UserRound size={15}/></span><p><small>Full name</small><strong>{profile?.full_name||'Add your name'}</strong></p></div><div><span><Mail size={15}/></span><p><small>Email address</small><strong className="break-all">{user.email}</strong></p></div><div><span><Phone size={15}/></span><p><small>Phone number</small><strong>{profile?.phone||'Not added yet'}</strong></p></div><div><span><Building2 size={15}/></span><p><small>Company</small><strong>{profile?.company||'Not added yet'}</strong></p></div></div>}
            <div className="client-security-note"><ShieldCheck size={17}/><p><strong>Your account is protected</strong><span>Your profile details are only visible to you and authorised NexxaCraft staff.</span></p></div>
          </aside>

          <div className="space-y-6">
            <section className="client-portal-panel"><div className="client-panel-heading"><div><p className="client-panel-eyebrow">ORDER ACTIVITY</p><h2>Recent orders</h2></div><Link to="/services" className="client-panel-link">Start an order <ArrowRight size={15}/></Link></div>{orders.length===0?<div className="client-empty-state"><span><PackageSearch size={22}/></span><p>No orders yet</p><small>Your submitted orders will appear here.</small><Link to="/services" className="btn-primary mt-4">Explore services</Link></div>:<div className="client-record-list">{orders.map(order=><article key={order.id} className="client-order-row"><div className="client-record-icon"><PackageSearch size={18}/></div><div className="min-w-0 flex-1"><p className="font-bold">{order.reference}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/>{new Date(order.created_at).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</p></div><span className="client-status-pill">{order.status?.replace(/_/g,' ')}</span><div className="text-right"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Payment</p><p className="mt-1 text-xs font-semibold capitalize text-slate-700">{order.payment_status?.replace(/_/g,' ')}</p></div><Link to={`/track/${encodeURIComponent(order.reference)}`} className="client-track-link">Track <ArrowRight size={14}/></Link></article>)}</div>}</section>

            <section className="client-portal-panel"><div className="client-panel-heading"><div><p className="client-panel-eyebrow">PAYMENTS &amp; DOCUMENTS</p><h2>Your invoices</h2></div><Receipt size={19} className="text-brand-700"/></div>{invoices.length===0?<div className="client-empty-state compact"><span><Receipt size={21}/></span><p>No invoices to show</p><small>Issued invoices and outstanding balances will appear here.</small></div>:<div className="client-record-list">{invoices.map(invoice=>{const due=Math.max(0,Number(invoice.total)-Number(invoice.amount_paid));return <article key={invoice.id} className="client-invoice-row"><div className="client-record-icon invoice"><Receipt size={18}/></div><div className="min-w-0 flex-1"><p className="font-bold">{invoice.invoice_number}</p><p className="mt-1 text-xs capitalize text-slate-500">{invoice.status.replace(/_/g,' ')} · Issued {new Date(invoice.created_at).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</p></div><div className="text-right"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{due>0?'Amount due':'Paid'}</p><p className="mt-1 font-bold">{money(due)}</p></div>{due>0&&<Link to={`/pay/${invoice.id}`} className="btn-primary">Pay invoice <ArrowRight size={15}/></Link>}</article>})}</div>}</section>
          </div>
        </div>
      </div>
    </div>;
  }

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
          <h2>One last step, {form.name.trim().split(/\s+/)[0] || 'there'}.</h2>
          <p className="auth-confirmation-copy">Supabase accepted your signup request for <strong>{form.email}</strong>. Confirm your email to unlock your customer workspace.</p>
          <div className="auth-confirmation-note"><span className="auth-confirmation-dot"/><span>Check your inbox and spam folder for the NexxaCraft confirmation email.</span></div>
          {error && <p role="alert" className="auth-alert-error">{error}</p>}
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await resendSignupConfirmation(form.email); setMessage('Supabase accepted the resend request. Check your inbox and spam folder; delivery depends on the configured email provider.'); } catch (err) { setError(err instanceof Error ? err.message : 'Could not resend the confirmation email.'); } finally { setBusy(false); } }} className="btn-outline auth-confirmation-resend">{busy ? 'Sending…' : 'Resend confirmation email'}</button>
          {message && <p role="status" className="auth-alert-success"><CheckCircle2 size={17} className="shrink-0"/>{message}</p>}
          <button type="button" onClick={() => changeMode('signin')} className="btn-primary auth-submit">Continue to sign in <ArrowRight size={17}/></button>
        </div> : <><div className="auth-card-heading"><div className="auth-mode-icon">{mode === 'forgot' ? <MailCheck size={22}/> : mode === 'reset' ? <KeyRound size={22}/> : <ShieldCheck size={22}/>}</div><div><h2>{title}</h2><p>{description}</p></div></div>
        <form onSubmit={submit} className="auth-form">{mode === 'signup' && <><div><label className="form-label" htmlFor="account-name">Full name *</label><input id="account-name" className="form-control" required autoComplete="name" value={form.name} onChange={e => update('name', e.target.value)}/></div><div><label className="form-label" htmlFor="account-phone">Phone number</label><input id="account-phone" className="form-control" autoComplete="tel" value={form.phone} onChange={e => update('phone', e.target.value)}/></div><div><label className="form-label" htmlFor="account-company">Company / organisation</label><input id="account-company" className="form-control" autoComplete="organization" value={form.company} onChange={e => update('company', e.target.value)}/></div></>}{mode !== 'reset' && <div><label className="form-label" htmlFor="account-email">Email address *</label><input id="account-email" type="email" className="form-control" autoComplete="email" required value={form.email} onChange={e => update('email', e.target.value)}/></div>}{mode !== 'forgot' && <div><label className="form-label" htmlFor="account-password">{mode === 'reset' ? 'New password *' : 'Password *'}</label><div className="auth-password-control"><input id="account-password" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete={mode === 'reset' ? 'new-password' : mode === 'signin' ? 'current-password' : 'new-password'} className="form-control" required value={form.password} onChange={e => update('password', e.target.value)}/><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}<span>{showPassword ? 'Hide' : 'Show'}</span></button></div></div>}{error && <p role="alert" className="auth-alert-error">{error}</p>}{message && <p role="status" className="auth-alert-success"><CheckCircle2 size={17} className="shrink-0"/>{message}</p>}{confirmationPending && <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await resendSignupConfirmation(form.email); setMessage('Supabase accepted the resend request. Check your inbox and spam folder; delivery depends on the configured email provider.'); } catch (err) { setError(err instanceof Error ? err.message : 'Could not resend the confirmation email.'); } finally { setBusy(false); } }} className="auth-text-button">Resend confirmation email</button>}<button disabled={busy} className="btn-primary auth-submit">{busy ? <><Loader2 size={17} className="animate-spin"/> Please wait…</> : mode === 'signin' ? 'Sign in to your account' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>{mode === 'signin' && <div className="auth-forgot"><button type="button" onClick={() => changeMode('forgot')}>Forgot password?</button></div>}<p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : mode === 'signin' ? 'New to NexxaCraft?' : 'Remember your password?'} <button type="button" onClick={() => changeMode(mode === 'signup' || mode === 'forgot' || mode === 'reset' ? 'signin' : 'signup')}>{mode === 'signup' || mode === 'forgot' || mode === 'reset' ? 'Sign in' : 'Create an account'}</button></p></form>
      </>}</div>
    </div></div>
  </section>;
};

export default Account;
