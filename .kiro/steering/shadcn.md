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

## Best Practices

1. **Use `asChild`** - For custom trigger elements
2. **Use `cn()` utility** - For conditional classes
3. **Prefer primitives** - Build features from shadcn components
4. **Don't modify `ui/` files directly** - Extend in feature components

## Common Patterns

### Button Variants

```typescript
import { Button } from '@/components/ui/button';

<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
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

## Custom Variants

Extend in feature components, not in ui/ files:

```typescript
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BrandButton({ className, ...props }) {
  return (
    <Button
      className={cn('bg-[#FF385C] hover:bg-[#E31C5F]', className)}
      {...props}
    />
  );
}
```
