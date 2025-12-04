#!/bin/bash
# Security check for pre-commit hook
# Checks for secrets, .env files, and debug statements in staged files

echo "🔒 Security Check..."

# Get staged TypeScript/JavaScript/JSON files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | \
  grep -E "\.(ts|tsx|js|jsx|json)$" || true)

if [ -z "$STAGED_FILES" ]; then
  echo "  ✓ No files to validate"
  exit 0
fi

ERRORS=0

# Check for hardcoded secrets
# Detects patterns like: apiKey = "sk-1234567890", token: "abc123xyz"
SECRETS=$(echo "$STAGED_FILES" | xargs git diff --cached | \
  grep -iE "^\+.*(api[_-]?key|secret|password|token|access[_-]?key).*[=:].*[\"\'][a-zA-Z0-9_\-]{16,}[\"\']" | \
  grep -v 'import.meta.env' | \
  grep -v 'process.env' | \
  grep -v 'VITE_' | \
  grep -v '//' | \
  grep -v '\*' | \
  wc -l | xargs)

if [ "$SECRETS" -gt 0 ]; then
  echo "  ❌ Found possible hardcoded secrets in staged files!"
  echo "  💡 Use environment variables instead (import.meta.env.VITE_*)"
  echo ""
  echo "  Detected patterns:"
  echo "$STAGED_FILES" | xargs git diff --cached | \
    grep -iE "^\+.*(api[_-]?key|secret|password|token|access[_-]?key).*[=:].*[\"\'][a-zA-Z0-9_\-]{16,}[\"\']" | \
    grep -v 'import.meta.env' | \
    grep -v 'process.env' | \
    grep -v 'VITE_' | \
    grep -v '//' | \
    grep -v '\*' | \
    head -3 | \
    sed 's/^/    /'
  echo ""
  echo "  ✅ Fix: Store secrets in .env and use import.meta.env.VITE_SECRET_NAME"
  ERRORS=1
fi

# Check for .env file commits
if git diff --cached --name-only | grep -qE "^\.env(\.local|\.production)?$"; then
  echo "  ❌ Attempting to commit .env file!"
  echo "  💡 .env files contain secrets and should NEVER be committed"
  echo "  ✅ Add to .gitignore: .env*"
  ERRORS=1
fi

# Check for node_modules
if git diff --cached --name-only | grep -q "node_modules/"; then
  echo "  ❌ Attempting to commit node_modules/"
  echo "  💡 node_modules should never be committed (use package.json instead)"
  echo "  ✅ Add to .gitignore: node_modules/"
  ERRORS=1
fi

# Check for dist/ directory
if git diff --cached --name-only | grep -q "dist/"; then
  echo "  ⚠️  Attempting to commit dist/ directory"
  echo "  💡 Build artifacts are usually not committed"
  echo "  Consider adding to .gitignore if not intentional"
fi

# Check for console.log statements
CONSOLE_LOGS=$(echo "$STAGED_FILES" | xargs git diff --cached | \
  grep -E "^\+.*console\.(log|debug|info|warn|error)\(" | \
  grep -v "//" | \
  grep -v "\*" | \
  wc -l | xargs)

if [ "$CONSOLE_LOGS" -gt 0 ]; then
  echo "  ⚠️  Found $CONSOLE_LOGS console statement(s)"
  echo "  💡 Consider removing debug logs or using a proper logger"
fi

# Check for debugger statements
DEBUGGERS=$(echo "$STAGED_FILES" | xargs git diff --cached | \
  grep -E "^\+.*debugger" | \
  grep -v "//" | \
  wc -l | xargs)

if [ "$DEBUGGERS" -gt 0 ]; then
  echo "  ❌ Found debugger statement(s)"
  echo "  💡 Remove 'debugger' statements before committing"
  ERRORS=1
fi

# Check for large files (>1MB)
LARGE_FILES=$(git diff --cached --name-only | while read file; do
  if [ -f "$file" ]; then
    SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt 1048576 ]; then
      echo "$file ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "$SIZE bytes"))"
    fi
  fi
done)

if [ -n "$LARGE_FILES" ]; then
  echo "  ⚠️  Large files detected:"
  echo "$LARGE_FILES" | sed 's/^/    /'
  echo "  💡 Consider using Git LFS for large assets"
fi

# Check for common mistake patterns
TODO_FIXES=$(echo "$STAGED_FILES" | xargs git diff --cached | \
  grep -iE "^\+.*(TODO|FIXME|HACK|XXX).*:" | \
  wc -l | xargs)

if [ "$TODO_FIXES" -gt 0 ]; then
  echo "  ℹ️  Found $TODO_FIXES TODO/FIXME comment(s)"
  echo "  💡 Consider creating issues for important TODOs"
fi

# Final result
if [ $ERRORS -eq 0 ]; then
  echo "  ✓ Security check passed"
  exit 0
else
  echo ""
  echo "  ❌ Security check failed!"
  echo "  Fix the issues above before committing"
  exit 1
fi
