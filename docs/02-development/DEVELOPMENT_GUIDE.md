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

### DevTools Component (Recommended)

FoodShare includes a `DevTools` component that initializes the logger system and provides a visual log viewer. This is the recommended way to enable dev tools in your app.

**Usage:**

Add to your root layout:

```tsx
import { DevTools } from '@/components/dev/DevTools';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <DevTools />
      </body>
    </html>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showLogViewer` | `boolean` | `true` | Show the floating log viewer panel |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Position of the log viewer |
| `version` | `string` | `undefined` | App version to display in console banner |

**Example with options:**

```tsx
<DevTools 
  showLogViewer={true} 
  position="bottom-left" 
  version="1.2.3" 
/>
```

The component automatically hides in production (`NODE_ENV === 'production'`).

### Built-in Log Viewer (Dev Only)

The `LogViewer` component (used by `DevTools`) displays error history from the logger system.

**Features:**
- Floating toggle button with configurable position
- Filter logs by level (error, warn, info, debug, success)
- Search logs by message or component name
- Expandable log entries with context and stack traces
- Export logs to JSON
- Copy individual log entries
- Pin panel to keep it visible
- Minimize/expand panel
- Auto-scroll to latest logs
- Badge showing log count with color-coded severity
- Auto-refreshes every 500ms
- Pulses red when errors are present

**Standalone usage (if not using DevTools):**

```tsx
import { LogViewer } from '@/components/dev/LogViewer';

// Default position (bottom-right)
<LogViewer />

// Custom position
<LogViewer position="bottom-left" />
<LogViewer position="top-right" />
<LogViewer position="top-left" />
```

**Logging to the viewer:**

```typescript
import { logger } from '@/lib/logger';

// These logs appear in the LogViewer
logger.error('Something failed', { component: 'MyComponent', action: 'fetch' });
logger.warn('Deprecation warning');
logger.info('User action', { userId: '123' });
logger.debug('Debug info');
```

### Pretty Logger (Recommended)

The `pretty` logger provides beautiful, structured console output with automatic environment detection (browser vs server).

```typescript
import { pretty } from '@/lib/logger';

// Basic log levels
pretty.info('User logged in', { component: 'Auth' });
pretty.success('Product created', { component: 'ProductForm' });
pretty.warn('Rate limit approaching');
pretty.error('Failed to save', new Error('Network error'), { component: 'API' });

// API request logging
pretty.api('GET', '/api/products', 200, 45, 1024); // method, url, status, duration(ms), size(bytes)

// Database query logging
pretty.db('SELECT', 'posts', 12, 50); // operation, table, duration(ms), rowCount

// Performance measurements
pretty.perf('render', 45); // name, duration(ms)
pretty.perf('hydration', 120, { components: 15 }); // with metadata

// Cache operations (browser only)
pretty.cache('hit', 'products:list');
pretty.cache('miss', 'user:123');

// Component lifecycle (dev only, browser only)
pretty.render('ProductCard', 'mount', { id: '123' });

// Auth events (browser only)
pretty.auth('login', 'user-123', { provider: 'google' });

// Visual helpers
pretty.divider('Section');
pretty.banner(); // FoodShare branded header
pretty.table('Products', [{ id: 1, name: 'Apple' }]);
```

The logger automatically adapts output styling for browser (CSS) and server (ANSI colors).

### Console Theme (Visual Output)

For scripts, CLI tools, or startup sequences, use the `theme` utilities for beautiful ASCII art and visual feedback:

```typescript
import { theme, printBanner, printProgress } from '@/lib/logger';

// FoodShare ASCII banner
theme.banner();

// Section headers
theme.section('Database Migration', '🗄️');

// Environment info badge
theme.envInfo(); // Shows "DEVELOPMENT" or "PRODUCTION" with color

// Key-value pairs
theme.keyValue('Version', '1.0.0', '📦');
theme.keyValue('Users', 1234);

// Status boxes
theme.successBox('Migration completed successfully');
theme.errorBox('Failed to connect to database');
theme.warningBox('Using fallback configuration');

// Progress bars
theme.progress(75, 100, 'Processing'); // ████████████████░░░░ 75%

// Timeline events
theme.timeline('10:30:45', 'Server started', 'success');
theme.timeline('10:30:46', 'Database connected', 'success');
theme.timeline('10:30:47', 'Cache warming', 'pending');
```

All theme functions automatically adapt to browser (CSS styling) and server (ANSI colors).

### Network Logger

The `network` logger provides beautiful network request/response logging with waterfall visualization for debugging API calls:

```typescript
import { network } from '@/lib/logger';

// Track request lifecycle
const requestId = network.start('GET', '/api/products'); // Returns unique ID
// ... make request ...
network.end(requestId, 200, 1024); // status, size in bytes

// Log complete request (simpler API)
network.log('POST', '/api/products', 201, 45, {
  size: 256,
  requestBody: { name: 'Apple' },
  responseBody: { id: 1, name: 'Apple' },
  headers: { 'Content-Type': 'application/json' },
});

// View waterfall visualization (browser only)
network.waterfall(); // Shows timing diagram of all logged requests

// Get logged entries programmatically
const entries = network.getEntries();

// Clear network log
network.clear();
```

The network logger automatically:
- Color-codes HTTP methods (GET=green, POST=blue, DELETE=red)
- Shows status with emoji indicators (✅ 2xx, ⚠️ 4xx, ❌ 5xx)
- Formats timing (μs, ms, s) and size (B, KB, MB)
- Groups detailed request/response data in collapsible console groups

### Console Interceptor

The `interceptor` utility globally intercepts and beautifies all console output with timestamps, emojis, and color-coding. It also maintains a buffer of recent logs for debugging.

```typescript
import { interceptor } from '@/lib/logger/interceptor';

// Start intercepting console output
interceptor.start();

// All console methods now have timestamps and styling
console.log('Hello');      // 12:30:45.123 Hello
console.info('Info');      // ℹ️ 12:30:45.124 Info
console.warn('Warning');   // ⚠️ 12:30:45.125 Warning
console.error('Error');    // ❌ 12:30:45.126 Error
console.debug('Debug');    // 🔍 12:30:45.127 Debug (dev only)

// Check if intercepting
interceptor.isActive(); // true

// Access buffered logs (last 500 entries)
const logs = interceptor.getBuffer();
// [{ level: 'log', args: ['Hello'], timestamp: Date }, ...]

// Export buffer as JSON (useful for bug reports)
const json = interceptor.exportBuffer();

// Clear the buffer
interceptor.clearBuffer();

// Stop intercepting and restore original console
interceptor.stop();

// Access original console methods (bypass interception)
interceptor.original.log('Unformatted output');
```

**Features:**
- Automatic environment detection (browser CSS vs server ANSI colors)
- Timestamps on all log output
- Emoji indicators for log levels
- Maintains rolling buffer of last 500 log entries
- Export buffer as JSON for debugging/bug reports
- Access to original console methods when needed

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
