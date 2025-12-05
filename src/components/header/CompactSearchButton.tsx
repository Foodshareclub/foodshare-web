import React, { memo } from "react";
import { SearchIcon } from "@/utils/icons";
import { Glass } from "@/components/Glass";
import { useTranslations } from 'next-intl';

type CompactSearchButtonProps = {
  onClick: () => void;
};

const CompactSearchButton: React.FC<CompactSearchButtonProps> = memo(({ onClick }) => {
  const t = useTranslations();
  return (
    <Glass
      variant="standard"
      className="flex items-center gap-2 px-3 py-2 min-w-0 md:min-w-[180px] cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      borderRadius="24px"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <SearchIcon className="text-lg text-muted-foreground" />
        <span className="hidden md:block text-sm text-muted-foreground font-medium truncate">
          {t('search')}
        </span>
      </div>
    </Glass>
  );
});

CompactSearchButton.displayName = "CompactSearchButton";

export default CompactSearchButton;
