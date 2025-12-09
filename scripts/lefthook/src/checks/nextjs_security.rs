//! Advanced Next.js/React/Vercel Security Scanner
//! 
//! Covers:
//! - OWASP Top 10 (Injection, XSS, SSRF, Path Traversal, etc.)
//! - React/Next.js CVE patterns
//! - Vercel Edge/Middleware security
//! - Supply chain attack prevention
//! - Runtime security (eval, prototype pollution)
//! - FoodShare-specific patterns

use crate::utils::{
    filter_files_by_extension, get_staged_diff, get_staged_files, print_error, print_header,
    print_success, print_verbose, print_warning,
};
use anyhow::Result;
use regex::Regex;
use std::fs;

/// Security issue severity
#[derive(Clone, Copy)]
enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

struct SecurityIssue {
    severity: Severity,
    file: String,
    message: String,
    owasp: Option<&'static str>,
}

pub fn run(files: &[String]) -> Result<()> {
    print_header("🛡️ Advanced Security Scanner (OWASP + Next.js/React/Vercel)");

    let files = if files.is_empty() {
        filter_files_by_extension(
            &get_staged_files(),
            &[".ts", ".tsx", ".js", ".jsx", ".json", ".env", ".mjs", ".cjs"],
        )
    } else {
        files.to_vec()
    };

    if files.is_empty() {
        print_success("No files to check");
        return Ok(());
    }

    let diff = get_staged_diff();
    let mut issues: Vec<SecurityIssue> = Vec::new();

    // =========================================================================
    // OWASP A03:2021 - INJECTION (SQL, NoSQL, Command, LDAP)
    // =========================================================================
    print_verbose("🔍 OWASP A03: Checking injection vulnerabilities...");
    check_injection_vulnerabilities(&files, &diff, &mut issues);

    // =========================================================================
    // OWASP A07:2021 - XSS (Cross-Site Scripting)
    // =========================================================================
    print_verbose("🔍 OWASP A07: Checking XSS vulnerabilities...");
    check_xss_vulnerabilities(&files, &diff, &mut issues);

    // =========================================================================
    // OWASP A10:2021 - SSRF (Server-Side Request Forgery)
    // =========================================================================
    print_verbose("🔍 OWASP A10: Checking SSRF vulnerabilities...");
    check_ssrf_vulnerabilities(&files, &diff, &mut issues);

    // =========================================================================
    // OWASP A01:2021 - Broken Access Control
    // =========================================================================
    print_verbose("🔍 OWASP A01: Checking access control...");
    check_access_control(&files, &mut issues);

    // =========================================================================
    // OWASP A02:2021 - Cryptographic Failures
    // =========================================================================
    print_verbose("🔍 OWASP A02: Checking cryptographic issues...");
    check_crypto_failures(&files, &diff, &mut issues);

    // =========================================================================
    // OWASP A04:2021 - Insecure Design (Path Traversal, Open Redirect)
    // =========================================================================
    print_verbose("🔍 OWASP A04: Checking insecure design patterns...");
    check_insecure_design(&files, &diff, &mut issues);

    // =========================================================================
    // OWASP A05:2021 - Security Misconfiguration
    // =========================================================================
    print_verbose("🔍 OWASP A05: Checking security configuration...");
    check_security_config(&files, &mut issues);

    // =========================================================================
    // OWASP A06:2021 - Vulnerable Components (Supply Chain)
    // =========================================================================
    print_verbose("🔍 OWASP A06: Checking supply chain security...");
    check_supply_chain(&files, &diff, &mut issues);

    // =========================================================================
    // RUNTIME SECURITY - eval, Function constructor, prototype pollution
    // =========================================================================
    print_verbose("🔍 Checking runtime security...");
    check_runtime_security(&files, &diff, &mut issues);

    // =========================================================================
    // NEXT.JS SPECIFIC - RSC, Server Actions, Middleware
    // =========================================================================
    print_verbose("🔍 Checking Next.js specific patterns...");
    check_nextjs_patterns(&files, &mut issues);

    // =========================================================================
    // VERCEL EDGE/MIDDLEWARE SECURITY
    // =========================================================================
    print_verbose("🔍 Checking Vercel Edge/Middleware security...");
    check_vercel_security(&files, &mut issues);

    // =========================================================================
    // REACT CVE PATTERNS
    // =========================================================================
    print_verbose("🔍 Checking React CVE patterns...");
    check_react_cve_patterns(&files, &diff, &mut issues);

    // =========================================================================
    // FOODSHARE SPECIFIC PATTERNS
    // =========================================================================
    print_verbose("🔍 Checking FoodShare patterns...");
    check_foodshare_patterns(&files, &mut issues);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    print_summary(&issues)
}


// =============================================================================
// OWASP A03:2021 - INJECTION
// =============================================================================
fn check_injection_vulnerabilities(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    // SQL Injection patterns (raw queries, string concatenation)
    let sql_injection_patterns = [
        (r#"\.raw\s*\(\s*[`'"].*\$\{.*\}"#, "SQL injection via raw query with template literal"),
        (r#"\.raw\s*\(\s*['"].*\+\s*"#, "SQL injection via string concatenation in raw query"),
        (r#"execute\s*\(\s*[`'"].*\$\{.*\}"#, "SQL injection in execute statement"),
        (r#"query\s*\(\s*[`'"].*\$\{.*\}"#, "SQL injection in query with interpolation"),
    ];

    // Command injection patterns
    let cmd_injection_patterns = [
        (r#"exec\s*\(\s*[`'"].*\$\{.*\}"#, "Command injection via exec()"),
        (r#"execSync\s*\(\s*[`'"].*\$\{.*\}"#, "Command injection via execSync()"),
        (r#"spawn\s*\([^,]+,\s*\[.*\$\{.*\}\]"#, "Command injection via spawn()"),
        (r#"child_process"#, "child_process import - ensure no user input in commands"),
    ];

    for file in files {
        if let Ok(content) = fs::read_to_string(file) {
            for (pattern, msg) in &sql_injection_patterns {
                if let Ok(re) = Regex::new(pattern) {
                    if re.is_match(&content) {
                        issues.push(SecurityIssue {
                            severity: Severity::Critical,
                            file: file.clone(),
                            message: msg.to_string(),
                            owasp: Some("A03:2021"),
                        });
                    }
                }
            }

            for (pattern, msg) in &cmd_injection_patterns {
                if let Ok(re) = Regex::new(pattern) {
                    if re.is_match(&content) {
                        issues.push(SecurityIssue {
                            severity: Severity::Critical,
                            file: file.clone(),
                            message: msg.to_string(),
                            owasp: Some("A03:2021"),
                        });
                    }
                }
            }
        }
    }

    // Check diff for new injection patterns
    let diff_patterns = [
        (r#"\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)"#, "Potential SQL injection in new code"),
        (r#"(?:SELECT|INSERT|UPDATE|DELETE).*\+\s*(?:req|params|query|body)"#, "SQL with user input concatenation"),
    ];

    for (pattern, msg) in &diff_patterns {
        if let Ok(re) = Regex::new(pattern) {
            if diff.lines().filter(|l| l.starts_with('+')).any(|l| re.is_match(l)) {
                issues.push(SecurityIssue {
                    severity: Severity::Critical,
                    file: "diff".to_string(),
                    message: msg.to_string(),
                    owasp: Some("A03:2021"),
                });
            }
        }
    }
}


// =============================================================================
// OWASP A07:2021 - XSS (Cross-Site Scripting)
// =============================================================================
fn check_xss_vulnerabilities(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    let dangerous_re = Regex::new(r"dangerouslySetInnerHTML").unwrap();
    let sanitize_re = Regex::new(r"(?i)(DOMPurify|sanitize|xss|escape)").unwrap();

    for file in files {
        if file.ends_with(".tsx") || file.ends_with(".jsx") {
            if let Ok(content) = fs::read_to_string(file) {
                if dangerous_re.is_match(&content) && !sanitize_re.is_match(&content) {
                    issues.push(SecurityIssue {
                        severity: Severity::Critical,
                        file: file.clone(),
                        message: "dangerouslySetInnerHTML without sanitization library".to_string(),
                        owasp: Some("A07:2021"),
                    });
                }

                // innerHTML usage
                if content.contains(".innerHTML") && !sanitize_re.is_match(&content) {
                    issues.push(SecurityIssue {
                        severity: Severity::Critical,
                        file: file.clone(),
                        message: "innerHTML assignment without sanitization".to_string(),
                        owasp: Some("A07:2021"),
                    });
                }

                // document.write
                if content.contains("document.write") {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        file: file.clone(),
                        message: "document.write() is XSS-prone - avoid usage".to_string(),
                        owasp: Some("A07:2021"),
                    });
                }
            }
        }
    }

    // Check for href javascript: protocol
    let js_href_re = Regex::new(r#"href\s*=\s*[`'"]?\s*javascript:"#).unwrap();
    for line in diff.lines().filter(|l| l.starts_with('+')) {
        if js_href_re.is_match(line) {
            issues.push(SecurityIssue {
                severity: Severity::Critical,
                file: "diff".to_string(),
                message: "javascript: protocol in href - XSS vulnerability".to_string(),
                owasp: Some("A07:2021"),
            });
        }
    }
}


// =============================================================================
// OWASP A10:2021 - SSRF (Server-Side Request Forgery)
// =============================================================================
fn check_ssrf_vulnerabilities(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    let ssrf_patterns = [
        (r#"fetch\s*\(\s*(?:req|params|query|body|searchParams)"#, "SSRF: fetch() with user-controlled URL"),
        (r#"axios\s*\.\s*(?:get|post|put|delete)\s*\(\s*(?:req|params|query)"#, "SSRF: axios with user-controlled URL"),
        (r#"http\.request\s*\(\s*(?:req|params|query)"#, "SSRF: http.request with user-controlled URL"),
        (r#"new\s+URL\s*\(\s*(?:req|params|query|body)"#, "SSRF: URL constructor with user input"),
    ];

    for file in files {
        if file.contains("/api/") || file.contains("/actions/") || file.contains("route.ts") {
            if let Ok(content) = fs::read_to_string(file) {
                for (pattern, msg) in &ssrf_patterns {
                    if let Ok(re) = Regex::new(pattern) {
                        if re.is_match(&content) {
                            issues.push(SecurityIssue {
                                severity: Severity::High,
                                file: file.clone(),
                                message: msg.to_string(),
                                owasp: Some("A10:2021"),
                            });
                        }
                    }
                }

                // Check for URL allowlist
                if (content.contains("fetch(") || content.contains("axios"))
                    && content.contains("req.")
                    && !content.contains("allowlist")
                    && !content.contains("whitelist")
                    && !content.contains("ALLOWED_")
                {
                    issues.push(SecurityIssue {
                        severity: Severity::Medium,
                        file: file.clone(),
                        message: "External request without URL allowlist validation".to_string(),
                        owasp: Some("A10:2021"),
                    });
                }
            }
        }
    }

    // Check diff for new SSRF patterns
    for line in diff.lines().filter(|l| l.starts_with('+')) {
        if line.contains("fetch(") && (line.contains("${") || line.contains("` +")) {
            issues.push(SecurityIssue {
                severity: Severity::High,
                file: "diff".to_string(),
                message: "Dynamic URL in fetch() - validate against allowlist".to_string(),
                owasp: Some("A10:2021"),
            });
        }
    }
}


// =============================================================================
// OWASP A01:2021 - Broken Access Control
// =============================================================================
fn check_access_control(files: &[String], issues: &mut Vec<SecurityIssue>) {
    let server_action_re = Regex::new(r#"['"]use server['"]"#).unwrap();
    let auth_patterns = ["getUser", "getCurrentUser", "session", "auth(", "getSession", "requireAuth"];

    for file in files {
        // Check Server Actions for auth
        if file.contains("/actions/") {
            if let Ok(content) = fs::read_to_string(file) {
                if server_action_re.is_match(&content) {
                    let has_mutation = content.contains(".insert(")
                        || content.contains(".update(")
                        || content.contains(".delete(")
                        || content.contains(".upsert(");

                    let has_auth = auth_patterns.iter().any(|p| content.contains(p));

                    if has_mutation && !has_auth {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: "Server Action performs mutation without authentication check".to_string(),
                            owasp: Some("A01:2021"),
                        });
                    }
                }
            }
        }

        // Check API routes for auth
        if file.contains("/api/") && file.ends_with("route.ts") {
            if let Ok(content) = fs::read_to_string(file) {
                let has_mutation = content.contains("POST")
                    || content.contains("PUT")
                    || content.contains("DELETE")
                    || content.contains("PATCH");

                let has_auth = auth_patterns.iter().any(|p| content.contains(p));

                if has_mutation && !has_auth {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        file: file.clone(),
                        message: "API route handles mutations without authentication".to_string(),
                        owasp: Some("A01:2021"),
                    });
                }
            }
        }

        // Check for IDOR (Insecure Direct Object Reference)
        if file.contains("/api/") || file.contains("/actions/") {
            if let Ok(content) = fs::read_to_string(file) {
                // Using params.id directly without ownership check
                if content.contains("params.id") || content.contains("params?.id") {
                    if !content.contains("user_id") && !content.contains("userId") && !content.contains("owner") {
                        issues.push(SecurityIssue {
                            severity: Severity::Medium,
                            file: file.clone(),
                            message: "Accessing resource by ID without ownership verification (potential IDOR)".to_string(),
                            owasp: Some("A01:2021"),
                        });
                    }
                }
            }
        }
    }
}


// =============================================================================
// OWASP A02:2021 - Cryptographic Failures
// =============================================================================
fn check_crypto_failures(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    // Use regex patterns with word boundaries to avoid false positives
    let weak_crypto_patterns = [
        (r"\bmd5\b", "MD5 is cryptographically broken - use SHA-256+"),
        (r"\bsha1\b", "SHA1 is weak - use SHA-256+"),
        (r"createCipher\(", "createCipher is deprecated - use createCipheriv"),
        (r"\bDES\b", "DES cipher is insecure - use AES-256"),
        (r"\bRC4\b", "RC4 is broken - use AES-256"),
        (r"crypto\.createDecipher", "createDecipher is deprecated - use createDecipheriv"),
    ];

    let sensitive_storage = [
        (r"localStorage\.setItem.*(?i)(password|token|secret|key|auth)", "Sensitive data in localStorage"),
        (r"sessionStorage\.setItem.*(?i)(password|secret|key)", "Sensitive data in sessionStorage"),
        (r"cookie.*(?i)password", "Password in cookie - use httpOnly secure cookies"),
    ];

    for file in files {
        if let Ok(content) = fs::read_to_string(file) {
            let content_lower = content.to_lowercase();

            for (pattern, msg) in &weak_crypto_patterns {
                if let Ok(re) = Regex::new(&format!("(?i){}", pattern)) {
                    if re.is_match(&content_lower) {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: msg.to_string(),
                            owasp: Some("A02:2021"),
                        });
                    }
                }
            }

            // Check for hardcoded secrets
            let secret_patterns = [
                r#"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]"#,
                r#"(?i)bearer\s+[a-zA-Z0-9_-]{20,}"#,
            ];

            for pattern in &secret_patterns {
                if let Ok(re) = Regex::new(pattern) {
                    if re.is_match(&content) && !file.contains(".env") && !file.contains("example") {
                        issues.push(SecurityIssue {
                            severity: Severity::Critical,
                            file: file.clone(),
                            message: "Potential hardcoded secret/credential".to_string(),
                            owasp: Some("A02:2021"),
                        });
                    }
                }
            }
        }
    }

    // Check diff for sensitive storage
    for (pattern, msg) in &sensitive_storage {
        if let Ok(re) = Regex::new(pattern) {
            if diff.lines().filter(|l| l.starts_with('+')).any(|l| re.is_match(l)) {
                issues.push(SecurityIssue {
                    severity: Severity::High,
                    file: "diff".to_string(),
                    message: msg.to_string(),
                    owasp: Some("A02:2021"),
                });
            }
        }
    }
}


// =============================================================================
// OWASP A04:2021 - Insecure Design (Path Traversal, Open Redirect)
// =============================================================================
fn check_insecure_design(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    // Path traversal patterns
    let path_traversal = [
        (r#"(?:readFile|writeFile|unlink|rmdir)\s*\([^)]*(?:req|params|query)"#, "Path traversal: file operation with user input"),
        (r#"path\.join\s*\([^)]*(?:req|params|query)"#, "Path traversal: path.join with user input"),
        (r#"fs\.[a-zA-Z]+\s*\([^)]*\.\."#, "Path traversal: '..' in file path"),
    ];

    // Open redirect patterns
    let open_redirect = [
        (r#"redirect\s*\(\s*(?:req|params|query|searchParams)"#, "Open redirect: redirect with user-controlled URL"),
        (r#"router\.push\s*\(\s*(?:req|params|query)"#, "Open redirect: router.push with user input"),
        (r#"window\.location\s*=\s*(?:req|params|query)"#, "Open redirect: window.location with user input"),
        (r#"location\.href\s*=\s*[^'"][^;]*(?:req|params|query)"#, "Open redirect: location.href with user input"),
    ];

    for file in files {
        if let Ok(content) = fs::read_to_string(file) {
            for (pattern, msg) in &path_traversal {
                if let Ok(re) = Regex::new(pattern) {
                    if re.is_match(&content) {
                        issues.push(SecurityIssue {
                            severity: Severity::Critical,
                            file: file.clone(),
                            message: msg.to_string(),
                            owasp: Some("A04:2021"),
                        });
                    }
                }
            }

            for (pattern, msg) in &open_redirect {
                if let Ok(re) = Regex::new(pattern) {
                    if re.is_match(&content) {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: msg.to_string(),
                            owasp: Some("A04:2021"),
                        });
                    }
                }
            }

            // Check for unsafe URL validation
            if content.contains("redirect(") || content.contains("router.push(") {
                if !content.contains("startsWith") && !content.contains("URL(") && !content.contains("allowedHosts") {
                    if content.contains("searchParams") || content.contains("query.") {
                        issues.push(SecurityIssue {
                            severity: Severity::Medium,
                            file: file.clone(),
                            message: "Redirect without URL validation - validate against allowlist".to_string(),
                            owasp: Some("A04:2021"),
                        });
                    }
                }
            }
        }
    }

    // Check diff for path traversal attempts
    for line in diff.lines().filter(|l| l.starts_with('+')) {
        if line.contains("..") && (line.contains("path") || line.contains("file") || line.contains("fs.")) {
            issues.push(SecurityIssue {
                severity: Severity::High,
                file: "diff".to_string(),
                message: "Potential path traversal pattern in new code".to_string(),
                owasp: Some("A04:2021"),
            });
            break;
        }
    }
}


// =============================================================================
// OWASP A05:2021 - Security Misconfiguration
// =============================================================================
fn check_security_config(files: &[String], issues: &mut Vec<SecurityIssue>) {
    for file in files {
        // Check next.config.ts/js for security headers
        if file.contains("next.config") {
            if let Ok(content) = fs::read_to_string(file) {
                let required_headers = [
                    ("X-Frame-Options", "Missing X-Frame-Options header (clickjacking protection)"),
                    ("X-Content-Type-Options", "Missing X-Content-Type-Options header"),
                    ("Strict-Transport-Security", "Missing HSTS header"),
                    ("Content-Security-Policy", "Missing CSP header"),
                ];

                if content.contains("headers") {
                    for (header, msg) in &required_headers {
                        if !content.contains(header) {
                            issues.push(SecurityIssue {
                                severity: Severity::Medium,
                                file: file.clone(),
                                message: msg.to_string(),
                                owasp: Some("A05:2021"),
                            });
                        }
                    }
                } else {
                    issues.push(SecurityIssue {
                        severity: Severity::Medium,
                        file: file.clone(),
                        message: "No security headers configured in next.config".to_string(),
                        owasp: Some("A05:2021"),
                    });
                }

                // Check for dangerous configurations
                if content.contains("dangerouslyAllowSVG: true") {
                    issues.push(SecurityIssue {
                        severity: Severity::Medium,
                        file: file.clone(),
                        message: "dangerouslyAllowSVG enabled - SVGs can contain scripts".to_string(),
                        owasp: Some("A05:2021"),
                    });
                }

                if content.contains("ignoreBuildErrors: true") {
                    issues.push(SecurityIssue {
                        severity: Severity::Low,
                        file: file.clone(),
                        message: "ignoreBuildErrors enabled - may hide security issues".to_string(),
                        owasp: Some("A05:2021"),
                    });
                }
            }
        }

        // Check vercel.json for security
        if file.contains("vercel.json") {
            if let Ok(content) = fs::read_to_string(file) {
                if !content.contains("headers") {
                    issues.push(SecurityIssue {
                        severity: Severity::Low,
                        file: file.clone(),
                        message: "Consider adding security headers in vercel.json".to_string(),
                        owasp: Some("A05:2021"),
                    });
                }
            }
        }

        // Check for debug mode in production
        if let Ok(content) = fs::read_to_string(file) {
            if content.contains("NODE_ENV") && content.contains("development") {
                if !content.contains("!==") && !content.contains("!=") && content.contains("===") {
                    // Checking if development mode is being enabled
                    if file.contains("middleware") || file.contains("config") {
                        issues.push(SecurityIssue {
                            severity: Severity::Low,
                            file: file.clone(),
                            message: "Ensure debug/development mode is disabled in production".to_string(),
                            owasp: Some("A05:2021"),
                        });
                    }
                }
            }
        }
    }
}


// =============================================================================
// OWASP A06:2021 - Vulnerable Components (Supply Chain)
// =============================================================================
fn check_supply_chain(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    // Check for lock file modifications
    let lock_files = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
    
    for file in files {
        if lock_files.iter().any(|lf| file.ends_with(lf)) {
            issues.push(SecurityIssue {
                severity: Severity::Low,
                file: file.clone(),
                message: "Lock file modified - verify dependency changes are intentional".to_string(),
                owasp: Some("A06:2021"),
            });
        }
    }

    // Check for typosquatting in package.json
    let typosquat_patterns = [
        ("loadsh", "lodash"),
        ("axois", "axios"),
        ("recat", "react"),
        ("expresss", "express"),
        ("momment", "moment"),
        ("requets", "requests"),
        ("coffe-script", "coffee-script"),
        ("cross-env-", "cross-env"),
        ("event-stream-", "event-stream"),
    ];

    for file in files {
        if file.ends_with("package.json") {
            if let Ok(content) = fs::read_to_string(file) {
                for (typo, correct) in &typosquat_patterns {
                    if content.contains(typo) {
                        issues.push(SecurityIssue {
                            severity: Severity::Critical,
                            file: file.clone(),
                            message: format!("Potential typosquatting: '{}' - did you mean '{}'?", typo, correct),
                            owasp: Some("A06:2021"),
                        });
                    }
                }

                // Check for known malicious packages
                let malicious_packages = [
                    "event-stream", // CVE-2018-16487
                    "flatmap-stream",
                    "ua-parser-js", // Check version
                    "coa", // Compromised
                    "rc", // Compromised
                ];

                for pkg in &malicious_packages {
                    if content.contains(&format!("\"{}\"", pkg)) {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: format!("Package '{}' has known security incidents - verify version", pkg),
                            owasp: Some("A06:2021"),
                        });
                    }
                }
            }
        }
    }

    // Check diff for new dependencies from untrusted sources
    for line in diff.lines().filter(|l| l.starts_with('+')) {
        // GitHub/GitLab direct dependencies
        if line.contains("github:") || line.contains("git+") || line.contains("git://") {
            issues.push(SecurityIssue {
                severity: Severity::Medium,
                file: "diff".to_string(),
                message: "Git-based dependency added - prefer npm registry packages".to_string(),
                owasp: Some("A06:2021"),
            });
        }

        // HTTP (non-HTTPS) dependencies
        if line.contains("http://") && !line.contains("localhost") {
            issues.push(SecurityIssue {
                severity: Severity::High,
                file: "diff".to_string(),
                message: "HTTP dependency URL - use HTTPS only".to_string(),
                owasp: Some("A06:2021"),
            });
        }
    }
}


// =============================================================================
// RUNTIME SECURITY - eval, Function constructor, prototype pollution
// =============================================================================
fn check_runtime_security(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    let dangerous_patterns = [
        (r"\beval\s*\(", "eval() is dangerous - avoid dynamic code execution"),
        (r"new\s+Function\s*\(", "Function constructor is dangerous - avoid dynamic code"),
        (r#"setTimeout\s*\(\s*['"]"#, "setTimeout with string is eval-like - use function"),
        (r#"setInterval\s*\(\s*['"]"#, "setInterval with string is eval-like - use function"),
    ];

    let prototype_pollution = [
        ("__proto__", "Prototype pollution risk: __proto__ usage"),
        (r#"constructor\s*\[\s*['"]prototype"#, "Prototype pollution: constructor.prototype access"),
        (r"Object\.assign\s*\(\s*\{\s*\}\s*,\s*(?:req|params|body)", "Prototype pollution: Object.assign with user input"),
        (r"\.\.\.(?:req|params|body|query)", "Prototype pollution: spreading user input directly"),
    ];

    for file in files {
        if let Ok(content) = fs::read_to_string(file) {
            for (pattern, msg) in &dangerous_patterns {
                if let Ok(re) = Regex::new(pattern) {
                    if re.is_match(&content) {
                        issues.push(SecurityIssue {
                            severity: Severity::Critical,
                            file: file.clone(),
                            message: msg.to_string(),
                            owasp: Some("A03:2021"),
                        });
                    }
                }
            }

            for (pattern, msg) in &prototype_pollution {
                if let Ok(re) = Regex::new(pattern) {
                    if re.is_match(&content) {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: msg.to_string(),
                            owasp: Some("A03:2021"),
                        });
                    }
                }
            }

            // Check for unsafe JSON parsing
            if content.contains("JSON.parse") {
                if content.contains("req.body") || content.contains("params") {
                    if !content.contains("try") && !content.contains("catch") {
                        issues.push(SecurityIssue {
                            severity: Severity::Medium,
                            file: file.clone(),
                            message: "JSON.parse without try-catch - can crash on malformed input".to_string(),
                            owasp: Some("A03:2021"),
                        });
                    }
                }
            }
        }
    }

    // Check diff for new dangerous patterns
    for line in diff.lines().filter(|l| l.starts_with('+')) {
        if line.contains("eval(") || line.contains("new Function(") {
            issues.push(SecurityIssue {
                severity: Severity::Critical,
                file: "diff".to_string(),
                message: "Dynamic code execution added - review carefully".to_string(),
                owasp: Some("A03:2021"),
            });
            break;
        }
    }
}


// =============================================================================
// NEXT.JS SPECIFIC PATTERNS
// =============================================================================
fn check_nextjs_patterns(files: &[String], issues: &mut Vec<SecurityIssue>) {
    let server_action_re = Regex::new(r#"['"]use server['"]"#).unwrap();

    for file in files {
        if let Ok(content) = fs::read_to_string(file) {
            // Server Actions must invalidate cache after mutations
            if file.contains("/actions/") && server_action_re.is_match(&content) {
                let has_mutation = content.contains(".insert(")
                    || content.contains(".update(")
                    || content.contains(".delete(")
                    || content.contains(".upsert(");

                if has_mutation && !content.contains("invalidateTag") && !content.contains("revalidatePath") {
                    issues.push(SecurityIssue {
                        severity: Severity::Medium,
                        file: file.clone(),
                        message: "Server Action mutates without cache invalidation".to_string(),
                        owasp: None,
                    });
                }
            }

            // Server Actions should validate input
            if file.contains("/actions/") && server_action_re.is_match(&content) {
                if content.contains("formData.get") && !content.contains("zod") && !content.contains("yup") && !content.contains("validate") {
                    issues.push(SecurityIssue {
                        severity: Severity::Medium,
                        file: file.clone(),
                        message: "Server Action lacks input validation - use zod or similar".to_string(),
                        owasp: Some("A03:2021"),
                    });
                }
            }

            // Check for exposed Server Action secrets
            if server_action_re.is_match(&content) {
                if content.contains("return") && (content.contains("password") || content.contains("secret") || content.contains("token")) {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        file: file.clone(),
                        message: "Server Action may be returning sensitive data to client".to_string(),
                        owasp: Some("A01:2021"),
                    });
                }
            }

            // RSC data exposure - don't pass sensitive props
            if !content.contains("use client") && (file.ends_with(".tsx") || file.ends_with(".jsx")) {
                if content.contains("password=") || content.contains("secret=") || content.contains("token=") {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        file: file.clone(),
                        message: "Sensitive data passed as props - may be serialized to client".to_string(),
                        owasp: Some("A01:2021"),
                    });
                }
            }

            // generateMetadata with user input
            if content.contains("generateMetadata") && content.contains("params") {
                if !content.contains("sanitize") && !content.contains("escape") {
                    issues.push(SecurityIssue {
                        severity: Severity::Low,
                        file: file.clone(),
                        message: "generateMetadata with params - ensure proper escaping for SEO injection".to_string(),
                        owasp: Some("A03:2021"),
                    });
                }
            }
        }
    }
}


// =============================================================================
// VERCEL EDGE/MIDDLEWARE SECURITY
// =============================================================================
fn check_vercel_security(files: &[String], issues: &mut Vec<SecurityIssue>) {
    for file in files {
        // Middleware security
        if file.contains("middleware") {
            if let Ok(content) = fs::read_to_string(file) {
                // Middleware bypass via path manipulation
                if content.contains("matcher") {
                    if !content.contains("/((?!") && !content.contains("/_next") {
                        issues.push(SecurityIssue {
                            severity: Severity::Medium,
                            file: file.clone(),
                            message: "Middleware matcher may not exclude internal paths (_next, api)".to_string(),
                            owasp: Some("A01:2021"),
                        });
                    }
                }

                // Auth bypass check
                if content.contains("NextResponse.next()") {
                    if !content.contains("if") && !content.contains("token") && !content.contains("session") {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: "Middleware passes all requests - add authentication checks".to_string(),
                            owasp: Some("A01:2021"),
                        });
                    }
                }

                // Check for proper redirect handling
                if content.contains("NextResponse.redirect") {
                    if content.contains("request.nextUrl") && !content.contains("startsWith") {
                        issues.push(SecurityIssue {
                            severity: Severity::Medium,
                            file: file.clone(),
                            message: "Middleware redirect with user URL - validate destination".to_string(),
                            owasp: Some("A04:2021"),
                        });
                    }
                }
            }
        }

        // Edge function security
        if file.contains("/api/") && file.ends_with("route.ts") {
            if let Ok(content) = fs::read_to_string(file) {
                // Check for edge runtime with sensitive operations
                if content.contains("edge") && content.contains("runtime") {
                    if content.contains("fs") || content.contains("child_process") {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: "Edge runtime cannot use Node.js APIs (fs, child_process)".to_string(),
                            owasp: None,
                        });
                    }

                    // Edge functions have limited crypto
                    if content.contains("crypto.") && !content.contains("webcrypto") {
                        issues.push(SecurityIssue {
                            severity: Severity::Low,
                            file: file.clone(),
                            message: "Edge runtime: use Web Crypto API instead of Node crypto".to_string(),
                            owasp: None,
                        });
                    }
                }

                // Rate limiting check for public APIs
                if !content.contains("rateLimit") && !content.contains("rate-limit") {
                    if content.contains("POST") || content.contains("PUT") {
                        issues.push(SecurityIssue {
                            severity: Severity::Low,
                            file: file.clone(),
                            message: "API route lacks rate limiting - consider adding protection".to_string(),
                            owasp: Some("A04:2021"),
                        });
                    }
                }
            }
        }

        // Vercel.json security
        if file.contains("vercel.json") {
            if let Ok(content) = fs::read_to_string(file) {
                // Check for overly permissive CORS
                if content.contains("Access-Control-Allow-Origin") && content.contains("*") {
                    issues.push(SecurityIssue {
                        severity: Severity::Medium,
                        file: file.clone(),
                        message: "Wildcard CORS origin - restrict to specific domains".to_string(),
                        owasp: Some("A05:2021"),
                    });
                }

                // Check for exposed source maps
                if content.contains("sourceMap") && content.contains("true") {
                    issues.push(SecurityIssue {
                        severity: Severity::Low,
                        file: file.clone(),
                        message: "Source maps enabled - may expose source code in production".to_string(),
                        owasp: Some("A05:2021"),
                    });
                }
            }
        }
    }
}


// =============================================================================
// REACT CVE PATTERNS
// =============================================================================
fn check_react_cve_patterns(files: &[String], diff: &str, issues: &mut Vec<SecurityIssue>) {
    for file in files {
        if file.ends_with(".tsx") || file.ends_with(".jsx") {
            if let Ok(content) = fs::read_to_string(file) {
                // CVE-2021-27913: react-native-web XSS via style prop
                if content.contains("react-native-web") && content.contains("style=") {
                    if content.contains("${") || content.contains("` +") {
                        issues.push(SecurityIssue {
                            severity: Severity::High,
                            file: file.clone(),
                            message: "CVE-2021-27913: Dynamic styles in react-native-web can lead to XSS".to_string(),
                            owasp: Some("A07:2021"),
                        });
                    }
                }

                // Unsafe component patterns
                // 1. Rendering user input as component name
                let component_injection = Regex::new(r"<\s*\{.*\}").unwrap();
                if component_injection.is_match(&content) {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        file: file.clone(),
                        message: "Dynamic component rendering - ensure component name is validated".to_string(),
                        owasp: Some("A03:2021"),
                    });
                }

                // 2. Spreading user props directly
                if content.contains("{...props}") || content.contains("{...rest}") {
                    // Check if it's in a form or input context
                    if content.contains("<form") || content.contains("<input") || content.contains("<button") {
                        issues.push(SecurityIssue {
                            severity: Severity::Low,
                            file: file.clone(),
                            message: "Prop spreading on form elements - may allow attribute injection".to_string(),
                            owasp: Some("A03:2021"),
                        });
                    }
                }

                // 3. useEffect with external URLs
                if content.contains("useEffect") && content.contains("fetch(") {
                    issues.push(SecurityIssue {
                        severity: Severity::Medium,
                        file: file.clone(),
                        message: "Client-side fetch in useEffect - prefer Server Components for data fetching".to_string(),
                        owasp: None,
                    });
                }

                // 4. Unsafe ref usage
                if content.contains("ref.current.innerHTML") {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        file: file.clone(),
                        message: "Direct innerHTML via ref - use dangerouslySetInnerHTML with sanitization".to_string(),
                        owasp: Some("A07:2021"),
                    });
                }
            }
        }
    }

    // Check diff for React-specific issues
    for line in diff.lines().filter(|l| l.starts_with('+')) {
        // Unsafe target="_blank" without rel="noopener"
        if line.contains("target=\"_blank\"") && !line.contains("noopener") && !line.contains("noreferrer") {
            issues.push(SecurityIssue {
                severity: Severity::Low,
                file: "diff".to_string(),
                message: "target=\"_blank\" without rel=\"noopener noreferrer\" - tabnabbing risk".to_string(),
                owasp: Some("A05:2021"),
            });
            break;
        }
    }
}


// =============================================================================
// FOODSHARE SPECIFIC PATTERNS
// =============================================================================
fn check_foodshare_patterns(files: &[String], issues: &mut Vec<SecurityIssue>) {
    for file in files {
        if let Ok(content) = fs::read_to_string(file) {
            // Supabase server client must be awaited
            if !content.contains("use client") {
                if content.contains("createClient()")
                    && !content.contains("await createClient()")
                    && content.contains("supabase/server")
                {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        file: file.clone(),
                        message: "Missing await on server createClient() - will fail at runtime".to_string(),
                        owasp: None,
                    });
                }
            }

            // Client component should not import server client
            if content.contains("use client") && content.contains("supabase/server") {
                issues.push(SecurityIssue {
                    severity: Severity::Critical,
                    file: file.clone(),
                    message: "Server Supabase client imported in client component - use @/lib/supabase/client".to_string(),
                    owasp: Some("A01:2021"),
                });
            }

            // No Redux/TanStack Query for server data
            let tanstack_re = Regex::new(r"\b(useQuery|useMutation|QueryClient)\b").unwrap();
            let redux_re = Regex::new(r"\b(useSelector|useDispatch|createSlice)\b").unwrap();

            if tanstack_re.is_match(&content) {
                issues.push(SecurityIssue {
                    severity: Severity::Low,
                    file: file.clone(),
                    message: "TanStack Query detected - use Server Components for data fetching".to_string(),
                    owasp: None,
                });
            }

            if redux_re.is_match(&content) {
                issues.push(SecurityIssue {
                    severity: Severity::Low,
                    file: file.clone(),
                    message: "Redux detected - use Zustand for UI state only".to_string(),
                    owasp: None,
                });
            }

            // Hooks require 'use client' directive
            let hooks_re = Regex::new(r"\b(useState|useEffect|useRef|useCallback|useMemo)\s*\(").unwrap();
            if (file.ends_with(".tsx") || file.ends_with(".jsx"))
                && !file.contains("/hooks/")
                && !content.contains("use client")
                && hooks_re.is_match(&content)
            {
                issues.push(SecurityIssue {
                    severity: Severity::High,
                    file: file.clone(),
                    message: "React hooks used without 'use client' directive".to_string(),
                    owasp: None,
                });
            }

            // Server env vars in client components
            let server_env_re = Regex::new(
                r"(?i)(SUPABASE_SERVICE_ROLE|DATABASE_URL|SECRET_KEY|PRIVATE_KEY|API_SECRET)",
            ).unwrap();

            if content.contains("use client") && server_env_re.is_match(&content) {
                issues.push(SecurityIssue {
                    severity: Severity::Critical,
                    file: file.clone(),
                    message: "Server-only env var referenced in client component".to_string(),
                    owasp: Some("A01:2021"),
                });
            }

            // Check NEXT_PUBLIC_ prefix in client components
            let env_re = Regex::new(r"process\.env\.([A-Z][A-Z0-9_]*)").unwrap();
            if content.contains("use client") {
                for cap in env_re.captures_iter(&content) {
                    if let Some(var) = cap.get(1) {
                        let name = var.as_str();
                        if !name.starts_with("NEXT_PUBLIC_") && name != "NODE_ENV" {
                            issues.push(SecurityIssue {
                                severity: Severity::High,
                                file: file.clone(),
                                message: format!("process.env.{} needs NEXT_PUBLIC_ prefix for client access", name),
                                owasp: Some("A01:2021"),
                            });
                        }
                    }
                }
            }

            // Use next/image instead of <img>
            let img_re = Regex::new(r"<img\s").unwrap();
            if (file.ends_with(".tsx") || file.ends_with(".jsx"))
                && img_re.is_match(&content)
                && !content.contains("next/image")
            {
                issues.push(SecurityIssue {
                    severity: Severity::Low,
                    file: file.clone(),
                    message: "Use next/image instead of <img> for optimization and security".to_string(),
                    owasp: None,
                });
            }
        }
    }
}


// =============================================================================
// SUMMARY
// =============================================================================
fn print_summary(issues: &[SecurityIssue]) -> Result<()> {
    println!();
    print_header("Security Scan Summary");

    let critical = issues.iter().filter(|i| matches!(i.severity, Severity::Critical)).count();
    let high = issues.iter().filter(|i| matches!(i.severity, Severity::High)).count();
    let medium = issues.iter().filter(|i| matches!(i.severity, Severity::Medium)).count();
    let low = issues.iter().filter(|i| matches!(i.severity, Severity::Low)).count();

    // Print issues grouped by severity
    if critical > 0 {
        println!();
        print_error(&format!("🚨 CRITICAL ({}):", critical));
        for issue in issues.iter().filter(|i| matches!(i.severity, Severity::Critical)) {
            let owasp = issue.owasp.map(|o| format!(" [{}]", o)).unwrap_or_default();
            print_error(&format!("  {} - {}{}", issue.file, issue.message, owasp));
        }
    }

    if high > 0 {
        println!();
        print_error(&format!("⛔ HIGH ({}):", high));
        for issue in issues.iter().filter(|i| matches!(i.severity, Severity::High)) {
            let owasp = issue.owasp.map(|o| format!(" [{}]", o)).unwrap_or_default();
            print_error(&format!("  {} - {}{}", issue.file, issue.message, owasp));
        }
    }

    if medium > 0 {
        println!();
        print_warning(&format!("⚠️  MEDIUM ({}):", medium));
        for issue in issues.iter().filter(|i| matches!(i.severity, Severity::Medium)) {
            let owasp = issue.owasp.map(|o| format!(" [{}]", o)).unwrap_or_default();
            print_warning(&format!("  {} - {}{}", issue.file, issue.message, owasp));
        }
    }

    if low > 0 {
        println!();
        print_verbose(&format!("ℹ️  LOW ({}):", low));
        for issue in issues.iter().filter(|i| matches!(i.severity, Severity::Low)) {
            let owasp = issue.owasp.map(|o| format!(" [{}]", o)).unwrap_or_default();
            print_verbose(&format!("  {} - {}{}", issue.file, issue.message, owasp));
        }
    }

    println!();
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!(
        "  Total: {} issues (🚨{} ⛔{} ⚠️{} ℹ️{})",
        issues.len(), critical, high, medium, low
    );
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if critical > 0 || high > 0 {
        print_error("Security check FAILED - fix critical/high issues before committing");
        Err(anyhow::anyhow!("Security vulnerabilities detected"))
    } else if medium > 0 {
        print_warning("Security check passed with warnings - review medium issues");
        Ok(())
    } else if low > 0 {
        print_success("Security check passed - minor improvements suggested");
        Ok(())
    } else {
        print_success("✅ No security issues detected!");
        Ok(())
    }
}
