#!/bin/bash
# Enhanced Security Check for Pre-Commit Hook
# Detects secrets, credentials, debug statements, and security issues
# Uses gitleaks/trufflehog if available, falls back to pattern matching

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

print_header "$LOCK Security Check"

# Check if we should skip this check
if should_skip "security-check"; then
  print_info "Skipping security check (LEFTHOOK_EXCLUDE)"
  exit 0
fi

# Get staged files
STAGED_FILES=$(get_staged_files "\.(ts|tsx|js|jsx|json|env|yml|yaml)$")

if ! check_has_files "$STAGED_FILES" "security check"; then
  exit_success "No files to check"
fi

ERRORS=0
WARNINGS=0

# ============================================================================
# 1. Use gitleaks if available (most comprehensive)
# ============================================================================
if command_exists gitleaks; then
  print_verbose "Running gitleaks scan..."

  if ! gitleaks detect --no-git --verbose --redact 2>&1 | grep -q "No leaks found"; then
    print_error "Gitleaks detected potential secrets!"
    print_info "Run: gitleaks detect --verbose to see details"
    ERRORS=$((ERRORS + 1))
  fi
fi

# ============================================================================
# 2. Check for hardcoded secrets and credentials
# ============================================================================
print_verbose "Checking for hardcoded secrets..."

# AWS Keys
AWS_KEYS=$(count_in_diff "^\+.*(AKIA[0-9A-Z]{16}|aws_access_key_id|aws_secret_access_key)" "import\.meta\.env|process\.env|//|\*")
if [ "$AWS_KEYS" -gt 0 ]; then
  print_error "Possible AWS credentials detected!"
  print_info "Use environment variables for AWS keys"
  ERRORS=$((ERRORS + 1))
fi

# Private Keys
PRIVATE_KEYS=$(count_in_diff "^\+.*(BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY)" "")
if [ "$PRIVATE_KEYS" -gt 0 ]; then
  print_error "Private key detected!"
  print_info "Never commit private keys to version control"
  ERRORS=$((ERRORS + 1))
fi

# Generic API Keys/Secrets (16+ characters)
API_KEYS=$(get_staged_diff | \
  grep -iE "^\+.*(api[_-]?key|secret|password|token|access[_-]?key)[\"']?\s*[:=]\s*[\"'][a-zA-Z0-9_\-+/]{16,}[\"']" | \
  grep -vE "import\.meta\.env|process\.env|VITE_|Deno\.env|\.find.*\.name\s*===|//|\*|example|placeholder|your_|xxx|test" | \
  wc -l | xargs)

if [ "$API_KEYS" -gt 0 ]; then
  print_error "Possible hardcoded API keys/secrets detected! ($API_KEYS occurrence(s))"
  print_info "Use environment variables: import.meta.env.VITE_YOUR_KEY"
  echo ""
  get_staged_diff | \
    grep -iE "^\+.*(api[_-]?key|secret|password|token|access[_-]?key)[\"']?\s*[:=]\s*[\"'][a-zA-Z0-9_\-+/]{16,}[\"']" | \
    grep -vE "import\.meta\.env|process\.env|VITE_|Deno\.env|\.find.*\.name\s*===|//|\*|example|placeholder|your_|xxx|test" | \
    head -3 | \
    sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
fi

# JWT Tokens
JWT_TOKENS=$(count_in_diff "^\+.*eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\." "//|\*|example")
if [ "$JWT_TOKENS" -gt 0 ]; then
  print_error "JWT token detected!"
  print_info "Never commit JWT tokens"
  ERRORS=$((ERRORS + 1))
fi

# Slack Tokens
SLACK_TOKENS=$(count_in_diff "^\+.*xox[baprs]-[0-9a-zA-Z-]+" "//|\*|example")
if [ "$SLACK_TOKENS" -gt 0 ]; then
  print_error "Slack token detected!"
  ERRORS=$((ERRORS + 1))
fi

# Stripe Keys
STRIPE_KEYS=$(count_in_diff "^\+.*(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}" "//|\*|example")
if [ "$STRIPE_KEYS" -gt 0 ]; then
  print_error "Stripe API key detected!"
  ERRORS=$((ERRORS + 1))
fi

# Database URLs with credentials
DB_URLS=$(count_in_diff "^\+.*(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@" "//|\*|example|localhost")
if [ "$DB_URLS" -gt 0 ]; then
  print_warning "Database URL with credentials detected"
  print_info "Consider using connection strings from environment variables"
  WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# 3. Check for sensitive files
# ============================================================================
print_verbose "Checking for sensitive files..."

# .env files
if git diff --cached --name-only | grep -qE "^\.env(\.local|\.production|\.staging)?$"; then
  print_error "Attempting to commit .env file!"
  print_info ".env files should NEVER be committed"
  print_info "Fix: git reset HEAD .env && echo '.env*' >> .gitignore"
  ERRORS=$((ERRORS + 1))
fi

# node_modules
if git diff --cached --name-only | grep -q "node_modules/"; then
  print_error "Attempting to commit node_modules/"
  print_info "node_modules should be in .gitignore"
  ERRORS=$((ERRORS + 1))
fi

# Common secret files
SECRET_FILES="credentials.json|secrets.json|private.key|.pem$|.p12$|.pfx$"
if git diff --cached --name-only | grep -qE "$SECRET_FILES"; then
  print_error "Attempting to commit potential secret files!"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# 4. Check for debug statements
# ============================================================================
print_verbose "Checking for debug statements..."

# debugger statements
DEBUGGERS=$(count_in_diff "^\+[^/]*\bdebugger\b" "//|/\*|no-debugger|['\"]debugger['\"]")
if [ "$DEBUGGERS" -gt 0 ]; then
  print_error "Found $DEBUGGERS debugger statement(s)"
  print_info "Remove 'debugger' before committing"
  ERRORS=$((ERRORS + 1))
fi

# console.log (warning, not error - useful for debugging)
CONSOLE_LOGS=$(count_in_diff "^\+.*console\.(log|debug)" "//|/\*|logger")
if [ "$CONSOLE_LOGS" -gt 0 ]; then
  print_warning "Found $CONSOLE_LOGS console.log statement(s)"
  print_info "Consider using a proper logger or removing debug logs"
  WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# 5. Check for large files
# ============================================================================
print_verbose "Checking for large files..."

LARGE_FILES=""
while IFS= read -r file; do
  if [ -f "$file" ]; then
    SIZE=$(get_file_size "$file")
    if [ "$SIZE" -gt 1048576 ]; then  # > 1MB
      FORMATTED_SIZE=$(format_bytes "$SIZE")
      LARGE_FILES="${LARGE_FILES}${file} (${FORMATTED_SIZE})\n"
    fi
  fi
done < <(git diff --cached --name-only)

if [ -n "$LARGE_FILES" ]; then
  print_warning "Large files detected (>1MB):"
  echo -e "$LARGE_FILES" | sed 's/^/    /'
  print_info "Consider using Git LFS for large binary files"
  print_info "Install: git lfs install && git lfs track '*.large-extension'"
  WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# 6. Check for TODO/FIXME comments
# ============================================================================
TODO_COUNT=$(count_in_diff "^\+.*(TODO|FIXME|HACK|XXX):" "")
if [ "$TODO_COUNT" -gt 0 ]; then
  print_info "Found $TODO_COUNT TODO/FIXME comment(s)"
  if [ "$TODO_COUNT" -gt 10 ]; then
    print_warning "High number of TODO comments"
    print_info "Consider creating issues for important TODOs"
  fi
fi

# ============================================================================
# 7. Security-sensitive patterns
# ============================================================================
print_verbose "Checking for security-sensitive patterns..."

# SQL Injection vulnerabilities
SQL_CONCAT=$(count_in_diff "^\+.*(query|execute|sql).*\+.*\(" "//|/\*|prepareStatement")
if [ "$SQL_CONCAT" -gt 0 ]; then
  print_warning "Possible SQL injection vulnerability (string concatenation in SQL)"
  print_info "Use parameterized queries or prepared statements"
  WARNINGS=$((WARNINGS + 1))
fi

# Unsafe code execution (checking for the word without calling it)
UNSAFE_CODE=$(count_in_diff "^\+.*\b(ev""al|Function)\(" "//|/\*|eslint-disable")
if [ "$UNSAFE_CODE" -gt 0 ]; then
  print_warning "Use of dynamic code execution detected"
  print_info "These are potential security risks - ensure input is sanitized"
  WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
print_header "Security Check Summary"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  print_success "No security issues detected"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  print_warning "$WARNINGS warning(s) found - review recommended"
  exit 0
else
  print_error "$ERRORS critical security issue(s) found!"
  [ $WARNINGS -gt 0 ] && print_warning "$WARNINGS warning(s) also detected"
  echo ""
  print_info "Fix critical issues before committing"
  print_info "Skip this check only if absolutely necessary: LEFTHOOK_EXCLUDE=security-check git commit"
  exit 1
fi
