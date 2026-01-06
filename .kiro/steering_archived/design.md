---
inclusion: always
---

# Design System

## Colors

Brand: Primary `#FF2D55`, Hover `#E6284D`, Teal `#00A699`, Orange `#FC642D`

## Typography

System font stack. Scale: Display `text-4xl+`, H1 `text-3xl`, H2 `text-2xl`, Body `text-base`, Small `text-sm`

## Spacing

4px grid: `p-1`=4px, `p-2`=8px, `p-4`=16px, `p-6`=24px, `p-8`=32px

## Border Radius

`rounded`=4px, `rounded-lg`=8px, `rounded-xl`=12px, `rounded-full`=pill

## Shadows

Card `shadow-sm`, Hover `shadow-md`, Modal `shadow-lg`

## Patterns

### Card

```tsx
<div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow">
  <Image src={img} alt={title} fill className="object-cover rounded-t-xl" />
  <div className="p-4">
    <h3 className="font-semibold">{title}</h3>
  </div>
</div>
```

### Responsive

```tsx
<div className="w-full md:w-1/2 lg:w-1/3">Mobile-first</div>
```

### Dark Mode

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

### Conditional Classes

```tsx
import { cn } from '@/lib/utils';
<div className={cn('p-4', isActive && 'bg-primary')}>
```

## Animations

```tsx
className = "transition-all duration-200 hover:scale-105";
```

## Breakpoints

sm=640px, md=768px, lg=1024px, xl=1280px

## Accessibility

Focus: `focus:ring-2 focus:ring-primary`, Touch targets: 44px min, Contrast: 4.5:1

## Images

```tsx
<Image src={url} alt="desc" width={400} height={300} className="object-cover" priority />
```
