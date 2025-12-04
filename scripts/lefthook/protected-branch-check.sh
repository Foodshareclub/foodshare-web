#!/bin/bash
# Protected branch check for pre-push hook
# Warns before pushing to main/master branches

CURRENT_BRANCH=$(git branch --show-current)
PROTECTED_BRANCHES=("main" "master" "production" "develop")

# Check if current branch is protected
for branch in "${PROTECTED_BRANCHES[@]}"; do
  if [ "$CURRENT_BRANCH" = "$branch" ]; then
    echo "⚠️  WARNING: Pushing to protected branch '$CURRENT_BRANCH'"
    echo "✓ Auto-approving for local development"
    break
  fi
done

# Success
exit 0
