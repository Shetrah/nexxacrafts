import { useCallback, useEffect, useState } from 'react';
import { Mail, Loader2, Plus, ShieldCheck, UserRound, Users, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { listStaffDirectory, updateProfileRole, type StaffDirectoryProfile } from '@/lib/api/profiles';
import { STAFF_ROLES, roleLabel, type StaffRole } from '@/lib/roles';
import { useToast } from '@/components/ui';

const emptyForm = { name: '', email: '', phone: '', role: 'sales' as StaffRole };

export default function StaffPage() {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffDirectoryProfile[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, StaffRole>>({});
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingRole, setSavingRole] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const rows = await listStaffDirectory();
      setStaff(rows);
      setRoleDrafts(Object.fromEntries(rows.map(row => [row.id, row.role as StaffRole])));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load staff profiles.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setSending(true); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('staff-admin', { body: form });
      if (invokeError) {
        const response = (invokeError as typeof invokeError & { context?: Response }).context;
        const body = response ? await response.clone().json().catch(() => null) : null;
        throw new Error(body?.error || invokeError.message);
      }
      if (data?.error || data?.ok !== true) throw new Error(data?.error || 'Supabase did not confirm the staff invite.');
      setNotice(`Invitation sent to ${form.email.trim()}. They can accept it and create a password to access the staff portal.`);
      setForm(emptyForm);
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not invite this staff member.'); }
    finally { setSending(false); }
  }

  async function saveRole(profile: StaffDirectoryProfile) {
    const role = roleDrafts[profile.id];
    if (!role || role === profile.role || role === 'customer') return;
    setSavingRole(profile.id); setError(''); setNotice('');
    try {
      await updateProfileRole(profile.id, role);
      toast.success(`${profile.full_name || profile.email} role updated.`);
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update staff role.'); }
    finally { setSavingRole(''); }
  }

  return <section className="space-y-6">
    <header className="rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Organisation</p><h2 className="mt-1 text-2xl font-bold">Staff</h2><p className="mt-2 text-sm text-slate-600">Invite team members and manage their workspace roles. New staff receive an email invitation to set a password.</p></header>
    {error&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">{error}</p>}
    {notice&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    <form onSubmit={invite} className="space-y-5 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Plus size={19}/></span><div><h3 className="text-lg font-bold">Invite a staff member</h3><p className="mt-1 text-sm text-slate-500">Supabase will email a secure invitation link. Staff roles are assigned by the server after admin verification.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">Full name *<input required minLength={2} maxLength={120} className="form-control mt-1" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name"/></label>
        <label className="text-sm font-semibold">Work email *<input required type="email" maxLength={254} className="form-control mt-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email"/></label>
        <label className="text-sm font-semibold">Phone number<input maxLength={40} className="form-control mt-1" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} autoComplete="tel"/></label>
        <label className="text-sm font-semibold">Staff role *<select className="form-control mt-1" value={form.role} onChange={e=>setForm({...form,role:e.target.value as StaffRole})}>{STAFF_ROLES.map(role=><option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
      </div>
      <div className="flex justify-end"><button className="btn-primary" disabled={sending}>{sending?<Loader2 size={16} className="animate-spin"/>:<Mail size={16}/>} {sending?'Sending invitation…':'Send staff invitation'}</button></div>
    </form>

    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs"><div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><Users size={18}/></span><div><h3 className="font-semibold">Team members</h3><p className="text-xs text-slate-500">Customer accounts are not included in this staff list.</p></div><span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{staff.length} staff</span></div>
      {loading?<div className="p-10 text-center text-sm text-slate-500"><Loader2 size={20} className="mx-auto mb-2 animate-spin"/>Loading staff…</div>:staff.length===0?<div className="p-10 text-center text-sm text-slate-500">No staff profiles found. Invite your first team member above.</div>:<div className="divide-y divide-line">{staff.map(profile=><article key={profile.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><UserRound size={18}/></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{profile.full_name||'Staff member'}</p><p className="break-all text-sm text-slate-500">{profile.email}</p>{profile.phone&&<p className="text-xs text-slate-400">{profile.phone}</p>}</div><div className="flex items-center gap-2"><ShieldCheck size={15} className="text-slate-400"/><select aria-label={`Role for ${profile.full_name||profile.email}`} className="form-control min-w-40" value={roleDrafts[profile.id]||profile.role} onChange={e=>setRoleDrafts(current=>({...current,[profile.id]:e.target.value as StaffRole}))}>{STAFF_ROLES.map(role=><option key={role} value={role}>{roleLabel(role)}</option>)}</select><button type="button" className="btn-outline" disabled={savingRole===profile.id||roleDrafts[profile.id]===profile.role} onClick={()=>void saveRole(profile)}>{savingRole===profile.id?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} Save</button></div></article>)}</div>}
    </div>
  </section>;
}
