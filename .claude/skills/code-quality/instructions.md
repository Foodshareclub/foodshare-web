# Code Quality Tools Skill

## Overview
Expert guidance for maintaining code quality with ESLint, Prettier, and Lefthook for automated linting, formatting, and git hooks.

## Tech Stack Context
- **ESLint**: 9.28.0 (Linting)
- **Prettier**: 3.5.3 (Formatting)
- **Lefthook**: 2.0.4 (Git hooks)
- **TypeScript ESLint**: 8.46.4

## ESLint Configuration

### Modern Flat Config (eslint.config.js)
```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  prettier
];
```

### TypeScript-Specific Rules
```javascript
{
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports'
    }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/ban-ts-comment': ['error', {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,
      'ts-nocheck': true
    }]
  }
}
```

### React Rules
```javascript
{
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 19
    'react/prop-types': 'off', // Using TypeScript
    'react/jsx-no-target-blank': 'error',
    'react/jsx-key': 'error',
    'react/no-array-index-key': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
}
```

## Prettier Configuration

### .prettierrc.json
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

### .prettierignore
```
# Dependencies
node_modules/
.pnp/
.pnp.js

# Build
dist/
build/
.next/
out/

# Coverage
coverage/

# Cache
.cache/
.eslintcache
.prettierrc

# Generated
*.compiled.js
*.min.js
```

## Lefthook Git Hooks

### lefthook.yml Configuration
```yaml
# Git hooks managed by Lefthook
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{js,jsx,ts,tsx}"
      run: npm run lint -- {staged_files}
      stage_fixed: true

    format:
      glob: "*.{js,jsx,ts,tsx,json,css,scss,md}"
      run: npm run format -- {staged_files}
      stage_fixed: true

    type-check:
      glob: "*.{ts,tsx}"
      run: npm run type-check

pre-push:
  commands:
    test:
      run: npm test

    build:
      run: npm run build

commit-msg:
  commands:
    check-message:
      run: |
        commit_msg=$(cat {1})
        if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"; then
          echo "Commit message must follow conventional commits format"
          echo "Example: feat: add new feature"
          exit 1
        fi
```

### Conventional Commits
```bash
# Format: <type>(<scope>): <description>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style (formatting, semicolons, etc.)
refactor: # Code refactoring
test:     # Adding tests
chore:    # Maintenance tasks
perf:     # Performance improvements
ci:       # CI/CD changes
build:    # Build system changes
revert:   # Revert previous commit

# Examples:
feat: add product search functionality
fix: resolve map marker clustering issue
docs: update README with installation steps
refactor: simplify authentication logic
test: add tests for ProductCard component
```

## NPM Scripts

### package.json Scripts
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint src --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,scss,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,scss,md}\"",
    "type-check": "tsc --noEmit",
    "prepare": "lefthook install"
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
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### .vscode/extensions.json
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

## Common ESLint Rules

### Disable Rules for Specific Lines
```typescript
// Disable next line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = fetchData();

// Disable for entire file
/* eslint-disable @typescript-eslint/no-explicit-any */
```

### Ignore Patterns
```javascript
// eslint.config.js
export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '**/*.config.js',
      'coverage/**'
    ]
  }
];
```

## Fixing Common Issues

### Auto-fix ESLint Issues
```bash
npm run lint:fix
```

### Format All Files
```bash
npm run format
```

### Fix Specific File
```bash
npx eslint src/components/Product.tsx --fix
npx prettier --write src/components/Product.tsx
```

## Pre-commit Workflow

### What Happens on Commit
1. **Lefthook triggers** pre-commit hook
2. **ESLint runs** on staged files
3. **Prettier formats** staged files
4. **TypeScript type-checks** staged files
5. **Auto-fixes** are staged
6. **Commit proceeds** if all checks pass

### Skip Hooks (Emergency Only)
```bash
# Skip pre-commit hooks
git commit -m "message" --no-verify

# Skip specific hook
LEFTHOOK=0 git commit -m "message"
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run type-check
```

## Common Patterns

### Ignore Generated Files
```javascript
// eslint.config.js
{
  ignores: [
    'src/locales/**/*.js', // Lingui compiled messages
    '**/*.compiled.js',
    'vite.config.ts.timestamp-*'
  ]
}
```

### Custom Rules for Tests
```javascript
{
  files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'off'
  }
}
```

### Project-Specific Rules
```javascript
{
  rules: {
    // Enforce import order
    'sort-imports': ['error', {
      ignoreCase: true,
      ignoreDeclarationSort: true
    }],

    // Prevent console.log in production
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

    // Enforce React best practices
    'react/jsx-no-bind': 'warn',
    'react/jsx-pascal-case': 'error'
  }
}
```

## Troubleshooting

### ESLint Not Working
```bash
# Clear cache
rm -rf node_modules/.cache/eslint

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check ESLint version
npx eslint --version
```

### Prettier Conflicts
```bash
# Ensure eslint-config-prettier is last in config
# Disable conflicting rules
npx eslint-config-prettier src/index.tsx
```

### Lefthook Issues
```bash
# Reinstall hooks
npx lefthook uninstall
npx lefthook install

# Test hooks manually
npx lefthook run pre-commit
```

## Best Practices

1. **Run linter regularly** - Don't wait for commits
2. **Fix warnings** - Don't ignore them
3. **Use auto-fix** - Let tools format code
4. **Consistent config** - Share across team
5. **Update regularly** - Keep tools current
6. **Document exceptions** - Explain disable comments
7. **CI enforcement** - Fail builds on errors
8. **Editor integration** - Format on save

## Code Review Checklist

- [ ] No ESLint errors
- [ ] No TypeScript errors
- [ ] Code is formatted with Prettier
- [ ] Conventional commit message
- [ ] Tests pass
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Proper error handling
- [ ] Accessible components

## Maintenance

### Update Dependencies
```bash
# Check for updates
npx npm-check-updates

# Update ESLint
npm install eslint@latest --save-dev

# Update Prettier
npm install prettier@latest --save-dev

# Update Lefthook
npm install @evilmartians/lefthook@latest --save-dev
```

### Migration to New ESLint Version
```bash
# Use ESLint migration tool
npx @eslint/migrate-config .eslintrc.json
```

## When to Use This Skill
- Setting up linting and formatting
- Configuring git hooks
- Fixing ESLint errors
- Formatting code automatically
- Enforcing code quality standards
- Setting up CI/CD quality checks
- Troubleshooting linter issues
- Creating custom ESLint rules
- Maintaining code consistency across team
