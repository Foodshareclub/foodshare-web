# 🔧 Development Documentation

Core development guides, architecture, and best practices for FoodShare.

## 📚 Documentation in This Section

### Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Database structure & relationships
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - Development workflows

### Code Quality

- **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** - Code style & conventions
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing strategies & QA

### Performance

- **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)** - Optimization techniques
- **[120FPS_GUIDE.md](./120FPS_GUIDE.md)** - Ultra-smooth performance

### Internationalization

- **[I18N_GUIDE.md](./I18N_GUIDE.md)** - Translation system & workflow

## 🎯 Quick Links by Task

### Understanding the System

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Review [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
3. Check [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

### Writing Code

1. Follow [STYLE_GUIDE.md](./STYLE_GUIDE.md)
2. Apply [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)
3. Test with [TESTING_GUIDE.md](./TESTING_GUIDE.md)

### Working with Translations

1. Read [I18N_GUIDE.md](./I18N_GUIDE.md)
2. Extract: `npm run extract`
3. Compile: `npm run compile`

## 🏗️ Tech Stack

### Frontend

- React 19 + TypeScript
- Vite 7 (build tool)
- Chakra UI v3 (components)
- Redux Toolkit (state)
- React Router v7 (routing)
- Lingui (i18n)

### Backend

- Supabase (BaaS)
  - PostgreSQL + PostGIS
  - Authentication
  - Real-time
  - Storage
  - Edge Functions

### Maps

- Leaflet + React Leaflet
- PostGIS for geo queries

## 💡 Best Practices

### Component Structure

```typescript
// 1. Imports
import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';

// 2. Types
type Props = { title: string };

// 3. Component (memoized)
export const Component: React.FC<Props> = React.memo(({ title }) => {
  // 4. Hooks
  const [state, setState] = useState();

  // 5. Render
  return <Box>{title}</Box>;
});

Component.displayName = 'Component';
```

### Performance Tips

- Use `React.memo` for components
- Wrap callbacks with `useCallback`
- Memoize computations with `useMemo`
- Lazy load images: `loading="lazy"`
- Code split routes with `React.lazy()`

### i18n Pattern

```typescript
import { Trans, t } from '@lingui/macro';

// In JSX
<Text><Trans>Hello World</Trans></Text>

// In attributes
<Input placeholder={t`Enter name`} />
```

## 🔍 Common Patterns

### API Calls (Supabase)

```typescript
const { data, error } = await supabase.from("posts").select("*").eq("active", true);

if (error) {
  console.error("Error:", error);
  return;
}
```

### Redux Async Thunk

```typescript
export const fetchData = createAsyncThunk("feature/fetchData", async (params, thunkAPI) => {
  try {
    const { data, error } = await api.getData(params);
    if (error) return thunkAPI.rejectWithValue(error);
    return data;
  } catch (e) {
    return thunkAPI.rejectWithValue(e);
  }
});
```

### Real-time Subscription

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('room')
    .on('postgres_changes', { ... }, handler)
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

## 📖 Related Documentation

- [Features](../03-features/) - Feature-specific docs
- [Reference](../05-reference/) - API & utilities
- [Deployment](../04-deployment/) - Production setup

---

[← Back to Index](../00-INDEX.md)
