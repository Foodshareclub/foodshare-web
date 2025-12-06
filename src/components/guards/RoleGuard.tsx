'use client';

import type { ReactNode } from 'react';
import React from 'react';
import { AuthGuard } from './AuthGuard';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole: 'admin';
}

/**
 * @deprecated Use AuthGuard with requireAdmin prop instead
 * Example: <AuthGuard requireAdmin>{children}</AuthGuard>
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, requiredRole: _requiredRole }) => {
  return (
    <AuthGuard requireAuth requireAdmin>
      {children}
    </AuthGuard>
  );
};
