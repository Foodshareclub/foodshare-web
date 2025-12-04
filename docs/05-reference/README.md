# 📖 Reference Documentation

API references, utilities, and technical specifications for FoodShare.

## 📚 Documentation in This Section

### [API_REFERENCE.md](./API_REFERENCE.md)

Complete API documentation.

- Supabase tables & queries
- Edge functions
- Real-time subscriptions
- Storage APIs

### [TECH_STACK.md](./TECH_STACK.md)

Technologies and libraries used.

- Frontend stack
- Backend services
- Build tools
- Dependencies

### [UTILITIES.md](./UTILITIES.md)

Helper functions and utilities.

- Date/time utilities
- String formatting
- Distance calculations
- Image processing

### [EXAMPLES.md](./EXAMPLES.md)

Code examples and patterns.

- Component examples
- API call patterns
- Redux patterns
- Common use cases

### [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

Quick reference guide.

- Common commands
- Keyboard shortcuts
- File locations
- Quick tips

### [AI_PROMPTS.md](./AI_PROMPTS.md)

AI prompts for development.

- Code generation prompts
- Documentation prompts
- Debugging prompts
- Refactoring prompts

### [ROADMAP_VISUAL.md](./ROADMAP_VISUAL.md)

Project roadmap and future plans.

- Completed features
- In progress
- Planned features
- Long-term vision

## 🎯 Quick Links

### API Documentation

- [Supabase Tables](./API_REFERENCE.md#tables)
- [Edge Functions](./API_REFERENCE.md#edge-functions)
- [Real-time](./API_REFERENCE.md#realtime)
- [Storage](./API_REFERENCE.md#storage)

### Code Examples

- [Components](./EXAMPLES.md#components)
- [Hooks](./EXAMPLES.md#hooks)
- [Redux](./EXAMPLES.md#redux)
- [API Calls](./EXAMPLES.md#api-calls)

### Utilities

- [Date/Time](./UTILITIES.md#datetime)
- [Formatting](./UTILITIES.md#formatting)
- [Validation](./UTILITIES.md#validation)
- [Helpers](./UTILITIES.md#helpers)

## 🛠️ Tech Stack Overview

### Frontend

```
React 19.2.0          - UI library
TypeScript 5.9.3      - Type safety
Vite 7.2.2           - Build tool
Chakra UI 3.29.0     - Component library
Redux Toolkit 2.10.1  - State management
React Router 7.9.5    - Routing
Lingui 5.6.0         - i18n
Framer Motion 12.23   - Animations
```

### Backend

```
Supabase 2.81.1      - Backend-as-a-Service
PostgreSQL 15        - Database
PostGIS 3.4          - Geographic data
Edge Functions       - Serverless functions
```

### Maps & Location

```
Leaflet 1.9.4        - Interactive maps
React Leaflet        - React integration
PostGIS              - Geo queries
```

## 📡 API Quick Reference

### Supabase Client

```typescript
import { supabase } from "@/lib/supabase/client";

// Query
const { data, error } = await supabase.from("posts").select("*").eq("active", true);

// Insert
const { data, error } = await supabase.from("posts").insert({ title: "Food" });

// Update
const { data, error } = await supabase.from("posts").update({ title: "Updated" }).eq("id", postId);

// Delete
const { data, error } = await supabase.from("posts").delete().eq("id", postId);
```

### Real-time Subscriptions

```typescript
const subscription = supabase
  .channel("room")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
    },
    (payload) => {
      console.log("New message:", payload.new);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

### Storage

```typescript
// Upload
const { data, error } = await supabase.storage.from("public-images").upload(filePath, file);

// Get public URL
const { data } = supabase.storage.from("public-images").getPublicUrl(filePath);

// Delete
const { error } = await supabase.storage.from("public-images").remove([filePath]);
```

## 🔧 Common Utilities

### Distance Calculation

```typescript
import { getDistance } from "@/utils/getDistance";

const distance = getDistance(
  { lat: 50.0755, lng: 14.4378 }, // Prague
  { lat: 48.8566, lng: 2.3522 } // Paris
);
// Returns distance in kilometers
```

### Date Formatting

```typescript
import { formatDate } from "@/utils/formatDate";

const formatted = formatDate(new Date());
// Returns: "Dec 1, 2024"
```

### Image URL Generation

```typescript
import { createPhotoUrl } from "@/utils/createPhotoUrl";

const url = createPhotoUrl(imagePath);
// Returns full Supabase storage URL
```

## 📝 Code Patterns

### Component Pattern

```typescript
import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { Trans } from '@lingui/macro';

type Props = {
  title: string;
};

export const Component: React.FC<Props> = React.memo(({ title }) => {
  return (
    <Box>
      <Text><Trans>{title}</Trans></Text>
    </Box>
  );
});

Component.displayName = 'Component';
```

### Custom Hook Pattern

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export function useData(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from("table").select("*").eq("id", id).single();

      if (error) setError(error);
      else setData(data);
      setLoading(false);
    }

    fetchData();
  }, [id]);

  return { data, loading, error };
}
```

### Redux Slice Pattern

```typescript
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchData = createAsyncThunk("feature/fetchData", async (params, thunkAPI) => {
  try {
    const { data, error } = await api.getData(params);
    if (error) return thunkAPI.rejectWithValue(error);
    return data;
  } catch (e) {
    return thunkAPI.rejectWithValue(e);
  }
});

const slice = createSlice({
  name: "feature",
  initialState: { data: [], status: "idle" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = "loaded";
      });
  },
});
```

## 🔍 Finding Information

### By Technology

- **React**: Check [EXAMPLES.md](./EXAMPLES.md)
- **Supabase**: Check [API_REFERENCE.md](./API_REFERENCE.md)
- **Chakra UI**: Check [EXAMPLES.md](./EXAMPLES.md#chakra-ui)
- **Redux**: Check [EXAMPLES.md](./EXAMPLES.md#redux)

### By Task

- **API calls**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Utilities**: [UTILITIES.md](./UTILITIES.md)
- **Examples**: [EXAMPLES.md](./EXAMPLES.md)
- **Quick tips**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

## 📖 Related Documentation

- [Development Guide](../02-development/DEVELOPMENT_GUIDE.md)
- [Features](../03-features/)
- [Architecture](../02-development/ARCHITECTURE.md)

---

[← Back to Index](../00-INDEX.md)
