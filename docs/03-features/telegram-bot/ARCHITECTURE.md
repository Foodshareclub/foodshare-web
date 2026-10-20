# Telegram Bot FoodShare - Componentized Architecture

## Overview

The Telegram bot has been refactored into a modular, maintainable architecture with clear separation of concerns.

## Directory Structure

```
telegram-bot-foodshare/
├── index.ts                    # Main entry point (Deno.serve handler)
├── README.md                   # This file
│
├── config/
│   └── index.ts               # Environment variables and configuration
│
├── types/
│   └── index.ts               # TypeScript type definitions
│
├── lib/
│   ├── i18n.ts                # Internationalization utilities
│   ├── emojis.ts              # Emoji constants
│   └── messages.ts            # Message formatting utilities
│
├── services/
│   ├── supabase.ts            # Supabase client with connection pooling
│   ├── cache.ts               # In-memory caching service
│   ├── telegram-api.ts        # Telegram Bot API wrapper
│   ├── user-state.ts          # User state management
│   ├── profile.ts             # Profile CRUD operations
│   ├── email.ts               # Email verification service
│   ├── geocoding.ts           # Location and geocoding utilities
│   ├── tracking.ts            # Activity tracking
│   └── impact.ts              # Impact statistics calculations
│
├── handlers/
│   ├── auth.ts                # Authentication flow handlers
│   ├── commands.ts            # Command handlers (/start, /help, etc.)
│   ├── messages.ts            # Message handlers (text, photo, location)
│   └── callbacks.ts           # Callback query handlers
│
└── utils/
    ├── validators.ts          # Input validation utilities
    └── formatters.ts          # Data formatting utilities
```

## Architecture Principles

### 1. **Separation of Concerns**

- **Services**: Business logic and external API interactions
- **Handlers**: Request/response handling and user interaction flow
- **Utils**: Pure functions for data transformation
- **Config**: Centralized configuration management

### 2. **Single Responsibility**

Each module has one clear purpose:

- `services/profile.ts` - Only profile-related database operations
- `services/email.ts` - Only email sending functionality
- `handlers/auth.ts` - Only authentication flow logic

### 3. **Dependency Injection**

Services are imported where needed, making testing and mocking easier:

```typescript
import { sendMessage } from "../services/telegram-api.ts";
import { getProfileByTelegramId } from "../services/profile.ts";
```

### 4. **Type Safety**

All types are centralized in `types/index.ts` and exported for reuse across modules.

### 5. **Error Handling**

Each service handles its own errors and returns appropriate values or throws typed errors.

## Key Services

### Supabase Service (`services/supabase.ts`)

- Connection pooling for performance
- Single client instance reused across requests
- Lazy initialization

### Cache Service (`services/cache.ts`)

- In-memory caching with TTL
- Generic type support
- Automatic expiration

### Telegram API Service (`services/telegram-api.ts`)

- Wrapper around Telegram Bot API
- Consistent error handling
- Type-safe method signatures

### Profile Service (`services/profile.ts`)

- CRUD operations for user profiles
- Email verification logic
- Profile lookup by telegram_id or email

### Email Service (`services/email.ts`)

- Verification email sending
- Integration with Resend edge function
- HTML email templates

## Handler Pattern

Handlers follow a consistent pattern:

```typescript
export async function handleCommand(
  chatId: number,
  userId: number,
  telegramUser: TelegramUser,
  lang?: string
): Promise<void> {
  // 1. Get user language
  const language = await getUserLanguage(userId, lang);

  // 2. Fetch required data
  const profile = await getProfileByTelegramId(userId);

  // 3. Validate and check permissions
  if (!profile || requiresEmailVerification(profile)) {
    await sendMessage(chatId, msg.errorMessage(...));
    return;
  }

  // 4. Execute business logic
  const result = await someService.doSomething();

  // 5. Send response
  await sendMessage(chatId, formatResponse(result));
}
```

## Benefits of This Architecture

### 1. **Maintainability**

- Easy to locate and fix bugs
- Clear module boundaries
- Self-documenting code structure

### 2. **Testability**

- Services can be unit tested in isolation
- Handlers can be tested with mocked services
- Pure functions are easy to test

### 3. **Scalability**

- Easy to add new commands/features
- Services can be extracted to separate edge functions if needed
- Clear extension points

### 4. **Reusability**

- Services can be shared across multiple handlers
- Utilities can be used anywhere
- Types ensure consistency

### 5. **Performance**

- Connection pooling reduces overhead
- Caching reduces database queries
- Lazy loading of services

## Adding New Features

### Adding a New Command

1. Create handler in `handlers/commands.ts`:

```typescript
export async function handleMyCommand(
  chatId: number,
  userId: number,
  telegramUser: TelegramUser
): Promise<void> {
  // Implementation
}
```

2. Register in main router (`index.ts`):

```typescript
case "/mycommand":
  await handleMyCommand(chatId, userId, telegramUser);
  break;
```

### Adding a New Service

1. Create service file in `services/`:

```typescript
// services/my-service.ts
import { getSupabaseClient } from "./supabase.ts";

export async function doSomething(): Promise<Result> {
  const supabase = getSupabaseClient();
  // Implementation
}
```

2. Import and use in handlers:

```typescript
import { doSomething } from "../services/my-service.ts";
```

## Migration Path

The original monolithic `index.ts` file can be gradually migrated:

1. ✅ Extract types → `types/index.ts`
2. ✅ Extract config → `config/index.ts`
3. ✅ Extract services → `services/*.ts`
4. ✅ Extract auth handlers → `handlers/auth.ts`
5. ⏳ Extract command handlers → `handlers/commands.ts`
6. ⏳ Extract message handlers → `handlers/messages.ts`
7. ⏳ Extract callback handlers → `handlers/callbacks.ts`
8. ⏳ Update main `index.ts` to use new modules

## Testing Strategy

### Unit Tests

```typescript
// Test services in isolation
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { generateVerificationCode } from "./services/profile.ts";

Deno.test("generateVerificationCode returns 6 digits", () => {
  const code = generateVerificationCode();
  assertEquals(code.length, 6);
  assertEquals(/^\d{6}$/.test(code), true);
});
```

### Integration Tests

```typescript
// Test handlers with mocked services
import { handleEmailInput } from "./handlers/auth.ts";
// Mock services and test flow
```

## Performance Considerations

- **Connection Pooling**: Single Supabase client reused
- **Caching**: Frequently accessed data cached with TTL
- **Lazy Loading**: Services initialized only when needed
- **Async/Await**: Non-blocking I/O operations
- **Error Boundaries**: Graceful degradation on service failures

## Security Best Practices

- Environment variables for sensitive data
- Input validation in handlers
- SQL injection prevention via Supabase client
- Rate limiting (to be implemented)
- Email verification required for sensitive operations

## Next Steps

1. Complete migration of remaining handlers
2. Add comprehensive error logging
3. Implement rate limiting
4. Add unit tests for all services
5. Add integration tests for critical flows
6. Document API contracts
7. Add monitoring and alerting
