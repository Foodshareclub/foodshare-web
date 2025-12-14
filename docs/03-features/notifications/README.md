# 🔔 Notifications System

Real-time notification system for FoodShare with server-side data fetching and Server Actions for mutations.

## Overview

The notification system keeps users informed about:

- New messages in chat
- Post claims and arrangements
- Reviews received
- Expiring posts
- Nearby listings
- System announcements

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Database Triggers ──► user_notifications table              │
│         │                      │                             │
│         ▼                      ▼                             │
│  Edge Functions         Server Components                    │
│  (push to mobile/web)   (fetch via lib/data)                │
│         │                      │                             │
│         ▼                      ▼                             │
│  Web Push API           Server Actions                       │
│  (via sw-push.js)       (mark read, delete)                  │
│                                │                             │
│                                ▼                             │
│                         Supabase Realtime                    │
│                         (live updates)                       │
│                                │                             │
│                                ▼                             │
│                         Toast Component                      │
│                         (immediate UI feedback)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Web Push Subscription Flow                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  usePushNotifications ──► Request Permission                 │
│         │                      │                             │
│         ▼                      ▼                             │
│  Register sw-push.js    PushManager.subscribe()              │
│         │                      │                             │
│         ▼                      ▼                             │
│  VAPID Auth             Save to device_tokens table          │
│  (public key)           (endpoint, p256dh, auth keys)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── lib/data/
│   ├── notifications.ts      # Data fetching functions
│   └── cache-keys.ts         # Cache tags for notifications
├── app/
│   ├── actions/
│   │   └── notifications.ts  # Server Actions for mutations
│   └── (routes)/settings/notifications/
│       ├── page.tsx                    # Settings page (Server Component)
│       └── NotificationSettingsForm.tsx # Preferences form (Client Component)
├── hooks/
│   ├── useBrowserNotifications.ts # Browser notification API hook
│   ├── usePushNotifications.ts    # Web Push subscription hook
│   └── useNotificationSound.ts    # Sound notification hook
└── components/notifications/
    ├── index.ts              # Barrel exports
    ├── NotificationBell.tsx  # Header bell icon with badge
    ├── NotificationItem.tsx  # Individual notification display
    ├── NotificationList.tsx  # Paginated notification list
    └── NotificationCenter.tsx # Full notification panel (realtime, sound, toasts)

public/
└── sw-push.js                # Push notification service worker
```

## Notification Types

| Type              | Description                  | Trigger                 |
| ----------------- | ---------------------------- | ----------------------- |
| `new_message`     | New chat message received    | Message insert          |
| `post_claimed`    | Someone claimed your post    | Post arrangement        |
| `post_arranged`   | Pickup arranged              | Arrangement confirmed   |
| `review_received` | New review on your profile   | Review insert           |
| `review_reminder` | Reminder to leave a review   | Scheduled job           |
| `post_expiring`   | Your post is about to expire | Scheduled job           |
| `nearby_post`     | New post near your location  | Post insert + geo query |
| `welcome`         | Welcome to FoodShare         | User signup             |
| `system`          | System announcements         | Admin action            |

## Data Functions

Located in `src/lib/data/notifications.ts`:

### getUserNotifications

Fetch paginated notifications for a user.

```typescript
import { getUserNotifications } from "@/lib/data/notifications";

// In a Server Component
const notifications = await getUserNotifications(userId, {
  limit: 20,
  offset: 0,
  unreadOnly: false,
});
```

### getUnreadNotificationCount

Get the count of unread notifications.

```typescript
import { getUnreadNotificationCount } from "@/lib/data/notifications";

const count = await getUnreadNotificationCount(userId);
```

### getNotificationPreferences

Get user's notification preferences.

```typescript
import { getNotificationPreferences } from "@/lib/data/notifications";

const prefs = await getNotificationPreferences(userId);
// { messages: true, new_listings: true, reservations: true }
```

## Server Actions

Located in `src/app/actions/notifications.ts`.

All actions return `ServerActionResult<T>` for type-safe error handling:

```typescript
type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } };
```

### markNotificationAsRead

Mark a single notification as read. Validates UUID format.

```typescript
import { markNotificationAsRead } from "@/app/actions/notifications";

const result = await markNotificationAsRead(notificationId);
if (!result.success) {
  console.error(result.error.message); // "Invalid notification ID" | "Not authenticated"
  return;
}
// Success - notification marked as read
```

### markAllNotificationsAsRead

Mark all notifications as read for the current user.

```typescript
import { markAllNotificationsAsRead } from "@/app/actions/notifications";

const result = await markAllNotificationsAsRead();
if (!result.success) {
  // Handle error
}
```

### deleteNotification

Delete a single notification. Validates UUID format.

```typescript
import { deleteNotification } from "@/app/actions/notifications";

const result = await deleteNotification(notificationId);
if (!result.success) {
  // Handle error
}
```

### deleteReadNotifications

Bulk delete all read notifications.

```typescript
import { deleteReadNotifications } from "@/app/actions/notifications";

const result = await deleteReadNotifications();
```

### createNotification

Create a notification (internal use / Edge Functions). Validates with Zod schema.

```typescript
import { createNotification } from "@/app/actions/notifications";

const result = await createNotification({
  recipientId: userId, // Required: UUID
  actorId: senderId, // Optional: UUID
  type: "new_message", // Required: NotificationType
  title: "New message", // Required: 1-200 chars
  body: "Message preview", // Optional: max 1000 chars
  roomId: chatRoomId, // Optional: UUID
  postId: 123, // Optional: positive integer
  reviewId: 456, // Optional: positive integer
  data: { custom: "data" }, // Optional: JSON object
});

if (!result.success) {
  console.error(result.error.message); // Validation or database error
}
```

### updateNotificationPreferences

Update user's notification preferences. Validates with Zod schema.

```typescript
import { updateNotificationPreferences } from "@/app/actions/notifications";

const result = await updateNotificationPreferences({
  messages: true,
  new_listings: false,
  reservations: true,
});
```

### getUnreadNotificationCount

Get the count of unread notifications for the current user.

```typescript
import { getUnreadNotificationCount } from "@/app/actions/notifications";

const result = await getUnreadNotificationCount();
if (result.success) {
  console.log(`You have ${result.data} unread notifications`);
}
```

## Validation & Error Handling

Server actions use Zod schemas for input validation and return type-safe results.

### Zod Schemas

```typescript
// CreateNotificationSchema
{
  recipientId: z.string().uuid(),
  actorId: z.string().uuid().optional().nullable(),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional().nullable(),
  postId: z.number().int().positive().optional().nullable(),
  roomId: z.string().uuid().optional().nullable(),
  reviewId: z.number().int().positive().optional().nullable(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
}

// NotificationPreferencesSchema
{
  messages: z.boolean().optional(),
  new_listings: z.boolean().optional(),
  reservations: z.boolean().optional(),
}
```

### Error Codes

| Code               | Description                                  |
| ------------------ | -------------------------------------------- |
| `VALIDATION_ERROR` | Invalid input (UUID format, required fields) |
| `UNAUTHORIZED`     | User not authenticated                       |
| `DATABASE_ERROR`   | Supabase query failed                        |
| `UNKNOWN_ERROR`    | Unexpected error                             |

### Handling Results

```typescript
import { isSuccessResult } from "@/lib/errors";

const result = await markNotificationAsRead(id);

if (isSuccessResult(result)) {
  // TypeScript knows result.data exists
  toast.success("Marked as read");
} else {
  // TypeScript knows result.error exists
  toast.error(result.error.message);
}
```

## Cache Invalidation

The notification system uses centralized cache tags from `@/lib/data/cache-keys`:

```typescript
// Cache tags
CACHE_TAGS.NOTIFICATIONS; // 'notifications'
CACHE_TAGS.NOTIFICATIONS_UNREAD; // 'notifications-unread'
CACHE_TAGS.USER_NOTIFICATIONS(id); // 'user-notifications-{userId}'

// Helper for bulk invalidation
import { getNotificationTags, invalidateTag } from "@/lib/data/cache-keys";

getNotificationTags(userId).forEach((tag) => invalidateTag(tag));
```

## Database Schema

```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_recipient ON user_notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON user_notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON user_notifications(created_at DESC);

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON user_notifications FOR DELETE
  USING (recipient_id = auth.uid());
```

## Usage Examples

### Notification List Component

```typescript
// app/notifications/page.tsx (Server Component)
import { getUserNotifications } from '@/lib/data/notifications';
import { createClient } from '@/lib/supabase/server';
import { NotificationList } from '@/components/notifications/NotificationList';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const notifications = await getUserNotifications(user.id);

  return <NotificationList notifications={notifications} />;
}
```

### Mark as Read Button

```typescript
// components/notifications/MarkReadButton.tsx
'use client';

import { markNotificationAsRead } from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { toast } from 'sonner';

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await markNotificationAsRead(notificationId);
          if (!result.success) {
            toast.error(result.error.message);
          }
        });
      }}
    >
      {isPending ? 'Marking...' : 'Mark as read'}
    </Button>
  );
}
```

### Notification Badge (Server Component)

```typescript
// components/notifications/NotificationBadge.tsx
import { getUnreadNotificationCount } from '@/lib/data/notifications';
import { createClient } from '@/lib/supabase/server';

export async function NotificationBadge() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const count = await getUnreadNotificationCount(user.id);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

### Notification Badge (Client Component)

For client-side fetching (e.g., after mutations):

```typescript
// components/notifications/NotificationBadgeClient.tsx
'use client';

import { getUnreadNotificationCount } from '@/app/actions/notifications';
import { useEffect, useState } from 'react';

export function NotificationBadgeClient() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      const result = await getUnreadNotificationCount();
      if (result.success) {
        setCount(result.data);
      }
    }
    fetchCount();
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

## UI Components

### NotificationCenter

The main notification panel component with realtime updates, sound, and browser notifications.

```typescript
import { NotificationCenter } from '@/components/notifications';

<NotificationCenter
  userId={user.id}
  initialNotifications={notifications}
  initialUnreadCount={unreadCount}
/>
```

**Features:**

- Realtime updates via Supabase subscriptions
- Toast notifications for new incoming notifications (auto-dismiss after 5 seconds)
- Browser notification support (with permission request)
- Sound notifications (toggleable, persisted to localStorage)
- Mark all as read / Delete read notifications bulk actions
- Animated transitions with Framer Motion

**Sound Preference:**

- Stored in localStorage under `notification_sound_enabled` key
- Toggle via settings icon in the notification panel
- Prevents sound on initial page load (1 second delay)

**Toast Notifications:**

- Appear when new notifications arrive in realtime
- Display notification title and body
- Type-specific styling
- Dismissible with X button
- Auto-dismiss after 5 seconds

**Browser Notifications:**

- Requires user permission
- Shows native OS notifications when tab is not focused
- Includes notification title and body

### NotificationItem

Displays a single notification with type-specific icons, colors, and actions.

```typescript
import { NotificationItem } from '@/components/notifications';

<NotificationItem
  notification={notification}
  onRead={() => refetch()}
  onDelete={() => refetch()}
/>
```

**Features:**

- Type-specific icons (message, shopping bag, star, clock, map pin, bell)
- Color-coded backgrounds per notification type
- Actor avatar display when available
- Relative timestamps ("2 hours ago")
- Unread indicator dot
- Smart linking based on notification type
- Dropdown menu with "Mark as read" and "Delete" actions
- Hover state reveals action menu
- Optimistic updates for instant UI feedback (reverts on error)

**Notification Type Styling:**

| Type              | Icon          | Color   |
| ----------------- | ------------- | ------- |
| `new_message`     | MessageSquare | Blue    |
| `post_claimed`    | ShoppingBag   | Green   |
| `post_arranged`   | Check         | Emerald |
| `review_received` | Star          | Yellow  |
| `review_reminder` | Star          | Orange  |
| `post_expiring`   | Clock         | Red     |
| `nearby_post`     | MapPin        | Purple  |
| `welcome`         | Bell          | Pink    |
| `system`          | Bell          | Gray    |

**Smart Linking:**

- `new_message` → `/chat/{roomId}`
- `post_claimed/arranged/expiring/nearby` → `/listing/{postId}`
- `review_received/reminder` → `/profile/reviews`

## Hooks

### useBrowserNotifications

Hook for browser notification support.

```typescript
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

const {
  showNotification, // Function to show a browser notification
  requestPermission, // Function to request notification permission
  isGranted, // Boolean: permission granted
  isSupported, // Boolean: browser supports notifications
} = useBrowserNotifications();

// Request permission
await requestPermission();

// Show notification
showNotification("New message", { body: "You have a new message" });
```

### useNotificationSound

Hook for playing notification sounds with automatic fallback to Web Audio API.

```typescript
import { useNotificationSound } from "@/hooks/useNotificationSound";

const { playSound } = useNotificationSound(soundEnabled);

// Play notification sound
playSound();
```

**Features:**

- Preloads audio file (`/sounds/notification.mp3`) on mount
- Falls back to Web Audio API beep if sound file is unavailable or fails to play
- Gracefully handles browsers that block autoplay
- Cleans up AudioContext on unmount

**Fallback Behavior:**

1. Attempts to play the MP3 sound file first
2. If the file fails to load or play, generates a 800Hz sine wave beep using Web Audio API
3. If Web Audio API is unavailable, fails silently

### usePushNotifications

Hook for Web Push API subscription management with VAPID authentication.

```typescript
import { usePushNotifications } from "@/hooks/usePushNotifications";

const {
  permission, // 'default' | 'granted' | 'denied' | 'unsupported'
  isSubscribed, // Boolean: user has active push subscription
  isLoading, // Boolean: operation in progress
  error, // Error message or null
  subscribe, // Function to subscribe to push notifications
  unsubscribe, // Function to unsubscribe from push notifications
} = usePushNotifications();

// Subscribe to push notifications
const success = await subscribe();
if (success) {
  console.log("Push notifications enabled!");
}

// Unsubscribe
await unsubscribe();
```

**Features:**

- Automatic permission and subscription state detection on mount
- Registers `/sw-push.js` service worker for push handling
- Stores subscription in `device_tokens` table with Web Push keys (p256dh, auth)
- Handles unsupported browsers gracefully
- Requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY` environment variable

**Database Schema (device_tokens):**

| Column     | Type | Description                         |
| ---------- | ---- | ----------------------------------- |
| profile_id | UUID | User's profile ID                   |
| token      | TEXT | Endpoint identifier (last segment)  |
| platform   | TEXT | Always 'web' for push subscriptions |
| endpoint   | TEXT | Full push service endpoint URL      |
| p256dh     | TEXT | Public key for message encryption   |
| auth       | TEXT | Authentication secret               |
| user_agent | TEXT | Browser user agent string           |

**Environment Setup:**

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

Generate VAPID keys using:

```bash
npx web-push generate-vapid-keys
```

Store the private key in Supabase Edge Function secrets for sending push notifications.

## Realtime Updates

For live notification updates, use Supabase Realtime in a Client Component:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserNotification } from "@/types/notifications.types";

export function useRealtimeNotifications(userId: string) {
  const [newNotification, setNewNotification] = useState<UserNotification | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          setNewNotification(payload.new as UserNotification);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  return newNotification;
}
```

## Related Documentation

- [Chat System](../chat/README.md) - Message notifications
- [Posts](../posts/README.md) - Post-related notifications
- [Email System](../email/README.md) - Email notifications
- [Architecture](../../02-development/ARCHITECTURE.md) - Overall system design

---

[← Back to Features](../README.md) | [← Back to Index](../../00-INDEX.md)
