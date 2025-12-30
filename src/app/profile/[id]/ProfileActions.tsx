"use client";

/**
 * ProfileActions - Thin client wrapper for profile action buttons
 * Handles navigation that requires useRouter
 */

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

interface ProfileActionsProps {
  profileId: string;
  isAuthenticated: boolean;
}

export function ProfileActions({ profileId, isAuthenticated }: ProfileActionsProps) {
  const router = useRouter();

  return (
    <>
      {/* Contact Button (Only for authenticated users) */}
      {isAuthenticated && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push(`/chat?user=${profileId}`)}
            className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Mail />
            Send Message
          </button>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          ← Back
        </button>
      </div>
    </>
  );
}
