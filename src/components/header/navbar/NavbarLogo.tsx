import React, { memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PATH } from "@/utils";

interface NavbarLogoProps {
  onNavigate?: () => void;
  isCompact?: boolean;
}

const NavbarLogo: React.FC<NavbarLogoProps> = memo(({ onNavigate, isCompact = false }) => {
  const router = useRouter();

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      router.push(PATH.mainFood);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 cursor-pointer",
        "transition-all duration-200 ease-in-out",
        "hover:opacity-80 hover:scale-[1.02]",
        "active:scale-[0.98]"
      )}
      role="button"
      aria-label="Go to homepage"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <Image
        src="/straw.svg"
        alt="Foodshare logo"
        width={isCompact ? 36 : 40}
        height={isCompact ? 36 : 40}
        className={cn(
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCompact ? "w-9 h-9" : "w-10 h-10"
        )}
        priority
      />
      <span
        className={cn(
          "hidden sm:block font-black text-primary tracking-[-0.5px]",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCompact ? "text-[22px]" : "text-[26px]"
        )}
      >
        Foodshare
      </span>
    </div>
  );
});

NavbarLogo.displayName = "NavbarLogo";

export default NavbarLogo;
