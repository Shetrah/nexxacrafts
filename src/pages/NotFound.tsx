import { Link } from 'react-router-dom';

/** Placeholder 404 — designed by the company-pages work package. */
export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-h1">Page not found</h1>
      <p className="mt-3 text-slate-600">The page you were looking for doesn’t exist or has moved.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-brand-700">Back to the homepage</Link>
    </div>
  );
}
