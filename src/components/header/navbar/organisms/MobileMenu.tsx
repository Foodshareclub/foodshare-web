"use client";

import { useState } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import { DragHandleIcon } from "@/utils/icons";
import { Button } from "@/components/ui/button";
import { UniversalDrawer, MinifiedUserInfo, AuthenticationUserModal } from "@/components";
import { ThemeToggleInline } from "@/components/theme/ThemeToggle";

// Lucide icons
import {
  ClipboardList,
  MessageCircle,
  Settings,
  LogOut,
  HelpCircle,
  Info,
  LayoutGrid,
} from "lucide-react";

export interface MobileMenuProps {
  /** User authentication status */
  isAuth: boolean;
  /** Whether user is admin */
  isAdmin?: boolean;
  /** User first name */
  firstName?: string;
  /** User last name */
  secondName?: string;
  /** User email */
  email?: string;
  /** User avatar URL */
  imgUrl?: string;
  /** Array of new message indicators */
  signalOfNewMessage: CustomRoomType[];
  /** Drawer size */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  /** Navigation handlers */
  onNavigateToMyLists: () => void;
  onNavigateToLogout: () => void;
  onNavigateToAccSettings: () => void;
  onNavigateToHelp: () => void;
  onNavigateToAboutUs: () => void;
  onNavigateToMyMessages: () => void;
  onNavigateToDashboard?: () => void;
}

/**
 * MobileMenu Organism (Formerly NavDrawer)
 *
 * Mobile navigation drawer with user menu, auth, and settings.
 * Optimized for touch interactions and small screens.
 *
 * @example
 * ```tsx
 * <MobileMenu
 *   isAuth={true}
 *   firstName="John"
 *   imgUrl="/avatar.jpg"
 *   signalOfNewMessage={messages}
 *   onNavigateToMyLists={handleMyLists}
 * />
 * ```
 */
export function MobileMenu({
  firstName,
  secondName,
  email,
  size = "md",
  isAuth,
  isAdmin = false,
  imgUrl,
  signalOfNewMessage,
  onNavigateToHelp,
  onNavigateToLogout,
  onNavigateToMyLists,
  onNavigateToAboutUs,
  onNavigateToAccSettings,
  onNavigateToMyMessages,
  onNavigateToDashboard,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleNavigation = (action: () => void) => {
    handleClose();
    action();
  };

  const hasNotifications = signalOfNewMessage.length > 0;

  // Build display name with fallback chain
  const emailUsername = email?.split("@")[0];
  const displayName = firstName || emailUsername || "friend";

  return (
    <div className="self-center">
      {/* Menu Trigger Button */}
      <Button
        onClick={handleOpen}
        variant="ghost"
        className="relative"
        aria-label={hasNotifications ? "See menu (new messages)" : "See menu"}
        aria-haspopup="dialog"
      >
        <DragHandleIcon />
        {hasNotifications && (
          <span
            className="absolute bottom-0 right-0 w-4 h-4 bg-green-300 border-2 border-background rounded-full"
            aria-label={`${signalOfNewMessage.length} new messages`}
          />
        )}
      </Button>

      {/* Drawer */}
      <UniversalDrawer
        size={size}
        onClose={handleClose}
        isOpen={isOpen}
        headerValue={`Hi ${displayName}`}
        placement="end"
      >
        <>
          {/* User Info */}
          <MinifiedUserInfo
            src={imgUrl}
            firstName={firstName}
            secondName={secondName}
            description={email}
          />

          <div className="mt-10">
            {/* Authenticated Menu */}
            {isAuth ? (
              <div className="flex flex-col gap-3">
                {/* Admin Dashboard Link */}
                {isAdmin && onNavigateToDashboard && (
                  <div
                    className="glass-accent-primary rounded-xl p-4 cursor-pointer gpu flex items-center gap-4"
                    onClick={() => handleNavigation(onNavigateToDashboard)}
                    role="button"
                    tabIndex={0}
                  >
                    <LayoutGrid className="w-8 h-8 flex-shrink-0" />
                    <p className="text-3xl font-semibold">Dashboard</p>
                  </div>
                )}

                <div
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4"
                  onClick={() => handleNavigation(onNavigateToMyLists)}
                  role="button"
                  tabIndex={0}
                >
                  <ClipboardList className="w-8 h-8 flex-shrink-0" />
                  <p className="text-3xl">My listing's</p>
                </div>

                <div
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4"
                  onClick={() => handleNavigation(onNavigateToAccSettings)}
                  role="button"
                  tabIndex={0}
                >
                  <Settings className="w-8 h-8 flex-shrink-0" />
                  <p className="text-3xl">Account settings</p>
                </div>

                <div
                  className={`${hasNotifications ? "glass-accent-primary" : "glass-subtle"} rounded-xl p-4 cursor-pointer gpu flex items-center gap-4`}
                  onClick={() => handleNavigation(onNavigateToMyMessages)}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    hasNotifications ? `Chat (${signalOfNewMessage.length} unread)` : "Chat"
                  }
                >
                  <MessageCircle className="w-8 h-8 flex-shrink-0" />
                  <p className="text-3xl">
                    {hasNotifications ? `Chat (${signalOfNewMessage.length} new)` : "Chat"}
                  </p>
                </div>

                <div
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4"
                  onClick={() => handleNavigation(onNavigateToLogout)}
                  role="button"
                  tabIndex={0}
                >
                  <LogOut className="w-8 h-8 flex-shrink-0" />
                  <p className="text-3xl">Log Out</p>
                </div>
              </div>
            ) : (
              /* Unauthenticated Menu */
              <div className="flex flex-col gap-3">
                <AuthenticationUserModal buttonValue="Login" fullScreen={false} />
                <AuthenticationUserModal buttonValue="Registration" fullScreen={false} />
              </div>
            )}

            {/* Common Links */}
            <div
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3 flex items-center gap-4"
              onClick={() => handleNavigation(onNavigateToAboutUs)}
              role="button"
              tabIndex={0}
            >
              <Info className="w-8 h-8 flex-shrink-0" />
              <p className="text-3xl">About Us</p>
            </div>

            <div
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3 flex items-center gap-4"
              onClick={() => handleNavigation(onNavigateToHelp)}
              role="button"
              tabIndex={0}
            >
              <HelpCircle className="w-8 h-8 flex-shrink-0" />
              <p className="text-3xl">Help</p>
            </div>

            {/* Theme Switcher */}
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground mb-3 font-medium">Appearance</p>
              <ThemeToggleInline />
            </div>
          </div>
        </>
      </UniversalDrawer>
    </div>
  );
}
