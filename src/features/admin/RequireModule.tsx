import React from 'react';
import { useAdmin } from './AdminContext';
import type { AdminModuleId } from './navigation';
import AccessDenied from './shell/AccessDenied';

/**
 * Renders a module only for roles listed in navigation.ts. Row Level Security still enforces the
 * real data boundary; this keeps the interface from offering screens a role cannot use.
 */
const RequireModule: React.FC<{ module: AdminModuleId; children: React.ReactNode }> = ({ module, children }) => {
  const { can } = useAdmin();
  if (!can(module)) return <AccessDenied module={module} />;
  return <>{children}</>;
};

export default RequireModule;
