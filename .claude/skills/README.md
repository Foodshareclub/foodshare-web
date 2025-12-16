# FoodShare Claude Code Skills

This directory contains custom Claude Code skills tailored for the FoodShare project. These skills provide expert guidance and best practices for our Next.js 16 + App Router stack.

## Available Skills

### Core Framework Skills

#### nextjs-app-router

Expert guidance for Next.js 16 App Router architecture and patterns.

**Topics Covered:**

- File-based routing (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)
- Server Components vs Client Components
- Route groups, parallel routes, intercepting routes
- Metadata API and SEO optimization
- Streaming with Suspense
- Route handlers and middleware

**When to Use:** Creating pages, layouts, implementing routing patterns, error handling

---

#### server-actions

Server Actions for mutations, form handling, and data revalidation.

**Topics Covered:**

- `'use server'` directive patterns
- Form actions with progressive enhancement
- Optimistic updates with `useOptimistic`
- Revalidation (`revalidatePath`, `revalidateTag`)
- Error handling and validation with Zod
- Integration with React Query

**When to Use:** Form submissions, mutations, data updates, cache invalidation

---

#### react-typescript

React 19 + TypeScript development for Next.js applications.

**Topics Covered:**

- Server Component patterns (async/await, data fetching)
- Client Component patterns (hooks, event handlers)
- TypeScript strict mode best practices
- Component composition and props
- Performance optimization (memo, useMemo, useCallback)
- Error boundaries

**When to Use:** Creating components, TypeScript patterns, performance optimization

---

### UI & Styling Skills

#### shadcn-ui

Component library patterns with shadcn/ui and Radix UI.

**Topics Covered:**

- Component installation (`npx shadcn@latest add`)
- Customization with CSS variables
- Dark mode with `next-themes`
- Form integration with React Hook Form
- Toast notifications
- Modal dialogs and sheets
- Data tables

**When to Use:** UI components, styling, theming, accessibility

---

#### leaflet-maps

Interactive mapping with React Leaflet in Next.js.

**Topics Covered:**

- Dynamic imports with `ssr: false`
- Client Component wrapper patterns
- Marker clustering
- Custom markers and popups
- Geolocation and location search
- PostGIS integration

**When to Use:** Map features, location tracking, geospatial queries

---

### Internationalization

#### next-intl

Internationalization with next-intl (21 languages).

**Topics Covered:**

- Server Component: `getTranslations()`
- Client Component: `useTranslations()`
- Locale routing and detection
- RTL support (Arabic)
- Pluralization and formatting
- Translation file structure

**When to Use:** Adding translations, language switching, localization

---

### Backend & Data

#### supabase-backend

Supabase integration with Next.js Server Components and Actions.

**Topics Covered:**

- Server client (`lib/supabase/server.ts`)
- Client browser (`lib/supabase/client.ts`)
- Cached data fetching with `unstable_cache`
- Row Level Security (RLS) policies
- Real-time subscriptions
- File storage

**When to Use:** Database operations, authentication, real-time features

---

#### form-handling

Form handling with Server Actions and shadcn/ui.

**Topics Covered:**

- Progressive enhancement with `<form action={...}>`
- Validation with Zod schemas
- `useFormState` and `useFormStatus`
- Error display with shadcn/ui components
- File uploads
- Multi-step forms

**When to Use:** Building forms, validation, file uploads

---

### Testing & Quality

#### jest-unit-testing

Unit testing Next.js applications with Jest.

**Topics Covered:**

- Server Component testing
- Client Component testing with React Testing Library
- Server Action mocking
- Supabase client mocking
- Coverage configuration

**When to Use:** Unit tests, component tests, improving coverage

---

#### playwright-e2e

End-to-end testing with Playwright.

**Topics Covered:**

- Browser automation and testing
- Page Object Model patterns
- Authentication testing
- Map/Leaflet testing
- API mocking
- Visual regression testing

**When to Use:** E2E tests, integration tests, user flow testing

---

#### code-quality

Code quality with ESLint, Prettier, and Next.js conventions.

**Topics Covered:**

- Next.js ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Import organization
- Pre-commit hooks

**When to Use:** Linting, formatting, enforcing code standards

---

## How to Use Skills

Skills are automatically available when working with Claude Code. Reference them explicitly:

- "Help me create a Server Action for updating user profiles"
- "How do I add marker clustering to my Leaflet map in Next.js?"
- "Write tests for this Server Component"
- "Set up translations for the settings page"

## Slash Commands

Common workflows are available as slash commands in `.claude/commands/`:

- `/fix-issue` - Debug and fix GitHub issues
- `/new-feature` - Implement new features
- `/refactor` - Code refactoring workflow
- `/add-translation` - Add translations
- `/add-component` - Create UI components
- `/db-migration` - Database migrations
- `/debug` - Systematic debugging

## Tech Stack Reference

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Framework  | Next.js 16 (App Router)                   |
| Language   | TypeScript 5 (strict)                     |
| UI Library | shadcn/ui + Radix UI                      |
| Styling    | Tailwind CSS 4                            |
| State      | Server Components + React Query + Zustand |
| i18n       | next-intl (21 languages)                  |
| Backend    | Supabase (Postgres + Auth + Storage)      |
| Maps       | React Leaflet + PostGIS                   |
| Testing    | Vitest + React Testing Library            |
