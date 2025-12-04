'use client';

import { memo, useState, type FC } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem, NavbarAvatar } from "../atoms";
import { AuthenticationUserModal } from "@/components";

export interface DesktopMenuProps {
  /** User authentication status */
  isAuth: boolean;
  /** User avatar URL */
  imgUrl?: string;
  /** Array of new message indicators */
  signalOfNewMessage: CustomRoomType[];
  /** Navigation handlers */
  onNavigateToMyLists: () => void;
  onNavigateToLogout: () => void;
  onNavigateToAccSettings: () => void;
  onNavigateToHelp: () => void;
  onNavigateToAboutUs: () => void;
  onNavigateToMyMessages: () => void;
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
export const DesktopMenu: FC<DesktopMenuProps> = memo(
  ({
    signalOfNewMessage,
    onNavigateToMyLists,
    onNavigateToHelp,
    onNavigateToLogout,
    onNavigateToAccSettings,
    onNavigateToAboutUs,
    onNavigateToMyMessages,
    imgUrl,
    isAuth,
  }) => {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const hasNotifications = signalOfNewMessage.length > 0;
    const notificationCount = signalOfNewMessage.length;

    return (
      <>
        <div className="self-center p-0 text-[#303030]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <NavbarAvatar
                  src={imgUrl}
                  alt="User profile"
                  hasNotification={hasNotifications}
                  size="md"
                />
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent variant="glass" className="rounded-xl min-w-[200px]" align="end">
              {isAuth ? (
                <>
                  <MenuItem
                    label={"My listing's"}
                    onClick={onNavigateToMyLists}
                    testId="menu-my-listings"
                  />
                  <MenuItem
                    label={
                      hasNotifications ? (
                        "You have {notificationCount} unanswered messages"
                      ) : (
                        "My messages"
                      )
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
                    label={"Account settings"}
                    onClick={onNavigateToAccSettings}
                    testId="menu-account-settings"
                  />
                  <MenuItem
                    label={"Log Out"}
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
);

DesktopMenu.displayName = "DesktopMenu";
