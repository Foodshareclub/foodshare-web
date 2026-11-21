"use client";

import { useState } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import { MinifiedUserInfo } from "@/components/minifiedUserInfo/MinifiedUserInfo";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import { ThemeToggleInline } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import UniversalDrawer from "@/components/universalDrawer/UniversalDrawer";
import { ClipboardList, HelpCircle, Info, LayoutGrid, LogOut, Menu, MessageCircle, Settings, User } from "lucide-react";
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
      {/* Mobile Menu Trigger Capsule Button */}
      <Button
        type="button"
        onClick={handleOpen}
        variant="ghost"
        className="relative flex items-center gap-2 rounded-full border border-border/80 bg-background/80 py-1.5 ps-3.5 pe-2 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:border-border hover:shadow-md cursor-pointer active:scale-95"
        aria-label={hasNotifications ? t("seeMenuWithUnread") : t("seeMenu")}
        aria-haspopup="dialog"
      >
        <Menu className="size-4 text-foreground/80" />
        <div className="relative flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="size-3.5" />
        </div>
        {hasNotifications && (
          <span
            className="absolute top-1 end-1 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
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

          <div className="mt-8">
            {/* Authenticated Menu */}
            {isAuth ? (
              <div className="flex flex-col gap-2.5">
                {/* Admin Dashboard Link */}
                {isAdmin && onNavigateToDashboard ? (
                  <button
                    type="button"
                    className="glass-accent-primary rounded-2xl p-3.5 cursor-pointer gpu flex items-center gap-3.5 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-primary/20"
                    onClick={() => handleNavigation(onNavigateToDashboard)}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary shrink-0">
                      <LayoutGrid className="size-5" />
                    </div>
                    <span className="text-base font-semibold text-foreground">{t("adminDashboard")}</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="glass-subtle rounded-2xl p-3.5 cursor-pointer gpu flex items-center gap-3.5 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-muted/50"
                  onClick={() => handleNavigation(onNavigateToMyLists)}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-foreground shrink-0">
                    <ClipboardList className="size-5" />
                  </div>
                  <span className="text-base font-semibold text-foreground">{t("myListings")}</span>
                </button>

                <button
                  type="button"
                  className="glass-subtle rounded-2xl p-3.5 cursor-pointer gpu flex items-center gap-3.5 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-muted/50"
                  onClick={() => handleNavigation(onNavigateToAccSettings)}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-foreground shrink-0">
                    <Settings className="size-5" />
                  </div>
                  <span className="text-base font-semibold text-foreground">{t("accountSettings")}</span>
                </button>

                <button
                  type="button"
                  className="glass-subtle rounded-2xl p-3.5 cursor-pointer gpu flex items-center gap-3.5 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-muted/50"
                  onClick={() => handleNavigation(onNavigateToMyMessages)}
                  aria-label={t("chatWithUnread", { count: signalOfNewMessage.length })}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-foreground shrink-0">
                    <MessageCircle className="size-5" />
                  </div>
                  <span className="text-base font-semibold text-foreground">
                    {t("chatWithUnread", { count: signalOfNewMessage.length })}
                  </span>
                </button>

                <button
                  type="button"
                  className="glass-subtle rounded-2xl p-3.5 cursor-pointer gpu flex items-center gap-3.5 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-muted/50"
                  onClick={() => handleNavigation(onNavigateToLogout)}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                    <LogOut className="size-5" />
                  </div>
                  <span className="text-base font-semibold text-foreground">{t("logOut")}</span>
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
            <div className="mt-4 pt-4 border-t border-border/40 flex flex-col gap-2.5">
              <button
                type="button"
                className="glass-subtle rounded-2xl p-3.5 cursor-pointer gpu flex items-center gap-3.5 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-muted/50"
                onClick={() => handleNavigation(onNavigateToAboutUs)}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-foreground shrink-0">
                  <Info className="size-5" />
                </div>
                <span className="text-base font-semibold text-foreground">{t("about")}</span>
              </button>

              <button
                type="button"
                className="glass-subtle rounded-2xl p-3.5 cursor-pointer gpu flex items-center gap-3.5 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-muted/50"
                onClick={() => handleNavigation(onNavigateToHelp)}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-foreground shrink-0">
                  <HelpCircle className="size-5" />
                </div>
                <span className="text-base font-semibold text-foreground">{t("help")}</span>
              </button>
            </div>

            {/* Theme Switcher */}
            <div className="mt-6 pt-4 border-t border-border/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t("appearance")}
              </p>
              <ThemeToggleInline />
            </div>
          </div>
        </>
      </UniversalDrawer>
    </div>
  );
}
