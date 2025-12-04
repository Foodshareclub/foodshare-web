#!/usr/bin/env bash
# Large Files Detection Script
# Prevents accidentally committing large files

set -e

echo "📏 Checking for large files..."

# Maximum file size in KB
MAX_SIZE_KB=500

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No files to check"
  exit 0
fi

HAS_LARGE_FILES=false

for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    FILE_SIZE_KB=$(du -k "$file" | cut -f1)

    if [ "$FILE_SIZE_KB" -gt "$MAX_SIZE_KB" ]; then
      echo "⚠️  Large file: $file (${FILE_SIZE_KB}KB)"
      HAS_LARGE_FILES=true
    fi
  fi
done

if [ "$HAS_LARGE_FILES" = true ]; then
  echo ""
  echo "Consider using Git LFS for large binary files"
  echo "Or ensure large files are necessary and not build artifacts"
  exit 1
fi

echo "✅ No large files detected"
exit 0
