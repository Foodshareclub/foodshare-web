# 🌍 i18n Quick Reference - 21 Languages

**Quick lookup for FoodShare's internationalization system**

---

## Supported Languages

| #   | Language   | Code | Flag | Status      | Coverage | Direction | Region |
| --- | ---------- | ---- | ---- | ----------- | -------- | --------- | ------ |
| 1   | English    | `en` | 🇬🇧   | ✅ Ready    | 100%     | LTR       | Global |
| 2   | Ukrainian  | `uk` | 🇺🇦   | ✅ Ready    | 100%     | LTR       | Europe |
| 3   | German     | `de` | 🇩🇪   | ✅ Ready    | 99%      | LTR       | Europe |
| 4   | Spanish    | `es` | 🇪🇸   | ✅ Ready    | 99%      | LTR       | Global |
| 5   | Russian    | `ru` | 🇷🇺   | ✅ Ready    | 99%      | LTR       | Europe |
| 6   | French     | `fr` | 🇫🇷   | 🚧 Progress | 55%      | LTR       | Global |
| 7   | Portuguese | `pt` | 🇵🇹   | 🚧 Progress | 56%      | LTR       | Global |
| 8   | Czech      | `cs` | 🇨🇿   | 🚧 Progress | 55%      | LTR       | Europe |
| 9   | Chinese    | `zh` | 🇨🇳   | 🆕 New      | 0%       | LTR       | Asia   |
| 10  | Hindi      | `hi` | 🇮🇳   | 🆕 New      | 0%       | LTR       | Asia   |
| 11  | Arabic     | `ar` | 🇸🇦   | 🆕 New      | 0%       | **RTL**   | MENA   |
| 12  | Italian    | `it` | 🇮🇹   | 🆕 New      | 0%       | LTR       | Europe |
| 13  | Polish     | `pl` | 🇵🇱   | 🆕 New      | 0%       | LTR       | Europe |
| 14  | Dutch      | `nl` | 🇳🇱   | 🆕 New      | 0%       | LTR       | Europe |
| 15  | Japanese   | `ja` | 🇯🇵   | 🆕 New      | 0%       | LTR       | Asia   |
| 16  | Korean     | `ko` | 🇰🇷   | 🆕 New      | 0%       | LTR       | Asia   |
| 17  | Turkish    | `tr` | 🇹🇷   | 🆕 New      | 0%       | LTR       | MENA   |
| 18  | Vietnamese | `vi` | 🇻🇳   | 🆕 New      | 0%       | LTR       | Asia   |
| 19  | Indonesian | `id` | 🇮🇩   | 🆕 New      | 0%       | LTR       | Asia   |
| 20  | Thai       | `th` | 🇹🇭   | 🆕 New      | 0%       | LTR       | Asia   |
| 21  | Swedish    | `sv` | 🇸🇪   | 🆕 New      | 0%       | LTR       | Europe |

---

## Quick Commands

```bash
# Extract translatable strings
bun run extract

# Compile translations
bun run compile

# Start dev server (requires compiled translations)
bun run dev

# Type check
bun run type-check
```

---

## Usage Examples

### In React Components

```typescript
import { Trans } from '@lingui/macro';

// Simple text
<Text><Trans>Welcome to FoodShare</Trans></Text>

// With variables
<Trans>Hello, {userName}!</Trans>

// Pluralization
<Trans>{count} {count === 1 ? 'item' : 'items'}</Trans>
```

### In Attributes

```typescript
import { t } from '@lingui/macro';

// Input placeholder
<Input placeholder={t`Enter your email`} />

// Button aria-label
<Button aria-label={t`Close dialog`} />
```

### Programmatic

```typescript
import { i18n } from "@lingui/core";
import { dynamicActivate, isLocaleLoaded } from "@/utils/i18n";

// Switch language
await dynamicActivate("es");

// Get current locale
const currentLocale = i18n.locale; // 'es'

// Check if locale is loaded
const loaded = isLocaleLoaded("es"); // true/false
```

### Using next-intl (Recommended)

```typescript
// Import from centralized config
import { locales, localeMetadata, type Locale } from "@/i18n/config";

// Get all supported locales
console.log(locales); // ['en', 'cs', 'de', ...]

// Get locale metadata
const info = localeMetadata["es"];
// { name: "Spanish", nativeName: "Español", flag: "🇪🇸", ... }
```

---

## File Locations

```
src/
├── i18n/
│   └── config.ts                  # Centralized i18n config (next-intl)
├── utils/
│   ├── i18n.ts                    # Legacy i18n utilities (Lingui)
│   ├── i18n-backend.ts            # Backend integration
│   ├── i18n-mobile.ts             # Mobile-specific
│   └── i18n-universal-sdk.ts      # Universal SDK
├── locales/
│   ├── en/messages.po             # English (source)
│   ├── uk/messages.po             # Ukrainian
│   ├── de/messages.po             # German
│   ├── es/messages.po             # Spanish
│   ├── ru/messages.po             # Russian
│   ├── fr/messages.po             # French
│   ├── pt/messages.po             # Portuguese
│   ├── cs/messages.po             # Czech
│   ├── zh/messages.po             # Chinese (new)
│   ├── hi/messages.po             # Hindi (new)
│   ├── ar/messages.po             # Arabic (new)
│   ├── it/messages.po             # Italian (new)
│   ├── pl/messages.po             # Polish (new)
│   ├── nl/messages.po             # Dutch (new)
│   ├── ja/messages.po             # Japanese (new)
│   ├── ko/messages.po             # Korean (new)
│   └── tr/messages.po             # Turkish (new)
└── lingui.config.js               # Lingui configuration
```

---

## Locale Metadata

```typescript
// Recommended: Use centralized config
import { localeMetadata, type Locale } from "@/i18n/config";

// Or legacy import (still works)
// import { localeMetadata } from "@/utils/i18n";

const info = localeMetadata["es"];
// {
//   name: "Spanish",
//   nativeName: "Español",
//   flag: "🇪🇸",
//   direction: "ltr",
//   code: "es-ES",
//   region: "global"
// }
```

---

## RTL Support (Arabic)

```typescript
// Recommended: Use centralized config
import { getLocaleDirection } from '@/i18n/config';

// Or legacy import
// import { getLocaleDirection } from '@/utils/i18n';

// Get text direction
const direction = getLocaleDirection('ar'); // 'rtl'

// Apply to document
document.dir = direction;

// CSS
[dir="rtl"] {
  text-align: right;
}
```

---

## Translation Workflow

1. **Mark strings for translation**

   ```typescript
   <Trans>Hello World</Trans>
   ```

2. **Extract strings**

   ```bash
   bun run extract
   ```

3. **Translate in .po files**

   ```po
   msgid "Hello World"
   msgstr "Hola Mundo"  # Spanish
   ```

4. **Compile translations**

   ```bash
   bun run compile
   ```

5. **Test in app**
   ```bash
   bun run dev
   ```

---

## Common Issues

### Issue: Translations not showing

**Solution**: Run `bun run compile` before `bun run dev`

### Issue: New language not appearing

**Solution**:

1. Check `lingui.config.js` includes the locale
2. Run `bun run extract`
3. Run `bun run compile`

### Issue: RTL not working for Arabic

**Solution**:

```typescript
import { getLocaleDirection } from "@/utils/i18n";
document.dir = getLocaleDirection("ar");
```

---

## Performance Tips

- ✅ Use lazy loading: `dynamicActivate(locale)`
- ✅ Preload common locales: `preloadLocale('es')`
- ✅ Cache compiled translations
- ✅ Use code splitting per locale

---

## Resources

- [Full Documentation](./LANGUAGE_EXPANSION_2024.md)
- [Cross-Platform Guide](./CROSS_PLATFORM_I18N_GUIDE.md)
- [Translation System v4](./translation-system-v4.md)
- [Lingui Docs](https://lingui.dev)

---

**Last Updated**: November 30, 2024  
**Total Languages**: 17  
**Production Ready**: 8  
**In Translation**: 9
