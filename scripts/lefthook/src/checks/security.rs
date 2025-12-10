use crate::utils::{
    filter_files_by_extension, get_staged_diff, get_staged_files, is_test_file, print_error,
    print_header, print_info, print_success, print_verbose, print_warning,
};
use anyhow::Result;
use regex::Regex;

pub fn run(files: &[String]) -> Result<()> {
    print_header("🔒 Security Check");

    let files = if files.is_empty() {
        filter_files_by_extension(
            &get_staged_files(),
            &[".ts", ".tsx", ".js", ".jsx", ".json", ".env", ".yml", ".yaml"],
        )
    } else {
        files.to_vec()
    };

    // Filter out test files - they contain mock credentials which are false positives
    let files: Vec<String> = files
        .into_iter()
        .filter(|f| !is_test_file(f))
        .collect();

    if files.is_empty() {
        print_success("No files to check (test files excluded)");
        return Ok(());
    }

    let diff = get_staged_diff();
    let mut errors = 0;
    let mut warnings = 0;

    // Check for AWS keys
    print_verbose("Checking for AWS credentials...");
    let aws_pattern = Regex::new(r"^\+.*(AKIA[0-9A-Z]{16}|aws_access_key_id|aws_secret_access_key)")
        .unwrap();
    if count_matches(&diff, &aws_pattern, Some(&["import.meta.env", "process.env"])) > 0 {
        print_error("Possible AWS credentials detected!");
        print_info("Use environment variables for AWS keys");
        errors += 1;
    }

    // Check for private keys
    print_verbose("Checking for private keys...");
    let private_key_pattern =
        Regex::new(r"^\+.*(BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY)").unwrap();
    if count_matches(&diff, &private_key_pattern, None) > 0 {
        print_error("Private key detected!");
        print_info("Never commit private keys to version control");
        errors += 1;
    }

    // Check for API keys/secrets
    print_verbose("Checking for hardcoded secrets...");
    let api_key_pattern = Regex::new(
        r#"(?i)^\+.*(api[_-]?key|secret|password|token|access[_-]?key)["']?\s*[:=]\s*["'][a-zA-Z0-9_\-+/]{16,}["']"#,
    )
    .unwrap();
    let api_key_count = count_matches(
        &diff,
        &api_key_pattern,
        Some(&[
            "import.meta.env",
            "process.env",
            "VITE_",
            "example",
            "placeholder",
            "your_",
            "xxx",
            "test",
        ]),
    );
    if api_key_count > 0 {
        print_error(&format!(
            "Possible hardcoded API keys/secrets detected! ({} occurrence(s))",
            api_key_count
        ));
        print_info("Use environment variables: import.meta.env.VITE_YOUR_KEY");
        errors += 1;
    }

    // Check for JWT tokens
    print_verbose("Checking for JWT tokens...");
    let jwt_pattern = Regex::new(r"^\+.*eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.").unwrap();
    if count_matches(&diff, &jwt_pattern, Some(&["example"])) > 0 {
        print_error("JWT token detected!");
        print_info("Never commit JWT tokens");
        errors += 1;
    }

    // Check for Slack tokens
    let slack_pattern = Regex::new(r"^\+.*xox[baprs]-[0-9a-zA-Z-]+").unwrap();
    if count_matches(&diff, &slack_pattern, Some(&["example"])) > 0 {
        print_error("Slack token detected!");
        errors += 1;
    }

    // Check for Stripe keys
    let stripe_pattern = Regex::new(r"^\+.*(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}").unwrap();
    if count_matches(&diff, &stripe_pattern, Some(&["example"])) > 0 {
        print_error("Stripe API key detected!");
        errors += 1;
    }

    // Check for database URLs with credentials
    let db_url_pattern = Regex::new(r"^\+.*(postgres|mysql|mongodb)://[^:]+:[^@]+@").unwrap();
    if count_matches(&diff, &db_url_pattern, Some(&["example", "localhost"])) > 0 {
        print_warning("Database URL with credentials detected");
        print_info("Consider using connection strings from environment variables");
        warnings += 1;
    }

    // Check for .env files
    print_verbose("Checking for sensitive files...");
    let staged = get_staged_files();
    for file in &staged {
        if file.starts_with(".env") && !file.ends_with(".example") {
            print_error("Attempting to commit .env file!");
            print_info(".env files should NEVER be committed");
            errors += 1;
            break;
        }
        if file.contains("node_modules/") {
            print_error("Attempting to commit node_modules/");
            errors += 1;
            break;
        }
    }

    // Check for debugger statements
    print_verbose("Checking for debug statements...");
    let debugger_pattern = Regex::new(r"^\+[^/]*\bdebugger\b").unwrap();
    let debugger_count = count_matches(&diff, &debugger_pattern, Some(&["//", "/*"]));
    if debugger_count > 0 {
        print_error(&format!("Found {} debugger statement(s)", debugger_count));
        print_info("Remove 'debugger' before committing");
        errors += 1;
    }

    // Check for console.log (warning only)
    let console_pattern = Regex::new(r"^\+.*console\.(log|debug)").unwrap();
    let console_count = count_matches(&diff, &console_pattern, Some(&["//", "/*", "logger"]));
    if console_count > 0 {
        print_warning(&format!("Found {} console.log statement(s)", console_count));
        print_info("Consider using a proper logger or removing debug logs");
        warnings += 1;
    }

    // Summary
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

fn count_matches(text: &str, pattern: &Regex, excludes: Option<&[&str]>) -> usize {
    text.lines()
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
