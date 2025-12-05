'use client';

import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PATH } from '@/utils/ROUTES';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole: 'admin';
}

/**
 * RoleGuard (DEPRECATED)
 * @deprecated Use AuthGuard with requireAdmin prop instead
 * This component is kept for backward compatibility during migration
 *
 * Protects admin routes from unauthorized access
 * Redirects non-admin users to home page
 * Uses useAuth hook (TanStack Query + Zustand) instead of Redux
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Determine if user has required role
  const isAuthenticatedAdmin = isAuthenticated && isAdmin;

  // Handle redirects with useEffect
  useEffect(() => {
    if (requiredRole === 'admin' && !isAuthenticatedAdmin) {
      setIsRedirecting(true);
      router.push(PATH.main);
      return;
    }
  }, [requiredRole, isAuthenticatedAdmin, router]);

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AiOutlineLoading3Quarters className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
};
