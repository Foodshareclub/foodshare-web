# FoodShare Features

**Project:** FoodShare - Community Food Sharing Platform
**Type:** Next.js 16 + React 19 Application
**Last Updated:** December 2025
**Version:** 2.0.0

---

## Table of Contents

- [Feature Overview](#feature-overview)
- [Core Features](#core-features)
- [User Features](#user-features)
- [Technical Features](#technical-features)
- [Platform Capabilities](#platform-capabilities)
- [Feature Status](#feature-status)
- [Planned Features](#planned-features)

---

## Feature Overview

FoodShare is a comprehensive community food sharing platform that combines location-based discovery, real-time messaging, and social features to reduce food waste and strengthen local communities.

### Key Value Propositions

1. **Effortless Food Sharing** - Post surplus food in seconds, discover available food nearby
2. **Real-Time Connection** - Instant messaging between sharers and receivers
3. **Location-Based Discovery** - Map view and geospatial search for nearby food
4. **Multi-Language Support** - Accessible to diverse communities (18 languages)
5. **Community Building** - Reviews, profiles, and volunteer opportunities

---

## Core Features

### 1. Food Listing Management

**Status:** Stable | **Priority:** P0 (Critical)

#### Create Food Listings

- **Quick post creation** - Simple form with photo upload
- **Multiple photos** - Up to 3 images per listing
- **Detailed descriptions** - Food type, quantity, expiration
- **Location tagging** - Address with geolocation
- **Availability hours** - When food can be picked up
- **Transportation options** - Pickup, delivery, or both

**User Story:**

> As a food sharer, I want to post my surplus vegetables with photos and pickup times so neighbors can collect them easily.

#### Browse Food Listings

- **Category filters** - Food, volunteers, community fridges, food banks
- **Distance-based sorting** - Nearest items first
- **Real-time updates** - New listings appear instantly
- **Card-based UI** - Visual grid with photo previews
- **Skeleton loading** - Smooth loading experience

**Technical Implementation:**

- API: `productAPI.getProducts(type)`
- State: React Query with caching
- Components: `ProductCard`, `AsideProducts`
- Filters: `FiltersModal` component

#### Search Functionality

- **Text search** - Find food by name or description
- **Full-text search** - PostgreSQL WebSearch type
- **Category filtering** - Food type, distance, availability
- **Debounced input** - Optimized search performance

**Technical Implementation:**

- API: `productAPI.searchProducts(searchWord, type)`
- Hook: Custom `useDebounce` hook
- Component: `SearchField`

---

### 2. Interactive Map

**Status:** Stable | **Priority:** P1 (High)

#### Map Display

- **Leaflet integration** - Open-source, no API key required
- **Custom markers** - Different icons for food types
- **Marker clustering** - Performance with many items
- **User location** - Show current position
- **Zoom controls** - Navigate map easily

**User Story:**

> As a food seeker, I want to see all available food on a map so I can find options near my current location.

#### Geospatial Features

- **Distance calculation** - Haversine formula for accuracy
- **Radius filtering** - Search within X kilometers
- **Location search** - Find food by address
- **Real-time updates** - Markers update as listings change

**Technical Implementation:**

- Library: Leaflet 1.9.4 + React Leaflet 5.0
- Components: `Leaflet`, `MarkerWhatEver`, `UserLocationMarker`
- Utils: `getDistanceFromLatLonInKm.ts`, `postgis.ts`
- Clustering: `react-leaflet-cluster` for performance
- Search: `leaflet-geosearch` integration
- SSR: Dynamic import with `{ ssr: false }`

---

### 3. Real-Time Chat

**Status:** Stable | **Priority:** P0 (Critical)

#### Direct Messaging

- **One-on-one chat** - Private conversations between users
- **Real-time delivery** - Supabase Realtime WebSockets
- **Message history** - Persistent conversation storage
- **Read receipts** - Track message status (planned)
- **Online indicators** - See who's active (planned)

**User Story:**

> As a food requester, I want to message the sharer to confirm pickup details and ask about the food condition.

#### Chat Features

- **Conversation list** - All active chats
- **Last message preview** - Quick conversation overview
- **Timestamps** - When messages were sent
- **User profiles** - See who you're chatting with
- **Image sharing** - Send photos in chat (optional)

**Technical Implementation:**

- API: `chatAPI.ts` - `getRoomOrCreate`, `sendMessage`, `getRoomMessages`
- State: Zustand `useChatStore` for real-time state
- Components: `ContactsBlock`, `MessagesWindow`, `InputSection`
- Realtime: Supabase subscriptions to `room_participants` table

#### Technical Architecture

```typescript
// Subscribe to new messages
const supabase = createClient();

supabase
  .channel(`room:${roomId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "room_participants",
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      // Update Zustand store
      addMessage(payload.new);
    }
  )
  .subscribe();
```

---

### 4. User Profiles

**Status:** Stable | **Priority:** P1 (High)

#### Profile Management

- **User information** - Name, email, phone, address
- **Profile photo** - Avatar upload and management
- **Bio/description** - About the user
- **Edit profile** - Update information anytime
- **Settings access** - Privacy and security options

**User Story:**

> As a user, I want to create a profile with my photo and bio so others in the community know who I am.

#### Profile Features

- **View active listings** - See user's current posts
- **Reputation system** - Reviews and ratings (via `reviews` table)
- **Contact information** - Controlled visibility
- **Activity history** - Past listings and interactions

**Technical Implementation:**

- API: `profileAPI.ts` - `getProfile`, `updateProfile`, `createProfile`
- State: React Query `useCurrentProfile` hook for profile data
- Components: `PersonalInfoClient` with reusable `InfoCard` pattern
- Design: Modern card-based UI with gradient icons, Framer Motion animations
- Pages: `/profile`, `/settings/personal-info`

---

### 5. Authentication & Security

**Status:** Stable | **Priority:** P0 (Critical)

#### User Authentication

- **Email/password signup** - Standard authentication
- **Email verification** - Confirm email address
- **Password recovery** - Reset forgotten passwords
- **Social auth** - Google, Apple (configurable in Supabase)
- **Session management** - JWT-based with PKCE flow, auto-refresh

**User Story:**

> As a new user, I want to sign up with my email so I can start sharing food with my community.

#### Security Features

- **Password requirements** - Strong password enforcement
- **Secure storage** - Passwords hashed by Supabase Auth
- **HTTPS only** - Encrypted communication
- **Row Level Security** - Database access control
- **XSS protection** - React's automatic escaping
- **CSRF protection** - Token-based security

**Technical Implementation:**

- Auth: Supabase Auth service with PKCE OAuth flow
- Config: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Components: `AuthenticationUserModal`, `CredentialsBlock`, `PasswordRecoveryModal`
- State: Redux `userReducer` stores auth state with persistence

---

### 6. Internationalization (i18n)

**Status:** Stable | **Priority:** P1 (High)

#### Multi-Language Support

- **18 languages** - Comprehensive global coverage
- **Dynamic switching** - Change language instantly
- **RTL support** - Arabic with right-to-left layout
- **Locale persistence** - Remember user's choice
- **Compiled catalogs** - Fast runtime performance

**Supported Languages:**

- **European**: English (en), Czech (cs), German (de), Spanish (es), French (fr), Portuguese (pt), Russian (ru), Ukrainian (uk), Italian (it), Polish (pl), Dutch (nl)
- **Asian**: Chinese (zh), Hindi (hi), Japanese (ja), Korean (ko)
- **Other**: Arabic (ar) with RTL support, Turkish (tr)

**User Story:**

> As a non-English speaker, I want to use the app in my native language so I can understand all features.

#### i18n Features

- **UI translations** - All interface text
- **Form validation** - Localized error messages
- **Date/time formatting** - Locale-appropriate formats
- **Number formatting** - Currency and units
- **Plural handling** - Correct grammar for counts

**Technical Implementation:**

- Framework: Lingui 5.6 with SWC plugin
- Macros: `<Trans>`, `t` macro
- Locales: `src/locales/{locale}/messages.{js,po}`
- Component: `ChangeLanguageContainer`
- Commands: `npm run extract`, `npm run compile`

---

### 7. Reviews & Ratings

**Status:** Stable | **Priority:** P2 (Medium)

#### Review System

- **Star ratings** - 1-5 star scale
- **Written feedback** - Detailed comments
- **Post reviews** - Review food listings
- **User reviews** - Review other users (via post reviews)
- **Review display** - Show on listings and profiles

**User Story:**

> As a food receiver, I want to leave a review thanking the sharer and helping others know they're trustworthy.

**Technical Implementation:**

- Database: `reviews` table
- API: Included in `productAPI.getProducts()` with `reviews(*)`
- Component: `Comments` component

---

### 8. Admin Dashboard

**Status:** Stable | **Priority:** P1 (High)

#### Admin Features

- **Listing moderation** - Approve, reject, flag posts
- **User management** - View and manage users
- **Bulk operations** - Batch approve/reject
- **Audit logging** - Track admin actions
- **Dashboard stats** - Platform metrics

**Technical Implementation:**

- Server Actions: `src/app/actions/admin.ts` and `src/app/actions/admin-listings.ts`
- Data Layer: `src/lib/data/admin-listings.ts` for server-side data fetching
- Pages: `/admin` with protected routes
- RLS: Admin-only database policies

---

### 9. CRM System

**Status:** Stable | **Priority:** P2 (Medium)

#### CRM Features

- **Contact management** - Track user relationships
- **Communication history** - Log interactions
- **User segments** - Group users by criteria
- **Export data** - Download reports

**Technical Implementation:**

- State: Redux `crmReducer`
- Pages: `/admin/crm`

---

## User Features

### Dashboard & Navigation

**Status:** Stable

- **Header navigation** - Access all main sections
- **Profile menu** - Quick access to settings
- **Settings page** - Manage account and preferences
- **Footer links** - About, contact, legal pages
- **Mobile-responsive** - Works on all devices

**Components:**

- `Header`, `NavComponent`, `ProfileSettings`
- `Footer`
- `NavDrawer` for mobile navigation (shadcn/ui Sheet)

### Notifications

**Status:** Partial | **Priority:** P2 (Medium)

- **Alert system** - In-app notifications
- **Modal notifications** - Important updates
- **Email notifications** - Supabase integration (configurable)
- **Push notifications** - Planned for future

**Components:**

- `AlertComponent`
- `PopupNotificationModal`
- `NotificationModal`
- shadcn/ui `Toast` for transient notifications

### Account Settings

**Status:** Stable

- **Personal information** - Edit profile details
- **Login & security** - Password management
- **Preferences** - App settings
- **Language selection** - Change interface language
- **Theme selection** - Light/dark/system modes
- **Account deletion** - Remove account (via modal)

**Pages:**

- `/profile`
- `/settings`

---

## Technical Features

### State Management (Hybrid Approach)

**Status:** Stable

Three-tier state management:

1. **React Query** - Server state (API data, caching, sync)
2. **Redux Toolkit** - Complex client state (auth, profile, products, admin)
3. **Zustand** - Lightweight feature state (chat, forum, UI)

**React Query Usage:**

```typescript
// Server state with automatic caching
const { data, isLoading } = useQuery({
  queryKey: ["products", filters],
  queryFn: () => productAPI.getProducts(filters),
});
```

**Redux Store Structure:**

```typescript
{
  auth: AuthState,       // Authentication state
  profile: ProfileState, // User profile data
  products: ProductState, // Listings with filters
  ui: UIState,           // Theme preferences
  chat: ChatState,       // Chat state
  forum: ForumState,     // Forum state
  admin: AdminState,     // Admin dashboard
  crm: CRMState          // CRM state
}
```

**Zustand Stores:**

```typescript
// Lightweight feature-specific state
useChatStore; // Real-time chat
useForumStore; // Forum functionality
useUIStore; // UI state management
```

### API Layer

**Status:** Stable

- **Centralized API** - All Supabase calls in `src/api/`
- **Type-safe** - TypeScript interfaces
- **Error handling** - Consistent error format
- **Response typing** - Supabase response types

**API Modules:**

- `productAPI.ts` - Food listings CRUD
- `chatAPI.ts` - Messaging operations
- `profileAPI.ts` - User profile management

**Server Actions (Admin):**

- `src/app/actions/admin.ts` - Admin user management
- `src/app/actions/admin-listings.ts` - Admin listing operations

### Performance Optimizations

**Status:** Stable

- **React Compiler** - Automatic memoization via `babel-plugin-react-compiler`
- **Turbopack** - Fast development builds
- **Server Components** - Reduced client-side JavaScript
- **Code splitting** - Automatic with App Router
- **Image optimization** - Next.js Image with Supabase CDN
- **Marker clustering** - Map performance with many items
- **React Query caching** - Smart server state management
- **Bundle analysis** - Available via `npm run build:analyze`

### Responsive Design

**Status:** Stable

- **Mobile-first** - Optimized for mobile devices
- **Breakpoints** - Tailwind CSS responsive utilities
- **shadcn/ui** - Accessible, responsive components
- **Touch-friendly** - Mobile gesture support
- **Adaptive layout** - Flexbox and Grid

**Implementation:**

- Framework: shadcn/ui + Radix UI
- Styling: Tailwind CSS 4
- Utils: `cn()` utility for conditional classes

---

## Platform Capabilities

### Database (Supabase PostgreSQL)

**Features:**

- **Relational data** - Complex relationships
- **Full-text search** - Fast search queries
- **Geospatial** - PostGIS location queries
- **Row Level Security** - Built-in access control
- **Real-time** - WebSocket subscriptions
- **Auto-generated types** - TypeScript types from schema

**Tables:**

- `profiles` - User accounts
- `posts` - Food listings
- `rooms` - Chat conversations
- `room_participants` - Chat messages
- `reviews` - Ratings and feedback

### Storage (Supabase Storage)

**Features:**

- **Image upload** - Food listing photos
- **Avatar storage** - Profile pictures
- **Public URLs** - Direct image access
- **Size limits** - Configurable limits
- **CDN integration** - Fast image delivery

### Authentication (Supabase Auth)

**Features:**

- **Email/password** - Standard auth
- **Social providers** - Google, Apple, etc.
- **PKCE OAuth** - Secure flow for SPAs
- **JWT tokens** - Secure sessions
- **Auto-refresh** - Seamless token renewal
- **Password reset** - Email-based recovery

---

## Feature Status

### Production-Ready (Stable)

- Food listing creation and browsing
- Interactive map with geolocation
- Real-time chat messaging
- User authentication and profiles
- Multi-language support (18 languages)
- Review and rating system
- Search functionality
- Responsive mobile design
- Admin dashboard
- Theme switching (light/dark/system)

### Beta/In Development (Partial)

- Push notifications
- Email notifications
- Advanced filtering
- User reputation scores
- Community features

### Planned (Roadmap)

- **Enhanced Notifications**
  - Push notifications for new messages
  - Email digests of nearby food
  - In-app notification center

- **Social Features**
  - Follow/favorite users
  - Community groups
  - Public forums
  - Event listings

- **Advanced Search**
  - Saved searches
  - Search alerts
  - Dietary filters (vegan, gluten-free, etc.)
  - Allergen warnings

- **Gamification**
  - Badges and achievements
  - Sharing leaderboards
  - Impact statistics (food saved, CO2 reduced)

- **Payment Integration**
  - Optional donations
  - Premium features
  - Support for food banks

- **Analytics**
  - User dashboard with stats
  - Impact metrics
  - Community insights

- **Mobile Apps**
  - iOS native app
  - Android native app
  - PWA offline support

---

## Feature Comparison

### vs. Other Food Sharing Platforms

| Feature                | FoodShare    | OLIO | Too Good To Go | Food Rescue  |
| ---------------------- | ------------ | ---- | -------------- | ------------ |
| **Free to use**        | Yes          | Yes  | Freemium       | Yes          |
| **Real-time chat**     | Yes          | Yes  | No             | Limited      |
| **Interactive map**    | Yes          | Yes  | Yes            | Limited      |
| **Multi-language**     | 18 languages | Many | Many           | English only |
| **Open-source**        | Yes          | No   | No             | Partial      |
| **Community fridges**  | Yes          | Yes  | No             | Yes          |
| **Volunteer listings** | Yes          | Yes  | No             | Yes          |
| **Business listings**  | No           | Yes  | Yes            | No           |

### Unique Advantages

1. **Next.js 16** - Server Components, Turbopack, optimized performance
2. **React 19** - Latest React features with React Compiler
3. **Hybrid State** - React Query + Redux + Zustand for optimal state management
4. **Type-safe** - Full TypeScript throughout
5. **Supabase** - Real-time, scalable backend
6. **shadcn/ui** - Accessible, beautiful, customizable components
7. **18 Languages** - Comprehensive international support
8. **Open architecture** - Easy to extend and customize

---

## Feature Metrics

### Current Capabilities

```
Supported Features:          30+
API Endpoints:               20+
React Components:            100+
State Management:            React Query + Redux + Zustand
Supported Languages:         18
Database Tables:             5+
Real-time Subscriptions:     2
Max Photo Upload:            3 per listing
Search Response Time:        <500ms
Map Marker Clustering:       Enabled
Mobile Responsive:           100%
Accessibility (WCAG):        AA compliant (Radix UI)
```

### Performance Targets

```
Page Load Time:              <2 seconds
Time to Interactive:         <3 seconds
First Contentful Paint:      <1 second
Map Render Time:             <1 second
Search Results:              <500ms
Real-time Message Delay:     <100ms
```

---

## Browser & Platform Support

### Desktop Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile Browsers

- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+
- Firefox Mobile 88+

### Operating Systems

- Windows 10+
- macOS 10.15+
- iOS 14+
- Android 10+
- Linux (Ubuntu, Fedora, etc.)

---

## Accessibility Features

**WCAG 2.1 Level AA Compliance** (via Radix UI)

- **Keyboard navigation** - Full keyboard support
- **Screen reader** - ARIA labels and roles
- **Focus management** - Visible focus indicators
- **Color contrast** - Meets WCAG AA standards
- **Responsive text** - Scalable font sizes
- **Alternative text** - Images have alt text

---

## Security Features

### Application Security

- **HTTPS only** - Enforced in production
- **XSS protection** - React automatic escaping
- **CSRF protection** - Token-based security
- **Input validation** - Client and server-side
- **SQL injection** - Prevented by Supabase
- **Content Security Policy** - Configured headers

### Data Privacy

- **Row Level Security** - User data isolation
- **Encrypted transport** - TLS 1.3
- **Secure authentication** - Supabase Auth with PKCE
- **Password hashing** - bcrypt by Supabase
- **GDPR ready** - Data export and deletion
- **Private by default** - Opt-in data sharing

---

## Development Features

### Developer Experience

- **Turbopack** - Instant HMR
- **TypeScript** - Full type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Redux DevTools** - State inspection
- **React DevTools** - Component debugging
- **React Query DevTools** - Server state inspection
- **Source maps** - Error stack traces

### Testing

- **Type checking** - TypeScript compiler
- **Linting** - Pre-commit hooks (Lefthook)
- **Build verification** - `npm run test:build`

---

## Documentation Features

Located in `/context` directory:

- **INDEX.md** - Documentation overview
- **ARCHITECTURE.md** - System architecture
- **DATABASE_SCHEMA.md** - Database structure
- **FOLDER_STRUCTURE.md** - Project organization
- **API_REFERENCE.md** - API documentation
- **DEVELOPMENT_GUIDE.md** - Development workflows
- **TECH_STACK.md** - Technology details
- **WORKFLOWS.md** - Development workflows
- **FEATURES.md** - This file
- **PRD.md** - Product requirements
- **ADR.md** - Architecture decisions
- **STYLE_GUIDE.md** - Documentation standards

---

## Conclusion

FoodShare provides a comprehensive feature set for community food sharing, combining modern web technologies with user-centered design. The platform is built for scalability, maintainability, and extensibility.

**Core Strengths:**

1. Real-time communication
2. Location-based discovery
3. Multi-language accessibility (18 languages)
4. Open-source architecture
5. Type-safe implementation
6. Modern React patterns

**Roadmap Focus:**

1. Enhanced notifications
2. Mobile apps
3. Advanced analytics
4. Community features
5. Payment integration

---

**Last Updated:** December 2025
**Maintained By:** FoodShare Development Team
**Status:** Active development - features added regularly

---

## Quick Navigation

- [Back to Index](INDEX.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Folder Structure](FOLDER_STRUCTURE.md)
- [Tech Stack Details](TECH_STACK.md)
- [Development Guide](DEVELOPMENT_GUIDE.md)
