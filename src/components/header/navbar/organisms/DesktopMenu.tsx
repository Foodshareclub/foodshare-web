"use client";

import { useState } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import { ThemeToggleInline } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  HelpCircle,
  Info,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageCircle,
  Settings,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenuEntry, NavbarAvatar } from "../atoms";

// Lucide icons

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
  // Every label in this menu was an English literal, in a menu that is the
  // primary navigation for every signed-in user in 21 locales. The Chat row
  // also built its own count string by concatenation, which is ungrammatical in
  // ja/ko/ar/zh where word order and counters differ — hence the ICU plural in
  // messages/en.json rather than another template literal.
  const t = useTranslations("nav");

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const hasNotifications = signalOfNewMessage.length > 0;
  const notificationCount = signalOfNewMessage.length;

  // Build display name with fallback chain: full name -> first name -> email username -> 'User'
  const fullName = [firstName, secondName].filter(Boolean).join(" ");
  const emailUsername = email?.split("@")[0];
  const displayName = fullName || emailUsername || "User";

  return (
    <>
      <div className="self-center p-0 text-foreground">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-lg" className="rounded-full" aria-label={t("seeMenu")}>
              <NavbarAvatar
                src={imgUrl}
                alt={t("userProfilePhoto")}
                firstName={firstName}
                secondName={secondName}
                hasNotification={hasNotifications}
                size="md"
              />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent variant="glass" className="glass-strong rounded-xl min-w-[220px]" align="end">
            {isAuth ? (
              <>
                {/* User Profile Info Header */}
                <div className="px-3 py-3 border-b border-border/50 mb-1 flex items-center gap-3">
                  <NavbarAvatar
                    src={imgUrl}
                    alt={t("userProfilePhoto")}
                    firstName={firstName}
                    secondName={secondName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{displayName}</p>
                    {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                  </div>
                </div>

                {/* Admin Dashboard */}
                {isAdmin && onNavigateToDashboard && (
                  <DropdownMenuEntry
                    label={t("adminDashboard")}
                    icon={<LayoutGrid className="w-5 h-5" />}
                    onSelect={onNavigateToDashboard}
                    variant="accent"
                    testId="menu-admin"
                  />
                )}

                <DropdownMenuEntry
                  label={t("myListings")}
                  icon={<ClipboardList className="w-5 h-5" />}
                  onSelect={onNavigateToMyLists}
                  testId="menu-my-listings"
                />

                <DropdownMenuEntry
                  label={t("chatWithUnread", { count: notificationCount })}
                  icon={<MessageCircle className="w-5 h-5" />}
                  onSelect={onNavigateToMyMessages}
                  variant={hasNotifications ? "accent" : "default"}
                  badge={
                    hasNotifications ? (
                      <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-green-500 text-white text-xs font-semibold">
                        {notificationCount > 9 ? "9+" : notificationCount}
                      </span>
                    ) : undefined
                  }
                  testId="menu-chat"
                />
                <DropdownMenuEntry
                  label={t("accountSettings")}
                  icon={<Settings className="w-5 h-5" />}
                  onSelect={onNavigateToAccSettings}
                  testId="menu-account-settings"
                />
                <DropdownMenuEntry
                  label={t("logOut")}
                  icon={<LogOut className="w-5 h-5" />}
                  onSelect={onNavigateToLogout}
                  variant="danger"
                  testId="menu-logout"
                />
              </>
            ) : (
              <>
                <DropdownMenuEntry
                  label={t("login")}
                  icon={<LogIn className="w-5 h-5" />}
                  onSelect={() => setIsLoginOpen(true)}
                  testId="menu-login"
                />
                <DropdownMenuEntry
                  label={t("registration")}
                  icon={<UserPlus className="w-5 h-5" />}
                  onSelect={() => setIsRegisterOpen(true)}
                  testId="menu-register"
                />
              </>
            )}

            {/* Divider */}
            <hr className="my-1 border-border" />

            <DropdownMenuEntry
              label={t("help")}
              icon={<HelpCircle className="w-5 h-5" />}
              onSelect={onNavigateToHelp}
              testId="menu-help"
            />
            <DropdownMenuEntry
              label={t("about")}
              icon={<Info className="w-5 h-5" />}
              onSelect={onNavigateToAboutUs}
              testId="menu-about"
            />

            {/* Theme Switcher */}
            <hr className="my-1 border-border" />
            <div className="px-2 py-2">
              <p className="text-xs text-muted-foreground mb-2 px-1">{t("appearance")}</p>
              <ThemeToggleInline className="w-full" />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Auth Modals - Rendered outside dropdown */}
      <AuthenticationUserModal
        mode="login"
        buttonLabel={t("login")}
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
      <AuthenticationUserModal
        mode="signup"
        buttonLabel={t("registration")}
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />
    </>
  );
}
