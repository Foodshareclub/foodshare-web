# Add UI Component

Add component: $ARGUMENTS

## Workflow

1. **Check shadcn/ui First**

   ```bash
   npx shadcn@latest add [component-name]
   ```

   Available: button, card, dialog, form, input, select, toast, etc.

2. **Create Custom Component**

   ```
   src/components/[feature]/[ComponentName].tsx
   ```

3. **Component Template**

   ```typescript
   // Server Component (default)
   interface Props {
     title: string;
     children?: React.ReactNode;
   }

   export function ComponentName({ title, children }: Props) {
     return (
       <div className="p-4">
         <h2>{title}</h2>
         {children}
       </div>
     );
   }
   ```

4. **Client Component (if needed)**

   ```typescript
   "use client";

   import { useState } from "react";

   export function InteractiveComponent() {
     const [open, setOpen] = useState(false);
     // ...
   }
   ```

## Guidelines

- Server Component by default
- Use Tailwind CSS for styling
- Use `cn()` for conditional classes
- Add translations for user-facing text
- Export from barrel file if exists
