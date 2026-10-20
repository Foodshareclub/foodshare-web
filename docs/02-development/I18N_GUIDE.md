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
# Sync translation files to Supabase
bun run translations:sync

# Start dev server
bun run dev

# Type check
bun run type-check
```

---

## Usage Examples

### In React Components

```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('common');

// Simple text
<Text>{t('welcome')}</Text>

// With variables
<Text>{t('hello', { name: userName })}</Text>

// Pluralization
<Text>{t('itemCount', { count })}</Text>
```

### In Attributes

```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('common');

// Input placeholder
<Input placeholder={t('enterEmail')} />

// Button aria-label
<Button aria-label={t('closeDialog')} />
```

### Programmatic (Server Components)

```typescript
import { getTranslations } from "next-intl/server";
import { locales, localeMetadata, type Locale } from "@/i18n/config";

// In async Server Components
const t = await getTranslations("common");

// Get all supported locales
console.log(locales); // ['en', 'cs', 'de', ...]

// Get locale metadata
const info = localeMetadata["es"];
// { name: "Spanish", nativeName: "Español", flag: "🇪🇸", ... }
```

---

## File Locations

```
messages/
├── en.json                        # English (source)
├── uk.json                        # Ukrainian
├── de.json                        # German
├── es.json                        # Spanish
├── ru.json                        # Russian
├── fr.json                        # French
├── pt.json                        # Portuguese
├── cs.json                        # Czech
├── zh.json                        # Chinese
├── hi.json                        # Hindi
├── ar.json                        # Arabic (RTL)
├── it.json                        # Italian
├── pl.json                        # Polish
├── nl.json                        # Dutch
├── ja.json                        # Japanese
├── ko.json                        # Korean
├── tr.json                        # Turkish
├── vi.json                        # Vietnamese
├── id.json                        # Indonesian
├── th.json                        # Thai
└── sv.json                        # Swedish

i18n.ts                            # next-intl request configuration
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

1. **Add the string to the English source**

   ```json
   // messages/en.json
   { "common": { "helloWorld": "Hello World" } }
   ```

2. **Use it in components**

   ```typescript
   const t = useTranslations("common");
   t("helloWorld");
   ```

3. **Translate in locale files**

   ```json
   // messages/es.json
   { "common": { "helloWorld": "Hola Mundo" } }
   ```

4. **Sync to the database**

   ```bash
   bun run translations:sync
   ```

5. **Test in app**
   ```bash
   bun run dev
   ```

---

## Common Issues

### Issue: Translations not showing

**Solution**: Check the key exists in `messages/{locale}.json` and restart `bun run dev`

### Issue: New language not appearing

**Solution**:

1. Create `messages/{locale}.json`
2. Register the locale in the i18n config
3. Run `bun run translations:sync`

### Issue: RTL not working for Arabic

**Solution**:

```typescript
import { getLocaleDirection } from "@/i18n/config";
document.dir = getLocaleDirection("ar");
```

---

## Performance Tips

- ✅ Use Server Components for translated content (no client JS)
- ✅ Namespace messages to keep payloads small
- ✅ Keep translations in `messages/{locale}.json` (statically analyzable)

---

## Resources

- [Full Documentation](./LANGUAGE_EXPANSION_2024.md)
- [Cross-Platform Guide](./CROSS_PLATFORM_I18N_GUIDE.md)
- [Translation System v4](./translation-system-v4.md)
- [next-intl Docs](https://next-intl-docs.vercel.app/)

---

**Last Updated**: August 2026  
**Total Languages**: 21  
**Production Ready**: 5  
**In Translation**: 16
