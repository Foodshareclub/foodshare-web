# React Hook Form Skill

## Overview
Expert guidance for building performant, accessible forms with React Hook Form, including validation, error handling, and Chakra UI integration.

## Tech Stack Context
- **React Hook Form**: 7.66.1
- **UI Integration**: Chakra UI 3.29.0
- **Features**: Type-safe forms, validation, error handling

## Basic Setup

### Simple Form
```typescript
import { useForm, SubmitHandler } from 'react-hook-form';

interface FormData {
  title: string;
  description: string;
  price: number;
}

const ProductForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit: SubmitHandler<FormData> = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      <textarea {...register('description')} />
      <input type="number" {...register('price')} />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### With Default Values
```typescript
const { register, handleSubmit } = useForm<FormData>({
  defaultValues: {
    title: '',
    description: '',
    price: 0,
    category: 'vegetables'
  }
});
```

## Validation

### Built-in Validation
```typescript
<input
  {...register('title', {
    required: 'Title is required',
    minLength: {
      value: 3,
      message: 'Title must be at least 3 characters'
    },
    maxLength: {
      value: 100,
      message: 'Title must not exceed 100 characters'
    }
  })}
/>

<input
  type="email"
  {...register('email', {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  })}
/>

<input
  type="number"
  {...register('price', {
    required: 'Price is required',
    min: {
      value: 0,
      message: 'Price must be positive'
    },
    max: {
      value: 10000,
      message: 'Price too high'
    }
  })}
/>
```

### Custom Validation
```typescript
<input
  {...register('username', {
    required: 'Username is required',
    validate: {
      notAdmin: (value) => value !== 'admin' || 'Username cannot be admin',
      unique: async (value) => {
        const exists = await checkUsernameExists(value);
        return !exists || 'Username already taken';
      }
    }
  })}
/>
```

### Cross-Field Validation
```typescript
import { useForm } from 'react-hook-form';

const { register, watch, formState: { errors } } = useForm<FormData>();
const password = watch('password');

<input
  type="password"
  {...register('confirmPassword', {
    required: 'Please confirm password',
    validate: (value) =>
      value === password || 'Passwords do not match'
  })}
/>
```

## Error Handling

### Display Errors
```typescript
const { register, formState: { errors } } = useForm<FormData>();

<div>
  <input {...register('title', { required: 'Title is required' })} />
  {errors.title && <span>{errors.title.message}</span>}
</div>
```

### Error Styling with Chakra UI
```typescript
import { Input, FormControl, FormLabel, FormErrorMessage } from '@chakra-ui/react';

<FormControl isInvalid={!!errors.title}>
  <FormLabel>Title</FormLabel>
  <Input {...register('title', { required: 'Title is required' })} />
  <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
</FormControl>
```

### Multiple Errors
```typescript
<input
  {...register('title', {
    required: 'Required',
    minLength: { value: 3, message: 'Too short' },
    maxLength: { value: 100, message: 'Too long' }
  })}
/>

{errors.title && (
  <ul>
    {Object.values(errors.title).map((error, i) => (
      <li key={i}>{error.message}</li>
    ))}
  </ul>
)}
```

## Form State

### Loading State
```typescript
const { handleSubmit, formState: { isSubmitting } } = useForm<FormData>();

const onSubmit = async (data: FormData) => {
  await createProduct(data);
};

<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

### Dirty State (Unsaved Changes)
```typescript
const { formState: { isDirty, dirtyFields } } = useForm<FormData>();

<button type="submit" disabled={!isDirty}>
  Save Changes
</button>

// Warn on navigation
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

### Touched Fields
```typescript
const { formState: { touchedFields } } = useForm<FormData>();

<input
  {...register('title')}
  className={touchedFields.title ? 'touched' : ''}
/>
```

## Advanced Patterns

### Dynamic Fields (Array Fields)
```typescript
import { useFieldArray } from 'react-hook-form';

interface FormData {
  images: { url: string }[];
}

const ImageForm = () => {
  const { register, control } = useForm<FormData>({
    defaultValues: {
      images: [{ url: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'images'
  });

  return (
    <div>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`images.${index}.url`)} />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ url: '' })}>
        Add Image
      </button>
    </div>
  );
};
```

### Controlled Components
```typescript
import { Controller } from 'react-hook-form';
import { Select } from '@chakra-ui/react';

<Controller
  name="category"
  control={control}
  rules={{ required: 'Category is required' }}
  render={({ field }) => (
    <Select {...field}>
      <option value="">Select category</option>
      <option value="vegetables">Vegetables</option>
      <option value="fruits">Fruits</option>
    </Select>
  )}
/>
```

### Watch Field Values
```typescript
const { register, watch } = useForm<FormData>();

// Watch specific field
const category = watch('category');

// Watch multiple fields
const [title, description] = watch(['title', 'description']);

// Watch all fields
const watchedData = watch();

useEffect(() => {
  console.log('Category changed:', category);
}, [category]);
```

### Conditional Fields
```typescript
const { register, watch } = useForm<FormData>();
const showExtraField = watch('type') === 'premium';

<div>
  <select {...register('type')}>
    <option value="basic">Basic</option>
    <option value="premium">Premium</option>
  </select>

  {showExtraField && (
    <input {...register('premiumFeature')} />
  )}
</div>
```

## Reset & Set Values

### Reset Form
```typescript
const { reset } = useForm<FormData>();

// Reset to default values
const handleReset = () => {
  reset();
};

// Reset to specific values
const handleLoadProduct = (product: Product) => {
  reset({
    title: product.title,
    description: product.description,
    price: product.price
  });
};
```

### Set Individual Field Value
```typescript
const { setValue, getValues } = useForm<FormData>();

// Set value
setValue('title', 'New Title');

// Set with validation
setValue('title', 'New Title', {
  shouldValidate: true,
  shouldDirty: true,
  shouldTouch: true
});

// Get value
const currentTitle = getValues('title');
const allValues = getValues();
```

## Integration with Chakra UI

### Complete Chakra Form
```typescript
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  Button,
  VStack
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';

interface FormData {
  title: string;
  description: string;
  price: number;
}

const ChakraForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    await createProduct(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={4} align="stretch">
        <FormControl isInvalid={!!errors.title}>
          <FormLabel>Product Title</FormLabel>
          <Input
            {...register('title', {
              required: 'Title is required',
              minLength: { value: 3, message: 'Minimum 3 characters' }
            })}
          />
          <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.description}>
          <FormLabel>Description</FormLabel>
          <Textarea
            {...register('description', {
              required: 'Description is required'
            })}
          />
          <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.price}>
          <FormLabel>Price</FormLabel>
          <Input
            type="number"
            {...register('price', {
              required: 'Price is required',
              min: { value: 0, message: 'Must be positive' }
            })}
          />
          <FormErrorMessage>{errors.price?.message}</FormErrorMessage>
        </FormControl>

        <Button type="submit" colorScheme="blue" isLoading={isSubmitting}>
          Submit
        </Button>
      </VStack>
    </form>
  );
};
```

## File Upload

### Single File Upload
```typescript
<input
  type="file"
  {...register('image', {
    required: 'Image is required',
    validate: {
      fileType: (files) =>
        files[0]?.type.startsWith('image/') || 'Must be an image',
      fileSize: (files) =>
        files[0]?.size < 5000000 || 'File must be less than 5MB'
    }
  })}
/>
```

### Multiple Files
```typescript
<input
  type="file"
  multiple
  {...register('images', {
    validate: {
      maxFiles: (files) =>
        files.length <= 5 || 'Maximum 5 files allowed'
    }
  })}
/>
```

## TypeScript Patterns

### Type-Safe Form
```typescript
interface ProductFormData {
  title: string;
  description: string;
  price: number;
  category: 'vegetables' | 'fruits' | 'grains';
  images: FileList;
}

const form = useForm<ProductFormData>();
// All fields are now type-checked
```

### Infer Types from Schema
```typescript
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  title: z.string().min(3),
  price: z.number().positive()
});

type FormData = z.infer<typeof schema>;

const { register } = useForm<FormData>({
  resolver: zodResolver(schema)
});
```

## Performance Optimization

### Mode Configuration
```typescript
// Validate on submit only (best performance)
const form = useForm({ mode: 'onSubmit' });

// Validate on blur
const form = useForm({ mode: 'onBlur' });

// Validate on change (most responsive)
const form = useForm({ mode: 'onChange' });

// Validate on blur, then on change
const form = useForm({ mode: 'onTouched' });
```

### Unregister Unused Fields
```typescript
const { register, unregister } = useForm();

useEffect(() => {
  if (!showField) {
    unregister('conditionalField');
  }
}, [showField, unregister]);
```

## Testing Forms

### Test Form Submission
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('submits form with valid data', async () => {
  const handleSubmit = vi.fn();
  const { user } = setup(<ProductForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/title/i), 'Fresh Apples');
  await user.type(screen.getByLabelText(/price/i), '10');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'Fresh Apples',
      price: 10
    });
  });
});
```

### Test Validation
```typescript
it('shows validation errors', async () => {
  const { user } = setup(<ProductForm />);

  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
});
```

## Best Practices

1. **Use TypeScript** - Type your form data for safety
2. **Default values** - Always provide default values
3. **Validation** - Validate on blur or submit for better UX
4. **Error messages** - Provide clear, actionable error messages
5. **Accessibility** - Use proper labels and ARIA attributes
6. **Reset on success** - Clear form after successful submission
7. **Loading states** - Disable submit during async operations
8. **Unsaved changes** - Warn users before navigation

## Common Patterns

### Multi-Step Form
```typescript
const [step, setStep] = useState(1);
const { register, trigger } = useForm<FormData>();

const handleNext = async () => {
  const isValid = await trigger(['title', 'description']);
  if (isValid) setStep(2);
};

return (
  <div>
    {step === 1 && <Step1 register={register} />}
    {step === 2 && <Step2 register={register} />}
    <button onClick={handleNext}>Next</button>
  </div>
);
```

### Form with API Integration
```typescript
const onSubmit = async (data: FormData) => {
  try {
    await createProduct(data);
    toast.success('Product created!');
    reset();
  } catch (error) {
    setError('root', {
      message: 'Failed to create product'
    });
  }
};
```

## When to Use This Skill
- Building forms with validation
- Integrating forms with Chakra UI
- Handling complex form state
- Implementing dynamic fields
- Managing file uploads
- Creating multi-step forms
- Testing form behavior
- Optimizing form performance
- Type-safe form handling
