'use client';

import { useState } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem, NavbarAvatar } from "../atoms";
import { AuthenticationUserModal } from "@/components";
import { ThemeToggleInline } from "@/components/ui/theme-toggle";

export interface DesktopMenuProps {
  /** User authentication status */
  isAuth: boolean;
  /** Whether user is admin */
  isAdmin?: boolean;
  /** User avatar URL */
  imgUrl?: string;
  /** User first name */
  firstName?: string;
  /** User last name */
  secondName?: string;
  /** User email */
  email?: string;
  /** Array of new message indicators */
  signalOfNewMessage: CustomRoomType[];
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
 * DesktopMenu Organism (Formerly ProfileSettings)
 *
 * Desktop navigation dropdown menu with user profile.
 * Displays avatar with notification badge and dropdown menu items.
 *
 * @example
 * ```tsx
 * <DesktopMenu
 *   isAuth={true}
 *   imgUrl="/avatar.jpg"
 *   signalOfNewMessage={messages}
 *   onNavigateToMyLists={handleMyLists}
 * />
 * ```
 */
export function DesktopMenu({
  signalOfNewMessage,
  onNavigateToMyLists,
  onNavigateToHelp,
  onNavigateToLogout,
  onNavigateToAccSettings,
  onNavigateToAboutUs,
  onNavigateToMyMessages,
  onNavigateToDashboard,
  imgUrl,
  firstName,
  secondName,
  email,
  isAuth,
  isAdmin = false,
}: DesktopMenuProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const hasNotifications = signalOfNewMessage.length > 0;
    const notificationCount = signalOfNewMessage.length;

    // Build display name from first and second name
    const displayName = [firstName, secondName].filter(Boolean).join(' ') || 'User';

    return (
      <>
        <div className="self-center p-0 text-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <NavbarAvatar
                  src={imgUrl}
                  alt="User profile"
                  firstName={firstName}
                  secondName={secondName}
                  hasNotification={hasNotifications}
                  size="md"
                />
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent variant="glass" className="glass-strong rounded-xl min-w-[220px]" align="end">
              {isAuth ? (
                <>
                  {/* User Profile Info Header */}
                  <div className="px-3 py-2 border-b border-border/50 mb-1">
                    <p className="font-medium text-sm text-foreground truncate">{displayName}</p>
                    {email && (
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    )}
                  </div>

                  {/* Admin Dashboard Link */}
                  {isAdmin && onNavigateToDashboard && (
                    <MenuItem
                      label="Dashboard"
                      onClick={onNavigateToDashboard}
                      variant="accent"
                      testId="menu-dashboard"
                    />
                  )}

                  <MenuItem
                    label="My listing's"
                    onClick={onNavigateToMyLists}
                    testId="menu-my-listings"
                  />
                  <MenuItem
                    label={
                      hasNotifications
                        ? `You have ${notificationCount} unanswered messages`
                        : "My messages"
                    }
                    onClick={onNavigateToMyMessages}
                    variant={hasNotifications ? "accent" : "default"}
                    badge={
                      hasNotifications ? (
                        <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-green-500 text-white text-xs font-semibold">
                          {notificationCount > 9 ? "9+" : notificationCount}
                        </span>
                      ) : undefined
                    }
                    testId="menu-messages"
                  />
                  <MenuItem
                    label="Account settings"
                    onClick={onNavigateToAccSettings}
                    testId="menu-account-settings"
                  />
                  <MenuItem
                    label="Log Out"
                    onClick={onNavigateToLogout}
                    variant="danger"
                    testId="menu-logout"
                  />
                </>
              ) : (
                <>
                  <MenuItem
                    label={"Login"}
                    onClick={() => setIsLoginOpen(true)}
                    testId="menu-login"
                  />
                  <MenuItem
                    label={"Registration"}
                    onClick={() => setIsRegisterOpen(true)}
                    testId="menu-register"
                  />
                </>
              )}

              {/* Divider */}
              <div className="my-1 h-px bg-border" role="separator" />

              <MenuItem label={"Help"} onClick={onNavigateToHelp} testId="menu-help" />
              <MenuItem
                label={"About Foodshare"}
                onClick={onNavigateToAboutUs}
                testId="menu-about"
              />

              {/* Theme Switcher */}
              <div className="my-1 h-px bg-border" role="separator" />
              <div className="px-2 py-2">
                <p className="text-xs text-muted-foreground mb-2 px-1">Appearance</p>
                <ThemeToggleInline className="w-full" />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Auth Modals - Rendered outside dropdown */}
        <AuthenticationUserModal
          buttonValue="Login"
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />
        <AuthenticationUserModal
          buttonValue="Registration"
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
        />
      </>
    );
}
