# Code Quality for Next.js 16

## Overview

Code quality tools and standards for Next.js 16: ESLint, Prettier, TypeScript strict mode, and git hooks.

## ESLint Configuration

### next.config.ts Integration

```typescript
// next.config.ts
const nextConfig = {
  eslint: {
    dirs: ["src"],
  },
};
```

### eslint.config.mjs (Flat Config)

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

export default eslintConfig;
```

## TypeScript Strict Mode

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### TypeScript Rules

- Never use `any` - use `unknown` for truly unknown types
- Never use `!` non-null assertions - check existence first
- Use `satisfies` for type-checking object literals
- Explicit return types for exported functions

## Prettier Configuration

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### .prettierignore

```
.next/
node_modules/
coverage/
*.min.js
```

## NPM Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "test:build": "npm run type-check && npm run lint && npm run build"
  }
}
```

## Next.js Specific Linting

### Server Component Rules

```javascript
// Ensure 'use client' is used correctly
{
  rules: {
    // Warn about useEffect in files without 'use client'
    'react-hooks/rules-of-hooks': 'error',
  }
}
```

### Import Organization

```javascript
// Enforce consistent imports
{
  rules: {
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling'],
        'index',
      ],
      pathGroups: [
        { pattern: 'react', group: 'external', position: 'before' },
        { pattern: 'next/**', group: 'external', position: 'before' },
        { pattern: '@/**', group: 'internal', position: 'before' },
      ],
      'newlines-between': 'always',
    }],
  }
}
```

## VSCode Integration

### .vscode/settings.json

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Pre-commit Workflow

### Simple Git Hook (package.json)

```json
{
  "scripts": {
    "precommit": "npm run type-check && npm run lint"
  }
}
```

### With Lefthook (lefthook.yml)

```yaml
pre-commit:
  parallel: true
  commands:
    types:
      run: npm run type-check
    lint:
      glob: "*.{ts,tsx}"
      run: npm run lint
    format:
      glob: "*.{ts,tsx,json,css,md}"
      run: npx prettier --check {staged_files}
```

## Common Patterns

### Disable for Specific Lines

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = legacyFunction();

/* eslint-disable @typescript-eslint/no-unused-vars */
// Multiple lines
/* eslint-enable @typescript-eslint/no-unused-vars */
```

### Ignore Files

```javascript
// eslint.config.mjs
{
  ignores: [".next/**", "node_modules/**", "coverage/**", "*.config.{js,mjs,ts}"];
}
```

## Fixing Issues

```bash
# Fix all lint errors
npm run lint:fix

# Format all files
npm run format

# Check types
npm run type-check

# Full quality check
npm run test:build
```

## When to Use This Skill

- Setting up ESLint for Next.js
- Configuring Prettier
- Enforcing TypeScript strict mode
- Setting up pre-commit hooks
- Fixing lint and type errors
