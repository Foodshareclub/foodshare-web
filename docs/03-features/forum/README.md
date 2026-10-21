# 💬 Forum Feature

Community discussion forum for FoodShare users.

## Overview

The forum enables community discussions with support for categories, tags, reactions, comments, polls, and user reputation.

## Architecture

```text
Server Component (page.tsx)
    ↓ Suspense boundary with ForumSkeleton
    ↓
ForumContent (async component)
    ↓
getForumPageData() → lib/data/forum.ts
    ↓ unstable_cache with tag-based invalidation
Supabase (PostgreSQL)
    ↓
ForumPageClient (client component for interactivity)
```

> **Note:** The forum uses server-side data fetching with Suspense streaming for optimal initial load. The `getForumPageData()` function aggregates all data (posts, categories, tags, stats, leaderboard, trending, activity) in parallel. The client component (`ForumPageClient`) handles filtering, sorting, view modes, and animations.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/forum/page.tsx` | Forum listing page (Server Component wrapper) |
| `src/app/forum/new/page.tsx` | Create new post page |
| `src/api/forumAPI.ts` | Forum API types and utilities |
| `src/lib/data/forum.ts` | Server-side data fetching (`getForumPageData`, `getForumPosts`, etc.) |
| `src/app/actions/forum.ts` | Server Actions for mutations |
| `src/components/forum/` | Forum UI components |

## Components

### ForumPageClient

The main client component (`ForumPageClient.tsx`) handles all interactive forum UI with rich filtering, sorting, and animations. It receives server-fetched data as props.

**Sub-components (internal to ForumPageClient):**
- `StatCard` - Stats display with icon, value, and trend indicator
- `TrendingPost` - Trending post item with rank badge (1st/2nd/3rd styling)
- `LeaderboardCard` - User leaderboard entry with avatar, score, and rank badges
- `ActivityItem` - Recent activity feed item with time-ago formatting
- `CategoryCard` - Category filter button with selection state
- `TagPill` - Tag filter pill with color indicator
- `QuickActionCard` - Gradient action card with hover animations

### Shared Components
- `ForumPostCard` - Post preview card with author, category, tags (supports `variant`: `default`, `compact`, `featured`)
- `ForumCategoryBadge` - Category indicator
- `ForumTagBadge` - Tag pill
- `ForumCommentCard` - Comment display with replies
- `CreatePostForm` - Form for creating new forum posts
- `RichTextEditor` - TipTap-based WYSIWYG editor for posts/comments

### RichTextEditor

A rich text editor built with TipTap for creating formatted forum posts and comments.

```typescript
import { RichTextEditor } from '@/components/forum/RichTextEditor';

<RichTextEditor
  content=""
  placeholder="Write your post..."
  onChange={(html, json) => setContent(html)}
  minHeight="200px"
/>
```

Features:
- Bold, italic, strikethrough, code formatting
- Bullet and ordered lists
- Blockquotes
- Links and images
- Undo/redo
- Dark mode support via Tailwind prose classes

## Post Types

| Type | Description |
|------|-------------|
| `discussion` | General community discussion |
| `question` | Q&A format with best answer |
| `announcement` | Official announcements |
| `guide` | How-to guides and tutorials |

## Database Tables

### Forum Posts & Content
- `forum` - Posts
- `forum_categories` - Categories
- `forum_tags` - Tags
- `forum_post_tags` - Post-tag junction
- `comments` - Comments and replies
- `forum_reactions` - Post reactions
- `forum_bookmarks` - Saved posts
- `forum_subscriptions` - Follow notifications
- `forum_user_stats` - User reputation
- `forum_polls` - Embedded polls

### Forum Conversations (Direct Messaging)
- `forum_conversations` - Conversation metadata (is_group, title, last_message_at)
- `forum_conversation_participants` - Participants with roles and read status
- `forum_messages` - Messages within conversations

> **Note:** Forum conversations use separate database tables from the food sharing chat system. The food sharing chat is available at `/chat`. See [Chat Feature](../chat/README.md) for the food sharing chat API.

## Usage

### Server Component + Client Component Pattern

The forum uses a hybrid approach: server-side data fetching with a rich client component for interactivity. The page uses Suspense for streaming with a skeleton fallback.

```typescript
// app/forum/page.tsx (Server Component)
import { Suspense } from 'react';
import { getForumPageData } from '@/lib/data/forum';
import { ForumPageClient } from '@/components/forum';

export const metadata = {
  title: 'Community Forum | FoodShare',
  description: 'Join the FoodShare community forum...',
};

async function ForumContent() {
  const data = await getForumPageData();

  return (
    <ForumPageClient
      posts={data.posts}
      categories={data.categories}
      tags={data.tags}
      stats={data.stats}
      leaderboard={data.leaderboard}
      trendingPosts={data.trendingPosts}
      recentActivity={data.recentActivity}
    />
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<ForumSkeleton />}>
      <ForumContent />
    </Suspense>
  );
}
```

```typescript
// components/forum/ForumPageClient.tsx (Client Component)
'use client';

import { useState } from 'react';
import type { ForumPost, ForumCategory, ForumTag } from '@/api/forumAPI';
import type { ForumStats, LeaderboardUser } from '@/lib/data/forum';

interface ForumPageClientProps {
  posts: ForumPost[];
  categories: ForumCategory[];
  tags: ForumTag[];
  stats: ForumStats;
  leaderboard: LeaderboardUser[];
  trendingPosts: ForumPost[];
  recentActivity: ForumPost[];
}

export function ForumPageClient({ posts, categories, tags, stats, leaderboard, trendingPosts, recentActivity }: ForumPageClientProps) {
  // Rich filtering, sorting, and view mode state...
  return <ForumUI />;
}
```

### Server Action (Mutations)

```typescript
// app/actions/forum.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

export async function createForumPost(formData: FormData) {
  const supabase = await createClient();
  await supabase.from('forum').insert({
    forum_post_name: formData.get('title'),
    forum_post_description: formData.get('description'),
    category_id: formData.get('category'),
  });
  invalidateTag(CACHE_TAGS.FORUM);
}
```

## Routes

| Route | Description |
|-------|-------------|
| `/forum` | Forum listing with category/tag filters |
| `/forum/new` | Create new post (requires authentication) |
| `/forum/[id]` | View single post with comments |

## Features

### Core Features
- Category filtering
- Tag-based organization
- Pinned/featured posts
- Hot score ranking
- Full-text search
- Nested comments
- Best answer marking (Q&A)
- Reactions and likes
- Bookmarks
- User reputation system
- Polls
- Draft saving

### UI Features
- Multiple view modes (grid, list, compact)
- Animated stat counters
- Trending posts sidebar
- Leaderboard with top contributors
- Recent activity feed
- Quick action cards
- Mobile-responsive filters panel
- Framer Motion animations

## Translations

Forum uses `next-intl` with keys in `Forum` namespace:

```json
{
  "Forum": {
    "title": "Community Forum",
    "description": "Join the discussion"
  }
}
```

---

[← Back to Features](../README.md)
