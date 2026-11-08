import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Render a recoverable route-level error instead of a blank screen. */
export default class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Detailed errors remain available in the browser console for debugging.
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="container-shell py-20">
          <div className="empty-state">
            <h1 className="text-2xl font-bold">This page could not load</h1>
            <p className="mt-3 text-sm text-slate-600">Refresh the page and try again. If the problem continues, contact our team for help.</p>
            <Link to="/contact" className="btn-primary mt-6">Contact our team</Link>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
