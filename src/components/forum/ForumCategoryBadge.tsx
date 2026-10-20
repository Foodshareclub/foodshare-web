import type { ForumCategory } from "@/api/forumAPI";
import type React from "react";

type ForumCategoryBadgeProps = {
  category: ForumCategory;
  onClick?: () => void;
  size?: "sm" | "md";
};

export const ForumCategoryBadge: React.FC<ForumCategoryBadgeProps> = ({ category, onClick, size = "sm" }) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  const badgeStyle = {
    backgroundColor: `${category.color}20`,
    color: category.color || "#4CAF50",
  };

  if (onClick) {
    return (
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${sizeClasses[size]} cursor-pointer hover:opacity-80`}
        style={badgeStyle}
        onClick={onClick}
      >
        {category.name}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${sizeClasses[size]}`}
      style={badgeStyle}
    >
      {category.name}
    </span>
  );
};

ForumCategoryBadge.displayName = "ForumCategoryBadge";
