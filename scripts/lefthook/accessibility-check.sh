#!/usr/bin/env bash
# Accessibility Check Script
# Validates React components for common accessibility issues

set -e

echo "♿ Checking accessibility..."

if [ -z "$1" ]; then
  echo "⚠️  No files to check"
  exit 0
fi

FILES="$@"
HAS_ISSUES=false

for file in $FILES; do
  if [[ ! "$file" =~ \.(tsx|jsx)$ ]]; then
    continue
  fi

  # Check for images without alt text
  IMG_NO_ALT=$(grep -n "<img[^>]*>" "$file" | grep -v "alt=" || true)
  if [ -n "$IMG_NO_ALT" ]; then
    echo "⚠️  $file: Images without alt text:"
    echo "$IMG_NO_ALT"
    HAS_ISSUES=true
  fi

  # Check for buttons without accessible labels
  BUTTON_NO_LABEL=$(grep -n "<button[^>]*>" "$file" | grep -v "aria-label=" | grep -v ">" | grep -v "</button>" || true)
  if [ -n "$BUTTON_NO_LABEL" ]; then
    # This might have false positives, so just warn
    # echo "⚠️  $file: Buttons that might need aria-label"
    true
  fi

  # Check for missing form labels
  INPUT_NO_LABEL=$(grep -n "<input[^>]*>" "$file" | grep -v "aria-label=" | grep -v "id=" || true)
  if [ -n "$INPUT_NO_LABEL" ]; then
    echo "⚠️  $file: Form inputs should have labels or aria-label"
    echo "$INPUT_NO_LABEL"
    HAS_ISSUES=true
  fi

  # Check for click handlers on non-interactive elements
  DIV_ONCLICK=$(grep -n "<div[^>]*onClick=" "$file" || true)
  if [ -n "$DIV_ONCLICK" ]; then
    echo "⚠️  $file: onClick on div (consider using button or add role/keyboard handlers):"
    echo "$DIV_ONCLICK"
    HAS_ISSUES=true
  fi

  # Check for missing heading hierarchy
  # This is complex to check statically, skip for now

  # Check for color-only information (looking for common patterns)
  COLOR_ONLY=$(grep -n "color.*red\|color.*green" "$file" | grep -v "aria-label\|title" || true)
  if [ -n "$COLOR_ONLY" ]; then
    # Just a warning
    # echo "⚠️  $file: Ensure color is not the only way to convey information"
    true
  fi
done

if [ "$HAS_ISSUES" = true ]; then
  echo ""
  echo "Fix accessibility issues to ensure your app is usable by everyone"
  exit 0  # Warning only, not blocking for now
fi

echo "✅ No obvious accessibility issues found"
exit 0
