#!/usr/bin/env bash
# Unused Code Detection Script
# Detects unused exports and imports

set -e

echo "🔍 Checking for unused code..."

# Check if we have the necessary tools
if ! command -v npx &> /dev/null; then
  echo "⚠️  npx not found, skipping unused code check"
  exit 0
fi

# Use TypeScript compiler to check for unused variables
# This is a quick check - for more thorough analysis, consider using ts-prune
if [ -f "tsconfig.json" ]; then
  # Check for unused imports/variables in the codebase
  UNUSED=$(npx tsc --noUnusedLocals --noUnusedParameters --noEmit 2>&1 | grep -E "is declared but|is defined but never used" || true)

  if [ -n "$UNUSED" ]; then
    echo "⚠️  Unused code detected:"
    echo "$UNUSED" | head -20
    echo ""
    echo "Consider removing unused imports and variables to keep codebase clean"
    exit 0  # Warning only, not blocking
  fi
fi

echo "✅ No obvious unused code detected"
exit 0
