import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftFromLine, ArrowRightFromLine, Menu, X } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { ADMIN_NAV_GROUPS } from '../navigation';
import { Logo } from '@/components/brand/Logo';
import ThemeToggle from '@/components/ThemeToggle';

/** Responsive staff workspace shell. Navigation visibility remains role-filtered by AdminContext. */
export default function AdminLayout() {
  const { nav, profile, signOut } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const current = [...nav].sort((a, b) => b.path.length - a.path.length).find((item) => item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path));
  return (
    <div className="flex min-h-screen bg-[#f3f5f9]">
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-ink-950/40 lg:hidden"/>}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950 p-4 text-slate-300 shadow-xl shadow-ink-950/10 transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Staff portal">
        <div className="flex h-12 items-center justify-between gap-2 px-2"><Logo variant="wordmark" tone="inverse" className={`h-7 w-auto ${collapsed ? 'lg:hidden' : ''}`}/><Logo variant="mark" tone="inverse" className={`size-8 ${collapsed ? 'hidden lg:block' : 'hidden'}`}/><button className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
        <nav aria-label="Staff navigation" className="mt-7 flex-1 space-y-5 overflow-y-auto pb-3">
          {ADMIN_NAV_GROUPS.map((group) => {
            const groupItems = nav.filter((entry) => entry.group === group);
            if (!groupItems.length) return null;
            return <section key={group} aria-label={group}>
              <h2 className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>{group}</h2>
              <div className="space-y-1">{groupItems.map((item) => {
                const Icon = item.icon;
                return <NavLink key={item.id} title={collapsed ? item.label : undefined} to={item.path} end={item.path === '/admin'} onClick={()=>setMobileOpen(false)} className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${isActive ? 'bg-brand-600/15 text-white shadow-[inset_2px_0_0_#0341fc]' : 'text-slate-300 hover:bg-white/[.06] hover:text-white'} ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}><Icon size={18} className="shrink-0 transition-colors group-hover:text-white"/><span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span></NavLink>;
              })}</div>
            </section>;
          })}
        </nav>
        <div className="border-t border-white/10 pt-4"><div className={`mb-3 flex items-center gap-3 px-2 ${collapsed ? 'lg:hidden' : ''}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-200">{(profile.full_name || 'NC').split(/\s+/).map((part)=>part[0]).slice(0,2).join('').toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{profile.full_name || 'nexxacrafts team'}</p><p className="mt-0.5 truncate text-[11px] capitalize text-slate-400">{profile.role.replace(/_/g, ' ')}</p></div></div><button className={`w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[.06] hover:text-white ${collapsed ? 'lg:text-center' : ''}`} onClick={() => signOut()}>{collapsed ? <><span className="lg:hidden">Sign out</span><span className="hidden lg:inline" aria-hidden="true">↪</span></> : 'Sign out'}</button></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6"><div className="flex min-w-0 items-center gap-3"><button className="rounded-lg border border-line p-2 text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 lg:hidden" onClick={()=>setMobileOpen(true)} aria-label="Open staff navigation"><Menu size={19}/></button><div className="min-w-0"><p className="flex items-center gap-2 truncate text-[11px] font-medium text-slate-500"><span>Staff portal</span><span className="text-slate-300">/</span><span>{current?.group || 'Workspace'}</span></p><h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">{current?.label || 'Workspace'}</h1></div></div><div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1.5 text-[11px] font-semibold capitalize text-brand-800 sm:inline-flex"><span className="size-1.5 rounded-full bg-brand-600"/>{profile.role.replace(/_/g, ' ')}</span><ThemeToggle/><button className="hidden rounded-lg border border-line p-2 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 lg:inline-flex" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed?<ArrowRightFromLine size={17}/>:<ArrowLeftFromLine size={17}/>}</button></div></header>
        <main id="main-content" className="min-w-0 p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
