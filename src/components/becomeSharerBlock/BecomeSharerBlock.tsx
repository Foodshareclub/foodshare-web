"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { photoObj } from "@/utils/navigationActions";
import { AddListingButton } from "./AddListingButton";

type ListingMenuItemProps = {
  value: string;
  icon: string | StaticImageData;
  label: string;
};

// React Compiler handles memoization automatically
function ListingMenuItem({ value, icon, label }: ListingMenuItemProps) {
  return (
    <DropdownMenuItem
      asChild
      className="rounded-xl p-2 sm:p-2.5 hover:bg-muted/60 active:scale-[0.98] transition-all cursor-pointer group focus:bg-muted/60 focus:text-foreground"
    >
      <Link href={`/new?type=${value}`} className="flex items-center gap-3 w-full">
        <div className="size-8 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-muted transition-transform">
          <Image src={icon} alt={label} width={20} height={20} />
        </div>
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </Link>
    </DropdownMenuItem>
  );
}

// Section header component
const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">{children}</div>
);

/**
 * BecomeSharerBlock Component
 * Dropdown menu for creating new listings
 * All options navigate to /new?type={category} using Link for proper navigation
 */
export function BecomeSharerBlock({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>
        <AddListingButton />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        variant="glass"
        className="backdrop-blur-2xl bg-popover/95 border border-border/80 shadow-2xl rounded-3xl p-3 sm:p-4 min-w-[320px]"
      >
        {/* Main Categories - Most Used */}
        <SectionHeader>Share</SectionHeader>
        <div className="grid grid-cols-2 gap-1.5">
          <ListingMenuItem value="food" icon={photoObj.food} label="Food" />
          <ListingMenuItem value="thing" icon={photoObj.things} label="Things" />
          <ListingMenuItem value="borrow" icon={photoObj.borrow} label="Borrow" />
          <ListingMenuItem value="wanted" icon={photoObj.wanted} label="Wanted" />
        </div>

        {/* Divider */}
        <DropdownMenuSeparator className="h-px bg-border/60 my-2 mx-1" />

        {/* Community */}
        <SectionHeader>Community</SectionHeader>
        <div className="grid grid-cols-1 gap-1">
          <ListingMenuItem value="fridge" icon={photoObj.fridge} label="Community fridge" />
          <ListingMenuItem value="foodbank" icon={photoObj.foodBanks} label="Food bank" />
          <ListingMenuItem value="volunteer" icon={photoObj.volunteer} label="Volunteer" />
        </div>

        {/* Divider */}
        <DropdownMenuSeparator className="h-px bg-border/60 my-2 mx-1" />

        {/* More Options */}
        <SectionHeader>More</SectionHeader>
        <div className="grid grid-cols-2 gap-1.5">
          <ListingMenuItem value="challenge" icon={photoObj.challenges} label="Challenge" />
          <ListingMenuItem value="vegan" icon={photoObj.vegan} label="Vegan" />
          <ListingMenuItem value="zerowaste" icon={photoObj["zero waste"]} label="Zero Waste" />
          <ListingMenuItem value="business" icon={photoObj.business} label="Organisation" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
