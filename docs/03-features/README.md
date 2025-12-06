# 🎯 Features Documentation

Feature-specific documentation for FoodShare's core functionality.

## 📁 Features

### [navbar/](./navbar/) - Navigation System

Airbnb-style navigation with search, filters, and categories.

- Responsive design
- Search functionality
- Category filtering
- Distance-based search

### [map/](./map/) - Map Integration

Interactive map with Leaflet and PostGIS.

- Split-view layout
- Real-time markers
- Geographic queries
- Location search

### [chat/](./chat/) - Messaging System

Real-time chat between users.

- Supabase Realtime
- Message notifications
- Read receipts
- File attachments

### [telegram-bot/](./telegram-bot/) - Telegram Bot

Telegram integration for posting and browsing food.

- Multi-language support
- Location sharing
- Photo uploads
- Inline queries

### [profiles/](./profiles/) - User Profiles

User management and profiles.

- Profile editing
- Avatar uploads
- Activity history
- Reputation system

### [email/](./email/) - Email System

Email notifications and CRM.

- Transactional emails
- Admin CRM
- Email templates
- Smart routing

### [authentication/](./authentication/) - Auth System

Authentication and authorization.

- Email/password auth
- OAuth providers
- Session management
- Protected routes

### [security/](./security/) - Security Features

Security implementations.

- MFA (Multi-factor auth)
- Rate limiting
- Input validation
- XSS protection

### [storage/](./storage/) - File Storage

File upload and management.

- Image optimization
- CDN integration
- Storage buckets
- Access control

### [admin/](./admin/) - Admin Dashboard

Admin CRM and management tools.

- User management
- Content moderation
- Analytics
- Bulk operations

### [forum/](./forum/) - Community Forum

Community discussion forum.

- Categories and tags
- Post types (discussion, Q&A, guides)
- Nested comments
- Reactions and bookmarks
- User reputation system

### Dev Tools

Development-only debugging utilities (hidden in production).

- **DevTools** (`src/components/dev/DevTools.tsx`) - Main dev tools wrapper (recommended)
  - Initializes logger with console banner and environment info
  - Enables performance profiler
  - Includes LogViewer component
  - Props: `showLogViewer`, `position`, `version`

- **LogViewer** (`src/components/dev/LogViewer.tsx`) - Visual log viewer panel
  - Displays error history from `@/lib/logger`
  - Filter by log level (error, warn, info, debug, success)
  - Search logs by message or component
  - Export logs to JSON, copy individual entries
  - Expandable entries with context and stack traces
  - Configurable position, pin/minimize support

## 🎯 Feature Status

| Feature      | Status      | Documentation                                          |
| ------------ | ----------- | ------------------------------------------------------ |
| Navbar       | ✅ Complete | [navbar/README.md](./navbar/README.md)                 |
| Map          | ✅ Complete | [map/README.md](./map/README.md)                       |
| Chat         | ✅ Complete | [chat/README.md](./chat/README.md)                     |
| Telegram Bot | ✅ Complete | [telegram-bot/README.md](./telegram-bot/README.md)     |
| Profiles     | ✅ Complete | [profiles/README.md](./profiles/README.md)             |
| Email        | ✅ Complete | [email/README.md](./email/README.md)                   |
| Auth         | ✅ Complete | [authentication/README.md](./authentication/README.md) |
| Security     | ✅ Complete | [security/README.md](./security/README.md)             |
| Storage      | ✅ Complete | [storage/README.md](./storage/README.md)               |
| Admin        | ✅ Complete | [admin/README.md](./admin/README.md)                   |
| Forum        | ✅ Complete | [forum/README.md](./forum/README.md)                   |

## 🚀 Adding a New Feature

### 1. Create Feature Folder

```bash
mkdir -p docs/03-features/my-feature
```

### 2. Add README

Create `docs/03-features/my-feature/README.md` with:

- Feature overview
- Implementation details
- API documentation
- Usage examples

### 3. Update This Index

Add your feature to the list above.

### 4. Link from Main Index

Update `docs/00-INDEX.md` with your feature.

## 📖 Feature Development Workflow

### Planning

1. Review [Architecture](../02-development/ARCHITECTURE.md)
2. Check [Database Schema](../02-development/DATABASE_SCHEMA.md)
3. Plan data model and API

### Implementation

1. Follow [Style Guide](../02-development/STYLE_GUIDE.md)
2. Create components in `src/components/`
3. Add Redux slice if needed
4. Implement API calls
5. Add translations

### Testing

1. Write unit tests
2. Test edge cases
3. Check mobile responsiveness
4. Verify i18n works

### Documentation

1. Create feature README
2. Add code examples
3. Document API endpoints
4. Update main index

## 🔗 Related Documentation

- [Development Guide](../02-development/DEVELOPMENT_GUIDE.md)
- [API Reference](../05-reference/API_REFERENCE.md)
- [Examples](../05-reference/EXAMPLES.md)

---

[← Back to Index](../00-INDEX.md)
