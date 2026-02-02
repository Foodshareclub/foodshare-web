"use client";

import { useState } from "react";

import {
  ClipboardList,
  MessageCircle,
  Settings,
  LogOut,
  HelpCircle,
  Info,
  LayoutGrid,
} from "lucide-react";
import type { CustomRoomType } from "@/api/chatAPI";
import { DragHandleIcon } from "@/utils/icons";
import { Button } from "@/components/ui/button";
import { UniversalDrawer, MinifiedUserInfo, AuthenticationUserModal } from "@/components";
import { ThemeToggleInline } from "@/components/theme/ThemeToggle";

// Lucide icons

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
                {isAdmin && onNavigateToDashboard ? (
                  <button
                    type="button"
                    className="glass-accent-primary rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => handleNavigation(onNavigateToDashboard)}
                  >
                    <LayoutGrid className="w-8 h-8 flex-shrink-0" />
                    <span className="text-3xl font-semibold">Admin</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleNavigation(onNavigateToMyLists)}
                >
                  <ClipboardList className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">My listings</span>
                </button>

                <button
                  type="button"
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleNavigation(onNavigateToAccSettings)}
                >
                  <Settings className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">Account settings</span>
                </button>

                <button
                  type="button"
                  className={`${hasNotifications ? "glass-accent-primary" : "glass-subtle"} rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  onClick={() => handleNavigation(onNavigateToMyMessages)}
                  aria-label={
                    hasNotifications ? `Chat (${signalOfNewMessage.length} unread)` : "Chat"
                  }
                >
                  <MessageCircle className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">
                    {hasNotifications ? `Chat (${signalOfNewMessage.length} new)` : "Chat"}
                  </span>
                </button>

                <button
                  type="button"
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleNavigation(onNavigateToLogout)}
                >
                  <LogOut className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">Log Out</span>
                </button>
              </div>
            ) : (
              /* Unauthenticated Menu */
              <div className="flex flex-col gap-3">
                <AuthenticationUserModal buttonValue="Login" fullScreen={false} />
                <AuthenticationUserModal buttonValue="Registration" fullScreen={false} />
              </div>
            )}

            {/* Common Links */}
            <button
              type="button"
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3 flex items-center gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => handleNavigation(onNavigateToAboutUs)}
            >
              <Info className="w-8 h-8 flex-shrink-0" />
              <span className="text-3xl">About Us</span>
            </button>

            <button
              type="button"
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3 flex items-center gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => handleNavigation(onNavigateToHelp)}
            >
              <HelpCircle className="w-8 h-8 flex-shrink-0" />
              <span className="text-3xl">Help</span>
            </button>

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
