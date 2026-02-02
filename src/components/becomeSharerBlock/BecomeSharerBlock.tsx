'use client';

import { useState } from "react";
import type { StaticImageData } from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { photoObj } from "@/utils/navigationActions";
import { useAuth } from "@/hooks/useAuth";
import { PATH } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AddListingButton } from "./AddListingButton";

// Lazy load the heavy modal (3000+ lines)
const PublishListingModal = dynamic(
  () => import("@/components/modals/PublishListingModal"),
  { ssr: false }
);

type ListingMenuItemProps = {
  value: string;
  icon: string | StaticImageData;
  label: string;
  onClick: (value: string) => void;
};

// React Compiler handles memoization automatically
function ListingMenuItem({ value, icon, label, onClick }: ListingMenuItemProps) {
  const iconSrc = typeof icon === 'string' ? icon : icon.src;
  return (
    <DropdownMenuItem
      onClick={() => onClick(value)}
      className="rounded-lg hover:bg-[rgba(255,45,85,0.1)] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <img src={iconSrc} className="w-5 h-5" alt={label} />
        <span className="text-sm">{label}</span>
      </div>
    </DropdownMenuItem>
  );
}

// Section header component
const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.5px] px-3 pt-3 pb-1">
    {children}
  </div>
);

/**
 * BecomeSharerBlock Component
 * Dropdown menu for creating new listings
 * Uses useAuth hook (TanStack Query + Zustand) instead of Redux
 */
export function BecomeSharerBlock() {
  const router = useRouter();
  // Auth state from useAuth hook (replaces Redux isAuthSelector)
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("");

  // React Compiler optimizes these handlers automatically
  const addHandler = (value: string) => {
    if (isAuthenticated) {
      setIsOpen(true);
      setType(value);
    } else {
      router.push(PATH.mainFood);
    }
  };

  const handleVolunteer = () => {
    router.push("/new?type=volunteer");
  };

  return (
    <DropdownMenu>
      <PublishListingModal value={type} onClose={() => setIsOpen(false)} isOpen={isOpen} />
      <DropdownMenuTrigger asChild>
        <AddListingButton />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        variant="glass"
        className="backdrop-blur-[16px] bg-popover/95 border border-border/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl p-2 min-w-[280px]"
      >
        {/* Main Categories - Most Used */}
        <SectionHeader>Share</SectionHeader>
        <div className="grid grid-cols-2 gap-1">
          <ListingMenuItem value="food" icon={photoObj.food} label="Food" onClick={addHandler} />
          <ListingMenuItem
            value="thing"
            icon={photoObj.things}
            label="Things"
            onClick={addHandler}
          />
          <ListingMenuItem
            value="borrow"
            icon={photoObj.borrow}
            label="Borrow"
            onClick={addHandler}
          />
          <ListingMenuItem
            value="wanted"
            icon={photoObj.wanted}
            label="Wanted"
            onClick={addHandler}
          />
        </div>

        {/* Divider */}
        <DropdownMenuSeparator className="h-px bg-border my-2 mx-2" />

        {/* Community */}
        <SectionHeader>Community</SectionHeader>
        <ListingMenuItem
          value="fridge"
          icon={photoObj.fridge}
          label="Community fridge"
          onClick={addHandler}
        />
        <ListingMenuItem
          value="foodbank"
          icon={photoObj.foodBanks}
          label="Food bank"
          onClick={addHandler}
        />
        <ListingMenuItem
          value="volunteer"
          icon={photoObj.volunteer}
          label="Volunteer"
          onClick={handleVolunteer}
        />

        {/* Divider */}
        <DropdownMenuSeparator className="h-px bg-border my-2 mx-2" />

        {/* More Options */}
        <SectionHeader>More</SectionHeader>
        <div className="grid grid-cols-2 gap-1">
          <ListingMenuItem
            value="challenge"
            icon={photoObj.challenges}
            label="Challenge"
            onClick={addHandler}
          />
          <ListingMenuItem
            value="vegan"
            icon={photoObj.vegan}
            label="Vegan"
            onClick={addHandler}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
