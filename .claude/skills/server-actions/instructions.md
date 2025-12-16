# Next.js 16 Server Actions

## Overview

Server Actions for mutations in Next.js 16: forms, data mutations, revalidation, and error handling.

## Basic Server Action

```typescript
// src/app/actions/products.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Extract and validate data
  const post_name = formData.get("post_name") as string;
  const post_description = formData.get("post_description") as string;

  if (!post_name || post_name.length < 3) {
    throw new Error("Title must be at least 3 characters");
  }

  // Insert into database
  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    post_name,
    post_description,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Revalidate and redirect
  revalidateTag("products");
  redirect("/food");
}
```

## Using in Forms

### Direct Form Action

```typescript
// src/app/food/new/page.tsx
import { createProduct } from '@/app/actions/products';

export default function NewProductPage() {
  return (
    <form action={createProduct}>
      <input name="post_name" required />
      <textarea name="post_description" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

### With Client Component

```typescript
// src/components/products/CreateForm.tsx
'use client';

import { useTransition } from 'react';
import { createProduct } from '@/app/actions/products';
import { Button } from '@/components/ui/button';

export function CreateForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await createProduct(formData);
    });
  };

  return (
    <form action={handleSubmit}>
      <input name="post_name" disabled={isPending} />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  );
}
```

## Error Handling

### Return Errors Instead of Throwing

```typescript
"use server";

type ActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

export async function createProduct(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Please sign in to continue" };
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        post_name: formData.get("post_name") as string,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag("products");
    return { success: true, data };
  } catch (e) {
    return { success: false, error: "An unexpected error occurred" };
  }
}
```

### Client-Side Error Handling

```typescript
'use client';

import { toast } from 'sonner';
import { createProduct } from '@/app/actions/products';

export function CreateForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createProduct(formData);

      if (result.success) {
        toast.success('Product created!');
      } else {
        toast.error(result.error);
      }
    });
  };

  return <form action={handleSubmit}>...</form>;
}
```

## Validation with Zod

```typescript
"use server";

import { z } from "zod";

const productSchema = z.object({
  post_name: z.string().min(3, "Title must be at least 3 characters"),
  post_description: z.string().min(10, "Description must be at least 10 characters"),
  post_type: z.enum(["food", "produce", "pantry"]),
});

export async function createProduct(formData: FormData) {
  const rawData = {
    post_name: formData.get("post_name"),
    post_description: formData.get("post_description"),
    post_type: formData.get("post_type"),
  };

  const result = productSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  // Continue with validated data
  const { post_name, post_description, post_type } = result.data;
  // ...
}
```

## Revalidation Patterns

### Tag-Based Revalidation

```typescript
// In data fetching (lib/data/)
export const getProducts = unstable_cache(
  async () => {
    /* ... */
  },
  ["products"],
  { tags: ["products"] }
);

// In Server Action
revalidateTag("products");
```

### Path-Based Revalidation

```typescript
import { revalidatePath } from "next/cache";

// Revalidate specific page
revalidatePath("/food");

// Revalidate dynamic route
revalidatePath(`/food/${productId}`);

// Revalidate layout and all pages
revalidatePath("/food", "layout");
```

## Delete Action

```typescript
"use server";

export async function deleteProduct(productId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify ownership
  const { data: product } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", productId)
    .single();

  if (product?.user_id !== user.id) {
    return { success: false, error: "Not authorized to delete this product" };
  }

  const { error } = await supabase.from("posts").delete().eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateTag("products");
  return { success: true };
}
```

## Optimistic Updates

```typescript
'use client';

import { useOptimistic, useTransition } from 'react';
import { toggleLike } from '@/app/actions/likes';

export function LikeButton({ productId, initialLiked }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(initialLiked);

  const handleClick = () => {
    startTransition(async () => {
      setOptimisticLiked(!optimisticLiked);
      await toggleLike(productId);
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {optimisticLiked ? '❤️' : '🤍'}
    </button>
  );
}
```

## File Upload

```typescript
"use server";

export async function uploadImage(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("file") as File;

  if (!file || file.size === 0) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "File must be an image" };
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File must be less than 5MB" };
  }

  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("product-images").upload(fileName, file);

  if (error) {
    return { success: false, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(data.path);

  return { success: true, url: publicUrl };
}
```

## When to Use This Skill

- Creating forms with Server Actions
- Data mutations (create, update, delete)
- Form validation
- Error handling patterns
- Cache revalidation
- File uploads
- Optimistic updates
