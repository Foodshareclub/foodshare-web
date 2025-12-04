# Lefthook Scripts - Enterprise Edition

Git hook scripts for FoodShare, managed by [Lefthook](https://github.com/evilmartians/lefthook).

## Overview

These scripts provide enterprise-level automated code quality, security, and performance checks throughout the git lifecycle. The configuration is in `lefthook.yml` at the project root.

## Priority Levels

Hooks are organized by priority:

- **Priority 1 (Critical)**: Security, branch protection
- **Priority 2 (High)**: Type checking, tests
- **Priority 3 (Medium)**: Build, performance
- **Priority 4 (Low)**: Quality checks
- **Priority 5 (Optional)**: Documentation, licenses

## Scripts

### Pre-commit Hooks (Run in Parallel)

#### `security-check.sh` 🔒 Priority 1

Comprehensive security scanning for staged files:

- ✅ Hardcoded API keys and secrets
- ✅ .env file commits
- ✅ console.log statements
- ✅ debugger statements
- ✅ Large files (>1MB)
- ✅ Suspicious patterns

**When it runs:** Before every commit

---

#### `dependency-audit.sh` 🔒 Priority 1

Scans dependencies for known security vulnerabilities:

- Checks npm audit for critical and high vulnerabilities
- Reports moderate vulnerabilities as warnings
- Suggests running `npm audit fix`

**When it runs:** Before every commit

---

#### `lint` 📝 Priority 2

ESLint with auto-fix for staged files:

- Enforces code style and quality
- `--max-warnings=0` ensures no warnings slip through
- Automatically fixes issues when possible

**Files checked:** `*.{ts,tsx,js,jsx}`

---

#### `format` ✨ Priority 2

Prettier code formatting:

- Ensures consistent code formatting
- Automatically formats files
- Re-stages formatted files

**Files checked:** `*.{ts,tsx,js,jsx,json,css,scss,md}`

---

#### `type-check` 🔍 Priority 2

TypeScript type checking:

- Runs `tsc --noEmit` to catch type errors
- Fast development-mode check
- Does not emit files

---

#### `complexity-check.sh` 🧮 Priority 3

Analyzes code complexity:

- Detects overly long functions (>100 lines)
- Identifies excessive nesting (>5 levels)
- Suggests refactoring opportunities

**Files checked:** `*.{ts,tsx,js,jsx}`

---

#### `unused-code-check.sh` 🪦 Priority 3

Detects unused code:

- Finds unused variables and imports
- Uses TypeScript compiler flags
- Suggests cleanup opportunities

---

#### `import-check.sh` 📦 Priority 3

Validates import organization:

- Detects deep relative imports (`../../../`)
- Identifies mixed import styles (import vs require)
- Suggests using absolute imports

**Files checked:** `*.{ts,tsx,js,jsx}`

---

#### `accessibility-check.sh` ♿ Priority 4

React accessibility validation:

- Images without alt text
- Buttons without accessible labels
- Form inputs without labels
- onClick handlers on non-interactive elements

**Files checked:** `*.{tsx,jsx}`

---

#### `large-files-check.sh` 📏 Priority 4

Prevents committing large files:

- Maximum file size: 500KB
- Suggests using Git LFS for large binaries
- Prevents build artifacts

---

#### `no-console-check.sh` 🔍 Priority 4

Detects console statements in production code:

- Finds console.log, console.debug, etc.
- Skips test files
- Warning only (non-blocking)

**Files checked:** `*.{ts,tsx,js,jsx}` (excluding tests)

---

### Commit-msg Hooks

#### `conventional-commits.sh` Priority 1

Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) format.

**Format:** `<type>(<scope>): <description>`

**Valid types:** feat, fix, docs, style, refactor, test, chore, perf, ci, build

**Examples:**

```
feat(products): add distance filtering
fix(chat): resolve message duplication
docs: update API reference
```

---

#### `commit-quality-check.sh` Priority 2

Ensures commit message quality:

- Minimum length: 10 characters
- Maximum length: 100 characters (subject)
- Rejects vague messages (wip, tmp, test, etc.)
- Checks capitalization
- Warns about trailing periods

---

### Pre-push Hooks (Run Sequentially)

#### `protected-branch-check.sh` 🛡️ Priority 1

Prevents accidental pushes to protected branches:

- Protected: main, master, production, develop
- Requires explicit confirmation
- Shows warning message

---

#### `type-check-strict` 🔍 Priority 1

Strict TypeScript checking for production:

- Runs `tsc --noEmit --strict`
- Production mode check
- Ensures no type errors before push

---

#### `test` 🧪 Priority 2

Runs full test suite:

- Executes `npm run test`
- CI mode (no watch)
- Must pass before push

---

#### `test-coverage-check.sh` 📊 Priority 2

Validates test coverage thresholds:

- Minimum coverage: 70%
- Target coverage: 80%
- Checks lines, statements, functions, branches
- Blocks push if below minimum

---

#### `build` 🏗️ Priority 3

Production build validation:

- Runs `npm run build`
- Ensures production build works
- Catches build-time errors

---

#### `bundle-size-check.sh` 📦 Priority 3

Analyzes bundle size:

- Max main bundle: 500KB
- Max vendor bundle: 1000KB
- Warns if size exceeds limits
- Suggests code splitting

---

#### `security-audit` 🔒 Priority 4

Full npm security audit:

- Runs `npm audit --audit-level=moderate`
- Checks all dependencies
- Reports vulnerabilities

---

#### `duplicate-code-check.sh` 🔍 Priority 4

Detects code duplication:

- Finds duplicate imports
- Identifies similar function patterns
- Suggests refactoring
- Recommends jscpd for detailed analysis

---

#### `dead-code-check.sh` 🪦 Priority 4

Finds unused exports and dead code:

- Uses ts-prune if available
- Identifies unused exports
- Suggests cleanup

---

#### `license-check.sh` ⚖️ Priority 5

License compliance validation:

- Checks for incompatible licenses (GPL, AGPL)
- Uses license-checker if installed
- Warns about licensing issues

---

### Post-checkout Hooks

#### `dependencies-check.sh`

Checks if dependencies changed after branch switch:

- Compares package.json and package-lock.json
- Notifies if dependencies changed
- Suggests running `npm install`

---

#### `clean-artifacts`

Cleans build artifacts:

- Removes dist/ and build/ directories
- Ensures clean slate after branch switch

---

### Post-merge Hooks

#### `dependencies-install`

Auto-installs dependencies after merge:

- Detects package.json changes
- Automatically runs `npm install`
- Keeps dependencies in sync

---

#### `migrations-check.sh`

Alerts for database migrations:

- Detects changed migration files
- Reminds to run migrations
- Shows migration command

---

### Prepare-commit-msg Hook

#### `ticket-integration.sh`

Adds ticket numbers to commits:

- Extracts ticket from branch name (PROJ-123, #123)
- Prepends to commit message
- Automatic ticket tracking

---

### Pre-rebase Hook

#### `uncommitted-changes`

Safety check before rebase:

- Detects uncommitted changes
- Warns user
- Prevents accidental rebases

---

## Lefthook Commands

### Install Lefthook Hooks

```bash
npx lefthook install
```

### Run Specific Hook Manually

```bash
# Run pre-commit checks
npx lefthook run pre-commit

# Run commit-msg validation
echo "feat: new feature" | npx lefthook run commit-msg

# Run pre-push checks
npx lefthook run pre-push
```

### Skip Hooks

```bash
# Skip all hooks for one commit
LEFTHOOK=0 git commit -m "emergency fix"

# Skip specific commands
LEFTHOOK_EXCLUDE=lint,format git commit -m "message"
LEFTHOOK_EXCLUDE=test git push

# Skip pre-push hooks
git push --no-verify
```

### Debug Mode

```bash
LEFTHOOK_VERBOSE=1 git commit -m "test"
```

## Configuration

Main configuration file: `lefthook.yml`

### Parallel vs Sequential Execution

**Pre-commit hooks:** Run in parallel for speed

- Security, lint, format, type-check, complexity, etc.

**Pre-push hooks:** Run sequentially for reliability

- Type check → Tests → Build → Audits

### Stage Fixed Files

Auto-fix hooks re-stage modified files:

```yaml
lint:
  run: npx eslint {staged_files} --fix
  stage_fixed: true # Re-stage fixed files
```

## Recommended Additional Tools

For enhanced code quality, install these optional tools:

```bash
# Code duplication detection
npm install -D jscpd

# Dead code detection
npm install -D ts-prune

# License compliance checking
npm install -D license-checker
```

## Troubleshooting

### Hooks Not Running

```bash
# Reinstall hooks
npx lefthook install

# Check hooks are in place
ls -la .git/hooks/pre-commit

# Verify lefthook is installed
npx lefthook version
```

### Hook Execution Failed

```bash
# Run hook manually to see full output
npx lefthook run pre-commit

# Enable verbose mode
LEFTHOOK_VERBOSE=1 git commit
```

### Permission Denied

```bash
# Make scripts executable
chmod +x scripts/lefthook/*.sh
```

### Too Slow

```bash
# Skip non-critical checks during development
LEFTHOOK_EXCLUDE=complexity-check,unused-code git commit

# Skip pre-push tests during rapid iteration
LEFTHOOK_EXCLUDE=test,build git push
```

## Best Practices

1. **Don't skip hooks without good reason** - They catch issues early
2. **Fix issues rather than skip** - Hooks enforce quality standards
3. **Use `--no-verify` sparingly** - Only for emergencies
4. **Run hooks before PR** - Ensure clean code before review
5. **Keep scripts updated** - Maintain relevance to workflow
6. **Share configs** - Team should have same standards

## Development Workflow

### Fast iteration mode (warnings only):

```bash
# Allow warnings during development
LEFTHOOK_EXCLUDE=complexity-check,unused-code git commit
```

### Pre-PR checklist:

```bash
# Run all pre-push checks locally
npx lefthook run pre-push

# Verify no issues before creating PR
npm run lint && npm run type-check && npm run test
```

### Production deployment:

```bash
# All checks must pass
git push  # No skipping hooks
```

## Adding New Hooks

To add a new hook:

1. **Create script** in `scripts/lefthook/`:

   ```bash
   touch scripts/lefthook/my-new-check.sh
   chmod +x scripts/lefthook/my-new-check.sh
   ```

2. **Add to lefthook.yml**:

   ```yaml
   pre-commit:
     commands:
       my-new-check:
         tags: quality
         run: bash scripts/lefthook/my-new-check.sh
         priority: 4
   ```

3. **Test it**:

   ```bash
   npx lefthook run pre-commit
   ```

4. **Document it** in this README

## Enterprise Features Summary

### Security

- 🔒 Secret detection
- 🔒 Dependency vulnerability scanning
- 🔒 Security audit before push

### Code Quality

- 📝 Linting with zero warnings
- ✨ Automatic formatting
- 🔍 Type checking (dev + strict production)
- 🧮 Complexity analysis
- 🪦 Dead code detection
- 🔍 Duplicate code detection

### Testing & Coverage

- 🧪 Full test suite on push
- 📊 Coverage threshold enforcement

### Performance

- 📦 Bundle size monitoring
- ⚡ Build validation

### Accessibility

- ♿ React a11y checks

### Compliance

- ⚖️ License checking
- 📋 Commit message standards
- 🎫 Ticket integration

## Resources

- [Lefthook Documentation](https://github.com/evilmartians/lefthook/blob/master/docs/usage.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [TypeScript](https://www.typescriptlang.org/)

---

**Last Updated:** November 2024
**Version:** 2.0.0 (Enterprise Edition)
