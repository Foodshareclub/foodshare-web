# FoodShare Scripts

Utility scripts for FoodShare web application development, build, and deployment.

## Directory Structure

```
scripts/
├── build/            # Build and bundling scripts
├── deploy/           # Deployment scripts
├── git-hooks/        # Git hook utilities
├── database/         # Database utilities
└── README.md         # This file
```

## Build Scripts

Located in `scripts/build/`

### `build-production.sh`

Creates an optimized production build of the React application.

```bash
./scripts/build/build-production.sh
```

**What it does:**

- Runs TypeScript type checking
- Creates production Vite build
- Generates bundle analysis report
- Validates build output
- Reports bundle sizes

**Requirements:**

- Node.js 24+
- npm dependencies installed

## Deployment Scripts

Located in `scripts/deploy/`

### `deploy-vercel.sh`

Deploys the application to Vercel with proper environment configuration.

```bash
./scripts/deploy/deploy-vercel.sh [production|preview]
```

**Options:**

- `production` - Deploy to production (requires confirmation)
- `preview` - Deploy preview branch (default)

**What it does:**

- Builds application
- Validates environment variables
- Deploys to Vercel
- Provides deployment URL

**Requirements:**

- Vercel CLI installed (`npm i -g vercel`)
- Vercel account configured

## Git Hooks

Located in `scripts/git-hooks/`

These scripts can be used with Git hooks or CI/CD pipelines.

### `conventional-commits.sh`

Validates commit messages follow Conventional Commits format.

```bash
./scripts/git-hooks/conventional-commits.sh .git/COMMIT_EDITMSG
```

**Commit Format:**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Valid Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code formatting (no logic change)
- `refactor` - Code restructuring (no behavior change)
- `test` - Adding or updating tests
- `chore` - Build/tooling changes
- `perf` - Performance improvements
- `ci` - CI/CD configuration
- `build` - Build system changes

**Examples:**

```bash
feat(products): add distance-based filtering
fix(chat): resolve message duplication in realtime
docs: update API reference documentation
refactor(map): simplify marker clustering logic
test(auth): add integration tests for login flow
```

### `security-check.sh`

Checks staged files for common security issues.

```bash
./scripts/git-hooks/security-check.sh
```

**What it checks:**

- Hardcoded API keys/secrets in code
- `.env` files being committed
- `console.log` statements (warning)
- Large files that shouldn't be committed

**Best Practices:**

- Store secrets in `.env` (never commit)
- Use environment variables via `import.meta.env.VITE_*`
- Remove debug logs before committing

## Database Scripts

Located in `scripts/database/`

### `backup.sh`

Creates a backup of the Supabase database.

```bash
./scripts/database/backup.sh
```

**What it does:**

- Exports database schema and data
- Creates timestamped backup file
- Stores in `backups/` directory

**Requirements:**

- Supabase CLI installed
- Supabase project linked

## Storage Migration Scripts

### `migrate-storage-to-users-bucket.ts`

Migrates files from legacy `avatars` and `posts` buckets to the consolidated `users` bucket with organized structure.

```bash
npm run migrate:storage
```

**What it does:**

- Lists all files in `avatars` and `posts` buckets
- Downloads each file from source buckets
- Uploads to `users` bucket with organized paths:
  - `avatars/*` → `users/avatars/*`
  - `posts/*` → `users/posts/*`
- Provides detailed migration statistics
- Optional: Delete files from source buckets after successful migration

**Migration Stats:**

- Total files processed
- Successful migrations
- Failed migrations with error details
- Overall summary

**Safety Features:**

- Files are copied by default (not moved)
- Set `DELETE_AFTER_MIGRATION = true` in script to delete after migration
- Detailed logging for each file operation
- Error tracking for failed migrations

**Requirements:**

- `VITE_SUPABASE_URL` in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Sufficient storage quota in target bucket

**Example Output:**

```
🚀 Starting storage migration to users bucket...

📦 Migrating avatars → users/avatars
Found 121 files in avatars
✓ Migrated: avatars/user123/profile.jpg → users/avatars/user123/profile.jpg
...

📦 Migrating posts → users/posts
Found 67 files in posts
✓ Migrated: posts/post456/food.jpg → users/posts/post456/food.jpg
...

============================================================
📊 Migration Summary
============================================================

Avatars Bucket:
  Total files: 121
  ✓ Successful: 121
  ✗ Failed: 0

Posts Bucket:
  Total files: 67
  ✓ Successful: 67
  ✗ Failed: 0

Overall:
  Total files: 188
  ✓ Successful: 188
  ✗ Failed: 0

✅ All files migrated successfully!

💡 Files were copied, not moved. Original files remain in source buckets.
   Set DELETE_AFTER_MIGRATION = true to delete after migration.
```

**Post-Migration Steps:**

1. Verify files are accessible in new locations
2. Update application code to use new bucket paths
3. Test image uploads and retrieval
4. Once verified, set `DELETE_AFTER_MIGRATION = true` and re-run
5. Delete legacy buckets after confirmation

### `verify-storage-updates.ts`

Verifies that all storage system updates are correctly implemented and configured.

```bash
npm run verify:storage
```

**What it does:**

- Verifies bucket constants are properly defined
- Checks MIME type configuration for all buckets
- Validates file size limits are set
- Tests validation functions
- Confirms old bucket constants are removed
- Ensures complete coverage (all buckets have MIME types and size limits)
- Provides detailed verification report

### `test-storage-validation.ts`

Comprehensive test suite for the storage validation system.

```bash
npm run test:storage
```

**What it does:**

- Tests bucket constant definitions
- Validates MIME type checking for all buckets
- Tests file size validation with various sizes
- Runs full validation function tests
- Tests helper functions (getMaxFileSize, getAllowedMimeTypes)
- Tests edge cases (empty MIME, zero size, uppercase MIME)
- Provides detailed test results with pass/fail counts
- Exits with error code if any tests fail

**Example Output:**

```
🔍 Verifying Storage System Updates...

✅ Bucket Constants:
   PROFILES: "profiles"
   POSTS: "posts"
   FLAGS: "flags"
   FORUM: "forum"
   CHALLENGES: "challenges"
   ROOMS: "rooms"
   ASSETS: "assets"

✅ MIME Type Configuration:
   PROFILES: 5 types
   POSTS: 7 types
   FLAGS: 6 types
   ...

✅ File Size Limits:
   PROFILES: 5MB
   POSTS: 10MB
   FLAGS: 2MB
   ...

✅ Testing Validation Functions:
   Valid JPEG for PROFILES: image/jpeg
   Invalid EXE for PROFILES: application/x-msdownload

✅ Total Buckets Configured: 7

✅ Old bucket constants removed successfully

✅ Checking MIME Type Coverage:
   ✓ PROFILES
   ✓ POSTS
   ✓ FLAGS
   ...

✅ Checking Size Limit Coverage:
   ✓ PROFILES
   ✓ POSTS
   ✓ FLAGS
   ...

✅ Verification Complete!

📝 Summary:
   - 7 buckets configured
   - All buckets have MIME type restrictions
   - All buckets have size limits
   - Old bucket constants removed

🎉 Storage system is ready for use!
```

**Example Test Output:**

```
🧪 Testing Storage Validation System...

✅ Test 1: Bucket Constants
   Found 7 buckets: PROFILES, POSTS, FLAGS, FORUM, CHALLENGES, ROOMS, ASSETS

✅ Test 2: MIME Type Validation
   ✓ image/jpeg for PROFILES: true (expected true)
   ✓ image/png for PROFILES: true (expected true)
   ✓ application/pdf for PROFILES: false (expected false)
   ...
   Passed: 8/8

✅ Test 3: File Size Validation
   ✓ 1.0MB for PROFILES: true (expected true)
   ✓ 6.0MB for PROFILES: false (expected false)
   ...
   Passed: 7/7

✅ Test 4: Full Validation Function
   ✓ image/jpeg (2.0MB) for PROFILES: valid
   ✗ application/pdf (1.0MB) for PROFILES: invalid
     Error: Invalid file type. Allowed types: PNG, JPEG, WEBP, GIF, AVIF
   ...
   Passed: 4/4

✅ Test 5: Helper Functions
   getMaxFileSize('PROFILES'): 5MB
   getMaxFileSize('ASSETS'): 50MB
   getAllowedMimeTypes('PROFILES'): 5 types
   getAllowedMimeTypes('ASSETS'): 13 types

✅ Test 6: Edge Cases
   Empty MIME type: invalid
     Error: Invalid file type
   Zero file size: invalid
     Error: File size must be greater than 0
   Uppercase MIME type: valid

📊 Test Summary:
   Total Tests: 19
   Passed: 19 ✅
   Failed: 0 ✅
   Success Rate: 100.0%

🎉 All tests passed! Storage validation system is working correctly.
```

**When to Run:**

- After updating storage constants
- Before deploying storage changes
- When adding new buckets
- As part of CI/CD validation
- After migrating storage files
- During development to verify validation logic
- Before committing storage-related changes

**Requirements:**

- Storage constants defined in `src/constants/storage.ts`
- No dependencies on Supabase (runs locally)
- TypeScript execution environment (tsx)

**See Also:**

- `docs/storage-migration-summary.md` - Complete migration documentation
- `docs/STORAGE_MIGRATION_GUIDE.md` - Migration guide
- Storage bucket organization and policies

## Usage Guidelines

### Running Scripts

All scripts should be executed from the **project root**:

```bash
# ✅ Correct
./scripts/build/build-production.sh

# ❌ Wrong (don't cd into scripts)
cd scripts/build && ./build-production.sh
```

### Making Scripts Executable

If a script isn't executable:

```bash
chmod +x scripts/category/script-name.sh
```

### Script Conventions

All scripts follow these conventions:

- Shebang: `#!/bin/bash`
- Error handling: `set -e` (exit on error)
- Colored output for readability
- Help text with usage examples
- Clear error messages

## Setting Up Git Hooks

**FoodShare uses Lefthook** for git hook management. Hooks are automatically installed when you run `npm install`.

### Quick Setup

```bash
# Install dependencies (includes Lefthook)
npm install

# Verify hooks are installed
npx lefthook version
ls -la .git/hooks/ | grep -E "(pre-commit|commit-msg|pre-push)"
```

### Manual Hook Installation

If hooks aren't installed:

```bash
# Install Lefthook hooks
npx lefthook install
```

### Lefthook Configuration

Configuration is in `lefthook.yml` at project root. See `LEFTHOOK_SETUP.md` for complete documentation.

**Available hooks:**

- **pre-commit**: Security check, ESLint, Prettier, TypeScript type-check (parallel)
- **commit-msg**: Conventional commits validation
- **pre-push**: Tests, build validation, protected branch check (sequential)
- **post-checkout**: Dependencies change notification
- **post-merge**: Auto npm install on package.json changes

## Environment Variables

Scripts that require environment variables will check for:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VERCEL_TOKEN` - Vercel deployment token (for deploy scripts)

Set these in `.env` file (never commit this file).

## Troubleshooting

### Script Permission Denied

```bash
# Make script executable
chmod +x scripts/path/to/script.sh
```

### Script Not Found

```bash
# Ensure you're in project root
pwd
# Should show: /path/to/foodshare/frontend

# Run with explicit path
./scripts/build/build-production.sh
```

### Environment Variable Missing

```bash
# Check .env file exists
ls -la .env

# Verify variables are set
cat .env | grep VITE_SUPABASE
```

## Adding New Scripts

When creating new scripts:

1. **Choose the right directory**:
   - `build/` - Build and bundling
   - `deploy/` - Deployment and release
   - `git-hooks/` - Git workflow automation
   - `database/` - Database operations

2. **Follow the template**:

   ```bash
   #!/bin/bash
   set -e  # Exit on error

   # Script description
   # Usage: ./scripts/category/script.sh [args]

   # Colors
   RED='\033[0;31m'
   GREEN='\033[0;32m'
   NC='\033[0m'

   echo -e "${GREEN}Starting...${NC}"

   # Script logic here

   echo -e "${GREEN}Done!${NC}"
   ```

3. **Make it executable**:

   ```bash
   chmod +x scripts/category/new-script.sh
   ```

4. **Test it**:

   ```bash
   ./scripts/category/new-script.sh
   ```

5. **Document it** in this README

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

### GitHub Actions Example

```yaml
name: Build and Deploy
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: ./scripts/build/build-production.sh
      - run: ./scripts/deploy/deploy-vercel.sh preview
```

## Support

For issues with scripts:

1. Check this README for usage instructions
2. Verify prerequisites are installed
3. Check script output for error messages
4. Review relevant documentation in `context/` directory

---

**Last Updated:** November 2025
