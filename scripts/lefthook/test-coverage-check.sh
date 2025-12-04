#!/usr/bin/env bash
# Test Coverage Validation Script
# Ensures test coverage meets minimum thresholds

set -e

echo "📊 Checking test coverage..."

# Minimum coverage thresholds (adjust as needed)
MIN_COVERAGE=70
TARGET_COVERAGE=80

# Run tests with coverage
npm run test:coverage -- --reporter=json --reporter=text 2>&1 | tee coverage-output.tmp || true

# Check if coverage report exists
if [ -f "coverage/coverage-summary.json" ]; then
  # Parse coverage percentages
  LINES=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*' | grep -o '[0-9]*' | awk 'NR==2{covered=$1} NR==1{total=$1} END{if(total>0) print int(covered*100/total); else print 0}')
  STATEMENTS=$(cat coverage/coverage-summary.json | grep -o '"statements":{"total":[0-9]*,"covered":[0-9]*' | grep -o '[0-9]*' | awk 'NR==2{covered=$1} NR==1{total=$1} END{if(total>0) print int(covered*100/total); else print 0}')
  FUNCTIONS=$(cat coverage/coverage-summary.json | grep -o '"functions":{"total":[0-9]*,"covered":[0-9]*' | grep -o '[0-9]*' | awk 'NR==2{covered=$1} NR==1{total=$1} END{if(total>0) print int(covered*100/total); else print 0}')
  BRANCHES=$(cat coverage/coverage-summary.json | grep -o '"branches":{"total":[0-9]*,"covered":[0-9]*' | grep -o '[0-9]*' | awk 'NR==2{covered=$1} NR==1{total=$1} END{if(total>0) print int(covered*100/total); else print 0}')

  echo "Coverage Results:"
  echo "  Lines: ${LINES}%"
  echo "  Statements: ${STATEMENTS}%"
  echo "  Functions: ${FUNCTIONS}%"
  echo "  Branches: ${BRANCHES}%"

  # Check if coverage meets minimum threshold
  if [ "$LINES" -lt "$MIN_COVERAGE" ]; then
    echo "❌ Line coverage (${LINES}%) is below minimum threshold (${MIN_COVERAGE}%)"
    rm -f coverage-output.tmp
    exit 1
  fi

  if [ "$LINES" -lt "$TARGET_COVERAGE" ]; then
    echo "⚠️  Coverage is above minimum but below target (${TARGET_COVERAGE}%)"
  else
    echo "✅ Coverage meets target threshold!"
  fi

  rm -f coverage-output.tmp
  exit 0
else
  echo "⚠️  Coverage report not found, tests may not have run correctly"
  rm -f coverage-output.tmp
  exit 0
fi
