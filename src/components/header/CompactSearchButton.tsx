import React from "react";
import { SearchIcon } from "@/utils/icons";
import { useTranslations } from 'next-intl';

type CompactSearchButtonProps = {
  onClick: () => void;
};

export default function CompactSearchButton({ onClick }: CompactSearchButtonProps) {
  const t = useTranslations();
  return (
    <div
      className="glass flex items-center gap-2 px-3 py-2 min-w-0 md:min-w-[180px] cursor-pointer rounded-3xl transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <SearchIcon className="text-lg text-muted-foreground" />
        <span className="hidden md:block text-sm text-muted-foreground font-medium truncate">
          {t('search')}
        </span>
      </div>
    </div>
  );
}
