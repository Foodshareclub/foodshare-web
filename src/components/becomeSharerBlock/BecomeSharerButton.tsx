"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AddListingButton } from "./AddListingButton";

const DynamicAuthenticationUserModal = dynamic(
  () => import("@/components/modals/AuthenticationUser/AuthenticationUserModal"),
  { ssr: false },
);

/**
 * BecomeSharerButton Component
 * Green "Add listing" button for unauthenticated users that opens the auth modal
 * Uses shared AddListingButton component for consistent styling
 */
export function BecomeSharerButton() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
      <AddListingButton onClick={() => setIsAuthOpen(true)} />

      {isAuthOpen && (
        <DynamicAuthenticationUserModal mode="login" isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      )}
    </>
  );
}
