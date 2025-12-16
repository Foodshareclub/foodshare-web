# Fix GitHub Issue

Fix the GitHub issue: $ARGUMENTS

## Workflow

1. **Understand the Issue**
   - Read the issue description and any linked resources
   - Identify acceptance criteria
   - Check for related issues or PRs

2. **Explore the Codebase**
   - Find relevant files
   - Understand existing patterns
   - Identify what needs to change

3. **Plan the Fix**
   - List the files to modify
   - Consider edge cases
   - Think about tests needed

4. **Implement**
   - Make minimal, focused changes
   - Follow existing code patterns
   - Add/update tests if needed

5. **Verify**
   - Run type-check: `npm run type-check`
   - Run lint: `npm run lint`
   - Test the fix manually if applicable

## Guidelines

- Keep changes minimal and focused
- Follow Next.js 16 patterns (Server Components, Server Actions)
- Use shadcn/ui for UI components
- Add translations if user-facing text changes
- Update tests if behavior changes
