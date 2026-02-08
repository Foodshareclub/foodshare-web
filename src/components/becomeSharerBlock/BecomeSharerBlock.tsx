"use client";

import type { StaticImageData } from "next/image";
import Link from "next/link";

import { AddListingButton } from "./AddListingButton";
import { photoObj } from "@/utils/navigationActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type ListingMenuItemProps = {
  value: string;
  icon: string | StaticImageData;
  label: string;
};

// React Compiler handles memoization automatically
function ListingMenuItem({ value, icon, label }: ListingMenuItemProps) {
  const iconSrc = typeof icon === "string" ? icon : icon.src;
  return (
    <DropdownMenuItem
      asChild
      className="rounded-lg hover:bg-[rgba(255,45,85,0.1)] transition-colors cursor-pointer"
    >
      <Link href={`/new?type=${value}`} className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} className="w-5 h-5" alt={label} />
        <span className="text-sm">{label}</span>
      </Link>
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
 * All options navigate to /new?type={category} using Link for proper navigation
 */
export function BecomeSharerBlock() {
  return (
    <DropdownMenu>
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
          <ListingMenuItem value="food" icon={photoObj.food} label="Food" />
          <ListingMenuItem value="thing" icon={photoObj.things} label="Things" />
          <ListingMenuItem value="borrow" icon={photoObj.borrow} label="Borrow" />
          <ListingMenuItem value="wanted" icon={photoObj.wanted} label="Wanted" />
        </div>

        {/* Divider */}
        <DropdownMenuSeparator className="h-px bg-border my-2 mx-2" />

        {/* Community */}
        <SectionHeader>Community</SectionHeader>
        <ListingMenuItem value="fridge" icon={photoObj.fridge} label="Community fridge" />
        <ListingMenuItem value="foodbank" icon={photoObj.foodBanks} label="Food bank" />
        <ListingMenuItem value="volunteer" icon={photoObj.volunteer} label="Volunteer" />

        {/* Divider */}
        <DropdownMenuSeparator className="h-px bg-border my-2 mx-2" />

        {/* More Options */}
        <SectionHeader>More</SectionHeader>
        <div className="grid grid-cols-2 gap-1">
          <ListingMenuItem value="challenge" icon={photoObj.challenges} label="Challenge" />
          <ListingMenuItem value="vegan" icon={photoObj.vegan} label="Vegan" />
          <ListingMenuItem value="zerowaste" icon={photoObj["zero waste"]} label="Zero Waste" />
          <ListingMenuItem value="business" icon={photoObj.business} label="Organisation" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
