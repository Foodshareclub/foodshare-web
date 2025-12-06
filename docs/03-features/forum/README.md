# 💬 Forum Feature

Community discussion forum for FoodShare users.

## Overview

The forum enables community discussions with support for categories, tags, reactions, comments, polls, and user reputation.

## Architecture

```text
Server Component (page.tsx)
    ↓
lib/data/forum.ts (data fetching)
    ↓
Supabase (PostgreSQL)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/forum/page.tsx` | Forum listing page (Server Component) |
| `src/app/forum/new/page.tsx` | Create new post page (Server Component) |
| `src/lib/data/forum.ts` | Server-side data functions |
| `src/api/forumAPI.ts` | Client-side API (legacy, for realtime) |
| `src/app/actions/forum.ts` | Server Actions for mutations |
| `src/components/forum/` | Forum UI components |

## Components

- `ForumPostCard` - Post preview card with author, category, tags
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

## Usage

### Server Component (Recommended)

```typescript
// app/forum/page.tsx
import { createClient } from '@/lib/supabase/server';

async function getForumPosts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum')
    .select(`
      *,
      profiles:profile_id (*),
      forum_categories:category_id (*),
      forum_post_tags (forum_tags (*))
    `)
    .eq('forum_published', true)
    .order('is_pinned', { ascending: false })
    .order('last_activity_at', { ascending: false });
  return data ?? [];
}

export default async function ForumPage() {
  const posts = await getForumPosts();
  return <ForumPostsList posts={posts} />;
}
```

### Server Action (Mutations)

```typescript
// app/actions/forum.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createForumPost(formData: FormData) {
  const supabase = await createClient();
  await supabase.from('forum').insert({
    forum_post_name: formData.get('title'),
    forum_post_description: formData.get('description'),
    category_id: formData.get('category'),
  });
  revalidatePath('/forum');
}
```

## Routes

| Route | Description |
|-------|-------------|
| `/forum` | Forum listing with category/tag filters |
| `/forum/new` | Create new post (requires authentication) |
| `/forum/[id]` | View single post with comments |

## Features

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
