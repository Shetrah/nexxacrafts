import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminGate from './shell/AdminGate';
import AdminLayout from './shell/AdminLayout';
import RequireModule from './RequireModule';
import RouteFallback from '@/components/RouteFallback';
import { useAdmin } from './AdminContext';
import { homePathForRole, type AdminModuleId } from './navigation';

// Every module is code-split so staff only download the screens they open.
const CompanyDashboard = lazy(() => import('./dashboard/CompanyDashboard'));
const NotificationsPage = lazy(() => import('./notifications/NotificationsPage'));
const SalesDesk = lazy(() => import('./sales/SalesDesk'));
const OperationsHome = lazy(() => import('./operations/OperationsHome'));
const DesignStudio = lazy(() => import('./design/DesignStudio'));
const PrintFloor = lazy(() => import('./printing/PrintFloor'));
const LaserWorkshop = lazy(() => import('./laser/LaserWorkshop'));
const SoftwareStudio = lazy(() => import('./software/SoftwareStudio'));
const DispatchBoard = lazy(() => import('./dispatch/DispatchBoard'));
const FinanceDesk = lazy(() => import('./finance/FinanceDesk'));
const OrdersPage = lazy(() => import('./orders/OrdersPage'));
const QuotesPage = lazy(() => import('./quotes/QuotesPage'));
const CustomersPage = lazy(() => import('./customers/CustomersPage'));
const ServicesPage = lazy(() => import('./services/ServicesPage'));
const PricingPage = lazy(() => import('./pricing/PricingPage'));
const ProductionPage = lazy(() => import('./production/ProductionPage'));
const InventoryPage = lazy(() => import('./inventory/InventoryPage'));
const ProjectsPage = lazy(() => import('./projects/ProjectsPage'));
const InvoicesPage = lazy(() => import('./invoices/InvoicesPage'));
const PaymentsPage = lazy(() => import('./payments/PaymentsPage'));
const ExpensesPage = lazy(() => import('./expenses/ExpensesPage'));
const ReportsPage = lazy(() => import('./reports/ReportsPage'));
const StaffPage = lazy(() => import('./staff/StaffPage'));
const RolesPage = lazy(() => import('./roles/RolesPage'));
const SettingsPage = lazy(() => import('./settings/SettingsPage'));

const MODULE_ROUTES: Array<{ path: string; module: AdminModuleId; Component: LazyExoticComponent<ComponentType> }> = [
  { path: 'notifications', module: 'notifications', Component: NotificationsPage },
  { path: 'sales', module: 'sales', Component: SalesDesk },
  { path: 'operations', module: 'operations', Component: OperationsHome },
  { path: 'design', module: 'design', Component: DesignStudio },
  { path: 'printing', module: 'printing', Component: PrintFloor },
  { path: 'laser', module: 'laser', Component: LaserWorkshop },
  { path: 'software', module: 'software', Component: SoftwareStudio },
  { path: 'dispatch', module: 'dispatch', Component: DispatchBoard },
  { path: 'finance', module: 'finance', Component: FinanceDesk },
  { path: 'orders', module: 'orders', Component: OrdersPage },
  { path: 'quotes', module: 'quotes', Component: QuotesPage },
  { path: 'customers', module: 'customers', Component: CustomersPage },
  { path: 'services', module: 'services', Component: ServicesPage },
  { path: 'pricing', module: 'pricing', Component: PricingPage },
  { path: 'production', module: 'production', Component: ProductionPage },
  { path: 'inventory', module: 'inventory', Component: InventoryPage },
  { path: 'projects', module: 'projects', Component: ProjectsPage },
  { path: 'invoices', module: 'invoices', Component: InvoicesPage },
  { path: 'payments', module: 'payments', Component: PaymentsPage },
  { path: 'expenses', module: 'expenses', Component: ExpensesPage },
  { path: 'reports', module: 'reports', Component: ReportsPage },
  { path: 'staff', module: 'staff', Component: StaffPage },
  { path: 'roles', module: 'roles', Component: RolesPage },
  { path: 'settings', module: 'settings', Component: SettingsPage },
];

/** /admin lands on the company dashboard for owners/admins and on the department workspace for everyone else. */
function AdminHome() {
  const { role, can } = useAdmin();
  if (can('dashboard')) {
    return (
      <RequireModule module="dashboard">
        <CompanyDashboard />
      </RequireModule>
    );
  }
  return <Navigate to={homePathForRole(role)} replace />;
}

export default function AdminRoutes() {
  return (
    <AdminGate>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<RouteFallback />}>
                <AdminHome />
              </Suspense>
            }
          />
          {MODULE_ROUTES.map(({ path, module, Component }) => (
            <Route
              key={path}
              path={path}
              element={
                <RequireModule module={module}>
                  <Suspense fallback={<RouteFallback />}>
                    <Component />
                  </Suspense>
                </RequireModule>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminGate>
  );
}
