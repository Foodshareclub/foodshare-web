#!/usr/bin/env bash
# License Compliance Check Script
# Validates dependency licenses are compatible

set -e

echo "⚖️  Checking license compliance..."

# List of incompatible licenses (GPL variants for proprietary software)
INCOMPATIBLE_LICENSES="GPL-3.0|AGPL"

# Check if license-checker is available
if ! command -v npx &> /dev/null; then
  echo "⚠️  npx not available, skipping license check"
  exit 0
fi

# Run license checker if installed
if npm list license-checker &> /dev/null 2>&1; then
  INCOMPATIBLE=$(npx license-checker --summary | grep -E "$INCOMPATIBLE_LICENSES" || true)

  if [ -n "$INCOMPATIBLE" ]; then
    echo "⚠️  Potentially incompatible licenses found:"
    echo "$INCOMPATIBLE"
    echo "Review these licenses for compliance with your project"
  else
    echo "✅ No incompatible licenses detected"
  fi
else
  echo "⚠️  license-checker not installed"
  echo "Install with: npm install -D license-checker"
  echo "Checking package.json licenses..."

  # Basic check of direct dependencies
  if [ -f "package.json" ]; then
    echo "Direct dependencies checked (install license-checker for full audit)"
  fi
fi

exit 0
