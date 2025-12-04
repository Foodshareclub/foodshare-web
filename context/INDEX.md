# FoodShare Documentation Index

**Project:** FoodShare - Community Food Sharing Platform
**Type:** Documentation Hub
**Last Updated:** December 2025
**Version:** 3.1.0

---

## Welcome to FoodShare

FoodShare is a modern community food sharing platform built with **Next.js 16 + React 19**, designed to reduce food waste and strengthen local communities through technology.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, shadcn/ui, Tailwind CSS 4, Server Components + Server Actions, React Query, Zustand, Supabase

---

## Quick Start

### New to the Project?

Start here to get up and running:

1. **[Folder Structure](FOLDER_STRUCTURE.md)** - Understand the codebase organization
2. **[Tech Stack](TECH_STACK.md)** - Learn about technologies used
3. **[Development Guide](DEVELOPMENT_GUIDE.md)** - Set up your development environment
4. **[Architecture](ARCHITECTURE.md)** - Understand system design

### Common Tasks

- **Add a new feature** → [Development Guide - Adding Features](DEVELOPMENT_GUIDE.md#adding-features)
- **Create a Server Action** → [Workflows - Server Actions](WORKFLOWS.md#server-actions-workflow)
- **Work with the database** → [API Reference](API_REFERENCE.md)
- **Understand the database** → [Database Schema](DATABASE_SCHEMA.md)
- **Learn about features** → [Features](FEATURES.md)
- **Write documentation** → [Style Guide](STYLE_GUIDE.md)

---

## Documentation Structure

### Core Documentation

Essential reading for all developers:

| Document                                         | Purpose                       | When to Read                              |
| ------------------------------------------------ | ----------------------------- | ----------------------------------------- |
| **[FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)**   | Complete project organization | First day, when finding files             |
| **[ARCHITECTURE.md](ARCHITECTURE.md)**           | System design and data flow   | Planning features, understanding patterns |
| **[TECH_STACK.md](TECH_STACK.md)**               | Technology details            | Learning stack, making tech decisions     |
| **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** | Development workflows         | Daily development, setup                  |

### Reference Documentation

Detailed specifications and references:

| Document                                     | Purpose                 | When to Read                                 |
| -------------------------------------------- | ----------------------- | -------------------------------------------- |
| **[API_REFERENCE.md](API_REFERENCE.md)**     | API layer documentation | Working with Supabase, adding endpoints      |
| **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** | Database structure      | Working with data, understanding models      |
| **[FEATURES.md](FEATURES.md)**               | Feature documentation   | Understanding capabilities, planning         |
| **[PRD.md](PRD.md)**                         | Product requirements    | Understanding product vision, goals, roadmap |

### Process Documentation

Development processes and decision records:

| Document                         | Purpose                | When to Read                        |
| -------------------------------- | ---------------------- | ----------------------------------- |
| **[WORKFLOWS.md](WORKFLOWS.md)** | Development workflows  | Daily development, common tasks     |
| **[ADR.md](ADR.md)**             | Architecture decisions | Understanding why choices were made |

### Meta Documentation

Documentation about documentation:

| Document                             | Purpose                 | When to Read                      |
| ------------------------------------ | ----------------------- | --------------------------------- |
| **[STYLE_GUIDE.md](STYLE_GUIDE.md)** | Documentation standards | Writing or updating documentation |

---

## Documentation by Role

### For New Developers

**Goal:** Get productive quickly

**Reading Path:**

1. [Folder Structure](FOLDER_STRUCTURE.md) - Know where everything is (20 min)
2. [Architecture](ARCHITECTURE.md) - Understand the design (30 min)
3. [Development Guide](DEVELOPMENT_GUIDE.md) - Set up environment (15 min)
4. [Tech Stack](TECH_STACK.md) - Learn the tools (20 min)

**Total time:** ~1.5 hours to full productivity

### For Feature Developers

**Goal:** Build features efficiently

**Reading Path:**

1. [Features](FEATURES.md) - Understand existing features
2. [Workflows](WORKFLOWS.md) - Learn development processes
3. [API Reference](API_REFERENCE.md) - Work with Supabase
4. [Database Schema](DATABASE_SCHEMA.md) - Understand data models
5. [Architecture](ARCHITECTURE.md) - Follow patterns

**Common references:**

- Development workflows → [Workflows](WORKFLOWS.md)
- Server Actions → [Workflows - Server Actions](WORKFLOWS.md#server-actions-workflow)
- Data fetching → [Tech Stack - Server Components](TECH_STACK.md#server-components-default)
- Component structure → [Folder Structure - Components](FOLDER_STRUCTURE.md#components)

### For Maintainers

**Goal:** Keep project healthy

**Reading Path:**

1. [Architecture](ARCHITECTURE.md) - System design principles
2. [ADR](ADR.md) - Architecture decision records
3. [PRD](PRD.md) - Product vision and roadmap
4. [Style Guide](STYLE_GUIDE.md) - Maintain documentation
5. [Development Guide](DEVELOPMENT_GUIDE.md) - Best practices

**Maintenance tasks:**

- Update documentation → [Style Guide](STYLE_GUIDE.md)
- Review architecture decisions → [ADR](ADR.md)
- Track product roadmap → [PRD](PRD.md)
- Improve workflows → [Workflows](WORKFLOWS.md)
- Onboard new developers → This index

---

## Key Concepts

### Next.js 16 App Router (NOT Vite SPA)

**Important:** FoodShare is a **Next.js 16 application with App Router**, not a Vite SPA:

| Aspect           | FoodShare (Next.js 16)     | Vite SPA             |
| ---------------- | -------------------------- | -------------------- |
| **Routing**      | File-based (App Router)    | React Router         |
| **Entry**        | `src/app/layout.tsx`       | `index.html`         |
| **Dev Server**   | Next.js + Turbopack (3000) | Vite (5173)          |
| **Build Output** | `.next/`                   | `dist/`              |
| **SSR**          | Built-in SSR/RSC           | None (pure SPA)      |
| **Env Vars**     | `NEXT_PUBLIC_` prefix      | `VITE_` prefix       |
| **Config**       | `next.config.ts`           | `vite.config.ts`     |
| **Components**   | Server + Client Components | All Client           |

See [Tech Stack](TECH_STACK.md) for full details.

### Server-First Architecture

FoodShare follows a server-first architecture leveraging Next.js 16 capabilities:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │  ← Server + Client Components (shadcn/ui)
│  (Components, Hooks, Tailwind CSS)      │
├─────────────────────────────────────────┤
│         Server Actions Layer            │  ← Mutations via 'use server'
│  (src/app/actions/*.ts)                 │
├─────────────────────────────────────────┤
│        Server Data Layer                │  ← Server Components + Supabase
│  (Direct DB access, no client fetch)    │
├─────────────────────────────────────────┤
│         Client State Layer              │  ← React Query, Zustand (minimal)
│  (Polling, real-time, UI state only)    │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │  ← External services
│  (Supabase, Vercel, Email providers)    │
└─────────────────────────────────────────┘
```

See [Architecture](ARCHITECTURE.md) for details.

### State Management (Server-First)

Next.js 16 server-first approach:

```
Need data from database?
├─ Yes → Server Component (fetch directly)
│        └─ Need to mutate? → Server Action
│
└─ No → Client state needed?
         ├─ Real-time/polling data? → React Query
         ├─ UI state (modals, toggles)? → Zustand
         └─ Form state? → React Hook Form or useState
```

**Key Principle**: Server Components and Server Actions handle 90% of data needs. Only use client state libraries for genuine client-side requirements.

See [Tech Stack - Server-First Data Flow](TECH_STACK.md#server-first-data-flow-nextjs-16-patterns) for patterns.

### Internationalization

next-intl i18n system with **17 languages**:

- **European**: English, Czech, German, Spanish, French, Portuguese, Russian, Ukrainian, Italian, Polish, Dutch
- **Asian**: Chinese, Hindi, Japanese, Korean
- **Other**: Arabic (RTL), Turkish

See [Tech Stack - Internationalization](TECH_STACK.md#internationalization-i18n) for workflow.

---

## Finding What You Need

### By Task

Looking for how to do something?

- **Add a component** → [Workflows - Component Development](WORKFLOWS.md#component-development-workflow)
- **Add a page** → Create in `src/app/[route]/page.tsx`
- **Add a Server Action** → [Workflows - Server Actions](WORKFLOWS.md#server-actions-workflow)
- **Mutate data** → Create Server Action in `src/app/actions/`
- **Add client state** → Zustand store in `src/store/zustand/`
- **Add a translation** → [Workflows - Internationalization](WORKFLOWS.md#internationalization-workflow)
- **Run tests** → [Workflows - Testing](WORKFLOWS.md#testing-workflow)
- **Deploy** → [Workflows - Deployment](WORKFLOWS.md#deployment-workflow)

### By Technology

Looking for technology-specific information?

- **Next.js 16** → [Tech Stack - Next.js](TECH_STACK.md#nextjs-16)
- **React 19** → [Tech Stack - React](TECH_STACK.md#react-1920)
- **TypeScript** → [Tech Stack - TypeScript](TECH_STACK.md#typescript-5)
- **Server Components** → [Tech Stack - Server Components](TECH_STACK.md#server-components-default)
- **Server Actions** → [Tech Stack - Server Actions](TECH_STACK.md#server-actions)
- **shadcn/ui** → [Tech Stack - shadcn/ui](TECH_STACK.md#shadcnui--radix-ui)
- **Tailwind CSS** → [Tech Stack - Tailwind](TECH_STACK.md#tailwind-css-4)
- **React Query** → [Tech Stack - React Query](TECH_STACK.md#tanstack-react-query-590)
- **Zustand** → [Tech Stack - Zustand](TECH_STACK.md#zustand-509)
- **Supabase** → [Architecture - Infrastructure](ARCHITECTURE.md#infrastructure-layer)
- **Leaflet Maps** → [Features - Interactive Map](FEATURES.md#interactive-map)
- **next-intl** → [Tech Stack - Internationalization](TECH_STACK.md#internationalization-i18n)

### By Feature

Looking for feature-specific information?

- **Food listings** → [Features - Food Listing Management](FEATURES.md#food-listing-management)
- **Map** → [Features - Interactive Map](FEATURES.md#interactive-map)
- **Chat** → [Features - Real-Time Chat](FEATURES.md#real-time-chat)
- **Profiles** → [Features - User Profiles](FEATURES.md#user-profiles)
- **Authentication** → [Features - Authentication & Security](FEATURES.md#authentication--security)
- **i18n** → [Features - Internationalization](FEATURES.md#internationalization)
- **Reviews** → [Features - Reviews & Ratings](FEATURES.md#reviews--ratings)
- **Admin** → [Features - Admin Dashboard](FEATURES.md#admin-dashboard)
- **CRM** → [Features - CRM System](FEATURES.md#crm-system)
- **Email** → [Features - Email System](FEATURES.md#email-system)

---

## Documentation Standards

All documentation follows the [Style Guide](STYLE_GUIDE.md):

- **Consistent structure** - Standard headers and footers
- **Clear writing** - Active voice, present tense
- **Code examples** - Tested and working
- **Cross-references** - Liberal linking between docs
- **Metadata** - Version and last updated date
- **Navigation** - Quick links at bottom

---

## Contributing to Documentation

Contributions to documentation are welcome!

**Before editing:**

1. Read the [Style Guide](STYLE_GUIDE.md)
2. Check existing docs for patterns
3. Update "Last Updated" metadata

**When adding new docs:**

1. Follow [Style Guide](STYLE_GUIDE.md) structure
2. Add to this INDEX.md
3. Cross-reference from related docs
4. Update navigation footer

**When updating existing docs:**

1. Maintain consistent formatting
2. Test all code examples
3. Update version if major changes
4. Check all cross-references still work

---

## Document History

### Version 3.1.0 (December 2025)

**Server-First Architecture Update:**

- Removed Redux Toolkit in favor of Server Components + Server Actions
- Updated state management to server-first approach (90% server, 10% client)
- Replaced Lingui i18n with next-intl
- Updated architecture diagram to reflect server-first patterns
- Updated all technology references and links

### Version 3.0.0 (December 2025)

**Major Stack Migration:**

- Migrated documentation from Vite + Chakra UI to **Next.js 16 + shadcn/ui**
- Updated all tech stack references to match actual codebase
- Updated i18n from 4 languages to 17 languages
- Updated folder structure for Next.js App Router

### Version 2.1.0 (November 2025)

- Added PRD.md (Product Requirements Document)
- Added WORKFLOWS.md (Development Workflows)
- Added ADR.md (Architecture Decision Records)

### Version 2.0.0 (November 2025)

- Initial documentation structure created

---

**Last Updated:** December 2025
**Maintained By:** FoodShare Development Team
**Status:** Living document - updated continuously

---

## All Documentation Files

Quick access to every documentation file:

**Core Documentation:**

- **[INDEX.md](INDEX.md)** - This file (documentation hub)
- **[FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)** - Project organization
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture
- **[TECH_STACK.md](TECH_STACK.md)** - Technology details
- **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - Development setup

**Reference Documentation:**

- **[API_REFERENCE.md](API_REFERENCE.md)** - API documentation
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Database structure
- **[FEATURES.md](FEATURES.md)** - Feature documentation
- **[PRD.md](PRD.md)** - Product requirements document

**Process Documentation:**

- **[WORKFLOWS.md](WORKFLOWS.md)** - Development workflows
- **[ADR.md](ADR.md)** - Architecture decision records

**Meta Documentation:**

- **[STYLE_GUIDE.md](STYLE_GUIDE.md)** - Documentation standards
