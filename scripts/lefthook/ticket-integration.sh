#!/usr/bin/env bash
# Ticket Integration Script
# Automatically adds ticket number from branch name to commit message

set -e

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Skip for merge commits, squash commits, or if message already has a ticket
if [ -n "$COMMIT_SOURCE" ]; then
  exit 0
fi

# Get current branch name
BRANCH_NAME=$(git symbolic-ref --short HEAD 2>/dev/null || true)

if [ -z "$BRANCH_NAME" ]; then
  exit 0
fi

# Extract ticket number from branch name (supports patterns like PROJ-123, #123, etc.)
TICKET=$(echo "$BRANCH_NAME" | grep -oE '([A-Z]+-[0-9]+|#[0-9]+)' | head -1 || true)

if [ -n "$TICKET" ]; then
  # Read current commit message
  COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

  # Check if ticket is already in message
  if echo "$COMMIT_MSG" | grep -q "$TICKET"; then
    exit 0
  fi

  # Prepend ticket to commit message
  echo "[$TICKET] $COMMIT_MSG" > "$COMMIT_MSG_FILE"
  echo "Added ticket number: $TICKET"
fi

exit 0
