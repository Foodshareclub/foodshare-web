# Chat Feature

Real-time messaging system for coordinating food pickups between sharers and seekers.

## Overview

The chat system enables direct communication between users about food listings. It uses Supabase Realtime for instant message delivery and supports both product-based and direct user conversations.

## Route

| Route | Purpose |
|-------|---------|
| `/chat` | Full chat interface with conversation list and messages |

## URL Parameters

```
/chat?food=123      → Start/continue chat about a food listing
/chat?user=uuid     → Direct message to a user
/chat?room=uuid     → Open specific chat room
/chat               → View all conversations
```

## Architecture

```
┌─────────────────┐
│   /chat page    │  ← Full chat interface
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Check     │  → Redirect to /auth/login if not authenticated
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Room Lookup     │  → Check for existing conversation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Chat UI         │  ← ContactsBlock + MessagesWindow
└─────────────────┘
```

## Key Hooks

### `useRooms(userId)`

Gets all chat rooms for the current user.

```typescript
const { data: rooms, isLoading } = useRooms(user?.id);
```

### `useMessages(roomId)`

Gets messages for a specific room (syncs to Zustand store).

```typescript
useMessages(activeRoomId);
const storeMessages = useChatStore((state) => state.messages);
```

### `useRoomAvailability(userId, postId)`

Checks if a chat room already exists between the current user and a post.

```typescript
const { data } = await chatAPI.checkRoomAvailability(user.id, foodId);
```

## Components

- `ContactsBlock` - List of chat conversations (sidebar)
- `MessagesWindow` - Message display area with input
- `InputSection` - Message composition
- `MessageItem` - Individual message bubble

## Database Tables

- `rooms` - Chat room metadata (sharer, requester, post_id, last_message)
- `room_participants` - Messages within rooms

## Related Files

- `src/app/chat/page.tsx` - Chat page
- `src/hooks/queries/useChatQueries.ts` - Chat-related hooks
- `src/api/chatAPI.ts` - Chat API functions
- `src/components/chat/` - Chat UI components
- `src/store/zustand/useChatStore.ts` - Chat state management
