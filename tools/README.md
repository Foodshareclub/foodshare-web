# lefthook-rs

Fast git hooks for FoodShare, written in Rust with OWASP security coverage.

## Build

```bash
cd tools
cargo build --release
```

The binary will be at `tools/target/release/lefthook-rs`.

## Commands

| Command                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `security`                   | Check for secrets, credentials, debug statements |
| `conventional-commit <file>` | Validate commit message format                   |
| `protected-branch`           | Warn when pushing to protected branches          |
| `large-files`                | Detect large files in staging                    |
| `complexity`                 | Analyze code complexity                          |
| `no-console`                 | Find console statements                          |
| `import-check`               | Check import organization                        |
| `dependency-audit`           | Run npm vulnerability audit                      |
| `accessibility`              | Check JSX/TSX for a11y issues                    |
| `bundle-size`                | Analyze build bundle size                        |
| `test-coverage`              | Check test coverage thresholds                   |
| `unused-exports`             | Find dead code / unused exports                  |
| `nextjs-security`            | OWASP security scanner for Next.js/React/Vercel  |
| `project-structure`          | Verify project directory organization            |
| `pre-commit`                 | Run all pre-commit checks                        |

## Usage

```bash
# Security check on staged files
./target/release/lefthook-rs security

# Validate commit message
./target/release/lefthook-rs conventional-commit .git/COMMIT_EDITMSG

# Check for large files (custom max size in KB)
./target/release/lefthook-rs large-files --max-size 1000

# Verbose output
./target/release/lefthook-rs -v security

# Run all pre-commit checks
./target/release/lefthook-rs pre-commit
```

## Integration

The `lefthook.yml` in the project root is configured to use this binary. After building, the hooks will automatically use the Rust implementation.

## Environment Variables

Enable optional checks via environment variables:

```bash
ENABLE_ALL=1 git commit          # Run all optional checks
ENABLE_COMPLEXITY=1 git commit   # Run complexity check
ENABLE_A11Y=1 git commit         # Run accessibility check
ENABLE_NO_CONSOLE=1 git commit   # Run console statement check
CHECK_BUNDLE_SIZE=1 git push     # Check bundle size on push
```

## OWASP Security Coverage

The `nextjs-security` command provides comprehensive security scanning:

| OWASP    | Category                  | Checks                                    |
| -------- | ------------------------- | ----------------------------------------- |
| A01:2021 | Broken Access Control     | Auth on mutations, IDOR, CSRF protection  |
| A02:2021 | Cryptographic Failures    | Weak crypto, secrets, JWT, timing attacks |
| A03:2021 | Injection                 | SQL, command, prototype pollution, ReDoS  |
| A04:2021 | Insecure Design           | Path traversal, open redirect             |
| A05:2021 | Security Misconfiguration | Headers, CSP, dangerous configs           |
| A06:2021 | Vulnerable Components     | Supply chain, typosquatting               |
| A07:2021 | XSS                       | dangerouslySetInnerHTML, innerHTML        |
| A08:2021 | Software Integrity        | SRI hashes for CDN resources              |
| A09:2021 | Security Logging          | Auth event logging                        |
| A10:2021 | SSRF                      | User-controlled URLs                      |

Additional checks: Input validation (zod/yup), JWT security, password hashing (bcrypt/argon2).

## Performance

The Rust implementation is significantly faster than bash scripts:

- No shell startup overhead
- Compiled regex patterns
- Parallel file processing where applicable
- Single binary with no external dependencies
