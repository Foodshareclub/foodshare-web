# Debug Issue

Debug: $ARGUMENTS

## Methodology

1. **Reproduce the Issue**
   - Get exact steps to reproduce
   - Note error messages
   - Check browser console and server logs

2. **Gather Information**
   - Read relevant code
   - Check recent changes (`git log`, `git diff`)
   - Look for similar issues in codebase

3. **Form Hypotheses**
   - List possible causes
   - Rank by likelihood
   - Identify tests for each

4. **Test Hypotheses**
   - Add logging if needed
   - Test each hypothesis systematically
   - Document findings

5. **Fix and Verify**
   - Make minimal fix
   - Test the fix
   - Consider edge cases

## Common Issues

### Hydration Mismatch

- Check for client-only code in Server Components
- Ensure consistent rendering server/client
- Use `suppressHydrationWarning` sparingly

### Type Errors

- Run `npm run type-check`
- Check Supabase types are up to date
- Verify import paths

### Server Action Errors

- Check `'use server'` directive
- Verify auth checks
- Check revalidation tags

### Map Not Rendering

- Ensure dynamic import with `ssr: false`
- Check `'use client'` directive
- Verify Leaflet CSS is imported

## Tools

- Browser DevTools (Console, Network)
- Supabase Dashboard (Logs, SQL Editor)
- `npm run type-check` for type issues
- `npm run lint` for code issues
