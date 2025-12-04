'use client';

/**
 * Protected Route Component (DEPRECATED)
 * @deprecated Use AuthGuard instead
 * This component is kept for backward compatibility during migration
 *
 * Redirects to login if user is not authenticated
 * Uses useAuth hook (TanStack Query + Zustand) instead of Redux
 */

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isAdmin, adminCheckStatus } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?from=${encodeURIComponent(pathname || '/')}`);
    }
  }, [isAuthenticated, pathname, router]);

  // Show loading spinner while checking auth status
  if (adminCheckStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <AiOutlineLoading3Quarters className="w-12 h-12 animate-spin text-rausch-500" />
      </div>
    );
  }

  // Show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <AiOutlineLoading3Quarters className="w-12 h-12 animate-spin text-rausch-500" />
      </div>
    );
  }

  // Redirect to home if admin access required but user is not admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
