#!/bin/bash
# Conventional commits validation for commit-msg hook
# Enforces conventional commit message format for FoodShare project

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Allow merge commits
if echo "$COMMIT_MSG" | grep -qE "^Merge "; then
  exit 0
fi

# Allow revert commits
if echo "$COMMIT_MSG" | grep -qE "^Revert "; then
  exit 0
fi

# Validate conventional commit format
if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,72}"; then
  echo "❌ Commit message must follow Conventional Commits format"
  echo ""
  echo "Format: <type>(<scope>): <description>"
  echo ""
  echo "Valid types:"
  echo "  feat     - New feature"
  echo "  fix      - Bug fix"
  echo "  docs     - Documentation changes"
  echo "  style    - Code style/formatting (no logic change)"
  echo "  refactor - Code restructuring (no behavior change)"
  echo "  test     - Adding or updating tests"
  echo "  chore    - Build/tooling changes"
  echo "  perf     - Performance improvements"
  echo "  ci       - CI/CD configuration"
  echo "  build    - Build system changes"
  echo ""
  echo "Common scopes for FoodShare:"
  echo "  products - Product listings and search"
  echo "  chat     - Real-time messaging"
  echo "  map      - Leaflet map integration"
  echo "  auth     - Authentication and user management"
  echo "  ui       - User interface components"
  echo "  api      - API layer and Supabase integration"
  echo "  i18n     - Internationalization"
  echo ""
  echo "Examples:"
  echo "  feat(products): add distance-based filtering"
  echo "  fix(chat): resolve message duplication in realtime"
  echo "  docs: update API reference documentation"
  echo "  refactor(map): simplify marker clustering logic"
  echo "  test(auth): add integration tests for login flow"
  echo "  perf(products): optimize product list rendering"
  echo "  chore: update dependencies"
  echo ""
  exit 1
fi

# Success
exit 0
