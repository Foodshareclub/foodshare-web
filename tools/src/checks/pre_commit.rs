use crate::checks::{complexity, import_check, nextjs_security, no_console, security};
use crate::utils::{filter_files_by_extension, get_staged_files, print_header, print_error, print_success};
use anyhow::Result;

pub fn run(files: &[String]) -> Result<()> {
    print_header("🚀 Pre-Commit Checks");

    let files = if files.is_empty() {
        get_staged_files()
    } else {
        files.to_vec()
    };

    if files.is_empty() {
        print_success("No staged files to check");
        return Ok(());
    }

    let ts_files = filter_files_by_extension(&files, &[".ts", ".tsx", ".js", ".jsx"]);

    let mut failed = false;

    // Run security check (critical - can fail)
    println!();
    if security::run(&files).is_err() {
        failed = true;
    }

    // Run Next.js/React/Vercel security check (critical - can fail)
    println!();
    if nextjs_security::run(&ts_files).is_err() {
        failed = true;
    }

    // Run complexity check (warning only)
    println!();
    let _ = complexity::run(&ts_files);

    // Run no-console check (warning only)
    println!();
    let _ = no_console::run(&ts_files);

    // Run import check (warning only)
    println!();
    let _ = import_check::run(&ts_files);

    // Summary
    println!();
    print_header("Pre-Commit Summary");

    if failed {
        print_error("Pre-commit checks failed - fix issues before committing");
        Err(anyhow::anyhow!("Pre-commit checks failed"))
    } else {
        print_success("All pre-commit checks passed");
        Ok(())
    }
}
