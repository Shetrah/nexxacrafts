import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import RouteFallback from './components/RouteFallback';
import ScrollToTop from './components/ScrollToTop';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import Home from './pages/Home';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CompanySettingsProvider } from './context/CompanySettingsContext';
import { ToastProvider } from './components/ui';
import { ThemeProvider } from './context/ThemeContext';

// The homepage ships in the main bundle; every other route is code-split so first visits stay fast
// and the staff portal never loads for customers.
const Services = lazy(() => import('./pages/Services'));
const ServiceOrder = lazy(() => import('./pages/ServiceOrder'));
const Quote = lazy(() => import('./pages/Quote'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const Account = lazy(() => import('./pages/Account'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Admin = lazy(() => import('./pages/Admin'));

// Dev-only previews: `import.meta.env.DEV` is statically false in production, so these chunks are never built.
const UiKitPreview = import.meta.env.DEV ? lazy(() => import('./dev/UiKitPreview')) : null;
const ChartsPreview = import.meta.env.DEV ? lazy(() => import('./dev/ChartsPreview')) : null;

function App() {
  return (
    <ThemeProvider>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <AuthProvider>
        <CompanySettingsProvider>
        <CartProvider>
          <ToastProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/order/:slug" element={<ServiceOrder />} />
                <Route path="/quote" element={<Quote />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track" element={<TrackOrderRoute />} />
                <Route path="/track/:reference" element={<TrackOrderRoute />} />
                <Route path="/account/*" element={<Account />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="/admin/*" element={<Admin />} />
              {UiKitPreview && <Route path="/__ui" element={<UiKitPreview />} />}
              {ChartsPreview && <Route path="/__charts" element={<ChartsPreview />} />}
            </Routes>
          </Suspense>
          </ToastProvider>
        </CartProvider>
        </CompanySettingsProvider>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  );
}

function TrackOrderRoute() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback label="Loading order tracking…" />}>
        <TrackOrder />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default App;
