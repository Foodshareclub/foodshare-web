"use client";

/**
 * Profile Edit Page - Next.js App Router version
 * Edit personal information including name, email, phone, and address
 *
 * Note: This page should ideally be a Server Component that fetches data
 * and passes it to a Client Component. For now, using useAuth for auth state.
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock } from "@/components/profile";

// Icon alias for consistency
const FaChevronRight = ChevronRight;

// Simplified profile type for this component
interface ProfileData {
  id: string;
  first_name?: string | null;
  second_name?: string | null;
  phone?: string | null;
}

interface AddressData {
  profile_id: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  county: string;
  state_province: string;
  postal_code: string;
  country: number;
}

interface ProfileEditPageProps {
  /** Profile data passed from server */
  initialProfile?: ProfileData | null;
  /** Address data passed from server */
  initialAddress?: AddressData | null;
}

export default function ProfileEditPage({ initialProfile, initialAddress }: ProfileEditPageProps) {
  const router = useRouter();

  // Auth state
  const { isAuthenticated, user } = useAuth();

  // Use server-provided data or empty defaults
  const currentProfile = initialProfile;
  const address = initialAddress;
  const isLoading = !initialProfile && isAuthenticated;

  // Local state for form fields - initialized from server data
  const [firstName, setFirstName] = useState(currentProfile?.first_name || "");
  const [secondName, setSecondName] = useState(currentProfile?.second_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(currentProfile?.phone || "");

  // State for controlling which block is being edited
  // When one block is in edit mode, it disables the others
  const [disableNameEdit, setDisableNameEdit] = useState(false);
  const [disableEmailEdit, setDisableEmailEdit] = useState(false);
  const [disablePhoneEdit, setDisablePhoneEdit] = useState(false);
  const [disableAddressEdit, setDisableAddressEdit] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login?from=/profile/edit");
    }
  }, [isAuthenticated, router]);

  // Note: State is initialized from server-provided props above
  // No need for useEffect to sync - props are the source of truth

  // Handle profile save
  const onSaveHandler = async () => {
    if (!currentProfile) return;

    // TODO: Use updateProfile Server Action
    // For now, just refresh the page
    router.refresh();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-3xl pt-24 pb-12 px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <button
            onClick={() => router.push("/profile")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Account settings
          </button>
          <FaChevronRight className="text-muted-foreground text-xs" />
          <span className="text-sm font-medium text-foreground">Personal info</span>
        </nav>

        {/* Loading State */}
        {isLoading || !address || !currentProfile ? (
          <>
            <div className="mt-8">
              <h1 className="text-4xl font-bold mb-4 text-foreground">Personal info</h1>
              <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
            </div>
            <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
            <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
            <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
          </>
        ) : (
          <>
            <div className="mt-8">
              <h1 className="text-4xl font-bold mb-6 text-foreground">Personal info</h1>

              {/* Name Block */}
              <NameBlock
                firstName={firstName}
                secondName={secondName}
                setFirstName={setFirstName}
                setSecondName={setSecondName}
                onSaveHandler={onSaveHandler}
                disableNameEdit={disableNameEdit}
                disableEmailEdit={disableEmailEdit}
                disablePhoneEdit={disablePhoneEdit}
                disableAddressEdit={disableAddressEdit}
                setDisableEmailEdit={setDisableEmailEdit}
                setDisablePhoneEdit={setDisablePhoneEdit}
                setDisableAddressEdit={setDisableAddressEdit}
              />
            </div>

            {/* Email Block */}
            <div className="mt-5">
              <EmailBlock
                email={email}
                setEmail={setEmail}
                onSaveHandler={onSaveHandler}
                disableNameEdit={disableNameEdit}
                disableEmailEdit={disableEmailEdit}
                disablePhoneEdit={disablePhoneEdit}
                disableAddressEdit={disableAddressEdit}
                setDisableNameEdit={setDisableNameEdit}
                setDisablePhoneEdit={setDisablePhoneEdit}
                setDisableAddressEdit={setDisableAddressEdit}
              />
            </div>

            {/* Phone Block */}
            <div className="mt-5">
              <PhoneNumberBlock
                phone={phone}
                setPhone={setPhone}
                onSaveHandler={onSaveHandler}
                disableNameEdit={disableNameEdit}
                disableEmailEdit={disableEmailEdit}
                disablePhoneEdit={disablePhoneEdit}
                disableAddressEdit={disableAddressEdit}
                setDisableNameEdit={setDisableNameEdit}
                setDisableEmailEdit={setDisableEmailEdit}
                setDisableAddressEdit={setDisableAddressEdit}
              />
            </div>

            {/* Address Block */}
            <div className="mt-5">
              <AddressBlock
                address={address}
                disableNameEdit={disableNameEdit}
                disableEmailEdit={disableEmailEdit}
                disablePhoneEdit={disablePhoneEdit}
                disableAddressEdit={disableAddressEdit}
                setDisableNameEdit={setDisableNameEdit}
                setDisableEmailEdit={setDisableEmailEdit}
                setDisablePhoneEdit={setDisablePhoneEdit}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
