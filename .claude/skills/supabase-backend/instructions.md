# Supabase Backend Integration Skill

## Overview
Expert guidance for integrating Supabase as a backend service with authentication, PostgreSQL database, storage, and real-time subscriptions.

## Tech Stack Context
- **Supabase JS**: 2.84.0
- **Features**: Auth, Database (PostgreSQL), Storage, Real-time, Edge Functions

## Setup and Configuration

### Client Initialization
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Authentication

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      username: 'username',
      avatar_url: 'url'
    }
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

### OAuth Providers
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

### Session Management
```typescript
// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Handle sign in
  }
  if (event === 'SIGNED_OUT') {
    // Handle sign out
  }
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

## Database Operations

### Type-Safe Queries
```typescript
// Define database types
interface Product {
  id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  created_at: string;
  user_id: string;
}

// Fetch data
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', userId);
```

### CRUD Operations

#### Create
```typescript
const { data, error } = await supabase
  .from('products')
  .insert([
    {
      title: 'Fresh Apples',
      description: 'Organic apples',
      location: { lat: 40.7128, lng: -74.0060 }
    }
  ])
  .select();
```

#### Read
```typescript
// Single row
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('id', productId)
  .single();

// Multiple rows with filters
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('status', 'available')
  .order('created_at', { ascending: false })
  .limit(10);

// Join tables
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    users (
      username,
      avatar_url
    )
  `);
```

#### Update
```typescript
const { data, error } = await supabase
  .from('products')
  .update({ status: 'sold' })
  .eq('id', productId)
  .select();
```

#### Delete
```typescript
const { data, error } = await supabase
  .from('products')
  .delete()
  .eq('id', productId);
```

### Geospatial Queries (PostGIS)
```typescript
// Find nearby products
const { data, error } = await supabase.rpc('products_nearby', {
  lat: 40.7128,
  lng: -74.0060,
  radius_km: 5
});
```

## Storage

### Upload Files
```typescript
const uploadImage = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return publicUrl;
};
```

### Download Files
```typescript
const { data, error } = await supabase.storage
  .from('product-images')
  .download('path/to/file.jpg');
```

### Delete Files
```typescript
const { data, error } = await supabase.storage
  .from('product-images')
  .remove(['path/to/file.jpg']);
```

## Real-time Subscriptions

### Subscribe to Changes
```typescript
const channel = supabase
  .channel('products-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'products'
    },
    (payload) => {
      console.log('Change received!', payload);
      // Update local state
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

### Presence (User tracking)
```typescript
const channel = supabase.channel('online-users', {
  config: {
    presence: {
      key: userId
    }
  }
});

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    // Handle presence changes
  })
  .subscribe();
```

## Row Level Security (RLS)

### Best Practices
1. **Always enable RLS** on tables with sensitive data
2. **Create policies** for different user roles
3. **Use authenticated user** in policies: `auth.uid()`
4. **Test policies** thoroughly

### Example Policies
```sql
-- Users can only read their own data
CREATE POLICY "Users can view own products"
ON products FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own products
CREATE POLICY "Users can insert own products"
ON products FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own products
CREATE POLICY "Users can update own products"
ON products FOR UPDATE
USING (auth.uid() = user_id);
```

## Error Handling

### Pattern
```typescript
const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*');

    if (error) throw error;

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching products:', error.message);
      // Handle specific errors
      if (error.message.includes('JWT')) {
        // Handle authentication error
      }
    }
    throw error;
  }
};
```

## React Integration

### Custom Hook Example
```typescript
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Subscribe to changes
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { products, loading, error };
};
```

## Performance Tips
1. **Use select specific columns** instead of `*` when possible
2. **Add indexes** on frequently queried columns
3. **Use pagination** for large datasets
4. **Cache data** appropriately
5. **Debounce real-time updates** to prevent excessive re-renders

## When to Use This Skill
- Setting up Supabase authentication
- Creating database queries with proper types
- Implementing real-time features
- Handling file uploads/downloads
- Writing Row Level Security policies
- Integrating Supabase with React components
- Debugging Supabase-related issues
