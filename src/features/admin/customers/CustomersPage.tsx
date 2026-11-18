import { useEffect, useState } from 'react';
import { Building2, Loader2, Plus, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui';

type Client = { id: string; display_name: string; company_name: string | null; email: string; phone: string; created_at: string };
const blank = { display_name: '', company_name: '', email: '', phone: '' };

export default function CustomersPage() {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function reload() {
    if (!supabase) return;
    const { data, error: loadError } = await supabase.from('client_contacts').select('id,display_name,company_name,email,phone,created_at').order('company_name', { ascending: false, nullsFirst: false }).order('display_name');
    if (loadError) setError(loadError.message); else setClients(data ?? []);
  }
  useEffect(() => { void reload(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error: saveError } = await supabase.from('client_contacts').insert({ display_name: form.display_name.trim(), company_name: form.company_name.trim() || null, email: form.email.trim().toLowerCase(), phone: form.phone.trim() });
      if (saveError) throw saveError;
      setForm(blank); setOpen(false); toast.success('Client saved.'); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save client.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-700">Commerce</p><h2 className="mt-1 text-2xl font-bold">Clients</h2><p className="mt-2 text-sm text-slate-600">Manage individual and company contacts for staff-entered orders.</p></div><button type="button" className="btn-primary" onClick={()=>setOpen(v=>!v)}><Plus size={16}/> Add client</button></header>
    {error&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">{error}</p>}
    {open&&<form onSubmit={save} className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-2"><h3 className="text-lg font-bold sm:col-span-2">New client</h3><label className="text-sm font-semibold">Client or contact name *<input required className="form-control mt-1" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/></label><label className="text-sm font-semibold">Company name <span className="font-normal text-slate-500">(optional)</span><input className="form-control mt-1" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></label><label className="text-sm font-semibold">Client email *<input required type="email" className="form-control mt-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="text-sm font-semibold">Phone number *<input required className="form-control mt-1" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-outline" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy?<Loader2 className="animate-spin" size={16}/>:<Plus size={16}/>} Save client</button></div></form>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{clients.map(client=><article key={client.id} className="rounded-xl border border-line bg-white p-5 shadow-xs"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">{client.company_name?<Building2 size={19}/>:<UserRound size={19}/>}</span><div className="min-w-0"><h3 className="truncate font-bold">{client.company_name||client.display_name}</h3>{client.company_name&&<p className="truncate text-sm text-slate-500">{client.display_name}</p>}</div></div><p className="mt-4 break-all text-sm text-slate-700">{client.email}</p><p className="mt-1 text-sm text-slate-500">{client.phone}</p></article>)}</div>
    {!clients.length&&<div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-sm text-slate-500">No saved clients yet. Add a client to autofill their details in manual orders.</div>}</section>;
}
