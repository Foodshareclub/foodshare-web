#!/usr/bin/env bash
# Import Organization Check Script
# Ensures imports are properly organized and follow best practices

set -e

echo "📦 Checking import organization..."

if [ -z "$1" ]; then
  echo "⚠️  No files to check"
  exit 0
fi

FILES="$@"
HAS_ISSUES=false

for file in $FILES; do
  if [[ ! "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
    continue
  fi

  # Check for relative imports that go up too many levels (../../..)
  DEEP_IMPORTS=$(grep -n "from ['\"]\.\.\/\.\.\/\.\.\/" "$file" 2>/dev/null || true)
  if [ -n "$DEEP_IMPORTS" ]; then
    echo "⚠️  $file: Deep relative imports found (consider using absolute imports):"
    echo "$DEEP_IMPORTS"
    HAS_ISSUES=true
  fi

  # Check for mixed import styles (require and import in same file)
  HAS_IMPORT=$(grep -c "^import " "$file" 2>/dev/null || echo "0")
  HAS_REQUIRE=$(grep -c "require(" "$file" 2>/dev/null || echo "0")

  if [ "$HAS_IMPORT" -gt 0 ] && [ "$HAS_REQUIRE" -gt 0 ]; then
    echo "⚠️  $file: Mixed import styles (import and require)"
    HAS_ISSUES=true
  fi

  # Check for unused imports (basic check)
  # This looks for imports that aren't referenced in the file
  IMPORTS=$(grep "^import.*from" "$file" | sed -E "s/import \{([^}]+)\}.*/\1/" | tr ',' '\n' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' || true)

  while IFS= read -r import_name; do
    if [ -n "$import_name" ] && [ "$import_name" != "import" ]; then
      # Skip type imports and default imports
      if [[ ! "$import_name" =~ ^type[[:space:]] ]] && [[ "$import_name" != *"*"* ]]; then
        # Check if imported name is used in file
        USAGE_COUNT=$(grep -c "\b$import_name\b" "$file" 2>/dev/null || echo "0")
        if [ "$USAGE_COUNT" -lt 2 ]; then  # Less than 2 means only the import line itself
          # This is just a warning, might have false positives
          # echo "⚠️  $file: Potentially unused import: $import_name"
          true  # Skip for now to avoid false positives
        fi
      fi
    fi
  done <<< "$IMPORTS"
done

if [ "$HAS_ISSUES" = true ]; then
  echo ""
  echo "Consider organizing imports using absolute paths and consistent import style"
  exit 0  # Warning only, not blocking
fi

echo "✅ Import organization looks good"
exit 0
