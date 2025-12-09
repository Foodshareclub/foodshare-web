import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";

// Icon aliases for consistency
const FaHome = Home;
const FaChevronRight = ChevronRight;
import type { ForumCategory } from "@/api/forumAPI";

interface ForumBreadcrumbProps {
  category?: ForumCategory | null;
  postTitle?: string;
}

/**
 * SEO-friendly breadcrumb navigation for forum pages
 */
export function ForumBreadcrumb({ category, postTitle }: ForumBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol
        className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        <li
          className="flex items-center gap-2"
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <Link
            href="/"
            className="hover:text-foreground transition-colors flex items-center gap-1"
            itemProp="item"
          >
            <FaHome className="w-3.5 h-3.5" />
            <span itemProp="name">Home</span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>

        <FaChevronRight className="w-3 h-3 text-muted-foreground/50" />

        <li
          className="flex items-center gap-2"
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <Link href="/forum" className="hover:text-foreground transition-colors" itemProp="item">
            <span itemProp="name">Forum</span>
          </Link>
          <meta itemProp="position" content="2" />
        </li>

        {category && (
          <>
            <FaChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <li
              className="flex items-center gap-2"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <Link
                href={`/forum?category=${category.slug}`}
                className="hover:text-foreground transition-colors"
                itemProp="item"
              >
                <span itemProp="name">{category.name}</span>
              </Link>
              <meta itemProp="position" content="3" />
            </li>
          </>
        )}

        {postTitle && (
          <>
            <FaChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <li
              className="text-foreground font-medium truncate max-w-[200px] sm:max-w-xs"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              aria-current="page"
            >
              <span itemProp="name">{postTitle}</span>
              <meta itemProp="position" content={category ? "4" : "3"} />
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
