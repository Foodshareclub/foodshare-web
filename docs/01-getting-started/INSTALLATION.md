# FoodShare Installation Guide

Complete setup instructions for the FoodShare web application.

## Prerequisites

Before starting, ensure you have:

- **Bun 1.2+** - Primary runtime and package manager
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/)

Verify installations:

```bash
bun --version   # Should be 1.2.x or higher
git --version   # Any recent version
```

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd foodshare/frontend
```

### 2. Install Dependencies

This will automatically install Lefthook git hooks via the `prepare` script:

```bash
bun install
```

**What gets installed:**

- Next.js 16 (App Router) + React 19
- shadcn/ui + Tailwind CSS 4
- Zustand state management
- next-intl internationalization
- Supabase client (@supabase/ssr)
- Lefthook git hooks
- ESLint + Prettier
- TypeScript 5
- And all other dependencies...

### 3. Configure Environment

Create `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://backend.foodshare.club
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Settings > API
4. Copy "Project URL" and "anon public" key

### 4. Verify Setup

```bash
# Start development server
bun run dev

# Should open at http://localhost:3000
```

**Verify git hooks:**

```bash
bunx lefthook version
# Should show: Lefthook version 1.10.10 (or similar)

ls -la .git/hooks/ | grep -E "(pre-commit|commit-msg|pre-push)"
# Should show installed hooks
```

### 5. Test Commit

```bash
# Create a test file
echo "// test" > test.txt
git add test.txt

# Try committing (should trigger hooks)
git commit -m "test: verify hooks work"

# Hooks will run:
# ✓ Security check
# ✓ ESLint
# ✓ Prettier
# ✓ TypeScript type-check
# ✓ Commit message validation
```

If everything passes, you're all set! 🎉

## Development Workflow

### Daily Development

```bash
# Start dev server with hot reload
bun run dev

# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run type-check

# Build for production
bun run build
```

### Git Workflow

**Normal commits** (hooks run automatically):

```bash
git add .
git commit -m "feat(products): add filtering by category"
# Hooks check: security, lint, format, type-check
```

**Commit message format** (enforced by hooks):

```
<type>(<scope>): <description>

Examples:
feat(chat): add real-time message notifications
fix(map): resolve marker clustering performance issue
docs: update API documentation
refactor(auth): simplify login flow
test(products): add unit tests for filtering
```

**Valid types:** feat, fix, docs, style, refactor, test, chore, perf, ci, build

**Common scopes:** products, chat, map, auth, ui, api, i18n

**Pushing to remote:**

```bash
git push
# Hooks run: tests, build validation, protected branch check
```

### Working with Translations

```bash
# Extract translatable strings
bun run extract

# Compile translations for runtime
bun run compile

# Add a new locale
bun run add-locale
```

## Project Structure

```
foodshare/frontend/
├── src/
├── src/
│   ├── app/              # Next.js App Router (pages/layouts)
│   ├── assets/           # Images, icons, static files
│   ├── components/       # UI components (shadcn/ui in src/components/ui/)
│   ├── hooks/            # Custom React hooks (React Query in src/hooks/queries/)
│   ├── lib/              # Core logic, Supabase clients, utils
│   ├── messages/         # i18n translations (.json files)
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript type definitions
│   └── proxy.ts          # Core request handler (Next.js 16 Proxy)
├── scripts/              # Build and automation scripts
├── context/              # Project documentation
├── public/               # Static assets
├── lefthook.yml          # Git hooks configuration
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.json        # ESLint configuration
├── .prettierrc           # Prettier configuration
└── package.json          # Dependencies and scripts
```

## Configuration Files

### Vite Configuration (`vite.config.ts`)

Build tool configuration:

- Development server settings
- Build optimizations
- Plugin configurations
- Path aliases (`@/` = `src/`)

### TypeScript (`tsconfig.json`)

TypeScript compiler options:

- Strict type checking enabled
- Path aliases configured
- React JSX support

### ESLint (`.eslintrc.json`)

Code quality rules:

- React and React Hooks rules
- TypeScript-specific rules
- Prettier integration

### Prettier (`.prettierrc`)

Code formatting settings:

- 2-space indentation
- Double quotes
- 100 character line width
- Semicolons enabled

### Lefthook (`lefthook.yml`)

Git hooks automation:

- Pre-commit: Security, lint, format, type-check
- Commit-msg: Message format validation
- Pre-push: Tests, build, branch protection
- Post-checkout: Dependency checks
- Post-merge: Auto bun install

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/`:

   ```tsx
   // src/pages/NewFeaturePage.tsx
   export const NewFeaturePage = () => {
     return <div>New Feature</div>;
   };
   ```

2. Add route in `src/app/App.tsx`:

   ```tsx
   <Route path="/new-feature" element={<NewFeaturePage />} />
   ```

3. Add to navigation if needed

### Adding a Redux Slice

1. Create slice in `src/store/slices/`:

   ```typescript
   // src/store/slices/newFeatureSlice.ts
   import { createSlice } from "@reduxjs/toolkit";

   export const newFeatureSlice = createSlice({
     name: "newFeature",
     initialState: {},
     reducers: {},
   });
   ```

2. Add to store in `src/store/redux-store.ts`

3. Create custom hook in `src/hooks/useNewFeature.ts`

### Adding API Methods

1. Add method to appropriate API file in `src/api/`:

   ```typescript
   // src/api/newFeatureAPI.ts
   export const newFeatureAPI = {
     async getData() {
       const { data, error } = await supabase.from("table_name").select("*");

       if (error) throw error;
       return data;
     },
   };
   ```

2. Call from components using hooks

### Adding Translations

1. Mark strings for translation:

   ```tsx
   import { t } from "@lingui/macro";

   <button>{t`Save Changes`}</button>;
   ```

2. Extract and compile:

   ```bash
   bun run extract
   bun run compile
   ```

3. Translate in `src/locales/{locale}/messages.po`

## Troubleshooting

### Port Already in Use

If port 3000 is in use:

```bash
# Kill process on port 3000
bunx kill-port 3000

# Or use a different port
bun run dev -- --port 3001
```

### Hooks Not Running

If git hooks aren't executing:

```bash
# Reinstall hooks
bunx lefthook install

# Verify installation
ls -la .git/hooks/pre-commit
```

### ESLint Errors

Fix linting errors automatically:

```bash
bun run lint -- --fix
```

### TypeScript Errors

Check type errors:

```bash
bun run type-check
```

### Environment Variables Not Loading

1. Verify `.env` file exists in project root
2. Ensure variables use `NEXT_PUBLIC_` prefix for client access
3. Restart dev server after .env changes
4. Check variables are not quoted incorrectly

### Build Failures

Common solutions:

```bash
# Clear cache and rebuild
rm -rf node_modules dist
bun install
bun run build
```

### Supabase Connection Issues

1. Verify credentials in `.env`
2. Check Supabase project is running
3. Verify API keys are not expired
4. Check network connectivity

## Skipping Git Hooks

**Emergency only!** Sometimes you need to skip hooks:

```bash
# Skip all hooks for one commit
LEFTHOOK=0 git commit -m "emergency fix"

# Or use git flag
git commit --no-verify -m "emergency fix"

# Skip specific commands
LEFTHOOK_EXCLUDE=lint,format git commit -m "WIP"

# Skip pre-push hooks
git push --no-verify
```

**Use sparingly** - hooks exist to maintain code quality!

## Additional Resources

- **Project Documentation**: `context/INDEX.md`
- **Architecture Guide**: `context/ARCHITECTURE.md`
- **API Reference**: `context/API_REFERENCE.md`
- **Tech Stack**: `context/TECH_STACK.md`
- **Development Guide**: `context/DEVELOPMENT_GUIDE.md`
- **Lefthook Setup**: `LEFTHOOK_SETUP.md`
- **Scripts Documentation**: `scripts/README.md`

## Getting Help

1. Check documentation in `context/` directory
2. Review error messages carefully
3. Search for similar issues in project history
4. Ask team members for guidance

## Next Steps

After installation:

1. **Explore the codebase**: Start with `src/app/App.tsx` and `src/pages/`
2. **Read documentation**: Check `context/` directory for detailed guides
3. **Run the app**: `bun run dev` and explore features
4. **Make a test commit**: Verify git hooks work correctly
5. **Join team communication**: Get added to project channels

---

**Installation Complete!** 🚀

You're ready to start developing FoodShare. Happy coding!
