# Form Handling with Server Actions

## Overview

Forms in Next.js 16 using React Hook Form with Server Actions and shadcn/ui components.

## Basic Pattern: Server Action Form

### Server Action

```typescript
// src/app/actions/products.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    post_name: formData.get("post_name") as string,
    post_description: formData.get("post_description") as string,
  });

  if (error) throw new Error(error.message);

  revalidateTag("products");
  redirect("/food");
}
```

### Client Form with React Hook Form

```typescript
// src/components/products/CreateProductForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useTransition } from 'react';
import { createProduct } from '@/app/actions/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormData {
  post_name: string;
  post_description: string;
}

export function CreateProductForm() {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    startTransition(async () => {
      await createProduct(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="post_name">Title</Label>
        <Input
          id="post_name"
          {...register('post_name', { required: 'Title is required' })}
        />
        {errors.post_name && (
          <p className="text-sm text-destructive">{errors.post_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="post_description">Description</Label>
        <Textarea
          id="post_description"
          {...register('post_description', { required: 'Description is required' })}
        />
        {errors.post_description && (
          <p className="text-sm text-destructive">{errors.post_description.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Product'}
      </Button>
    </form>
  );
}
```

## shadcn/ui Form Components

### Using Form Component (with Zod)

```typescript
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  post_name: z.string().min(3, 'Title must be at least 3 characters'),
  post_description: z.string().min(10, 'Description must be at least 10 characters'),
});

type FormData = z.infer<typeof formSchema>;

export function ProductForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      post_name: '',
      post_description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    // Handle submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="post_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="post_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          Submit
        </Button>
      </form>
    </Form>
  );
}
```

## File Upload with Server Actions

```typescript
// Server Action
'use server';

export async function uploadImage(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get('file') as File;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(`${Date.now()}-${file.name}`, file);

  if (error) throw new Error(error.message);
  return data.path;
}

// Client Component
'use client';

export function ImageUpload() {
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      await uploadImage(formData);
    });
  };

  return (
    <Input
      type="file"
      accept="image/*"
      onChange={handleFileChange}
      disabled={isPending}
    />
  );
}
```

## Select and Combobox

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Controller } from 'react-hook-form';

<Controller
  control={control}
  name="category"
  render={({ field }) => (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
      <SelectTrigger>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="vegetables">Vegetables</SelectItem>
        <SelectItem value="fruits">Fruits</SelectItem>
        <SelectItem value="grains">Grains</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

## Error Handling with Server Actions

```typescript
// Server Action with error return
"use server";

export async function createProduct(formData: FormData) {
  try {
    const supabase = await createClient();
    // ... create logic
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Client handling
const onSubmit = async (data: FormData) => {
  startTransition(async () => {
    const result = await createProduct(formData);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Product created!");
    }
  });
};
```

## When to Use This Skill

- Creating forms with Server Actions
- Integrating React Hook Form with shadcn/ui
- Form validation with Zod
- File uploads
- Error handling patterns
