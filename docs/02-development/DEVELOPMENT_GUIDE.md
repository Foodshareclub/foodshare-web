# FoodShare Development Guide

**Last Updated:** November 2025

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (or yarn/pnpm)
- **Git**: For version control
- **Supabase Account**: For backend services

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd foodshare/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` file in the project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics
VITE_VERCEL_ANALYTICS_ID=your-analytics-id
```

**Where to find Supabase credentials:**

1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Settings → API
4. Copy "Project URL" and "anon/public" key

### 4. Start Development Server

```bash
npm run dev
```

Application opens at `http://localhost:5173`

---

## Development Workflow

### Daily Development

1. **Pull latest changes**

   ```bash
   git pull origin main
   ```

2. **Start dev server**

   ```bash
   npm run dev
   ```

3. **Make changes** to code

4. **Test changes** in browser (hot reload enabled)

5. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin your-branch
   ```

---

## Project Scripts

### Core Scripts

```bash
# Development
npm run dev          # Start dev server (Vite)
npm start            # Alias for dev

# Build
npm run build        # Type check + build for production
npm run preview      # Preview production build

# i18n (Translations)
npm run extract      # Extract translatable strings
npm run compile      # Compile translations
npm run add-locale   # Add new language
```

---

## Code Organization

### Adding a New Feature

#### 1. Create Component

```bash
# Create component file
touch src/components/myFeature/MyFeature.tsx
```

```typescript
// src/components/myFeature/MyFeature.tsx
import { Box, Text } from '@chakra-ui/react';
import { Trans } from '@lingui/macro';

export const MyFeature = () => {
  return (
    <Box>
      <Text>
        <Trans>My Feature</Trans>
      </Text>
    </Box>
  );
};
```

#### 2. Create API Methods (if needed)

```typescript
// src/api/myFeatureAPI.ts
import { supabase } from "@/lib/supabase/client";

export const myFeatureAPI = {
  getData() {
    return supabase.from("my_table").select("*");
  },
};
```

#### 3. Create Redux Slice (if needed)

```typescript
// src/store/slices/myFeatureReducer.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface MyFeatureState {
  data: any[];
  loading: boolean;
}

const initialState: MyFeatureState = {
  data: [],
  loading: false,
};

export const myFeatureSlice = createSlice({
  name: "myFeature",
  initialState,
  reducers: {
    setData(state, action: PayloadAction<any[]>) {
      state.data = action.payload;
    },
  },
});

export const { setData } = myFeatureSlice.actions;
export default myFeatureSlice.reducer;
```

#### 4. Add to Redux Store

```typescript
// src/store/redux-store.ts
import myFeatureReducer from "./slices/myFeatureReducer";

export const store = configureStore({
  reducer: {
    // ... existing reducers
    myFeature: myFeatureReducer,
  },
});
```

#### 5. Create Page (if needed)

```typescript
// src/pages/myFeaturePage/MyFeaturePage.tsx
import { MyFeature } from '@/components/myFeature/MyFeature';

export const MyFeaturePage = () => {
  return <MyFeature />;
};
```

#### 6. Add Route

```typescript
// src/App.tsx
import { MyFeaturePage } from './pages/myFeaturePage/MyFeaturePage';

// In router configuration
<Route path="/my-feature" element={<MyFeaturePage />} />
```

---

## Internationalization (i18n)

### Adding Translations

#### 1. Mark Strings for Translation

```tsx
import { Trans, t } from "@lingui/macro";

// In JSX
<Trans>Hello World</Trans>;

// In strings/attributes
const placeholder = t`Enter your name`;
```

#### 2. Extract Strings

```bash
npm run extract
```

This creates/updates `.po` files in `src/locales/{locale}/`

#### 3. Translate in .po Files

Open `src/locales/cs/messages.po` (example for Czech):

```po
msgid "Hello World"
msgstr "Ahoj Světe"
```

#### 4. Compile Translations

```bash
npm run compile
```

This generates `.js` files that the app uses at runtime.

#### 5. Add New Language

```bash
npm run add-locale -- cs  # Example: Czech
```

---

## Working with Supabase

### Database Changes

1. **Make changes in Supabase Dashboard**
   - Go to Table Editor
   - Modify schema

2. **Update TypeScript types**
   - Update type definitions in `src/api/` files
   - Add new API methods if needed

3. **Test locally**
   ```bash
   npm run dev
   ```

### Storage (Images)

#### Upload Image

```typescript
const uploadImage = async (file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `images/${fileName}`;

  const { data, error } = await supabase.storage.from("public-images").upload(filePath, file);

  if (error) throw error;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("public-images").getPublicUrl(filePath);

  return publicUrl;
};
```

---

## Styling Guidelines

### Chakra UI

```tsx
// Use Chakra components
import { Box, Button, Text } from "@chakra-ui/react";

<Box bg="gray.100" p={4} borderRadius="md">
  <Text fontSize="xl" fontWeight="bold">
    Title
  </Text>
  <Button colorScheme="green" size="lg">
    Click Me
  </Button>
</Box>;
```

### Custom Styles

```tsx
// Use sx prop for custom styles
<Box
  sx={{
    "&:hover": {
      bg: "gray.200",
    },
  }}
>
  Content
</Box>
```

### Responsive Design

```tsx
// Use responsive array syntax
<Box width={{ base: "100%", md: "50%", lg: "33%" }} fontSize={["sm", "md", "lg"]}>
  Responsive Content
</Box>
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

```typescript
// src/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

---

## Git Workflow

### Branch Naming

- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation changes

### Commit Messages

Follow conventional commits:

```bash
feat: add user profile page
fix: resolve chat message duplication
refactor: simplify product card component
docs: update API documentation
style: format code with prettier
test: add tests for chat functionality
```

### Pull Request Process

1. Create feature branch

   ```bash
   git checkout -b feat/my-feature
   ```

2. Make changes and commit

   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

3. Push to remote

   ```bash
   git push origin feat/my-feature
   ```

4. Create Pull Request on GitHub

5. Request review

6. Merge when approved

---

## Debugging

### Browser DevTools

1. **React DevTools**: Inspect component tree
2. **Redux DevTools**: Monitor state changes
3. **Network Tab**: Check API requests
4. **Console**: View logs and errors

### Common Issues

#### Supabase Connection Error

```
Error: Invalid API key
```

**Fix**: Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

#### Import Path Error

```
Cannot find module '@/components/...'
```

**Fix**: Check `tsconfig.json` has path alias configured:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### Translation Not Working

```
String not translated
```

**Fix**: Run `npm run extract` then `npm run compile`

---

## Performance Optimization

### Code Splitting

Use React lazy loading:

```typescript
import { lazy, Suspense } from 'react';

const MyHeavyComponent = lazy(() =>
  import('./components/MyHeavyComponent')
);

<Suspense fallback={<div>Loading...</div>}>
  <MyHeavyComponent />
</Suspense>
```

### Image Optimization

1. Use appropriate image formats (WebP, JPEG)
2. Compress images before upload
3. Use lazy loading for images
4. Implement responsive images

### Bundle Analysis

```bash
npm run build
# Check dist/ folder size
```

---

## Deployment

### Build for Production

```bash
npm run build
```

Outputs to `dist/` folder.

### Deploy to Vercel

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Deploy**

   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables** in Vercel Dashboard

---

## Troubleshooting

### Clear Cache

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Reset Vite Cache

```bash
rm -rf .vite
npm run dev
```

---

## Resources

- **React**: [reactjs.org](https://reactjs.org)
- **TypeScript**: [typescriptlang.org](https://www.typescriptlang.org)
- **Chakra UI**: [chakra-ui.com](https://chakra-ui.com)
- **Redux Toolkit**: [redux-toolkit.js.org](https://redux-toolkit.js.org)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Vite**: [vitejs.dev](https://vitejs.dev)
- **Lingui**: [lingui.dev](https://lingui.dev)

---

**Next Steps:**

- Review [Architecture](ARCHITECTURE.md) for system design
- See [API Reference](API_REFERENCE.md) for API usage
- Read [Database Schema](DATABASE_SCHEMA.md) for data structure
