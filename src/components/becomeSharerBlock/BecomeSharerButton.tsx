'use client';

import { useState } from "react";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";

/**
 * BecomeSharerButton Component
 * Green button for unauthenticated users that opens the auth modal
 * Matches the style of the authenticated "Add listing" button
 */
export function BecomeSharerButton() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsAuthOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-md hover:bg-emerald-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Become a Sharer
      </button>

      <AuthenticationUserModal
        buttonValue="Login"
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  );
}
