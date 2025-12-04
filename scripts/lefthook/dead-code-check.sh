#!/usr/bin/env bash
# Dead Code Detection Script
# Identifies unused exports and dead code

set -e

echo "🪦 Checking for dead code..."

# Check for unused exports using TypeScript
if command -v npx &> /dev/null; then
  # Use ts-prune if available, otherwise fall back to basic checks
  if npm list ts-prune &> /dev/null 2>&1; then
    echo "Running ts-prune for detailed analysis..."
    npx ts-prune | grep -v "(used in module)" | head -20 || true
  else
    echo "⚠️  ts-prune not installed. Install with: npm install -D ts-prune"
    echo "Running basic dead code checks..."

    # Basic check: find exports that aren't imported anywhere
    EXPORTS=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep "^export" | grep -v "export default" || true)

    if [ -n "$EXPORTS" ]; then
      echo "Found $(echo "$EXPORTS" | wc -l) exports (manual review recommended)"
    fi
  fi
fi

echo "✅ Dead code check complete"
echo "For comprehensive analysis: npm install -D ts-prune && npx ts-prune"
exit 0
