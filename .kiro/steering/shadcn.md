---
inclusion: always
---

# Shadcn/ui Guide

## Configuration

- **Style**: `new-york`
- **Base color**: `neutral`
- **CSS Variables**: enabled
- **RSC**: false (components are client-side)

## Installation

```bash
npx shadcn@latest add [component]
```

## Available Components

Located in `src/components/ui/`:

- `button` - Primary interactive element
- `dialog` - Modal dialogs
- `drawer` - Mobile-friendly slide panels
- `dropdown-menu` - Context menus
- `select` - Dropdown selection
- `input`, `textarea`, `label` - Form inputs
- `checkbox`, `radio-group` - Selection controls
- `avatar` - User avatars
- `badge` - Status indicators
- `popover` - Floating content
- `separator` - Visual dividers
- `card` - Content containers
- `toast` - Notifications
- `skeleton` - Loading placeholders
- `tabs` - Tabbed content
- `tooltip` - Hover hints
- `progress` - Progress indicators

## Best Practices

1. **Use `asChild`** - For custom trigger elements
2. **Use `cn()` utility** - For conditional classes
3. **Prefer primitives** - Build features from shadcn components
4. **Don't modify `ui/` files directly** - Extend in feature components

## Common Patterns

### Button Variants

```typescript
import { Button } from '@/components/ui/button';

// Standard variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

// Glass variants (using Tailwind v4 @utility classes)
<Button variant="glass">Glass</Button>
<Button variant="glass-subtle">Subtle Glass</Button>
<Button variant="glass-prominent">Prominent Glass</Button>
<Button variant="glass-accent">Accent Glass</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// Icon sizes
<Button size="icon"><Icon /></Button>
<Button size="icon-sm"><Icon /></Button>
<Button size="icon-lg"><Icon /></Button>
```

### Dialog

```typescript
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <div>Content</div>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Responsive Modal

Use Dialog on desktop, Drawer on mobile:

```typescript
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

export function ResponsiveModal({ open, onOpenChange, children }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>{children}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>{children}</DrawerContent>
    </Drawer>
  );
}
```

### Form Inputs

```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="email@example.com" />
</div>
```

### Dropdown Menu

```typescript
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Skeleton Loading

```typescript
import { Skeleton } from '@/components/ui/skeleton';

// Card skeleton
<div className="space-y-3">
  <Skeleton className="h-48 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>

// Avatar + text skeleton
<div className="flex items-center gap-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
</div>
```

## Custom Variants

Extend in feature components, not in ui/ files:

```typescript
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BrandButton({ className, ...props }) {
  return (
    <Button
      className={cn('bg-[#FF2D55] hover:bg-[#E6284D]', className)}
      {...props}
    />
  );
}
```
