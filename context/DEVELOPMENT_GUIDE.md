# FoodShare Development Guide

**Last Updated:** December 2025

## Getting Started

### Prerequisites

- **Node.js**: 24.11.1 (see `.nvmrc`)
- **npm**: 10.0.0 or higher
- **Git**: For version control
- **Supabase Account**: For backend services

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd foodshare-nextjs
```

### 2. Install Node.js Version

```bash
# Using nvm (recommended)
nvm install
nvm use

# Or manually install Node.js 24.11.1
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: OpenAI
OPENAI_API_KEY=your-openai-key

# Optional: Email (Brevo)
BREVO_API_KEY=your-brevo-key
```

**Where to find Supabase credentials:**

1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Settings → API
4. Copy "Project URL" and "anon/public" key

### 5. Start Development Server

```bash
npm run dev
```

Application opens at `http://localhost:3000`

---

## Development Workflow

### Daily Development

1. **Pull latest changes**

   ```bash
   git pull origin main
   ```

2. **Start dev server** (uses Turbopack for fast HMR)

   ```bash
   npm run dev
   ```

3. **Make changes** to code

4. **Test changes** in browser (hot reload enabled)

5. **Run type check and lint**

   ```bash
   npm run type-check
   npm run lint
   ```

6. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin your-branch
   ```

---

## Project Scripts

### Core Scripts

```bash
# Development
npm run dev              # Start dev server (Turbopack, port 3000)

# Build
npm run build            # Production build
npm run build:analyze    # Build with bundle analyzer
npm run start            # Start production server

# Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # TypeScript type checking
npm run test:build       # Type check + lint + build

# Cleanup
npm run clean            # Clean build artifacts
```

---

## Code Organization

### Adding a New Page (Server Component)

Create a new page in the App Router:

```bash
# Create page file
mkdir -p src/app/my-feature
touch src/app/my-feature/page.tsx
```

```typescript
// src/app/my-feature/page.tsx
// Server Component by default - fetches data at the server
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

export default async function MyFeaturePage() {
  const supabase = await createClient();
  const t = await getTranslations('myFeature');

  const { data: items } = await supabase.from('items').select('*');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <ul>
        {items?.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Adding a Server Action

Create server actions for mutations:

```bash
# Create action file
touch src/app/actions/myFeature.ts
```

```typescript
// src/app/actions/myFeature.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createItem(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  const { error } = await supabase.from('items').insert({ name, description });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/my-feature');
  return { success: true };
}

export async function deleteItem(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('items').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/my-feature');
  return { success: true };
}
```

### Using Server Actions in Forms

```typescript
// src/app/my-feature/CreateItemForm.tsx
'use client';

import { useFormStatus } from 'react-dom';
import { createItem } from '@/app/actions/myFeature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Item'}
    </Button>
  );
}

export function CreateItemForm() {
  return (
    <form action={createItem} className="space-y-4">
      <Input name="name" placeholder="Item name" required />
      <Input name="description" placeholder="Description" />
      <SubmitButton />
    </form>
  );
}
```

### Using Server Actions with useTransition

```typescript
// src/components/DeleteButton.tsx
'use client';

import { useTransition } from 'react';
import { deleteItem } from '@/app/actions/myFeature';
import { Button } from '@/components/ui/button';

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteItem(id);
    });
  };

  return (
    <Button onClick={handleDelete} disabled={isPending} variant="destructive">
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
```

### Adding a Client Component

Only use `'use client'` when you need interactivity:

```bash
# Create component file
mkdir -p src/components/myFeature
touch src/components/myFeature/MyFeature.tsx
```

```typescript
// src/components/myFeature/MyFeature.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export function MyFeature() {
  const t = useTranslations('myFeature');
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 border rounded-lg">
      <p className="mb-4">{t('count', { count })}</p>
      <Button onClick={() => setCount(count + 1)}>{t('increment')}</Button>
    </div>
  );
}
```

### Adding shadcn/ui Components

```bash
# Add new shadcn/ui component
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add input
```

### Adding Zustand Store (for lightweight UI state)

```typescript
// src/store/zustand/useMyFeatureStore.ts
import { create } from 'zustand';

interface MyFeatureStore {
  isOpen: boolean;
  selectedId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useMyFeatureStore = create<MyFeatureStore>((set) => ({
  isOpen: false,
  selectedId: null,
  open: (id) => set({ isOpen: true, selectedId: id }),
  close: () => set({ isOpen: false, selectedId: null }),
}));
```

### Adding React Query (for client-side caching/real-time)

Only use React Query when you need client-side caching, polling, or optimistic updates:

```typescript
// src/hooks/queries/useRealtimeMessages.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeMessages(chatId: string) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      return data;
    },
    refetchInterval: 3000, // Poll every 3 seconds for real-time feel
  });
}
```

---

## Server Components vs Client Components

### Decision Tree

```
Does the component need...
├─ Data from database? → Server Component (fetch directly)
├─ Event handlers (onClick, etc.)? → Client Component
├─ useState, useEffect, useRef? → Client Component
├─ Browser APIs (localStorage, etc.)? → Client Component
├─ Real-time updates/polling? → Client Component + React Query
└─ Just display data passed as props? → Server Component
```

### Server Components (Default)

```tsx
// src/app/products/page.tsx
// No 'use client' directive = Server Component
import { createClient } from '@/lib/supabase/server';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('*');

  return (
    <div>
      {products?.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Client Components

```tsx
// src/components/productCard/ProductCard.tsx
'use client'; // Required for client-side interactivity

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => router.push(`/food/${product.id}`)}
    >
      {/* Interactive content */}
    </div>
  );
}
```

---

## Internationalization (i18n) with next-intl

### Adding Translations

#### 1. Add Strings to Message Files

Edit `/messages/{locale}.json`:

```json
// messages/en.json
{
  "myFeature": {
    "title": "My Feature",
    "count": "Count: {count}",
    "increment": "Increment"
  }
}
```

```json
// messages/cs.json
{
  "myFeature": {
    "title": "Moje funkce",
    "count": "Pocet: {count}",
    "increment": "Zvysit"
  }
}
```

#### 2. Use in Server Components

```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('myFeature');
  return <h1>{t('title')}</h1>;
}
```

#### 3. Use in Client Components

```tsx
'use client';
import { useTranslations } from 'next-intl';

function ClientComponent() {
  const t = useTranslations('myFeature');
  return <p>{t('count', { count: 5 })}</p>;
}
```

### Supported Languages (17)

- **European**: en, cs, de, es, fr, pt, ru, uk, it, pl, nl
- **Asian**: zh, hi, ja, ko
- **Other**: ar (RTL), tr

---

## Working with Supabase

### Server-Side Data Fetching

```typescript
// In Server Components or Server Actions
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    throw new Error(error.message);
  }

  return <ProductList products={data} />;
}
```

### Client-Side Data Fetching

```typescript
// In Client Components (use sparingly)
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

function ClientComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('products').select('*').then(({ data }) => setData(data));
  }, []);

  return <div>{/* render data */}</div>;
}
```

### Server Action Mutations

```typescript
// src/app/actions/products.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from('products').insert({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    user_id: (await supabase.auth.getUser()).data.user?.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/products');
  return { success: true };
}
```

### Storage (Images)

```typescript
// src/app/actions/upload.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function uploadImage(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get('file') as File;

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `images/${fileName}`;

  const { error } = await supabase.storage
    .from('public-images')
    .upload(filePath, file);

  if (error) {
    return { error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('public-images').getPublicUrl(filePath);

  return { url: publicUrl };
}
```

---

## Styling Guidelines

### Tailwind CSS + shadcn/ui

```tsx
// Use Tailwind utilities
<div className="bg-gray-100 p-4 rounded-lg">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
  <Button variant="default" size="lg">
    Click Me
  </Button>
</div>
```

### Using cn() for Conditional Classes

```tsx
import { cn } from '@/lib/utils';

<div
  className={cn(
    'p-4 rounded-lg',
    isActive && 'bg-blue-500 text-white',
    isDisabled && 'opacity-50 cursor-not-allowed'
  )}
>
  Content
</div>;
```

### Responsive Design

```tsx
// Use Tailwind responsive prefixes
<div className="w-full md:w-1/2 lg:w-1/3">
  <p className="text-sm md:text-base lg:text-lg">Responsive Content</p>
</div>
```

### Dark Mode

```tsx
// Dark mode classes are automatic with next-themes
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content adapts to theme
</div>
```

---

## Git Workflow

### Branch Naming

- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation changes

### Commit Messages

Follow conventional commits:

```bash
feat: add user profile page
fix: resolve chat message duplication
refactor: simplify product card component
docs: update API documentation
style: format code with prettier
test: add tests for chat functionality
```

### Pull Request Process

1. Create feature branch

   ```bash
   git checkout -b feat/my-feature
   ```

2. Make changes and commit

   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

3. Push to remote

   ```bash
   git push origin feat/my-feature
   ```

4. Create Pull Request on GitHub

5. Request review

6. Merge when approved

---

## Debugging

### Browser DevTools

1. **React DevTools**: Inspect component tree
2. **React Query DevTools**: Monitor queries and cache (if using React Query)
3. **Network Tab**: Check API requests and Server Action calls
4. **Console**: View logs and errors

### Server-Side Debugging

```typescript
// Use console.log in Server Components and Server Actions
// Output appears in terminal, not browser

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('products').select('*');

  console.log('Server-side data:', data); // Logs to terminal
  console.error('Server-side error:', error);

  return <div>...</div>;
}
```

### Common Issues

#### Supabase Connection Error

```
Error: Invalid API key
```

**Fix**: Check `.env.local` file has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Import Path Error

```
Cannot find module '@/components/...'
```

**Fix**: Check `tsconfig.json` has path alias configured:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### Hydration Mismatch

```
Error: Text content does not match server-rendered HTML
```

**Fix**: Ensure client-only code is wrapped in `useEffect` or component is marked `'use client'`

#### Server Action Not Working

```
Error: Server Actions must be async functions
```

**Fix**: Ensure the function has `'use server'` directive and is async

---

## Performance Optimization

### Server Components (Primary Optimization)

Server Components are the primary performance optimization in Next.js 16:

- Zero client JavaScript for data-fetching components
- No hydration overhead
- Automatic code splitting

### Streaming with Suspense

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>My Page</h1>
      <Suspense fallback={<div>Loading products...</div>}>
        <ProductList />
      </Suspense>
    </div>
  );
}

async function ProductList() {
  const products = await fetchProducts(); // Streams when ready
  return <ul>{/* render products */}</ul>;
}
```

### React Compiler

The project uses React Compiler (enabled in `next.config.ts`) which automatically:

- Memoizes components
- Optimizes re-renders
- Handles useCallback/useMemo automatically

### Code Splitting

Next.js automatically code-splits by route. For additional splitting:

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
});
```

### Image Optimization

```tsx
import Image from 'next/image';

<Image
  src="/images/product.jpg"
  alt="Product"
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL="/images/placeholder.jpg"
/>;
```

### Bundle Analysis

```bash
npm run build:analyze
```

Opens bundle analyzer to identify large dependencies.

---

## Deployment

### Build for Production

```bash
npm run build
```

Outputs to `.next/` folder.

### Deploy to Vercel

1. **Connect GitHub repository to Vercel**

2. **Configure Environment Variables** in Vercel Dashboard

3. **Deploy automatically on push** to main branch

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## Troubleshooting

### Clear Cache

```bash
# Clean Next.js build artifacts
npm run clean

# Or manually
rm -rf .next node_modules/.cache

# Full reset
rm -rf node_modules package-lock.json
npm install
```

### Reset Everything

```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Resources

- **Next.js**: [nextjs.org](https://nextjs.org)
- **React 19**: [react.dev](https://react.dev)
- **TypeScript**: [typescriptlang.org](https://www.typescriptlang.org)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com)
- **Radix UI**: [radix-ui.com](https://www.radix-ui.com)
- **TanStack Query**: [tanstack.com/query](https://tanstack.com/query)
- **Zustand**: [zustand-demo.pmnd.rs](https://zustand-demo.pmnd.rs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **next-intl**: [next-intl.dev](https://next-intl.dev)

---

**Next Steps:**

- Review [Architecture](ARCHITECTURE.md) for system design
- See [API Reference](API_REFERENCE.md) for API usage
- Read [Database Schema](DATABASE_SCHEMA.md) for data structure
