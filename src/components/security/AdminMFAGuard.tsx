"use client";

/**
 * Admin MFA Guard Component
 * Protects admin routes by requiring AAL2 authentication
 * Uses useAuth hook (TanStack Query + Zustand) instead of Redux
 *
 * Features:
 * - Checks if user is admin
 * - Verifies AAL2 authentication level
 * - Redirects to MFA verification if needed
 * - Session activity tracking
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MFAVerification } from "./MFAVerification";
import { checkAdminMFARequired, MFAService } from "@/lib/security/mfa";
import { Loader2 } from "lucide-react";

interface AdminMFAGuardProps {
  children: React.ReactNode;
}

/**
 * AdminMFAGuard
 * Wraps admin routes to ensure AAL2 authentication
 *
 * Usage:
 * <Route path="/admin/*" element={
 *   <AdminMFAGuard>
 *     <AdminLayout />
 *   </AdminMFAGuard>
 * } />
 */
export const AdminMFAGuard: React.FC<AdminMFAGuardProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isAdmin, user } = useAuth();

  const [isChecking, setIsChecking] = useState(true);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [currentAAL, setCurrentAAL] = useState<"aal1" | "aal2">("aal1");

  // Check MFA requirement on mount and when auth changes
  useEffect(() => {
    checkMFARequirement();
  }, [isAuthenticated, isAdmin, user]);

  // Set up session activity tracking
  useEffect(() => {
    if (!requiresMFA && user?.id) {
      // Track user activity to extend session
      const activityInterval = setInterval(
        async () => {
          const session = await MFAService.getActiveSession(user.id);
          if (session) {
            await MFAService.updateSessionActivity(session.session_id);
          }
        },
        5 * 60 * 1000
      ); // Every 5 minutes

      return () => clearInterval(activityInterval);
    }
  }, [requiresMFA, user?.id]);

  const checkMFARequirement = async () => {
    if (!isAuthenticated || !user) {
      setIsChecking(false);
      return;
    }

    try {
      const result = await checkAdminMFARequired();

      setRequiresMFA(result.required);
      setCurrentAAL(result.currentAAL);
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === "development") {
        console.error("[AdminMFAGuard] Error checking MFA requirement:", error);
      }
      setRequiresMFA(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleMFAVerified = () => {
    setRequiresMFA(false);
    setCurrentAAL("aal2");
    // Refresh to update UI
    window.location.reload();
  };

  const handleMFACancel = () => {
    // Log user out and redirect to login
    window.location.href = "/login";
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      router.push("/login");
    }
  }, [isChecking, isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Show MFA verification if required
  if (requiresMFA && user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <MFAVerification
          profileId={user.id}
          onVerified={handleMFAVerified}
          onCancel={handleMFACancel}
        />
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};
