# Chat Feature

Real-time messaging system for coordinating food pickups between sharers and seekers.

## Overview

The chat system enables direct communication between users about food listings. It uses Supabase Realtime for instant message delivery and supports both product-based and direct user conversations.

**Key Safeguards:**

- Users cannot chat with themselves about their own listings
- Users cannot request their own posts
- Duplicate room creation is prevented (returns existing room)

## Route

| Route   | Purpose                                                 |
| ------- | ------------------------------------------------------- |
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
│   /chat page    │  ← Full chat interface (Server Component)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Check     │  → Redirect to /auth/login if not authenticated
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Profile Fetch   │  → Get user name and avatar for display
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Room Lookup     │  → Check for existing food sharing conversation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ChatPageClient  │  ← Client component with userId, userName, userAvatar
└─────────────────┘
```

### Mobile-First UX

The chat page does **not** auto-select the first room when no room is specified. This provides better UX on mobile where the conversation list is shown first, allowing users to choose which conversation to open.

## Data Layer

### Server-Side Functions (`@/lib/data/chat`)

Server-side data fetching for the unified chat system. Use these in Server Components.

```typescript
import {
  getUserChatRooms,
  getChatRoom,
  getOrCreateChatRoom,
  getChatMessages,
  getUnreadMessageCount,
} from "@/lib/data/chat";
```

#### Get User Chat Rooms

```typescript
const rooms = await getUserChatRooms(userId);
```

Returns all chat rooms where the user is either sharer or requester, with related post and profile data.

#### Get Single Chat Room

```typescript
const room = await getChatRoom(roomId);
```

Returns a specific chat room by ID with all relations.

#### Get or Create Chat Room

```typescript
const room = await getOrCreateChatRoom(postId, sharerId, requesterId);
```

Finds existing room or creates a new one for the given post and participants.

#### Get Chat Messages

```typescript
const messages = await getChatMessages(roomId, limit, offset);
```

Returns paginated messages for a room in chronological order.

#### Get Unread Count

```typescript
const count = await getUnreadMessageCount(userId);
```

Returns the number of unread conversations for the user.

### Types

```typescript
// Chat room with relations
type ChatRoom = {
  id: string;
  sharer: string;
  requester: string;
  post_id: number;
  last_message: string;
  last_message_sent_by: string;
  last_message_seen_by: string;
  last_message_time: string;
  posts?: { id: number; post_name: string; images: string[]; post_type: string };
  sharer_profile?: { id: string; first_name: string; second_name: string; avatar_url: string };
  requester_profile?: { id: string; first_name: string; second_name: string; avatar_url: string };
};

// Chat message
type ChatMessage = {
  id: string;
  room_id: string;
  profile_id: string;
  text: string;
  image: string;
  timestamp: string;
  profiles?: { id: string; first_name: string; second_name: string; avatar_url: string };
};

// Normalized message format (used by ChatPageClient)
type NormalizedMessage = {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  image?: string;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: { id: string; text: string; senderName: string };
  readBy?: string[];
  reactions?: { emoji: string; users: string[] }[];
};
```

## Client-Side Hooks

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

### Unified Chat Components

- `UnifiedChatList` - List of all food sharing conversations with search and filtering
- `UnifiedChatContainer` - Chat interface for food sharing conversations with real-time updates

### Legacy Components

- `ContactsBlock` - List of chat conversations (sidebar)
- `MessagesWindow` - Message display area with input
- `InputSection` - Message composition
- `MessageItem` - Individual message bubble

### UnifiedChatList Usage

```typescript
import { UnifiedChatList } from '@/components/chat/UnifiedChatList';

// In a Server Component, fetch the data
const chatRooms = await getAllUserChats(userId);

// Pass to client component
<UnifiedChatList
  chatRooms={chatRooms}
  activeChatId={selectedChatId}
  onSelectChat={(chat) => handleSelectChat(chat)}
  onlineUserIds={onlineUserIds}  // Optional: array of online user IDs
/>
```

**Props:**

| Prop            | Type                              | Description                                   |
| --------------- | --------------------------------- | --------------------------------------------- |
| `chatRooms`     | `UnifiedChatRoom[]`               | Array of chat rooms to display                |
| `activeChatId`  | `string`                          | Currently selected chat ID (optional)         |
| `onSelectChat`  | `(chat: UnifiedChatRoom) => void` | Callback when chat is selected (optional)     |
| `onlineUserIds` | `string[]`                        | Array of user IDs currently online (optional) |

**Features:**

- Search across conversation titles and participant names with clear button
- Unread message badges and total count in header
- Online status indicators (green dot) for participants
- Animated list transitions using Framer Motion
- Smart sorting: unread conversations first, then by most recent
- Responsive design with glassmorphism styling (`glass-card` utility class)

### UnifiedChatContainer Usage

```typescript
import { UnifiedChatContainer } from '@/components/chat/UnifiedChatContainer';

<UnifiedChatContainer
  userId={currentUserId}
  userName="John Doe"
  userAvatar="/avatar.jpg"
  chatRoom={selectedChatRoom}
  initialMessages={messages}
  onBack={() => handleBackToList()}      // Optional: mobile back navigation
  isLoadingMessages={isLoading}          // Optional: show loading state
/>
```

**Props:**

| Prop                | Type              | Description                                  |
| ------------------- | ----------------- | -------------------------------------------- |
| `userId`            | `string`          | Current user's ID                            |
| `userName`          | `string`          | Current user's display name                  |
| `userAvatar`        | `string`          | Current user's avatar URL                    |
| `chatRoom`          | `UnifiedChatRoom` | Selected chat room                           |
| `initialMessages`   | `Message[]`       | Pre-fetched messages for the room            |
| `onBack`            | `() => void`      | Optional callback for mobile back navigation |
| `isLoadingMessages` | `boolean`         | Optional loading state for messages          |

**Features:**

- Real-time message updates via Supabase subscriptions
- Optimistic UI updates for sent messages
- Auto-scroll to latest messages
- Auto-mark as read on mount
- Support for both food sharing and forum message types
- Mobile-responsive with back navigation support
- Loading state for async message fetching
- **Dark/light theme support** - Glassmorphism effects adapt to theme
- **Message status indicators** - Sent, delivered, and read status
- **Message editing** - Edit your own messages (forum only)
- **Message deletion** - Delete your own messages (forum only)
- **Reply to messages** - Quote and reply to specific messages
- **Read receipts** - See who has read your messages
- **Emoji reactions** - React to messages with emojis (👍 ❤️ 😂 😮 😢 🙏)
- **Typing indicators** - See when others are typing
- **Online presence** - See who is currently online

### ChatPageClient Usage

The main chat page client component that orchestrates the chat UI. Uses a calculated height layout that accounts for navbar (~64px) and footer (~64px), keeping the chat within the main content area.

```typescript
import { ChatPageClient } from './ChatPageClient';

<ChatPageClient
  userId={user.id}
  userName="John Doe"           // User's display name
  userAvatar="/avatar.jpg"      // User's avatar URL
  chatRooms={chatRooms}         // All user's chat rooms
  activeChatRoom={activeChatRoom}
  initialMessages={initialMessages}
/>
```

**Props:**

| Prop              | Type                      | Description                                       |
| ----------------- | ------------------------- | ------------------------------------------------- |
| `userId`          | `string`                  | Current user's ID                                 |
| `userName`        | `string`                  | Current user's display name (first + second name) |
| `userAvatar`      | `string`                  | Current user's avatar URL                         |
| `chatRooms`       | `UnifiedChatRoom[]`       | All chat rooms for the user                       |
| `activeChatRoom`  | `UnifiedChatRoom \| null` | Currently selected chat room                      |
| `initialMessages` | `NormalizedMessage[]`     | Pre-fetched messages for active room              |

**Layout Features:**

- Chat layout wrapper uses `h-full` to fill the main container (viewport minus navbar)
- `overflow-hidden` on wrapper prevents double scrollbars
- Footer is hidden via `[data-chat-page]` attribute on the layout wrapper
- Glassmorphism styling with decorative background gradients
- Dark/light theme support with automatic theme detection
- Independently scrolling sidebar (340px on desktop) and message area
- Responsive: sidebar overlays on mobile, side-by-side on desktop
- Smooth Framer Motion transitions between views

**Message Loading:**

- Initial messages loaded server-side for active room
- Additional messages fetched via API when switching chats
- Loading state shown during message fetch

**Empty State:**

- Animated icon with pulsing effect
- Shows chat statistics (food sharing vs community counts)
- Different messaging for "select a chat" vs "no chats yet"

## Database Tables

- `rooms` - Chat room metadata (sharer, requester, post_id, last_message)
- `room_participants` - Messages within rooms

## Unified Chat System

The chat system provides a unified interface for food sharing conversations.

### Unified Chat Functions

```typescript
import { getAllUserChats, getTotalUnreadCount, type UnifiedChatRoom } from "@/lib/data/chat";
```

#### Get All User Chats

```typescript
const chats = await getAllUserChats(userId);
```

Returns all chat rooms for a user, sorted by last message time.

**Returns:** `UnifiedChatRoom[]`

```typescript
type UnifiedChatRoom = {
  id: string;
  type: "food";
  title: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  hasUnread: boolean;
  participants: Array<{
    id: string;
    firstName: string;
    secondName: string;
    avatarUrl: string | null;
  }>;
  // Food-specific
  postId?: number;
  postName?: string;
  postImage?: string;
  postType?: string; // Category: food, thing, borrow, wanted, fridge, foodbank, etc.
  // Role info
  isSharer?: boolean;
  sharerId?: string;
  requesterId?: string;
};
```

#### Get Total Unread Count

```typescript
const count = await getTotalUnreadCount(userId);
```

Returns the total unread message count across all chats.

## Database Tables

- `rooms` - Chat room metadata (sharer, requester, post_id, last_message)
- `room_participants` - Messages within rooms

## Real-Time Features

### useUnifiedChat Hook

The `useUnifiedChat` hook provides real-time subscriptions for the food sharing chat system, including typing indicators, presence, and read receipts.

```typescript
import { useUnifiedChat } from "@/hooks/useUnifiedChat";

const {
  subscribeToAllRooms,
  typingUsers, // Users currently typing
  onlineUsers, // Users currently online in this chat
  isTyping, // Whether current user is typing
  sendTypingIndicator,
  sendReadReceipt,
} = useUnifiedChat({
  userId: currentUserId,
  userName: "John",
  userAvatar: "/avatar.jpg",
  roomId: "food-room-id", // Food sharing room ID
  onNewFoodMessage: (message) => {
    /* handle new food message */
  },
  onTypingChange: (users) => {
    /* handle typing users change */
  },
  onPresenceChange: (users) => {
    /* handle online users change */
  },
  onMessageRead: (messageId, readBy) => {
    /* handle read receipt */
  },
});
```

#### Typing Indicators

```typescript
// Send typing indicator when user starts typing
const handleInputChange = (e) => {
  setText(e.target.value);
  sendTypingIndicator(true);
};

// Display typing users
{typingUsers.length > 0 && (
  <div className="text-sm text-muted-foreground">
    {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
  </div>
)}
```

#### Read Receipts

```typescript
// Mark message as read when viewed
useEffect(() => {
  if (lastMessage && lastMessage.sender_id !== userId) {
    sendReadReceipt(lastMessage.id);
  }
}, [lastMessage]);

// Handle read receipt updates in UnifiedChatContainer
onMessageRead: (messageId, readBy) => {
  setMessages((prev) =>
    prev.map((m) => (m.id === messageId ? { ...m, readBy: [...(m.readBy || []), readBy] } : m))
  );
};
```

#### Presence (Online Users)

```typescript
// Show online status
{onlineUsers.map(user => (
  <div key={user.id} className="flex items-center gap-2">
    <span className="w-2 h-2 bg-green-500 rounded-full" />
    <span>{user.name}</span>
  </div>
))}
```

### useUnreadCount Hook

Track unread message count across all rooms.

```typescript
import { useUnreadCount } from '@/hooks/useUnifiedChat';

const { unreadCount, setUnreadCount } = useUnreadCount(userId);

// Display badge
<Badge>{unreadCount}</Badge>
```

### useOnlineStatus Hook

Track and broadcast the current user's online status.

```typescript
import { useOnlineStatus } from "@/hooks/useUnifiedChat";

const isOnline = useOnlineStatus(userId);
// Automatically tracks visibility changes and broadcasts presence
```

## API Routes

### GET `/api/chat/messages`

Fetches messages for food sharing rooms. Used by `ChatPageClient` when switching between chats.

**Authentication:** Required (returns 401 if not authenticated)

**Query Parameters:**

| Parameter | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `roomId`  | `string` | Food sharing room ID (required)           |
| `limit`   | `number` | Number of messages to fetch (default: 50) |
| `offset`  | `number` | Pagination offset (default: 0)            |

**Response:**

```typescript
{
  messages: Array<{
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    image?: string;
    isOwn: boolean;
    senderName?: string;
    senderAvatar?: string;
  }>;
}
```

**Example Usage:**

```typescript
// Fetch food sharing messages
const response = await fetch(`/api/chat/messages?roomId=${roomId}`);
const { messages } = await response.json();

// With pagination
const response = await fetch(`/api/chat/messages?roomId=${roomId}&limit=20&offset=40`);
```

**Error Responses:**

| Status | Description                    |
| ------ | ------------------------------ |
| 400    | Missing `roomId`               |
| 401    | User not authenticated         |
| 500    | Server error fetching messages |

## Server Actions

Server actions for chat mutations are located in `src/app/actions/chat.ts`.

### createFoodChatRoom

Creates a new food sharing chat room between a requester and a sharer.

```typescript
import { createFoodChatRoom } from "@/app/actions/chat";

const result = await createFoodChatRoom(postId, sharerId);
// Returns: { success: true, roomId: string } or { error: string }
```

**Validation Rules:**

- User must be authenticated
- User cannot chat with themselves (self-chat prevention)
- User cannot request their own listings
- If room already exists, returns existing room ID

**Side Effects:**

- Logs a `contacted` activity via `logPostContact()` for analytics and audit trails
- Invalidates post activity caches for the post and user
- Tracks "Food Requested" analytics event

**Error Messages:**

- `'You cannot chat with yourself about your own listing'` - When sharerId matches current user
- `'You cannot request your own listing'` - When post belongs to current user

### sendFoodChatMessage

Sends a message in a food sharing chat room.

```typescript
import { sendFoodChatMessage } from "@/app/actions/chat";

const formData = new FormData();
formData.set("roomId", roomId);
formData.set("text", "Hello!");
formData.set("image", imageUrl); // Optional

const result = await sendFoodChatMessage(formData);
```

### markFoodChatAsRead

Marks a chat room as read for the current user.

```typescript
import { markFoodChatAsRead } from "@/app/actions/chat";

const result = await markFoodChatAsRead(roomId);
```

### updateRoom

Updates a food sharing chat room with arrangement details (pickup time, assigned recipient).

```typescript
import { updateRoom } from "@/app/actions/chat";

const formData = new FormData();
formData.set("post_arranged_to", recipientUserId); // User ID who will pick up the item
formData.set("post_arranged_at", "2025-12-15T14:00:00Z"); // Pickup date/time (ISO string)

const result = await updateRoom(roomId, formData);
// Returns: { success: true } or { success: false, error: { message: string } }
```

**Supported Fields:**

- `post_arranged_to` - User ID of the person the item is arranged for
- `post_arranged_at` - Timestamp when pickup is arranged (ISO 8601 format)

**Side Effects (when `post_arranged_to` is set):**

- Logs an `arranged` activity via `logPostArrangement()` for analytics and audit trails
- Invalidates post activity caches for the post and user
- Tracks "Food Arranged" analytics event

**Use Cases:**

- Post owner confirms a requester for pickup
- Setting pickup date/time for food sharing arrangements

## Related Files

- `src/app/chat/page.tsx` - Chat page (Server Component - fetches user profile, chat rooms, and messages)
- `src/app/chat/ChatPageClient.tsx` - Chat page client component (receives userId, userName, userAvatar props)
- `src/app/chat/loading.tsx` - Loading skeleton UI (shown during page load)
- `src/app/api/chat/messages/route.ts` - API route for fetching messages (used when switching chats)
- `src/lib/data/chat.ts` - Server-side data functions
- `src/hooks/queries/useChatQueries.ts` - Client-side hooks
- `src/hooks/useUnifiedChat.ts` - Real-time subscription hook for food sharing chat with typing, presence, and read receipts
- `src/api/chatAPI.ts` - Client-side API functions
- `src/components/chat/UnifiedChatList.tsx` - Unified conversation list component (uses Framer Motion for animations)
- `src/components/chat/UnifiedChatContainer.tsx` - Unified chat interface component
- `src/components/chat/ContactsBlock.tsx` - Legacy contacts sidebar
- `src/components/chat/MessagesWindow.tsx` - Legacy message window
- `src/store/zustand/useChatStore.ts` - Chat state management
- `src/app/actions/chat.ts` - Server actions for sending messages

## Post Activity Integration

Chat actions automatically log activities to the `post_activity_logs` table for analytics and audit trails:

| Action           | Activity Type | Logged Data                               |
| ---------------- | ------------- | ----------------------------------------- |
| Create chat room | `contacted`   | Post ID, room ID, sharer ID, requester ID |
| Arrange pickup   | `arranged`    | Post ID, room ID, arranged-to profile ID  |

These activities are logged via functions from `@/app/actions/post-activity`:

- `logPostContact()` - When a user initiates a chat about a post
- `logPostArrangement()` - When a post owner confirms a pickup arrangement

Cache invalidation uses `invalidatePostActivityCaches()` from `@/lib/data/cache-keys` to ensure activity timelines and stats are updated.

See [Post Activity Documentation](../posts/README.md#post-activity-timeline) for more details on the activity logging system.

## Dependencies

The chat components use the following key dependencies:

- `framer-motion` - Animations for list transitions in UnifiedChatList
- `@supabase/supabase-js` - Real-time subscriptions
- `next-intl` - Internationalization
