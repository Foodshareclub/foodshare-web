"use client";

/**
 * Auth Guard Component (Unified)
 * Protects routes based on authentication and authorization status
 * Following ultrathink principles: simple, secure, user-friendly
 *
 * Features:
 * - Automatic redirects
 * - Loading states
 * - Return URL preservation
 * - Admin role checking
 * - Flexible configuration
 */

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Whether authentication is required to access this route
   * @default true
   */
  requireAuth?: boolean;
  /**
   * Whether admin role is required to access this route
   * @default false
   */
  requireAdmin?: boolean;
  /**
   * Where to redirect if auth requirement is not met
   * @default '/auth/login' for requireAuth=true
   * @default '/' for requireAuth=false
   */
  redirectTo?: string;
  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
  /**
   * Custom fallback for unauthorized access (when requireAdmin fails)
   */
  fallback?: React.ReactNode;
  /**
   * Show loading message
   * @default true
   */
  showLoadingMessage?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AuthGuard - Protects routes based on authentication and authorization
 *
 * @example
 * ```typescript
 * // Protect a route (require authentication)
 * <AuthGuard>
 *   <ProfilePage />
 * </AuthGuard>
 *
 * // Require admin role
 * <AuthGuard requireAdmin>
 *   <AdminDashboard />
 * </AuthGuard>
 *
 * // Redirect authenticated users away (e.g., login page)
 * <AuthGuard requireAuth={false}>
 *   <LoginPage />
 * </AuthGuard>
 *
 * // Custom redirect and fallback
 * <AuthGuard redirectTo="/signup" fallback={<CustomLoader />}>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  redirectTo,
  loadingComponent,
  fallback,
  showLoadingMessage = true,
}) => {
  const { isAuthenticated, isAdmin, isLoading, adminCheckStatus } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Determine redirect path
  const defaultRedirect = requireAuth ? "/auth/login" : "/";
  const redirectPath = redirectTo ?? defaultRedirect;

  // Handle redirects with useEffect
  useEffect(() => {
    if (isLoading) return;

    // Redirect unauthenticated users to login
    if (requireAuth && !isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRedirecting(true);
      const loginUrl = `${redirectPath}?from=${encodeURIComponent(pathname || "/")}`;
      router.push(loginUrl);
      return;
    }

    // Redirect authenticated users away from auth pages
    if (!requireAuth && isAuthenticated) {
      setIsRedirecting(true);
      router.push(redirectPath);
      return;
    }
  }, [isLoading, isAuthenticated, requireAuth, redirectPath, pathname, router]);

  // Loading component renderer
  const renderLoading = () => {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        {showLoadingMessage && <p className="text-muted-foreground text-sm">Loading...</p>}
      </div>
    );
  };

  // Show loading while checking admin status
  if (requireAdmin && adminCheckStatus === "loading") {
    return renderLoading();
  }

  // Show loading state while checking authentication or redirecting
  if (isLoading || isRedirecting) {
    return renderLoading();
  }

  // Show loading while redirecting unauthenticated users
  if (requireAuth && !isAuthenticated) {
    return renderLoading();
  }

  // Show access denied if admin required but user is not admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don&apos;t have permission to access this page.
          </p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
};

// Display name for debugging
AuthGuard.displayName = "AuthGuard";

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * RequireAuth - Shorthand for requiring authentication
 *
 * @example
 * ```typescript
 * <RequireAuth>
 *   <ProfilePage />
 * </RequireAuth>
 * ```
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthGuard requireAuth={true}>{children}</AuthGuard>;
};

RequireAuth.displayName = "RequireAuth";

/**
 * RequireGuest - Shorthand for requiring guest (not authenticated)
 * Useful for login/signup pages
 *
 * @example
 * ```typescript
 * <RequireGuest>
 *   <LoginPage />
 * </RequireGuest>
 * ```
 */
export const RequireGuest: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthGuard requireAuth={false}>{children}</AuthGuard>;
};

RequireGuest.displayName = "RequireGuest";

/**
 * RequireAdmin - Shorthand for requiring admin role
 *
 * @example
 * ```typescript
 * <RequireAdmin>
 *   <AdminDashboard />
 * </RequireAdmin>
 * ```
 */
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthGuard requireAuth={true} requireAdmin={true}>
      {children}
    </AuthGuard>
  );
};

RequireAdmin.displayName = "RequireAdmin";
