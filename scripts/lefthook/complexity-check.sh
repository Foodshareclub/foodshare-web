#!/usr/bin/env bash
# Code Complexity Analysis Script
# Detects overly complex functions that may need refactoring

set -e

# Maximum cyclomatic complexity threshold
MAX_COMPLEXITY=15

echo "🧮 Analyzing code complexity..."

if [ -z "$1" ]; then
  echo "⚠️  No files to check"
  exit 0
fi

# Check if we have any TypeScript/JavaScript files
FILES="$@"
HAS_ISSUES=false

for file in $FILES; do
  if [[ ! "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
    continue
  fi

  # Simple complexity heuristics (lines in functions, nested levels)
  # Count function lines
  FUNCTION_LINES=$(grep -E "^\s*(function|const.*=.*\(|=>)" "$file" 2>/dev/null | wc -l || echo "0")

  # Count nested if/for/while statements (rough estimate)
  NESTING_LEVEL=$(grep -E "^\s{8,}(if|for|while|switch)" "$file" 2>/dev/null | wc -l || echo "0")

  # Check for very long functions (>100 lines is a smell)
  LONG_FUNCTIONS=$(awk '/^[[:space:]]*(function|const.*=.*\(|=>)/ { start=NR }
                         /^[[:space:]]*}[[:space:]]*$/ {
                           if (NR-start > 100) print "Line " start ": Function too long (" NR-start " lines)"
                         }' "$file" 2>/dev/null || true)

  if [ -n "$LONG_FUNCTIONS" ]; then
    echo "⚠️  $file:"
    echo "$LONG_FUNCTIONS"
    HAS_ISSUES=true
  fi

  # Warn about excessive nesting
  if [ "$NESTING_LEVEL" -gt 5 ]; then
    echo "⚠️  $file: Excessive nesting detected ($NESTING_LEVEL deep levels)"
    HAS_ISSUES=true
  fi
done

if [ "$HAS_ISSUES" = true ]; then
  echo ""
  echo "Consider refactoring complex functions into smaller, more maintainable pieces"
  exit 0  # Warning only, not blocking
fi

echo "✅ Code complexity is within acceptable limits"
exit 0
