#!/usr/bin/env bash
# No Console.log Check Script
# Detects console.log statements in production code

set -e

echo "🔍 Checking for console statements..."

if [ -z "$1" ]; then
  echo "⚠️  No files to check"
  exit 0
fi

FILES="$@"
HAS_CONSOLE=false

for file in $FILES; do
  if [[ ! "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
    continue
  fi

  # Skip test files
  if [[ "$file" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]]; then
    continue
  fi

  # Skip Supabase Edge Functions (Deno-based, console.log is acceptable)
  if [[ "$file" =~ ^supabase/functions/ ]]; then
    continue
  fi

  # Check for console statements
  CONSOLE_LINES=$(grep -n "console\.\(log\|debug\|info\|warn\|error\)" "$file" 2>/dev/null || true)

  if [ -n "$CONSOLE_LINES" ]; then
    echo "⚠️  $file contains console statements:"
    echo "$CONSOLE_LINES"
    HAS_CONSOLE=true
  fi
done

if [ "$HAS_CONSOLE" = true ]; then
  echo ""
  echo "Remove console statements before committing to production"
  echo "Use a proper logging library for production logs"
  exit 0  # Warning only for now
fi

echo "✅ No console statements found"
exit 0
