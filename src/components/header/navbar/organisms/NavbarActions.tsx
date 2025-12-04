import { memo, type FC } from "react";

import type { CustomRoomType } from "@/api/chatAPI";
import { BecomeSharerBlock } from "@/components/becomeSharerBlock/BecomeSharerBlock";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMediaQuery } from "@/hooks";
import { MobileMenu } from "./MobileMenu";
import { DesktopMenu } from "./DesktopMenu";

export interface NavbarActionsProps {
  /** User authentication status */
  isAuth: boolean;
  /** User ID (optional) */
  userId?: string;
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
}

/**
 * NavbarActions Organism
 *
 * Right-side action buttons for the navbar.
 * Includes theme toggle, "Become a Sharer" button, and user menu.
 * Responsive: Shows drawer on mobile, dropdown on desktop.
 *
 * @example
 * ```tsx
 * <NavbarActions
 *   isAuth={true}
 *   imgUrl="/avatar.jpg"
 *   signalOfNewMessage={messages}
 *   onNavigateToMyLists={handleMyLists}
 * />
 * ```
 */
export const NavbarActions: FC<NavbarActionsProps> = memo(
  ({
    isAuth,
    imgUrl = "",
    firstName,
    secondName,
    email,
    signalOfNewMessage,
    onNavigateToMyLists,
    onNavigateToLogout,
    onNavigateToAccSettings,
    onNavigateToHelp,
    onNavigateToAboutUs,
    onNavigateToMyMessages,
  }) => {
    // Breakpoint: 800px (mobile vs desktop menu)
    const isDesktop = useMediaQuery("(min-width:800px)");

    const menuProps = {
      isAuth,
      imgUrl,
      firstName,
      secondName,
      email,
      signalOfNewMessage,
      onNavigateToMyLists,
      onNavigateToLogout,
      onNavigateToAccSettings,
      onNavigateToHelp,
      onNavigateToAboutUs,
      onNavigateToMyMessages,
    };

    return (
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle size="sm" />

        {/* Become a Sharer / Login */}
        {!isAuth ? (
          <AuthenticationUserModal becomeSharerBlock buttonValue="Login" />
        ) : (
          <BecomeSharerBlock />
        )}

        {/* User Menu - Responsive */}
        {isDesktop ? <DesktopMenu {...menuProps} /> : <MobileMenu {...menuProps} size="md" />}
      </div>
    );
  }
);

NavbarActions.displayName = "NavbarActions";
