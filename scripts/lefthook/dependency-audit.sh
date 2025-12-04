#!/usr/bin/env bash
# Dependency Vulnerability Audit Script
# Checks for known vulnerabilities in npm dependencies

set -e

echo "🔍 Running dependency vulnerability audit..."

# Check for high and critical vulnerabilities
AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)

if [ -z "$AUDIT_OUTPUT" ]; then
  echo "✅ No vulnerabilities found"
  exit 0
fi

# Parse vulnerabilities
CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' || echo "0")
HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | grep -o '[0-9]*' || echo "0")
MODERATE=$(echo "$AUDIT_OUTPUT" | grep -o '"moderate":[0-9]*' | grep -o '[0-9]*' || echo "0")

# Display results
if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
  echo "❌ Security vulnerabilities found:"
  echo "   Critical: $CRITICAL"
  echo "   High: $HIGH"
  echo "   Moderate: $MODERATE"
  echo ""
  echo "Run 'npm audit' for details and 'npm audit fix' to resolve"
  exit 1
fi

if [ "$MODERATE" -gt 0 ]; then
  echo "⚠️  Moderate vulnerabilities found: $MODERATE"
  echo "Consider running 'npm audit fix' to resolve"
  exit 0
fi

echo "✅ No critical or high vulnerabilities found"
exit 0
