# Glass Component Migration Guide

> ✅ **MIGRATION COMPLETE** - December 5, 2025
> 
> The Glass folder has been deleted. All components now use Tailwind v4 `@utility` classes.

## Overview

The Glass system has been refactored from a complex React component wrapper to native Tailwind v4 utilities using the `@utility` directive. This provides:

- **Better performance** - No React wrapper overhead
- **Full Tailwind integration** - Works with `hover:`, `dark:`, `md:`, etc.
- **Smaller bundle** - ~250 lines removed
- **Simpler API** - Just use className

---

## Quick Migration

### Before (Old Pattern - No Longer Available)
```tsx
// ❌ These imports no longer work
import { Glass, GlassCard, GlassButton } from '@/components/Glass';
import { Glass, GlassCard, GlassButton } from '@/components';

<Glass variant="subtle" borderRadius="12px" padding="16px">
  Content
</Glass>

<GlassCard variant="standard" padding="md">
  Card content
</GlassCard>

<GlassButton variant="accentGreen" onClick={handler}>
  Click me
</GlassButton>
```

### After (New Pattern)
```tsx
// Option 1: Direct Tailwind classes (recommended)
<div className="glass-subtle rounded-xl p-4">
  Content
</div>

<div className="glass rounded-xl p-5 glass-transition hover:shadow-lg">
  Card content
</div>

<Button variant="glass-accent" onClick={handler}>
  Click me
</Button>

// Option 2: New Glass component from ui/
import { Glass, GlassCard } from '@/components/ui/glass';

<Glass variant="subtle" className="p-4">
  Content
</Glass>

<GlassCard>
  Card content
</GlassCard>
```

---

## Available Tailwind Utilities

These are defined in `globals.css` using `@utility`:

| Class | Description |
|-------|-------------|
| `glass` | Standard glassmorphism |
| `glass-subtle` | Lighter, more transparent |
| `glass-prominent` | Stronger blur, more opaque |
| `glass-strong` | Maximum blur effect |
| `glass-overlay` | For modals/overlays |
| `glass-input` | For form inputs |
| `glass-accent-primary` | Primary color tinted |
| `glass-accent-orange` | Orange tinted |
| `glass-transition` | Smooth hover transitions |
| `gpu` | GPU acceleration |

---

## Component-Specific Migrations

### GlassDialogContent → DialogContent

```tsx
// Before
import { GlassDialogContent } from '@/components/Glass';
<GlassDialogContent>...</GlassDialogContent>

// After
import { DialogContent } from '@/components/ui/dialog';
<DialogContent variant="glass">...</DialogContent>
```

### GlassButton → Button

```tsx
// Before
import { GlassButton } from '@/components/Glass';
<GlassButton variant="accentGreen">Click</GlassButton>

// After
import { Button } from '@/components/ui/button';
<Button variant="glass-accent">Click</Button>

// Or for orange accent:
<Button variant="glass" className="glass-accent-orange">Click</Button>
```

### GlassCard → Glass or div

```tsx
// Before
import { GlassCard } from '@/components/Glass';
<GlassCard variant="standard" padding="md">Content</GlassCard>

// After - Option 1: Direct classes
<div className="glass rounded-xl p-5 glass-transition hover:shadow-lg">
  Content
</div>

// After - Option 2: New component
import { GlassCard } from '@/components/ui/glass';
<GlassCard>Content</GlassCard>
```

### Glass with Chakra-style props

```tsx
// Before (Chakra-style props)
<Glass
  variant="subtle"
  borderRadius="12px"
  padding="16px"
  w="100%"
  cursor="pointer"
  onClick={handler}
>
  Content
</Glass>

// After (Tailwind classes)
<div
  className="glass-subtle rounded-xl p-4 w-full cursor-pointer"
  onClick={handler}
>
  Content
</div>
```

---

## Files to Update

Run this to find any remaining files needing updates:

```bash
grep -r "from '@/components/Glass'" src/ --include="*.tsx" -l
grep -r "from '@/components'" src/ --include="*.tsx" | grep -i glass
```

> **Note:** The barrel export from `@/components` has been removed. Any remaining imports from `@/components/Glass` will cause build errors and must be migrated.

---

## Variant Mapping

| Old Variant | New Class |
|-------------|-----------|
| `standard` | `glass` |
| `subtle` | `glass-subtle` |
| `prominent` | `glass-prominent` |
| `strong` | `glass-strong` |
| `overlay` | `glass-overlay` |
| `input` | `glass-input` |
| `accentGreen` | `glass-accent-primary` |
| `accentOrange` | `glass-accent-orange` |

---

## Deprecation Timeline

1. ~~**Phase 1**: New `@utility` classes available, old components still work~~ ✅
2. ~~**Phase 2**: Update high-traffic components (modals, cards)~~ ✅
3. ~~**Phase 3**: Delete `src/components/Glass/` folder~~ ✅ Complete
4. ~~**Phase 4**: Remove from `src/components/index.ts` exports~~ ✅ Complete

### Current Status - MIGRATION COMPLETE

The `src/components/Glass/` folder has been deleted. All 40+ files have been migrated to use Tailwind v4 `@utility` classes. Use one of:

```tsx
// Option 1: Tailwind utility classes (recommended)
<div className="glass rounded-xl p-4">Content</div>

// Option 2: CVA-based component
import { Glass, GlassCard } from '@/components/ui/glass';

// Option 3: Built-in variants on shadcn components
<Button variant="glass">Click</Button>
<DialogContent variant="glass">...</DialogContent>
```

---

## Testing Checklist

After migrating a component:

- [ ] Visual appearance matches (light mode)
- [ ] Visual appearance matches (dark mode)
- [ ] Hover effects work
- [ ] Focus states work
- [ ] Responsive behavior unchanged
- [ ] No hydration errors
