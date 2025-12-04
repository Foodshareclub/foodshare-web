#!/bin/bash
# Common helper functions for lefthook scripts
# Source this file in other scripts: source "$(dirname "$0")/common.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis for better visual feedback
CHECK_MARK="✓"
CROSS_MARK="✗"
WARNING="⚠️"
INFO="ℹ️"
LOCK="🔒"
ROCKET="🚀"
CLEAN="🧹"
HAMMER="🔨"

# Print colored message
print_color() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Print success message
print_success() {
  print_color "$GREEN" "  $CHECK_MARK $1"
}

# Print error message
print_error() {
  print_color "$RED" "  $CROSS_MARK $1"
}

# Print warning message
print_warning() {
  print_color "$YELLOW" "  $WARNING $1"
}

# Print info message
print_info() {
  print_color "$CYAN" "  $INFO $1"
}

# Print section header
print_header() {
  echo ""
  print_color "$MAGENTA" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  print_color "$MAGENTA" "  $1"
  print_color "$MAGENTA" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Get file size in a cross-platform way
get_file_size() {
  local file=$1
  if [ -f "$file" ]; then
    # Try BSD stat (macOS)
    stat -f%z "$file" 2>/dev/null || \
    # Try GNU stat (Linux)
    stat -c%s "$file" 2>/dev/null || \
    # Fallback
    echo 0
  else
    echo 0
  fi
}

# Format bytes to human readable
format_bytes() {
  local bytes=$1
  if command -v numfmt &>/dev/null; then
    numfmt --to=iec-i --suffix=B "$bytes" 2>/dev/null
  elif [ "$bytes" -ge 1073741824 ]; then
    echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1073741824}")GB"
  elif [ "$bytes" -ge 1048576 ]; then
    echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1048576}")MB"
  elif [ "$bytes" -ge 1024 ]; then
    echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1024}")KB"
  else
    echo "${bytes}B"
  fi
}

# Get staged files matching a pattern
get_staged_files() {
  local pattern=${1:-".*"}
  git diff --cached --name-only --diff-filter=ACM | grep -E "$pattern" || true
}

# Get staged files content matching a pattern
get_staged_diff() {
  git diff --cached
}

# Check if command exists
command_exists() {
  command -v "$1" &>/dev/null
}

# Skip check if no relevant files
check_has_files() {
  local files=$1
  local check_name=$2

  if [ -z "$files" ]; then
    print_info "No files to check for $check_name"
    return 1
  fi
  return 0
}

# Count occurrences in staged diff
count_in_diff() {
  local pattern=$1
  local exclude_pattern=${2:-"^$"}

  get_staged_diff | \
    grep -E "$pattern" | \
    grep -vE "$exclude_pattern" | \
    wc -l | \
    xargs
}

# Check if running in CI environment
is_ci() {
  [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$GITLAB_CI" ] || [ -n "$VERCEL" ]
}

# Check if verbose mode is enabled
is_verbose() {
  [ -n "$LEFTHOOK_VERBOSE" ] || [ "$VERBOSE" = "1" ]
}

# Print verbose message (only if verbose mode enabled)
print_verbose() {
  if is_verbose; then
    print_info "$1"
  fi
}

# Exit with error code and message
exit_error() {
  local message=$1
  local code=${2:-1}
  echo ""
  print_error "$message"
  exit "$code"
}

# Exit with success message
exit_success() {
  local message=${1:-"Check passed"}
  print_success "$message"
  exit 0
}

# Run command with timeout (if timeout command exists)
run_with_timeout() {
  local timeout_seconds=$1
  shift
  local cmd=$@

  if command_exists timeout; then
    timeout "$timeout_seconds" $cmd
  else
    $cmd
  fi
}

# Check if we should skip (for quick commits)
should_skip() {
  local check_name=$1
  [ -n "$LEFTHOOK_EXCLUDE" ] && echo "$LEFTHOOK_EXCLUDE" | grep -q "$check_name"
}

# Get project root directory
get_project_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

# Check if file is in staged changes
is_file_staged() {
  local file=$1
  git diff --cached --name-only | grep -qF "$file"
}

# Count lines in file matching pattern
count_lines_matching() {
  local file=$1
  local pattern=$2
  grep -cE "$pattern" "$file" 2>/dev/null || echo 0
}

# Export functions for use in other scripts
export -f print_color
export -f print_success
export -f print_error
export -f print_warning
export -f print_info
export -f print_header
export -f print_verbose
export -f get_file_size
export -f format_bytes
export -f get_staged_files
export -f get_staged_diff
export -f command_exists
export -f check_has_files
export -f count_in_diff
export -f is_ci
export -f is_verbose
export -f exit_error
export -f exit_success
export -f run_with_timeout
export -f should_skip
export -f get_project_root
export -f is_file_staged
export -f count_lines_matching
