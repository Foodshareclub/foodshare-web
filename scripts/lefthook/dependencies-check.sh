#!/bin/bash
# Dependencies check for post-checkout hook
# Checks if package.json changed and suggests reinstall
#
# Arguments from git post-checkout hook:
# $1 = previous HEAD ref
# $2 = new HEAD ref
# $3 = branch checkout flag (1 = branch checkout, 0 = file checkout)

PREV_HEAD=$1
NEW_HEAD=$2
BRANCH_CHECKOUT=$3

# Only run on branch checkouts
if [ "$BRANCH_CHECKOUT" != "1" ]; then
  exit 0
fi

# Check if package.json or package-lock.json changed
CHANGED_FILES=$(git diff --name-only $PREV_HEAD $NEW_HEAD 2>/dev/null)

if echo "$CHANGED_FILES" | grep -qE "^(package\.json|package-lock\.json)$"; then
  echo ""
  echo "📦 Dependencies may have changed!"
  echo ""
  echo "Changes detected in:"
  echo "$CHANGED_FILES" | grep -E "^(package\.json|package-lock\.json)$" | sed 's/^/  - /'
  echo ""
  echo "Recommendation: Run 'npm install' to update dependencies"
  echo ""
fi

exit 0
