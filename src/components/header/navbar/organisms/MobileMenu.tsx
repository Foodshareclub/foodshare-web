"use client";

import { useState } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import { MinifiedUserInfo } from "@/components/minifiedUserInfo/MinifiedUserInfo";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import { ThemeToggleInline } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import UniversalDrawer from "@/components/universalDrawer/UniversalDrawer";
import { DragHandleIcon } from "@/utils/icons";
import { ClipboardList, HelpCircle, Info, LayoutGrid, LogOut, MessageCircle, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

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
  // Labels were English literals; this is the mobile half of the primary
  // navigation, so it is on the same footing as DesktopMenu.
  const t = useTranslations("nav");

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
        type="button"
        onClick={handleOpen}
        variant="ghost"
        size="icon-lg"
        className="relative rounded-full"
        aria-label={hasNotifications ? t("seeMenuWithUnread") : t("seeMenu")}
        aria-haspopup="dialog"
      >
        <DragHandleIcon />
        {hasNotifications && (
          <span
            className="absolute bottom-0 end-0 w-4 h-4 bg-green-300 border-2 border-background rounded-full"
            aria-label={t("newMessages", { count: signalOfNewMessage.length })}
          />
        )}
      </Button>

      {/* Drawer */}
      <UniversalDrawer
        size={size}
        onClose={handleClose}
        isOpen={isOpen}
        headerValue={t("greeting", { name: displayName })}
        placement="end"
      >
        <>
          {/* User Info */}
          <MinifiedUserInfo src={imgUrl} firstName={firstName} secondName={secondName} description={email} />

          <div className="mt-10">
            {/* Authenticated Menu */}
            {isAuth ? (
              <div className="flex flex-col gap-3">
                {/* Admin Dashboard Link */}
                {isAdmin && onNavigateToDashboard ? (
                  <button
                    type="button"
                    className="glass-accent-primary rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => handleNavigation(onNavigateToDashboard)}
                  >
                    <LayoutGrid className="w-8 h-8 flex-shrink-0" />
                    <span className="text-3xl font-semibold">{t("adminDashboard")}</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleNavigation(onNavigateToMyLists)}
                >
                  <ClipboardList className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">{t("myListings")}</span>
                </button>

                <button
                  type="button"
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleNavigation(onNavigateToAccSettings)}
                >
                  <Settings className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">{t("accountSettings")}</span>
                </button>

                <button
                  type="button"
                  className={`${hasNotifications ? "glass-accent-primary" : "glass-subtle"} rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  onClick={() => handleNavigation(onNavigateToMyMessages)}
                  aria-label={t("chatWithUnread", { count: signalOfNewMessage.length })}
                >
                  <MessageCircle className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">{t("chatWithUnread", { count: signalOfNewMessage.length })}</span>
                </button>

                <button
                  type="button"
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu flex items-center gap-4 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleNavigation(onNavigateToLogout)}
                >
                  <LogOut className="w-8 h-8 flex-shrink-0" />
                  <span className="text-3xl">{t("logOut")}</span>
                </button>
              </div>
            ) : (
              /* Unauthenticated Menu */
              <div className="flex flex-col gap-3">
                <AuthenticationUserModal mode="login" buttonLabel={t("login")} fullScreen={false} />
                <AuthenticationUserModal mode="signup" buttonLabel={t("registration")} fullScreen={false} />
              </div>
            )}

            {/* Common Links */}
            <button
              type="button"
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3 flex items-center gap-4 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => handleNavigation(onNavigateToAboutUs)}
            >
              <Info className="w-8 h-8 flex-shrink-0" />
              <span className="text-3xl">{t("about")}</span>
            </button>

            <button
              type="button"
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3 flex items-center gap-4 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => handleNavigation(onNavigateToHelp)}
            >
              <HelpCircle className="w-8 h-8 flex-shrink-0" />
              <span className="text-3xl">{t("help")}</span>
            </button>

            {/* Theme Switcher */}
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground mb-3 font-medium">{t("appearance")}</p>
              <ThemeToggleInline />
            </div>
          </div>
        </>
      </UniversalDrawer>
    </div>
  );
}
