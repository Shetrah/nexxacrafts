import { Link } from 'react-router-dom';
import { getNavItem, type AdminModuleId } from '../navigation';

/** TEMPORARY placeholder — restyled by the admin-shell work package. */
export default function AccessDenied({ module }: { module: AdminModuleId }) {
  const item = getNavItem(module);
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">You don’t have access to {item.label}</h1>
      <p className="mt-2 text-sm text-slate-600">Your role doesn’t include this area. Ask a super administrator if you need access.</p>
      <Link to="/admin" className="mt-6 inline-block text-sm font-semibold text-brand-700">Go to your workspace</Link>
    </div>
  );
}
