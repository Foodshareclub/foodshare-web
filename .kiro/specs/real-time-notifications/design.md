# Design Document

## Overview

The Real-time Notifications feature provides users with instant updates about platform events through multiple channels: in-app notifications, browser push notifications, and email summaries. Built on Supabase Realtime for sub-second delivery.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Notification │  │ Notification │  │ Push Service │      │
│  │    Bell      │  │   Center     │  │   Worker     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Realtime                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WebSocket Connection                                │   │
│  │  - Subscribe to notifications channel                │   │
│  │  - Receive events in real-time                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database + Functions                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  notifications table                                 │   │
│  │  notification_preferences table                      │   │
│  │  Edge Functions for email batching                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

```typescript
interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>; // Context data
  read: boolean;
  created_at: Date;
  expires_at?: Date;
  priority: "low" | "normal" | "high" | "critical";
  action_url?: string;
}

enum NotificationType {
  NEW_LISTING = "new_listing",
  BOOKING_REQUEST = "booking_request",
  NEW_MESSAGE = "new_message",
  BOOKING_CONFIRMED = "booking_confirmed",
  EXPIRY_REMINDER = "expiry_reminder",
  REVIEW_RECEIVED = "review_received",
}

interface NotificationPreferences {
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  do_not_disturb_start?: string; // HH:MM
  do_not_disturb_end?: string;
  type_preferences: Record<NotificationType, boolean>;
}
```

## Correctness Properties

### Property 1: Delivery timing

_For any_ notification event, it should be delivered to the user within 1 second of creation.
**Validates: Requirements 1.1, 2.1, 3.1**

### Property 2: Preference respect

_For any_ disabled notification type in user preferences, no notifications of that type should be delivered.
**Validates: Requirements 4.2**

### Property 3: Read state consistency

_For any_ notification marked as read, it should remain read across all sessions and devices.
**Validates: Requirements 5.4**

### Property 4: Push notification registration

_For any_ user who grants push permission, they should receive push notifications when the app is closed.
**Validates: Requirements 6.2, 6.3**

### Property 5: Email batching

_For any_ user offline for more than 1 hour with unread notifications, they should receive exactly one email summary.
**Validates: Requirements 10.1, 10.5**

## Testing Strategy

Property-based tests using fast-check for notification delivery, filtering, and batching logic.

## API Endpoints

```typescript
// GET /api/notifications
// POST /api/notifications/mark-read
// PUT /api/notifications/preferences
// POST /api/notifications/register-push
```
