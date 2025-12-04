#!/usr/bin/env bash
# Duplicate Code Detection Script
# Identifies duplicate code blocks that should be refactored

set -e

echo "🔍 Checking for duplicate code..."

# Simple duplicate detection using pattern matching
# For production use, consider tools like jscpd or PMD

# Check for duplicate imports
DUPLICATE_IMPORTS=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep "^import" 2>/dev/null | sort | uniq -c | sort -rn | awk '$1 > 10 {print $1, $2, $3, $4}' || true)

if [ -n "$DUPLICATE_IMPORTS" ]; then
  echo "⚠️  Frequently duplicated imports (consider creating a shared imports file):"
  echo "$DUPLICATE_IMPORTS" | head -5
fi

# Check for similar function signatures (basic heuristic)
SIMILAR_FUNCTIONS=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -h "function.*{" 2>/dev/null | sort | uniq -c | sort -rn | awk '$1 > 3 {print}' || true)

if [ -n "$SIMILAR_FUNCTIONS" ]; then
  echo "⚠️  Similar function patterns detected (may indicate duplication)"
fi

echo "✅ Duplicate code check complete (basic analysis)"
echo "For detailed analysis, consider using: npx jscpd src"
exit 0
