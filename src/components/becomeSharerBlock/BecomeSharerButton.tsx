"use client";

import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import { useState } from "react";
import { AddListingButton } from "./AddListingButton";

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

      <AuthenticationUserModal mode="login" isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
