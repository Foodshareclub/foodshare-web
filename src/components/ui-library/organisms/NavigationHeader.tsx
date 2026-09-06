import React from "react";
import { cn } from "@/lib/utils";
import { SearchField } from "@/components/ui-library/molecules/SearchField";
import { NavbarWrapper } from "@/components/header/navbar/NavbarWrapper";
import { NavbarActions } from "@/components/header/navbar/NavbarActions";
import NavbarLogo from "@/components/header/navbar/NavbarLogo";
import { Avatar } from "@/components/ui-library/atoms/Avatar";

/**
 * NavigationHeader - Organism combining header navigation elements
 * Provides a consistent header with search, actions, and branding
 */
interface NavigationHeaderProps {
  locale?: "en" | "ar" | "fr" | "de";
  isAdmin?: boolean;
  user?: {
    name: string;
    avatar?: string;
  };
  onLocaleChange?: (locale: string) => void;
  showSearch?: boolean;
  searchPlaceholder: string;
  className?: string;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  locale,
  isAdmin,
  user,
  onLocaleChange,
  showSearch = true,
  searchPlaceholder,
  className,
}) => {
  return (
    <nav
      className={cn(
        "flex w-full items-center justify-between gap-4 border-b border-border pb-4",
        className
      )}
    >
      <NavbarLogo />

      <div className="flex items-center gap-3">
        {isAdmin && (
          <NavbarActions
            isAuth={false}
            signalOfNewMessage={[] as any}
            onNavigateToMyLists={() => {}}
            onNavigateToLogout={() => {}}
            onNavigateToAccSettings={() => {}}
            onNavigateToHelp={() => {}}
            onNavigateToAboutUs={() => {}}
            onNavigateToMyMessages={() => {}}
          />
        )}

        {user && (
          <div>
            <Avatar src={user.avatar!} alt={user.name} size="sm" />
            <span className="font-medium text-foreground">{user.name}</span>
          </div>
        )}
      </div>

      {showSearch && (
        <SearchField
          placeholder={searchPlaceholder}
          onChange={(e: any) => {
            const val = e.target?.value || "";
            console.log("Search:", val);
          }}
          className="flex-1"
        />
      )}
    </nav>
  );
};
