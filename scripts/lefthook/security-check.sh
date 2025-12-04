#!/bin/bash
# Security check for pre-commit hook
# Enhanced with common.sh utilities and better detection

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

print_header "$LOCK Security Check"

# Check if we should skip
if should_skip "security-check"; then
  print_info "Skipping security check (LEFTHOOK_EXCLUDE)"
  exit 0
fi

# Get staged TypeScript/JavaScript/JSON files
STAGED_FILES=$(get_staged_files "\.(ts|tsx|js|jsx|json|env|yml|yaml)$")

if ! check_has_files "$STAGED_FILES" "security check"; then
  exit_success "No files to check"
fi

ERRORS=0
WARNINGS=0

# ============================================================================
# Use gitleaks if available
# ============================================================================
if command_exists gitleaks; then
  print_verbose "Running gitleaks scan..."
  if ! gitleaks detect --no-git --redact 2>&1 | grep -q "No leaks found"; then
    print_error "Gitleaks detected potential secrets!"
    print_info "Run: gitleaks detect --verbose for details"
    ERRORS=$((ERRORS + 1))
  fi
fi

# ============================================================================
# Check for hardcoded secrets
# ============================================================================
print_verbose "Checking for hardcoded secrets..."

# AWS Keys
AWS_PATTERN="AKIA[0-9A-Z]{16}|aws_access_key_id|aws_secret_access_key"
AWS_KEYS=$(count_in_diff "^\+.*($AWS_PATTERN)" "import\.meta\.env|process\.env|//|\*|example")
if [ "$AWS_KEYS" -gt 0 ]; then
  print_error "Possible AWS credentials detected!"
  print_info "Use environment variables for AWS keys"
  ERRORS=$((ERRORS + 1))
fi

# Generic API Keys/Secrets (16+ characters)
SECRET_PATTERN="(api[_-]?key|secret|password|token|access[_-]?key)[\"']?\s*[:=]\s*[\"'][a-zA-Z0-9_\-+/]{16,}[\"']"
SECRETS=$(get_staged_diff | \
  grep -iE "^\+.*$SECRET_PATTERN" | \
  grep -vE "import\.meta\.env|process\.env|VITE_|Deno\.env|//|\*|example|placeholder|your_|xxx|test" | \
  wc -l | xargs)

if [ "$SECRETS" -gt 0 ]; then
  print_error "Found possible hardcoded secrets! ($SECRETS occurrence(s))"
  print_info "Use environment variables: import.meta.env.VITE_*"
  echo ""
  get_staged_diff | \
    grep -iE "^\+.*$SECRET_PATTERN" | \
    grep -vE "import\.meta\.env|process\.env|VITE_|//|\*|example" | \
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

# Private Keys
PRIVATE_KEYS=$(count_in_diff "^\+.*(BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY)" "")
if [ "$PRIVATE_KEYS" -gt 0 ]; then
  print_error "Private key detected!"
  print_info "Never commit private keys to version control"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Check for .env file commits
# ============================================================================
if is_file_staged ".env" || is_file_staged ".env.local" || is_file_staged ".env.production"; then
  print_error "Attempting to commit .env file!"
  print_info ".env files contain secrets and should NEVER be committed"
  print_info "Fix: git reset HEAD .env && echo '.env*' >> .gitignore"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Check for node_modules
# ============================================================================
if git diff --cached --name-only | grep -q "node_modules/"; then
  print_error "Attempting to commit node_modules/"
  print_info "node_modules should never be committed"
  print_info "Fix: Add 'node_modules/' to .gitignore"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Check for dist/ directory (warning only)
# ============================================================================
if git diff --cached --name-only | grep -q "^dist/"; then
  print_warning "Attempting to commit dist/ directory"
  print_info "Build artifacts are usually not committed"
  WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# Check for debugger statements
# ============================================================================
print_verbose "Checking for debug statements..."

DEBUGGERS=$(count_in_diff "^\+[^/]*\bdebugger\b" "//|/\*|no-debugger|['\"]debugger['\"]")
if [ "$DEBUGGERS" -gt 0 ]; then
  print_error "Found $DEBUGGERS debugger statement(s)"
  print_info "Remove 'debugger' statements before committing"
  ERRORS=$((ERRORS + 1))
fi

# Console logs (warning only)
CONSOLE_LOGS=$(count_in_diff "^\+.*console\.(log|debug|info)" "//|/\*|logger")
if [ "$CONSOLE_LOGS" -gt 0 ]; then
  print_warning "Found $CONSOLE_LOGS console.log statement(s)"
  print_info "Consider using a proper logger"
  WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# Check for large files
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
  print_info "Consider using Git LFS: brew install git-lfs && git lfs install"
  WARNINGS=$((WARNINGS + 1))
fi

# ============================================================================
# Check for TODO/FIXME comments
# ============================================================================
TODO_COUNT=$(count_in_diff "^\+.*(TODO|FIXME|HACK|XXX):" "")
if [ "$TODO_COUNT" -gt 0 ]; then
  print_verbose "Found $TODO_COUNT TODO/FIXME comment(s)"
  if [ "$TODO_COUNT" -gt 10 ]; then
    print_warning "High number of TODO comments ($TODO_COUNT)"
    print_info "Consider creating issues for important TODOs"
  fi
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  print_success "Security check passed - no issues detected"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  print_success "Security check passed"
  print_warning "$WARNINGS warning(s) - review recommended"
  exit 0
else
  print_error "Security check failed - $ERRORS critical issue(s) found!"
  [ $WARNINGS -gt 0 ] && print_warning "Also found $WARNINGS warning(s)"
  echo ""
  print_info "Fix critical issues before committing"
  print_info "Emergency bypass: LEFTHOOK_EXCLUDE=security-check git commit"
  exit 1
fi
