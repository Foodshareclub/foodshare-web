# next-intl Internationalization

## Overview

Internationalization for Next.js 16 with next-intl. FoodShare supports 21 languages including RTL (Arabic).

## Supported Locales

```typescript
// en, cs, de, es, fr, pt, ru, uk, zh, hi, ar (RTL), it, pl, nl, ja, ko, tr, vi, id, th, sv
```

## Configuration

### i18n.ts

```typescript
// src/i18n.ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default,
}));
```

### middleware.ts

```typescript
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "cs", "de", "es", "fr", "ar"],
  defaultLocale: "en",
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

## Translation Files

### Structure

```
messages/
├── en.json
├── cs.json
├── de.json
├── es.json
├── fr.json
├── ar.json    # RTL
└── ...
```

### JSON Format

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading..."
  },
  "products": {
    "title": "Food Listings",
    "empty": "No products found",
    "create": "Add Product"
  },
  "errors": {
    "required": "{field} is required",
    "minLength": "{field} must be at least {min} characters"
  }
}
```

## Usage in Components

### Server Components

```typescript
// src/app/food/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function FoodPage() {
  const t = await getTranslations('products');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('empty')}</p>
    </div>
  );
}
```

### Client Components

```typescript
// src/components/products/ProductForm.tsx
'use client';

import { useTranslations } from 'next-intl';

export function ProductForm() {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');

  return (
    <form>
      <button type="submit">{tCommon('save')}</button>
      <button type="button">{tCommon('cancel')}</button>
    </form>
  );
}
```

## Dynamic Values

### Interpolation

```typescript
// messages/en.json
{
  "greeting": "Hello, {name}!",
  "items": "You have {count} items"
}

// Component
t('greeting', { name: 'John' });  // "Hello, John!"
t('items', { count: 5 });         // "You have 5 items"
```

### Pluralization

```typescript
// messages/en.json
{
  "products": {
    "count": "{count, plural, =0 {No products} one {# product} other {# products}}"
  }
}

// Component
t('products.count', { count: 0 });  // "No products"
t('products.count', { count: 1 });  // "1 product"
t('products.count', { count: 5 });  // "5 products"
```

### Rich Text

```typescript
// messages/en.json
{
  "terms": "By signing up, you agree to our <link>Terms of Service</link>"
}

// Component
t.rich('terms', {
  link: (chunks) => <Link href="/terms">{chunks}</Link>
});
```

## Formatting

### Dates

```typescript
import { useFormatter } from 'next-intl';

function DateDisplay({ date }: { date: Date }) {
  const format = useFormatter();

  return (
    <span>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </span>
  );
}
```

### Numbers and Currency

```typescript
const format = useFormatter();

format.number(1234.56); // "1,234.56"
format.number(1234.56, { style: "currency", currency: "USD" }); // "$1,234.56"
```

### Relative Time

```typescript
const format = useFormatter();

format.relativeTime(new Date(Date.now() - 1000 * 60 * 5)); // "5 minutes ago"
```

## RTL Support (Arabic)

### Layout Direction

```typescript
// src/app/layout.tsx
import { getLocale } from 'next-intl/server';

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

### Tailwind RTL Utilities

```tsx
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  Content with RTL-aware margins
</div>

<div className="text-left rtl:text-right">
  RTL-aware text alignment
</div>
```

## Language Switcher

```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const changeLocale = (newLocale: string) => {
    router.push(pathname, { locale: newLocale });
  };

  return (
    <select value={locale} onChange={(e) => changeLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="cs">Čeština</option>
      <option value="de">Deutsch</option>
      <option value="ar">العربية</option>
    </select>
  );
}
```

## Metadata

```typescript
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}
```

## When to Use This Skill

- Adding new translations
- Using translations in components
- Pluralization and formatting
- RTL language support
- Language switching
- Dynamic translation values
