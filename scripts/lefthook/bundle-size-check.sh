#!/usr/bin/env bash
# Bundle Size Analysis Script
# Checks if bundle size exceeds thresholds

set -e

echo "📦 Analyzing bundle size..."

# Build directory (adjust if different)
BUILD_DIR="dist"

if [ ! -d "$BUILD_DIR" ]; then
  echo "⚠️  Build directory not found, skipping bundle size check"
  exit 0
fi

# Maximum bundle size in KB (adjust as needed)
MAX_MAIN_BUNDLE_KB=500
MAX_VENDOR_BUNDLE_KB=1000

# Find JavaScript bundles
MAIN_BUNDLE=$(find "$BUILD_DIR" -name "index*.js" -o -name "main*.js" | head -1)
VENDOR_BUNDLE=$(find "$BUILD_DIR" -name "vendor*.js" | head -1)

if [ -z "$MAIN_BUNDLE" ]; then
  echo "⚠️  No main bundle found, skipping size check"
  exit 0
fi

# Check main bundle size
MAIN_SIZE_KB=$(du -k "$MAIN_BUNDLE" | cut -f1)
echo "Main bundle: ${MAIN_SIZE_KB}KB (max: ${MAX_MAIN_BUNDLE_KB}KB)"

if [ "$MAIN_SIZE_KB" -gt "$MAX_MAIN_BUNDLE_KB" ]; then
  echo "⚠️  Main bundle exceeds size limit!"
  echo "Consider code splitting or removing unused dependencies"
fi

# Check vendor bundle if exists
if [ -n "$VENDOR_BUNDLE" ]; then
  VENDOR_SIZE_KB=$(du -k "$VENDOR_BUNDLE" | cut -f1)
  echo "Vendor bundle: ${VENDOR_SIZE_KB}KB (max: ${MAX_VENDOR_BUNDLE_KB}KB)"

  if [ "$VENDOR_SIZE_KB" -gt "$MAX_VENDOR_BUNDLE_KB" ]; then
    echo "⚠️  Vendor bundle exceeds size limit!"
    echo "Consider using dynamic imports for large dependencies"
  fi
fi

# Total size check
TOTAL_SIZE_KB=$(du -sk "$BUILD_DIR" | cut -f1)
echo "Total build size: ${TOTAL_SIZE_KB}KB"

echo "✅ Bundle size analysis complete"
exit 0
