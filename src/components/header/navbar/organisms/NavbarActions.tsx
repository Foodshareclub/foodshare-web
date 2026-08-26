import type { CustomRoomType } from "@/api/chatAPI";
import { BecomeSharerBlock } from "@/components/becomeSharerBlock/BecomeSharerBlock";
import { BecomeSharerButton } from "@/components/becomeSharerBlock/BecomeSharerButton";
import { NotificationCenter } from "@/components/notifications";
import { useMediaQuery } from "@/hooks";
import { MobileMenu } from "./MobileMenu";
import { DesktopMenu } from "./DesktopMenu";

export interface NavbarActionsProps {
  /** User authentication status */
  isAuth: boolean;
  /** Whether user is admin */
  isAdmin?: boolean;
  /** User ID (optional) */
  userId?: string;
  /** Initial unread notification count (from server) */
  initialUnreadCount?: number;
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
 * NavbarActions Organism
 *
 * Right-side action buttons for the navbar.
 * Includes "Add listing" button and user menu (with theme toggle inside).
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
export function NavbarActions({
  isAuth,
  isAdmin = false,
  userId,
  imgUrl = "",
  firstName,
  secondName,
  email,
  signalOfNewMessage,
  initialUnreadCount = 0,
  onNavigateToMyLists,
  onNavigateToLogout,
  onNavigateToAccSettings,
  onNavigateToHelp,
  onNavigateToAboutUs,
  onNavigateToMyMessages,
  onNavigateToDashboard,
}: NavbarActionsProps) {
  // Breakpoint: 800px (mobile vs desktop menu)
  const isDesktop = useMediaQuery("(min-width:800px)");

  const menuProps = {
    isAuth,
    isAdmin,
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
    onNavigateToDashboard,
  };

  return (
    <div className="flex items-center gap-3">
      {/* Add Listing / Login - next to profile */}
      {!isAuth ? <BecomeSharerButton /> : <BecomeSharerBlock />}

      {/* Notifications - only for authenticated users */}
      {isAuth && userId && (
        <NotificationCenter userId={userId} initialUnreadCount={initialUnreadCount} />
      )}

      {/* User Menu - Responsive (theme toggle inside dropdown) */}
      {isDesktop ? <DesktopMenu {...menuProps} /> : <MobileMenu {...menuProps} size="md" />}
    </div>
  );
}
