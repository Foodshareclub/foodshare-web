---
inclusion: always
---

# Common Tasks

## Add New Feature

### 1. Create Data Function

```typescript
// lib/data/myFeature.ts
import { createClient } from '@/lib/supabase/server';

export async function getMyData() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('my_table').select('*');
  if (error) throw error;
  return data;
}
```

### 2. Create Server Action

```typescript
// app/actions/myFeature.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { invalidateTag } from '@/lib/data/cache-keys';

export async function createMyItem(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('my_table').insert({ name: formData.get('name') });
  if (error) return { error: error.message };
  invalidateTag('myFeature');
  return { success: true };
}
```

### 3. Create Page

```typescript
// app/my-feature/page.tsx
import { getMyData } from '@/lib/data/myFeature';
import { MyFeatureList } from '@/components/myFeature/MyFeatureList';

export default async function MyFeaturePage() {
  const data = await getMyData();
  return <MyFeatureList data={data} />;
}
```

### 4. Create Component

```typescript
// components/myFeature/MyFeatureList.tsx
'use client';
import { createMyItem } from '@/app/actions/myFeature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function MyFeatureList({ data }) {
  return (
    <div>
      <form action={createMyItem} className="flex gap-2">
        <Input name="name" placeholder="Name" />
        <Button type="submit">Add</Button>
      </form>
      <ul>{data.map(item => <li key={item.id}>{item.name}</li>)}</ul>
    </div>
  );
}
```

## Supabase Queries

```typescript
// Select
const { data } = await supabase.from('posts').select('*');

// With filter
const { data } = await supabase.from('posts').select('*').eq('type', 'food').eq('active', true);

// With relations
const { data } = await supabase.from('posts').select('*, profiles(*)');

// Insert
const { error } = await supabase.from('posts').insert({ name: 'New' });

// Update
const { error } = await supabase.from('posts').update({ name: 'Updated' }).eq('id', id);

// Delete
const { error } = await supabase.from('posts').delete().eq('id', id);
```

## Git Workflow

```bash
git checkout -b feat/my-feature
git add .
git commit -m "feat: add my feature"
git push origin feat/my-feature
```

Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `perf:`

## Git Hooks (lefthook-rs)

Rust-based hooks run automatically on commit/push:

```bash
# Build Rust tools (one-time)
cd tools && cargo build --release

# Normal commit - auto-fix runs (format, lint, imports)
git commit -m "feat: add feature"

# Skip type-check for faster commits
LEFTHOOK_EXCLUDE=type-check git commit -m "wip: progress"

# Skip all hooks
LEFTHOOK=0 git commit -m "wip: quick save"

# Enable optional checks
ENABLE_ALL=1 git commit           # All optional checks
ENABLE_COMPLEXITY=1 git commit    # Complexity analysis
ENABLE_A11Y=1 git commit          # Accessibility check

# Quick push (skip tests/build)
SKIP_TESTS=1 SKIP_BUILD=1 git push
```

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Debugging

- React DevTools: Inspect components
- Network tab: Check API calls
- `console.error()` for errors (allowed)
- `console.warn()` for warnings (allowed)
- Avoid `console.log()` in production

## Common Issues

| Issue | Solution |
|-------|----------|
| Hydration mismatch | Use `useEffect` for client-only content |
| Supabase error | Check env vars, await `createClient()` |
| Import not found | Use `@/` alias |
| Component not updating | Check revalidation in Server Action |
| Hook failed | Check `tools/target/release/lefthook-rs` exists |
| Security check failed | Review flagged patterns, fix or allowlist |
