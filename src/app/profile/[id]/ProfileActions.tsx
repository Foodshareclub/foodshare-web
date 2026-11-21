"use client";

/**
 * ProfileActions - Thin client wrapper for profile action buttons
 * Handles navigation that requires useRouter
 */

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileActionsProps {
  profileId: string;
  isAuthenticated: boolean;
}

export function ProfileActions({ profileId, isAuthenticated }: ProfileActionsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      {/* Contact Button (Only for authenticated users) */}
      {isAuthenticated && (
        <button
          type="button"
          onClick={() => router.push(`/chat?user=${profileId}`)}
          className="w-full sm:w-auto h-12 px-7 rounded-xl bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E6284D] hover:to-[#E03150] text-white font-semibold text-sm shadow-md hover:shadow-lg shadow-[#FF2D55]/20 hover:shadow-[#FF2D55]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Mail className="size-4" aria-hidden="true" />
          <span>Send Message</span>
        </button>
      )}

      {/* Back Button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="w-full sm:w-auto h-12 px-6 rounded-xl border border-border/80 text-foreground font-semibold text-sm hover:bg-muted/60 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
      >
        <span>← Back</span>
      </button>
    </div>
  );
}
