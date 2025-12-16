# Database Migration

Create migration for: $ARGUMENTS

## Workflow

1. **Plan the Schema Change**
   - Define new tables/columns
   - Consider RLS policies
   - Plan indexes for performance

2. **Use MCP Supabase Tool**

   ```
   mcp__supabase__apply_migration
   ```

3. **Migration Template**

   ```sql
   -- Create table
   CREATE TABLE IF NOT EXISTS table_name (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

   -- RLS Policies
   CREATE POLICY "Users can view own data"
   ON table_name FOR SELECT
   USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own data"
   ON table_name FOR INSERT
   WITH CHECK (auth.uid() = user_id);
   ```

4. **Update Types**

   ```bash
   supabase gen types typescript --project-id [id] > src/types/supabase.ts
   ```

5. **Update Data Layer**
   - Add functions to `lib/data/`
   - Add Server Actions to `app/actions/`

## Guidelines

- Always enable RLS on new tables
- Add appropriate indexes
- Use CASCADE for foreign keys when appropriate
- Test policies thoroughly
