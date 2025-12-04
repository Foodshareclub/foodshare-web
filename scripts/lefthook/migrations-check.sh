#!/usr/bin/env bash
# Database Migrations Check Script
# Alerts when migrations need to be run after merge

set -e

echo "🗄️  Checking for database migrations..."

# Check if there's a migrations directory (adjust path as needed)
MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  # No migrations directory, skip
  exit 0
fi

# Check if any migration files changed in the merge
CHANGED_MIGRATIONS=$(git diff-tree -r --name-only --no-commit-id HEAD@{1} HEAD 2>/dev/null | grep "$MIGRATIONS_DIR" || true)

if [ -n "$CHANGED_MIGRATIONS" ]; then
  echo "⚠️  Migration files changed in this merge:"
  echo "$CHANGED_MIGRATIONS"
  echo ""
  echo "Remember to run migrations:"
  echo "  npx supabase db push"
  echo "  or your project's migration command"
fi

exit 0
