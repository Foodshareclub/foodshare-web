# FoodShare - Development Workflows

**Project:** FoodShare - Community Food Sharing Platform
**Type:** Development Workflows Guide
**Last Updated:** December 2025
**Version:** 3.0.0
**Status:** Living Document

---

## Table of Contents

1. [Introduction](#introduction)
2. [Development Environment Setup](#development-environment-setup)
3. [Daily Development Workflow](#daily-development-workflow)
4. [Feature Development Workflow](#feature-development-workflow)
5. [Server Actions Workflow](#server-actions-workflow)
6. [Component Development Workflow](#component-development-workflow)
7. [State Management Workflow](#state-management-workflow)
8. [Internationalization Workflow](#internationalization-workflow)
9. [Testing Workflow](#testing-workflow)
10. [Code Review Workflow](#code-review-workflow)
11. [Deployment Workflow](#deployment-workflow)
12. [Troubleshooting Workflows](#troubleshooting-workflows)

---

## Introduction

This document provides step-by-step workflows for common development tasks in the FoodShare project. Each workflow is designed to be clear, actionable, and aligned with Next.js 16 best practices.

**Key Principles:**

- Server Components by default, Client Components when needed
- Server Actions for mutations (not API routes)
- TypeScript strict mode standards
- Maintain code consistency with existing patterns
- Write self-documenting code with clear naming
- Test locally before committing
- Keep pull requests focused and small

---

## Development Environment Setup

### Initial Setup Workflow

**Prerequisites:**

- Node.js 24+ installed (see `.nvmrc`)
- Git installed
- Code editor (VS Code recommended)
- GitHub account with repository access

**Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/your-org/foodshare.git
cd foodshare

# 2. Install correct Node.js version
nvm install
nvm use

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 5. Start development server (Turbopack)
npm run dev

# 6. Open browser to http://localhost:3000
```

**Verification:**

- Dev server starts without errors
- App loads in browser
- Hot Module Replacement (HMR) works
- No TypeScript errors in terminal

**Troubleshooting:**

- If port 3000 is in use: Pass a different port with `npm run dev -- -p 3001`
- If dependencies fail: Try `rm -rf node_modules package-lock.json && npm install`
- If env vars not working: Check `NEXT_PUBLIC_` prefix is used (not `VITE_` or `REACT_APP_`)

---

### VS Code Setup

**Recommended Extensions:**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

**Settings (.vscode/settings.json):**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## Daily Development Workflow

### Morning Startup

```bash
# 1. Pull latest changes
git checkout main
git pull origin main

# 2. Create/switch to feature branch
git checkout -b feature/your-feature-name
# or switch to existing branch:
git checkout feature/your-feature-name

# 3. Ensure dependencies are up to date
npm install

# 4. Start development server (Turbopack for fast HMR)
npm run dev

# 5. Open project in editor
code .
```

### During Development

**Every Hour:**

- Save files (auto-save recommended)
- Check terminal for TypeScript errors
- Test in browser (HMR updates automatically)
- Commit work-in-progress: `git add . && git commit -m "WIP: feature progress"`

**Best Practices:**

- Keep dev server running (fast HMR via Turbopack)
- Check browser console for warnings
- Test responsive views (mobile, tablet, desktop)
- Use React DevTools to inspect components
- Use React Query DevTools for client-side caching

### End of Day

```bash
# 1. Ensure all changes are committed
git status
git add .
git commit -m "feat: descriptive commit message"

# 2. Push to remote
git push origin feature/your-feature-name

# 3. Optional: Open draft PR for visibility
gh pr create --draft --title "WIP: Feature name" --body "Work in progress"
```

---

## Feature Development Workflow

### Step 1: Plan the Feature

**Before Writing Code:**

1. **Understand Requirements**
   - Read product requirements (PRD.md)
   - Review designs (if available)
   - Identify affected components
   - List technical dependencies

2. **Design Data Flow**
   - What data is needed?
   - Is it a Server Component (fetch data) or Client Component (interactivity)?
   - Are mutations needed? → Server Actions
   - Need real-time updates? → React Query with polling

3. **Identify Components**
   - New components needed?
   - Existing components to modify?
   - Shared components to extract?

**Example Plan:**

```markdown
Feature: Add food item to favorites

Data Flow:

- Server Component fetches existing favorites
- User clicks "favorite" button (Client Component)
- Server Action: addToFavorites(itemId)
- revalidatePath() refreshes the page
- Show success toast

Files to Create:

- src/app/actions/favorites.ts (Server Actions)
- src/components/favoriteButton/FavoriteButton.tsx
- Update ProductCard to include button
```

---

### Step 2: Create Feature Branch

```bash
# Branch naming convention:
# feature/description - new features
# fix/description - bug fixes
# refactor/description - code improvements
# docs/description - documentation

git checkout main
git pull origin main
git checkout -b feature/add-favorites-system
```

---

### Step 3: Implement the Feature

**A. Create Server Actions (for mutations)**

```bash
# Create server action file
touch src/app/actions/favorites.ts
```

```typescript
// src/app/actions/favorites.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addToFavorites(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Must be logged in" };
  }

  const { error } = await supabase.from("favorites").insert({ item_id: itemId, user_id: user.id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/food");
  return { success: true };
}

export async function removeFromFavorites(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Must be logged in" };
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("item_id", itemId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/food");
  return { success: true };
}
```

**B. Create Server Component Page**

```typescript
// src/app/food/page.tsx
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/productCard/ProductCard';

export default async function FoodPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true);

  const { data: { user } } = await supabase.auth.getUser();

  let favorites: string[] = [];
  if (user) {
    const { data } = await supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', user.id);
    favorites = data?.map(f => f.item_id) || [];
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products?.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={favorites.includes(product.id)}
        />
      ))}
    </div>
  );
}
```

**C. Create Client Component (for interactivity)**

```bash
mkdir -p src/components/favoriteButton
touch src/components/favoriteButton/FavoriteButton.tsx
```

```typescript
// src/components/favoriteButton/FavoriteButton.tsx
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { addToFavorites, removeFromFavorites } from '@/app/actions/favorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  itemId: string;
  isFavorite: boolean;
}

export function FavoriteButton({ itemId, isFavorite }: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      if (isFavorite) {
        await removeFromFavorites(itemId);
      } else {
        await addToFavorites(itemId);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isPending}
    >
      <Heart
        className={cn(
          'h-4 w-4',
          isFavorite && 'fill-red-500 text-red-500'
        )}
      />
    </Button>
  );
}
```

**D. Update Existing Component**

```typescript
// src/components/productCard/ProductCard.tsx
import { FavoriteButton } from '@/components/favoriteButton/FavoriteButton';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
}

export function ProductCard({ product, isFavorite }: ProductCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{product.name}</CardTitle>
        <FavoriteButton itemId={product.id} isFavorite={isFavorite} />
      </CardHeader>
      {/* Rest of component */}
    </Card>
  );
}
```

---

### Step 4: Test the Feature

**Manual Testing:**

```bash
# Ensure dev server is running
npm run dev

# Test scenarios:
# 1. Click favorite button - should add to favorites
# 2. Page should refresh automatically (revalidatePath)
# 3. Refresh page - favorites should persist
# 4. Test error cases - logged out user, etc.
```

**Check in Browser:**

- Button renders correctly
- Click adds to favorites
- Page updates after action completes
- No console errors
- Responsive on mobile

---

### Step 5: Add Translations (if UI changes)

Edit translation files directly:

```json
// messages/en.json
{
  "favorites": {
    "add": "Add to favorites",
    "remove": "Remove from favorites",
    "added": "Added to favorites",
    "removed": "Removed from favorites"
  }
}
```

```json
// messages/cs.json
{
  "favorites": {
    "add": "Přidat do oblíbených",
    "remove": "Odebrat z oblíbených",
    "added": "Přidáno do oblíbených",
    "removed": "Odebráno z oblíbených"
  }
}
```

---

### Step 6: Commit Changes

```bash
# Check what changed
git status

# Add files
git add src/app/actions/favorites.ts
git add src/components/favoriteButton/
git add messages/

# Commit with conventional commit message
git commit -m "feat: add favorites system

- Add Server Actions for favorites CRUD
- Create FavoriteButton client component
- Update ProductCard to include favorite button
- Add translations for all languages"

# Push to remote
git push origin feature/add-favorites-system
```

---

### Step 7: Create Pull Request

```bash
# Using GitHub CLI
gh pr create \
  --title "feat: Add favorites system" \
  --body "## Description
Implements user favorites functionality allowing users to save food items.

## Changes
- Server Actions for favorites (addToFavorites, removeFromFavorites)
- FavoriteButton client component with useTransition
- ProductCard updated to display favorite state
- i18n support for all languages

## Testing
- [x] Manual testing on desktop
- [x] Manual testing on mobile
- [x] Server Action works correctly
- [x] revalidatePath refreshes data
- [x] Translations complete

Closes #123"
```

---

## Server Actions Workflow

### When to Use Server Actions

**Use Server Actions for:**

- Creating new records
- Updating existing records
- Deleting records
- Form submissions
- Any mutation that changes data

**Do NOT use Server Actions for:**

- Reading data (use Server Components instead)
- Client-side only operations

### Creating a Server Action

**Step 1: Create Action File**

```bash
touch src/app/actions/[entity].ts
```

**Step 2: Write the Action**

```typescript
// src/app/actions/products.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  // Validate
  if (!title) {
    return { error: "Title is required" };
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Must be logged in" };
  }

  // Insert
  const { data, error } = await supabase
    .from("products")
    .insert({
      title,
      description,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/food");
  return { success: true, data };
}
```

### Using Server Actions in Forms

```typescript
// src/components/CreateProductForm.tsx
'use client';

import { useFormStatus } from 'react-dom';
import { createProduct } from '@/app/actions/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Product'}
    </Button>
  );
}

export function CreateProductForm() {
  return (
    <form action={createProduct} className="space-y-4">
      <Input name="title" placeholder="Product title" required />
      <Input name="description" placeholder="Description" />
      <SubmitButton />
    </form>
  );
}
```

### Using Server Actions with useTransition

```typescript
// For programmatic calls (not forms)
'use client';

import { useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';
import { Button } from '@/components/ui/button';

export function DeleteButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result.error) {
        // Handle error (show toast, etc.)
      }
    });
  };

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
```

---

## Component Development Workflow

### Server vs Client Component Decision

```
Does the component need...
├─ Data from database? → Server Component (fetch directly)
├─ onClick, onChange, onSubmit? → Client Component
├─ useState, useEffect, useRef? → Client Component
├─ useTransition (for Server Actions)? → Client Component
├─ Browser APIs (localStorage)? → Client Component
└─ Just display props? → Server Component
```

### Creating a Server Component

```typescript
// src/app/food/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function ProductPage({ params }: Props) {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*, profiles(*)')
    .eq('id', params.id)
    .single();

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      {/* Pass data to client components as props */}
      <ContactButton sellerId={product.user_id} />
    </div>
  );
}
```

### Creating a Client Component

```typescript
// src/components/contactButton/ContactButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface ContactButtonProps {
  sellerId: string;
}

export function ContactButton({ sellerId }: ContactButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Contact Seller</Button>
      </DialogTrigger>
      <DialogContent>
        {/* Contact form */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## State Management Workflow

### State Management Decision Tree

```
Need to read data from database?
├─ YES → Server Component (fetch directly)
│        └─ Need to mutate? → Server Action
│
└─ NO → Is it client-side state?
         ├─ UI state (modals, toggles)? → Zustand or useState
         ├─ Real-time/polling data? → React Query
         └─ Form state? → useState or React Hook Form
```

### Adding a Zustand Store (for UI state)

```typescript
// src/store/zustand/useUIStore.ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  modalOpen: boolean;
  toggleSidebar: () => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  modalOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));
```

### Adding React Query (for real-time/polling)

Only use when you need client-side caching or polling:

```typescript
// src/hooks/queries/useChatQueries.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeMessages(chatId: string) {
  return useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      return data;
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });
}
```

---

## Internationalization Workflow

### Adding New Translations (next-intl)

**Step 1: Add to English messages**

```json
// messages/en.json
{
  "products": {
    "title": "Food Listings",
    "empty": "No products found",
    "create": "Create Listing"
  }
}
```

**Step 2: Add to other languages**

```json
// messages/cs.json
{
  "products": {
    "title": "Nabídky jídla",
    "empty": "Žádné produkty nenalezeny",
    "create": "Vytvořit nabídku"
  }
}
```

**Step 3: Use in Server Components**

```typescript
import { getTranslations } from 'next-intl/server';

export default async function ProductsPage() {
  const t = await getTranslations('products');

  return (
    <div>
      <h1>{t('title')}</h1>
      {/* ... */}
    </div>
  );
}
```

**Step 4: Use in Client Components**

```typescript
'use client';
import { useTranslations } from 'next-intl';

export function ProductList() {
  const t = useTranslations('products');

  return <p>{t('empty')}</p>;
}
```

### Supported Languages (17)

- **European**: en, cs, de, es, fr, pt, ru, uk, it, pl, nl
- **Asian**: zh, hi, ja, ko
- **Other**: ar (RTL), tr

---

## Testing Workflow

### Manual Testing Checklist

**Before Every Commit:**

- [ ] Feature works as expected
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] All interactions work (clicks, forms, navigation)
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Translations work

**Testing Commands:**

```bash
# Check TypeScript
npm run type-check

# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Build production bundle
npm run build

# Start production server
npm run start
```

---

## Code Review Workflow

### Creating a Pull Request

**Step 1: Self-Review**

Before opening PR:

- Read your own code changes
- Check for console.logs or debug code
- Ensure comments are helpful
- Verify naming is clear
- Test edge cases

**Step 2: Write PR Description**

```markdown
## Description

Brief summary of changes

## Changes Made

- Specific change 1
- Specific change 2
- Specific change 3

## Testing Done

- [x] Manual testing on desktop
- [x] Manual testing on mobile
- [x] TypeScript check passes
- [x] Build succeeds

## Screenshots

[Add relevant screenshots]

## Related Issues

Closes #123
```

---

## Deployment Workflow

### Deploying to Vercel

**Automatic Deployment:**

Vercel automatically deploys:

- `main` branch → Production
- Pull requests → Preview deployments

**Manual Deployment:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Pre-Deployment Checklist

- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables set in Vercel
- [ ] Database migrations applied (if any)
- [ ] No sensitive data in code
- [ ] Performance tested
- [ ] Mobile tested

---

## Troubleshooting Workflows

### TypeScript Errors

**Problem:** TypeScript compilation errors

**Solution Steps:**

```bash
# 1. Check exact error
npm run type-check

# 2. Common fixes:

# Missing types
npm install --save-dev @types/package-name

# Outdated types
npm update @types/*

# Clear cache
rm -rf node_modules/.cache .next

# Restart TypeScript server (VS Code)
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### Build Failures

**Problem:** `npm run build` fails

**Solution Steps:**

```bash
# 1. Clear everything
npm run clean
npm install

# 2. Check environment variables
cat .env.local
# Ensure NEXT_PUBLIC_ prefix for client-side vars

# 3. Run build with verbose output
npm run build

# 4. Check for issues in console output
```

---

### Server Action Not Working

**Problem:** Server Action doesn't execute

**Solution Steps:**

1. Ensure `'use server'` directive is at top of file
2. Ensure function is `async`
3. Check for errors in server terminal (not browser console)
4. Verify `revalidatePath()` is called after mutations

```typescript
// Correct Server Action
"use server";

import { revalidatePath } from "next/cache";

export async function myAction(formData: FormData) {
  // ... do something
  revalidatePath("/path");
  return { success: true };
}
```

---

### Hydration Mismatch

**Problem:** `Text content does not match server-rendered HTML`

**Solution Steps:**

1. Check for client-only code in Server Components
2. Wrap client-only code with `'use client'` directive
3. Use `suppressHydrationWarning` for unavoidable mismatches (dates, random values)
4. Ensure consistent rendering between server and client

```typescript
// Fix: Add 'use client' directive
'use client';

import { useState, useEffect } from 'react';

export function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <div>{/* Client-only content */}</div>;
}
```

---

### Map Not Rendering

**Problem:** Leaflet map doesn't show

**Solution Steps:**

```typescript
// 1. Use dynamic import with ssr: false
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/leaflet/LeafletMap'), {
  ssr: false,
  loading: () => <div>Loading map...</div>,
});

// 2. Ensure map container has height
<div className="h-[400px]">
  <Map />
</div>

// 3. Import Leaflet CSS in your component
import 'leaflet/dist/leaflet.css';
```

---

## Quick Reference

### Git Commands

```bash
# Branch management
git checkout -b feature/name
git checkout main
git branch -d feature/name

# Committing
git add .
git commit -m "type: message"
git push origin branch-name

# Syncing
git pull origin main
git fetch --all

# Stashing
git stash
git stash pop
```

---

### NPM Scripts

```bash
npm run dev          # Start dev server (Turbopack, port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run test:build   # Type check + lint + build
npm run clean        # Clean build artifacts
```

---

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Access in code:
# Client-side (NEXT_PUBLIC_ prefix required)
process.env.NEXT_PUBLIC_SUPABASE_URL

# Server-side only
process.env.SUPABASE_SERVICE_ROLE_KEY
```

---

### Conventional Commits

```
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code formatting (no logic change)
refactor: Code restructuring
perf: Performance improvement
test: Adding tests
chore: Build process or auxiliary tool changes
```

---

**Last Updated:** December 2025
**Document Owner:** FoodShare Development Team
**Status:** Living Document

---

## Quick Navigation

- [Product Requirements](PRD.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Feature Documentation](FEATURES.md)
- [API Reference](API_REFERENCE.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Style Guide](STYLE_GUIDE.md)
- [Back to Index](INDEX.md)
