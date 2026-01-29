---
inclusion: manual
---

# Navbar Design Reference

## Desktop Structure

```text
[Logo]          [Search Bar]              [Nav Items] [Profile]
```

## Mobile Structure

```text
[Logo]                              [Menu]
---
[Bottom Tab Bar: Home | Search | Add | Chat | Profile]
```

## Search Bar (Pill Style)

```tsx
<div className="flex items-center bg-white border rounded-full shadow-sm hover:shadow-md">
  <input className="flex-1 px-6 py-3 bg-transparent" placeholder="Search..." />
  <Button className="m-2 rounded-full bg-[#FF2D55]">
    <Search className="h-4 w-4" />
  </Button>
</div>
```

## Profile Menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="rounded-full gap-2">
      <Menu className="h-4 w-4" />
      <Avatar>
        <AvatarImage src={user?.avatar} />
      </Avatar>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Log out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Sticky Header with Scroll

```tsx
"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all",
        isScrolled ? "bg-white shadow-md" : "bg-transparent"
      )}
    >
      {/* content */}
    </header>
  );
}
```

## Mobile Bottom Navigation

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden z-50">
  <div className="flex justify-around py-2">
    {[
      { icon: Home, label: "Home", href: "/" },
      { icon: Search, label: "Search", href: "/search" },
      { icon: Plus, label: "Add", href: "/add" },
      { icon: MessageCircle, label: "Chat", href: "/chat" },
      { icon: User, label: "Profile", href: "/profile" },
    ].map((item) => (
      <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1">
        <item.icon className="h-6 w-6" />
        <span className="text-xs">{item.label}</span>
      </Link>
    ))}
  </div>
</nav>
```

## Colors

- Background: `bg-white`
- Border: `border-gray-200`
- Text: `text-gray-900`
- Active: `text-[#FF2D55]`

## Breakpoints

- Mobile: < 768px (bottom nav)
- Desktop: >= 1024px (full nav)
