#!/usr/bin/env bash
# Commit Message Quality Check Script
# Ensures commit messages are meaningful and well-formed

set -e

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Skip merge commits
if echo "$COMMIT_MSG" | grep -q "^Merge"; then
  exit 0
fi

# Minimum message length (excluding type and scope)
MIN_LENGTH=10
MAX_LENGTH=100

# Extract the subject line (first line)
SUBJECT=$(echo "$COMMIT_MSG" | head -1)

# Check minimum length
if [ ${#SUBJECT} -lt $MIN_LENGTH ]; then
  echo "❌ Commit message too short (minimum $MIN_LENGTH characters)"
  echo "Current: '$SUBJECT'"
  exit 1
fi

# Check maximum length
if [ ${#SUBJECT} -gt $MAX_LENGTH ]; then
  echo "⚠️  Commit subject line is long (${#SUBJECT} chars, recommended max: $MAX_LENGTH)"
  echo "Consider moving details to commit body"
fi

# Check if message starts with capital letter (after type)
if echo "$SUBJECT" | grep -qE "^[a-z]+(\([a-z-]+\))?:\s+[a-z]"; then
  echo "⚠️  Commit message should start with capital letter after colon"
fi

# Check for common bad patterns
if echo "$SUBJECT" | grep -qiE "^(wip|tmp|test|debug|fix bug|update|changes)$"; then
  echo "❌ Commit message is too vague: '$SUBJECT'"
  echo "Be more specific about what changed and why"
  exit 1
fi

# Check for ending with period
if echo "$SUBJECT" | grep -q "\.$"; then
  echo "⚠️  Commit subject should not end with a period"
fi

echo "✅ Commit message quality check passed"
exit 0
