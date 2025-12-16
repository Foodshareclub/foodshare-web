# New Feature Implementation

Implement: $ARGUMENTS

## Workflow

1. **Explore & Understand**
   - Research how similar features are implemented in the codebase
   - Identify patterns to follow
   - Find files that need modification

2. **Plan**
   - Create a checklist of tasks
   - Identify new files to create
   - Consider database changes needed
   - Plan the UI components

3. **Implement in Order**
   - Database migration (if needed)
   - Data layer (`lib/data/`)
   - Server Actions (`app/actions/`)
   - UI Components (`components/`)
   - Page routes (`app/`)
   - Translations (`messages/`)

4. **Verify**
   - `npm run type-check`
   - `npm run lint`
   - `npm run build` (optional)

## Patterns to Follow

### Data Fetching

```typescript
// lib/data/[feature].ts
export const getData = unstable_cache(
  async () => {
    /* ... */
  },
  ["cache-key"],
  { tags: ["tag-name"] }
);
```

### Server Actions

```typescript
// app/actions/[feature].ts
"use server";
export async function createItem(formData: FormData) {
  // Validate, insert, revalidateTag
}
```

### Components

- Server Components by default
- `'use client'` only when needed (interactivity, hooks)
- Use shadcn/ui components
- Add translations for user-facing text
