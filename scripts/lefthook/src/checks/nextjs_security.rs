use crate::utils::{
    filter_files_by_extension, get_staged_diff, get_staged_files, print_error, print_header,
    print_success, print_verbose, print_warning,
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
    // FOODSHARE: Supabase Client - await createClient() on server
    // =========================================================================
    print_verbose("Checking Supabase client patterns...");

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            // Server component must await createClient
            if !content.contains("use client") {
                if content.contains("createClient()")
                    && !content.contains("await createClient()")
                    && content.contains("supabase/server")
                {
                    print_error(&format!(
                        "{}: Missing await on server createClient()",
                        file
                    ));
                    errors += 1;
                }
            }

            // Client component should not import server client
            if content.contains("use client") && content.contains("supabase/server") {
                print_error(&format!(
                    "{}: Server Supabase client in client component",
                    file
                ));
                errors += 1;
            }
        }
    }

    // =========================================================================
    // FOODSHARE: Server Actions must use invalidateTag after mutations
    // =========================================================================
    print_verbose("Checking Server Action cache invalidation...");

    let server_action_re = Regex::new(r#"use server"#).unwrap();

    for file in &files {
        if file.contains("/actions/") {
            if let Ok(content) = fs::read_to_string(file) {
                if server_action_re.is_match(&content) {
                    let has_mutation = content.contains(".insert(")
                        || content.contains(".update(")
                        || content.contains(".delete(")
                        || content.contains(".upsert(");

                    if has_mutation
                        && !content.contains("invalidateTag")
                        && !content.contains("revalidatePath")
                    {
                        print_warning(&format!(
                            "{}: Server Action mutates without cache invalidation",
                            file
                        ));
                        warnings += 1;
                    }
                }
            }
        }
    }

    // =========================================================================
    // FOODSHARE: No Redux/TanStack Query for server data
    // =========================================================================
    print_verbose("Checking state management patterns...");

    let tanstack_re = Regex::new(r"useQuery|useMutation|QueryClient").unwrap();
    let redux_re = Regex::new(r"useSelector|useDispatch|createSlice").unwrap();

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            if tanstack_re.is_match(&content) {
                print_warning(&format!(
                    "{}: TanStack Query - use Server Components instead",
                    file
                ));
                warnings += 1;
            }
            if redux_re.is_match(&content) {
                print_warning(&format!(
                    "{}: Redux detected - use Zustand for UI state only",
                    file
                ));
                warnings += 1;
            }
        }
    }

    // =========================================================================
    // FOODSHARE: Hooks require 'use client' directive
    // =========================================================================
    print_verbose("Checking component directives...");

    let hooks_re = Regex::new(r"\b(useState|useEffect|useRef|useCallback)\s*\(").unwrap();

    for file in &files {
        if (file.ends_with(".tsx") || file.ends_with(".jsx")) && !file.contains("/hooks/") {
            if let Ok(content) = fs::read_to_string(file) {
                if !content.contains("use client") && hooks_re.is_match(&content) {
                    print_error(&format!(
                        "{}: React hooks used without 'use client'",
                        file
                    ));
                    errors += 1;
                }
            }
        }
    }

    // =========================================================================
    // CRITICAL: XSS - dangerouslySetInnerHTML
    // =========================================================================
    print_verbose("Checking XSS vulnerabilities...");

    let dangerous_re = Regex::new(r"dangerouslySetInnerHTML").unwrap();
    let dangerous_count = count_in_diff(&diff, &dangerous_re, Some(&["DOMPurify", "sanitize"]));
    if dangerous_count > 0 {
        print_error("dangerouslySetInnerHTML without sanitization");
        errors += 1;
    }

    // =========================================================================
    // CRITICAL: Server env vars in client components
    // =========================================================================
    print_verbose("Checking environment variable exposure...");

    let server_env_re = Regex::new(
        r"(?i)(SUPABASE_SERVICE_ROLE|DATABASE_URL|SECRET_KEY|PRIVATE_KEY|API_SECRET)",
    )
    .unwrap();

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            if content.contains("use client") && server_env_re.is_match(&content) {
                print_error(&format!(
                    "{}: Server env var in client component",
                    file
                ));
                errors += 1;
            }
        }
    }

    // Check NEXT_PUBLIC_ prefix
    let env_re = Regex::new(r"process\.env\.([A-Z][A-Z0-9_]*)").unwrap();
    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            if content.contains("use client") {
                for cap in env_re.captures_iter(&content) {
                    if let Some(var) = cap.get(1) {
                        let name = var.as_str();
                        if !name.starts_with("NEXT_PUBLIC_") && name != "NODE_ENV" {
                            print_error(&format!(
                                "{}: process.env.{} needs NEXT_PUBLIC_ prefix",
                                file, name
                            ));
                            errors += 1;
                        }
                    }
                }
            }
        }
    }

    // =========================================================================
    // CRITICAL: Server Action authentication
    // =========================================================================
    print_verbose("Checking Server Action auth...");

    for file in &files {
        if file.contains("/actions/") {
            if let Ok(content) = fs::read_to_string(file) {
                if server_action_re.is_match(&content) {
                    let has_mutation = content.contains(".insert(")
                        || content.contains(".update(")
                        || content.contains(".delete(");

                    let has_auth = content.contains("getUser")
                        || content.contains("getCurrentUser")
                        || content.contains("session")
                        || content.contains("auth(");

                    if has_mutation && !has_auth {
                        print_warning(&format!(
                            "{}: Server Action mutates without auth check",
                            file
                        ));
                        warnings += 1;
                    }
                }
            }
        }
    }

    // =========================================================================
    // HIGH: Sensitive data in browser storage
    // =========================================================================
    print_verbose("Checking browser storage...");

    let storage_re = Regex::new(r"(?i)(localStorage|sessionStorage)\.setItem").unwrap();
    let sensitive_re = Regex::new(r"(?i)(token|password|secret|key|auth)").unwrap();

    for line in diff.lines().filter(|l| l.starts_with('+')) {
        if storage_re.is_match(line) && sensitive_re.is_match(line) {
            print_error("Sensitive data in browser storage - use httpOnly cookies");
            errors += 1;
            break;
        }
    }

    // =========================================================================
    // HIGH: Use next/image instead of <img>
    // =========================================================================
    print_verbose("Checking image usage...");

    let img_re = Regex::new(r"<img\s").unwrap();
    for file in &files {
        if file.ends_with(".tsx") || file.ends_with(".jsx") {
            if let Ok(content) = fs::read_to_string(file) {
                if img_re.is_match(&content) && !content.contains("next/image") {
                    print_warning(&format!("{}: Use next/image instead of <img>", file));
                    warnings += 1;
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
        print_warning(&format!("{} warning(s) - review recommended", warnings));
        Ok(())
    } else {
        print_error(&format!("{} critical issue(s) found!", errors));
        if warnings > 0 {
            print_warning(&format!("{} warning(s) also detected", warnings));
        }
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
