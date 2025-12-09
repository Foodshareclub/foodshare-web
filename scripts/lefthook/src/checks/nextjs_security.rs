use crate::utils::{
    filter_files_by_extension, get_staged_diff, get_staged_files, print_error, print_header,
    print_info, print_success, print_verbose, print_warning,
};
use anyhow::Result;
use regex::Regex;
use std::fs;

pub fn run(files: &[String]) -> Result<()> {
    print_header("🛡️ Next.js/React/Vercel Security Check");

    let files = if files.is_empty() {
        filter_files_by_extension(
            &get_staged_files(),
            &[".ts", ".tsx", ".js", ".jsx", ".json", ".env"],
        )
    } else {
        files.to_vec()
    };

    if files.is_empty() {
        print_success("No files to check");
        return Ok(());
    }

    let diff = get_staged_diff();
    let mut errors = 0;
    let mut warnings = 0;

    // =========================================================================
    // CRITICAL: Server Action Security
    // =========================================================================
    print_verbose("Checking Server Action security...");

    // Unvalidated input in Server Actions
    let server_action_pattern = Regex::new(r#"['"]use server['"]"#).unwrap();
    let form_data_direct = Regex::new(r"formData\.get\([^)]+\)\s*as\s+").unwrap();

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            if server_action_pattern.is_match(&content) {
                // Check for direct formData casting without validation
                if form_data_direct.is_match(&content) && !content.contains("zod") && !content.contains("yup") {
                    print_warning(&format!(
                        "{}: Server Action uses direct formData casting without schema validation",
                        file
                    ));
                    print_info("Consider using Zod or similar for input validation");
                    warnings += 1;
                }

                // Check for missing auth checks in server actions
                if !content.contains("getUser") && !content.contains("auth()") && !content.contains("session") {
                    if content.contains("insert") || content.contains("update") || content.contains("delete") {
                        print_warning(&format!(
                            "{}: Server Action performs mutations without apparent auth check",
                            file
                        ));
                        warnings += 1;
                    }
                }
            }
        }
    }

    // =========================================================================
    // CRITICAL: XSS Vulnerabilities
    // =========================================================================
    print_verbose("Checking for XSS vulnerabilities...");

    // dangerouslySetInnerHTML usage
    let dangerous_html = Regex::new(r"dangerouslySetInnerHTML").unwrap();
    let dangerous_count = count_in_diff(&diff, &dangerous_html, Some(&["DOMPurify", "sanitize"]));
    if dangerous_count > 0 {
        print_error(&format!(
            "Found {} dangerouslySetInnerHTML usage without sanitization",
            dangerous_count
        ));
        print_info("Use DOMPurify.sanitize() before rendering HTML");
        errors += 1;
    }

    // Unescaped user input in href
    let href_interpolation = Regex::new(r#"href=\{[`'"]?\$?\{[^}]+\}"#).unwrap();
    if count_in_diff(&diff, &href_interpolation, Some(&["encodeURIComponent"])) > 0 {
        print_warning("Dynamic href detected - ensure URL is validated to prevent javascript: XSS");
        warnings += 1;
    }

    // =========================================================================
    // CRITICAL: SSRF & Open Redirect
    // =========================================================================
    print_verbose("Checking for SSRF/Open Redirect...");

    // Unvalidated redirects
    let redirect_pattern = Regex::new(r"redirect\([^)]*\$\{|redirect\([^)]*\+").unwrap();
    if count_in_diff(&diff, &redirect_pattern, None) > 0 {
        print_error("Dynamic redirect detected - validate destination to prevent open redirect");
        errors += 1;
    }

    // Unvalidated fetch URLs
    let fetch_dynamic = Regex::new(r"fetch\([^)]*\+").unwrap();
    if count_in_diff(&diff, &fetch_dynamic, Some(&["NEXT_PUBLIC_", "process.env"])) > 0 {
        print_warning("Dynamic fetch URL - ensure URL is validated to prevent SSRF");
        warnings += 1;
    }

    // =========================================================================
    // CRITICAL: Authentication & Authorization
    // =========================================================================
    print_verbose("Checking auth patterns...");

    // Exposed API routes without auth
    for file in &files {
        if file.contains("/api/") && file.ends_with(".ts") {
            if let Ok(content) = fs::read_to_string(file) {
                if !content.contains("auth") && !content.contains("session") && !content.contains("getUser") {
                    if content.contains("POST") || content.contains("PUT") || content.contains("DELETE") {
                        print_warning(&format!(
                            "{}: API route handles mutations without apparent auth check",
                            file
                        ));
                        warnings += 1;
                    }
                }
            }
        }
    }

    // =========================================================================
    // CRITICAL: Environment Variable Exposure
    // =========================================================================
    print_verbose("Checking environment variable exposure...");

    // Server secrets exposed to client
    let server_env_client = Regex::new(
        r"(?i)(SUPABASE_SERVICE_ROLE|DATABASE_URL|SECRET_KEY|PRIVATE_KEY|API_SECRET)[^_]",
    ).unwrap();

    for file in &files {
        if file.contains("/components/") || file.contains("/app/") {
            if let Ok(content) = fs::read_to_string(file) {
                let is_client = content.contains("use client");
                if is_client {
                    if server_env_client.is_match(&content) {
                        print_error(&format!(
                            "{}: Server-only env var referenced in client component",
                            file
                        ));
                        errors += 1;
                    }
                }
            }
        }
    }

    // Missing NEXT_PUBLIC_ prefix for client vars
    let client_env_pattern = Regex::new(r"process\.env\.([A-Z_]+)").unwrap();
    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            if content.contains("use client") {
                for cap in client_env_pattern.captures_iter(&content) {
                    if let Some(env_var) = cap.get(1) {
                        let var_name = env_var.as_str();
                        if !var_name.starts_with("NEXT_PUBLIC_") && var_name != "NODE_ENV" {
                            print_warning(&format!(
                                "{}: Client component accessing non-NEXT_PUBLIC_ env var: process.env.{}",
                                file,
                                var_name
                            ));
                            warnings += 1;
                        }
                    }
                }
            }
        }
    }

    // =========================================================================
    // CRITICAL: SQL Injection (Supabase)
    // =========================================================================
    print_verbose("Checking for SQL injection patterns...");

    // Raw SQL with string interpolation
    let raw_sql = Regex::new(r#"\.rpc\([^,]+,\s*\{[^}]*\$\{|\.sql\([`'"].*\$\{"#).unwrap();
    if count_in_diff(&diff, &raw_sql, None) > 0 {
        print_error("Potential SQL injection - use parameterized queries");
        errors += 1;
    }

    // =========================================================================
    // HIGH: React Security Patterns
    // =========================================================================
    print_verbose("Checking React security patterns...");

    // useEffect with unvalidated external data
    let use_effect_fetch = Regex::new(r"useEffect\([^)]*fetch\(").unwrap();
    if count_in_diff(&diff, &use_effect_fetch, None) > 0 {
        print_warning("Client-side fetch in useEffect - prefer Server Components for data fetching");
        warnings += 1;
    }

    // Storing sensitive data in localStorage/sessionStorage
    let storage_sensitive = Regex::new(
        r#"(?i)(localStorage|sessionStorage)\.(setItem|getItem)\([^)]*(?:token|password|secret|key)"#,
    ).unwrap();
    if count_in_diff(&diff, &storage_sensitive, None) > 0 {
        print_error("Storing sensitive data in browser storage - use httpOnly cookies instead");
        errors += 1;
    }

    // =========================================================================
    // HIGH: Vercel/Deployment Security
    // =========================================================================
    print_verbose("Checking Vercel deployment security...");

    // Exposed vercel.json secrets
    for file in &files {
        if file == "vercel.json" {
            if let Ok(content) = fs::read_to_string(file) {
                if content.contains("env") && (content.contains("secret") || content.contains("key")) {
                    print_warning("vercel.json may contain sensitive values - use Vercel dashboard for secrets");
                    warnings += 1;
                }
            }
        }
    }

    // next.config with security issues
    for file in &files {
        if file == "next.config.ts" || file == "next.config.js" || file == "next.config.mjs" {
            if let Ok(content) = fs::read_to_string(file) {
                // Disabled security headers
                if content.contains("poweredByHeader: true") {
                    print_warning("X-Powered-By header enabled - consider disabling");
                    warnings += 1;
                }

                // Overly permissive CORS
                if content.contains("Access-Control-Allow-Origin") && content.contains("*") {
                    print_error("Wildcard CORS origin - restrict to specific domains");
                    errors += 1;
                }

                // Disabled strict mode
                if content.contains("reactStrictMode: false") {
                    print_warning("React Strict Mode disabled - enable for better error detection");
                    warnings += 1;
                }
            }
        }
    }

    // =========================================================================
    // MEDIUM: Component Security
    // =========================================================================
    print_verbose("Checking component security...");

    // Uncontrolled file uploads
    let file_input = Regex::new(r#"<input[^>]*type=["']file["'][^>]*>"#).unwrap();
    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            if file_input.is_match(&content) {
                if !content.contains("accept=") {
                    print_warning(&format!(
                        "{}: File input without accept attribute - restrict file types",
                        file
                    ));
                    warnings += 1;
                }
            }
        }
    }

    // Iframe without sandbox
    let iframe_pattern = Regex::new(r"<iframe[^>]*>").unwrap();
    let sandbox_pattern = Regex::new(r"sandbox=").unwrap();
    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            for iframe_match in iframe_pattern.find_iter(&content) {
                if !sandbox_pattern.is_match(iframe_match.as_str()) {
                    print_warning(&format!(
                        "{}: iframe without sandbox attribute",
                        file
                    ));
                    warnings += 1;
                    break;
                }
            }
        }
    }

    // =========================================================================
    // Summary
    // =========================================================================
    println!();
    print_header("Security Check Summary");

    if errors == 0 && warnings == 0 {
        print_success("No security issues detected");
        Ok(())
    } else if errors == 0 {
        print_warning(&format!("{} warning(s) found - review recommended", warnings));
        Ok(())
    } else {
        print_error(&format!("{} critical security issue(s) found!", errors));
        if warnings > 0 {
            print_warning(&format!("{} warning(s) also detected", warnings));
        }
        println!();
        print_info("Fix critical issues before committing");
        Err(anyhow::anyhow!("Security check failed"))
    }
}

fn count_in_diff(text: &str, pattern: &Regex, excludes: Option<&[&str]>) -> usize {
    text.lines()
        .filter(|line| line.starts_with('+'))
        .filter(|line| {
            if !pattern.is_match(line) {
                return false;
            }
            if let Some(excl) = excludes {
                !excl.iter().any(|e| line.contains(e))
            } else {
                true
            }
        })
        .count()
}
