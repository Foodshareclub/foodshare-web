'use client';

import { memo, useState, type FC } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import { DragHandleIcon } from "@/utils/icons";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/Glass";
import { UniversalDrawer, MinifiedUserInfo, AuthenticationUserModal } from "@/components";
import { ThemeToggleInline } from "@/components/ui/theme-toggle";
import { MenuItem, NavbarAvatar } from "../atoms";

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
export const MobileMenu: FC<MobileMenuProps> = memo(
  ({
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
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleNavigation = (action: () => void) => {
      handleClose();
      action();
    };

    const hasNotifications = signalOfNewMessage.length > 0;

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
          headerValue={`Hi ${firstName || "friend"}`}
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
                    <Glass
                      variant="accentGreen"
                      borderRadius="12px"
                      padding="16px"
                      className="cursor-pointer glass-accelerated"
                      onClick={() => handleNavigation(onNavigateToDashboard)}
                      role="button"
                      tabIndex={0}
                    >
                      <p className="text-3xl font-semibold">
                        Dashboard
                      </p>
                    </Glass>
                  )}

                  <Glass
                    variant="subtle"
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => handleNavigation(onNavigateToMyLists)}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="text-3xl">
                      My listing's
                    </p>
                  </Glass>

                  <Glass
                    variant="subtle"
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => handleNavigation(onNavigateToAccSettings)}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="text-3xl">
                      "Account settings"
                    </p>
                  </Glass>

                  <Glass
                    variant={hasNotifications ? "accentGreen" : "subtle"}
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => handleNavigation(onNavigateToMyMessages)}
                    role="button"
                    tabIndex={0}
                    aria-label={
                      hasNotifications
                        ? `Messages (${signalOfNewMessage.length} unread)`
                        : "Messages"
                    }
                  >
                    <p className="text-3xl">
                      {hasNotifications ? (
                        "You have {signalOfNewMessage.length} unanswered messages"
                      ) : (
                        "My messages"
                      )}
                    </p>
                  </Glass>

                  <Glass
                    variant="subtle"
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => handleNavigation(onNavigateToLogout)}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="text-3xl">
                      "Log Out"
                    </p>
                  </Glass>
                </div>
              ) : (
                /* Unauthenticated Menu */
                <div className="flex flex-col gap-3">
                  <AuthenticationUserModal buttonValue="Login" fullScreen={false} />
                  <AuthenticationUserModal
                    buttonValue="Registration"
                    fullScreen={false}
                  />
                </div>
              )}

              {/* Common Links */}
              <Glass
                variant="subtle"
                borderRadius="12px"
                padding="16px"
                className="cursor-pointer glass-accelerated mt-3"
                onClick={() => handleNavigation(onNavigateToAboutUs)}
                role="button"
                tabIndex={0}
              >
                <p className="text-3xl">
                  "About Us"
                </p>
              </Glass>

              <Glass
                variant="subtle"
                borderRadius="12px"
                padding="16px"
                className="cursor-pointer glass-accelerated mt-3"
                onClick={() => handleNavigation(onNavigateToHelp)}
                role="button"
                tabIndex={0}
              >
                <p className="text-3xl">
                  "Help"
                </p>
              </Glass>

              {/* Theme Switcher */}
              <div className="mt-6 pt-4 border-t border-border/30">
                <p className="text-sm text-muted-foreground mb-3 font-medium">
                  "Appearance"
                </p>
                <ThemeToggleInline />
              </div>
            </div>
          </>
        </UniversalDrawer>
      </div>
    );
  }
);

MobileMenu.displayName = "MobileMenu";
