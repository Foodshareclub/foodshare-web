# Refactor Code

Refactor: $ARGUMENTS

## Workflow

1. **Analyze Current State**
   - Read the code to refactor
   - Identify code smells or issues
   - Understand dependencies

2. **Plan Refactoring**
   - Define the target structure
   - List breaking changes
   - Identify test updates needed

3. **Refactor Incrementally**
   - Make small, verifiable changes
   - Run type-check after each step
   - Keep the app functional

4. **Verify**
   - `npm run type-check`
   - `npm run lint`
   - Run tests if applicable

## Common Refactors

### Client to Server Component

- Remove `'use client'`
- Replace useState with props
- Move data fetching to parent

### Extract Server Action

```typescript
// Move from component to app/actions/
"use server";
export async function doAction(formData: FormData) {
  // Implementation
}
```

### Consolidate Components

- Find duplicate code
- Extract shared component
- Update imports

## Guidelines

- Don't change behavior while refactoring
- Keep changes focused
- Update imports across codebase
- Remove unused code
