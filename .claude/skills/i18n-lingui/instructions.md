# Lingui Internationalization Skill

## Overview
Expert guidance for implementing internationalization (i18n) with Lingui in React applications, supporting multiple languages and locales.

## Tech Stack Context
- **Lingui React**: 5.6.0
- **Lingui CLI**: 5.6.0
- **Lingui Macro**: 5.6.0
- **Lingui Vite Plugin**: 5.6.0
- **Supported Locales**: English (en), Czech (cs), French (fr), Russian (ru)

## Setup and Configuration

### Lingui Configuration
```typescript
// lingui.config.ts
import { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'cs', 'fr', 'ru'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: 'src/locales/{locale}/messages',
      include: ['src']
    }
  ],
  format: 'po'
};

export default config;
```

### I18nProvider Setup
```typescript
// src/i18n.ts
import { i18n } from '@lingui/core';
import { messages as enMessages } from './locales/en/messages';
import { messages as csMessages } from './locales/cs/messages';
import { messages as frMessages } from './locales/fr/messages';
import { messages as ruMessages } from './locales/ru/messages';

i18n.load({
  en: enMessages,
  cs: csMessages,
  fr: frMessages,
  ru: ruMessages
});

i18n.activate('en');

export { i18n };
```

```typescript
// src/App.tsx
import { I18nProvider } from '@lingui/react';
import { i18n } from './i18n';

export const App = () => {
  return (
    <I18nProvider i18n={i18n}>
      <YourApp />
    </I18nProvider>
  );
};
```

## Basic Usage

### Trans Component
```typescript
import { Trans } from '@lingui/react/macro';

// Simple text
<Trans>Hello World</Trans>

// With variables
<Trans>Hello {userName}</Trans>

// With plurals
<Trans>
  You have {count} {count === 1 ? 'item' : 'items'}
</Trans>

// With components
<Trans>
  Read the <a href="/docs">documentation</a>
</Trans>
```

### useLingui Hook
```typescript
import { useLingui } from '@lingui/react';

export const Component = () => {
  const { i18n, _ } = useLingui();

  // Translate string
  const greeting = _(msg`Hello World`);

  // With variables
  const welcome = _(msg`Welcome, ${userName}`);

  // In attributes or variables
  return <input placeholder={_(msg`Enter your name`)} />;
};
```

### msg Macro for IDs
```typescript
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';

const Component = () => {
  const { _ } = useLingui();

  const messages = {
    title: msg`Product Title`,
    description: msg`Product Description`
  };

  return (
    <div>
      <h1>{_(messages.title)}</h1>
      <p>{_(messages.description)}</p>
    </div>
  );
};
```

## Advanced Patterns

### Pluralization
```typescript
import { Plural } from '@lingui/react/macro';

<Plural
  value={count}
  one="# item"
  other="# items"
/>

// With custom messages
<Plural
  value={itemCount}
  zero="No items"
  one="One item"
  few="A few items"
  other="# items"
/>
```

### Date and Number Formatting
```typescript
import { useLingui } from '@lingui/react';

const Component = () => {
  const { i18n } = useLingui();

  // Format date
  const formattedDate = i18n.date(new Date(), {
    dateStyle: 'medium'
  });

  // Format number
  const formattedNumber = i18n.number(1234.56, {
    style: 'currency',
    currency: 'EUR'
  });

  return (
    <div>
      <p>{formattedDate}</p>
      <p>{formattedNumber}</p>
    </div>
  );
};
```

### Select (Gender/Context)
```typescript
import { Select } from '@lingui/react/macro';

<Select
  value={gender}
  male="He liked this"
  female="She liked this"
  other="They liked this"
/>
```

### Message Context
```typescript
import { Trans } from '@lingui/react/macro';

// Different contexts for same word
<Trans context="navigation">Home</Trans>
<Trans context="action">Home</Trans>
```

## Language Switching

### Language Switcher Component
```typescript
import { useLingui } from '@lingui/react';

const locales = {
  en: 'English',
  cs: 'Čeština',
  fr: 'Français',
  ru: 'Русский'
};

export const LanguageSwitcher = () => {
  const { i18n } = useLingui();

  const handleChange = (locale: string) => {
    i18n.activate(locale);
    // Optionally save to localStorage
    localStorage.setItem('locale', locale);
  };

  return (
    <select
      value={i18n.locale}
      onChange={(e) => handleChange(e.target.value)}
    >
      {Object.entries(locales).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
};
```

### Persist Language Preference
```typescript
// src/i18n.ts
const defaultLocale = localStorage.getItem('locale') || 'en';
i18n.activate(defaultLocale);

// Listen for changes
i18n.on('change', () => {
  localStorage.setItem('locale', i18n.locale);
});
```

## Dynamic Loading (Code Splitting)

### Lazy Load Translations
```typescript
import { i18n } from '@lingui/core';

export async function dynamicActivate(locale: string) {
  const { messages } = await import(
    `./locales/${locale}/messages.ts`
  );

  i18n.load(locale, messages);
  i18n.activate(locale);
}
```

## CLI Commands

### Extract Messages
```bash
# Extract translatable strings from code
npm run extract

# Extract and compile in one command
npm run extract && npm run compile
```

### Compile Translations
```bash
# Compile message catalogs for runtime
npm run compile
```

### Add New Locale
```bash
# Add a new language
npm run add-locale -- de
```

## Message Catalog Structure

```
src/locales/
├── en/
│   └── messages.po
├── cs/
│   └── messages.po
├── fr/
│   └── messages.po
└── ru/
    └── messages.po
```

### Example .po File
```po
msgid "Hello {name}"
msgstr "Ahoj {name}"

msgid "You have {count} items"
msgid_plural "You have {count} items"
msgstr[0] "Máte {count} položku"
msgstr[1] "Máte {count} položky"
msgstr[2] "Máte {count} položek"
```

## Best Practices

### 1. Use Macros for Type Safety
```typescript
// Good - Type safe
import { Trans } from '@lingui/react/macro';
<Trans>Welcome</Trans>

// Avoid - Runtime only
import { Trans } from '@lingui/react';
<Trans id="welcome" />
```

### 2. Keep Translations in Context
```typescript
// Good - Context clear
<Trans>Delete this product?</Trans>

// Less clear - Generic
<Trans>Delete?</Trans>
```

### 3. Extract Variables
```typescript
// Good
const productName = product.title;
<Trans>Are you sure you want to delete {productName}?</Trans>

// Avoid - Complex expressions in Trans
<Trans>Delete {product.title.toUpperCase()}?</Trans>
```

### 4. Use msg for Constants
```typescript
const ERRORS = {
  required: msg`This field is required`,
  invalid: msg`Invalid input`,
  tooLong: msg`Input is too long`
};
```

## Common Patterns

### Form Validation Messages
```typescript
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';

const validationMessages = {
  required: msg`This field is required`,
  email: msg`Please enter a valid email`,
  minLength: msg`Minimum length is {min} characters`
};

const MyForm = () => {
  const { _ } = useLingui();

  return (
    <input
      required
      aria-invalid={hasError}
      aria-errormessage={_(validationMessages.required)}
    />
  );
};
```

### Dynamic Content
```typescript
import { Trans } from '@lingui/react/macro';

const ProductCard = ({ product }) => {
  return (
    <div>
      <Trans>
        Posted by {product.userName} on {product.createdAt}
      </Trans>
    </div>
  );
};
```

### Conditional Messages
```typescript
const status = isAvailable
  ? _(msg`Available`)
  : _(msg`Sold Out`);

return <Badge>{status}</Badge>;
```

## Testing i18n

### Mock i18n in Tests
```typescript
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render } from '@testing-library/react';

// Activate test locale
i18n.load('en', {});
i18n.activate('en');

const renderWithI18n = (ui: React.ReactElement) => {
  return render(
    <I18nProvider i18n={i18n}>
      {ui}
    </I18nProvider>
  );
};
```

### Test Different Locales
```typescript
it('displays in Czech', () => {
  i18n.load('cs', {
    'Hello World': 'Ahoj Světe'
  });
  i18n.activate('cs');

  const { getByText } = renderWithI18n(<Component />);
  expect(getByText('Ahoj Světe')).toBeInTheDocument();
});
```

## TypeScript Integration

### Type-Safe Locale
```typescript
type SupportedLocale = 'en' | 'cs' | 'fr' | 'ru';

const setLocale = (locale: SupportedLocale) => {
  i18n.activate(locale);
};
```

### Message Descriptor Type
```typescript
import { MessageDescriptor } from '@lingui/core';

interface TranslatedMessages {
  title: MessageDescriptor;
  description: MessageDescriptor;
}
```

## Performance Tips

1. **Compile messages** - Always run `npm run compile` before production
2. **Lazy load** - Use dynamic imports for large translation files
3. **Extract regularly** - Run `npm run extract` frequently during development
4. **Cache locale** - Store user's language preference in localStorage

## Workflow

### Development Workflow
1. Write code with `<Trans>` and `msg` macros
2. Run `npm run extract` to extract new strings
3. Translate messages in `.po` files
4. Run `npm run compile` to compile catalogs
5. Test different languages

### Translation Workflow
1. Developer: Extract messages (`npm run extract`)
2. Translator: Translate in `.po` files
3. Developer: Compile messages (`npm run compile`)
4. CI/CD: Verify all translations compile

## When to Use This Skill
- Adding new translatable text to the app
- Setting up language switching
- Formatting dates, numbers, or currencies
- Working with pluralization rules
- Extracting and compiling translations
- Testing multilingual features
- Implementing RTL support (future)
- Managing translation catalogs
