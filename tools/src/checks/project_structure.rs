use crate::utils::{print_error, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use std::fs;
use std::path::Path;

pub fn run() -> Result<()> {
    print_header("🔍 Project Structure Verification");

    let mut passed = 0;
    let mut failed = 0;
    let mut warnings = 0;

    // Check root directory is clean (no loose .md or .sh files except README.md)
    println!("\n  Checking root directory...");
    let root_md = count_files_with_ext(".", ".md", 1);
    let root_sh = count_files_with_ext(".", ".sh", 1);

    // README.md is allowed
    let loose_md = root_md.saturating_sub(1);
    if loose_md == 0 && root_sh == 0 {
        print_success("Root directory is clean (no loose .md or .sh files)");
        passed += 1;
    } else {
        print_warning(&format!(
            "Found {} .md and {} .sh files in root",
            loose_md, root_sh
        ));
        warnings += 1;
    }

    // Check docs directory exists
    println!("\n  Checking docs directory...");
    if Path::new("docs").is_dir() {
        let docs_count = count_files_with_ext("docs", ".md", 10);
        print_success(&format!(
            "docs/ directory exists with {} markdown files",
            docs_count
        ));
        passed += 1;
    } else {
        print_error("docs/ directory not found");
        failed += 1;
    }

    // Check scripts directory
    println!("\n  Checking scripts directory...");
    if Path::new("scripts").is_dir() {
        let scripts_count = count_files_with_ext("scripts", ".sh", 10);
        print_success(&format!(
            "scripts/ directory exists with {} shell scripts",
            scripts_count
        ));
        passed += 1;
    } else {
        print_warning("scripts/ directory not found");
        warnings += 1;
    }

    // Check supabase/functions directory is clean
    println!("\n  Checking supabase/functions directory...");
    if Path::new("supabase/functions").is_dir() {
        let func_md = count_files_with_ext_depth1("supabase/functions", ".md");
        let func_sh = count_files_with_ext_depth1("supabase/functions", ".sh");

        if func_md == 0 && func_sh == 0 {
            print_success("supabase/functions/ is clean (code only)");
            passed += 1;
        } else {
            print_warning(&format!(
                "Found {} .md and {} .sh files in supabase/functions",
                func_md, func_sh
            ));
            warnings += 1;
        }
    } else {
        print_info("supabase/functions/ directory not found (optional)");
    }

    // Check key documentation files
    println!("\n  Checking key documentation files...");
    let key_docs = [
        "README.md",
        "docs/INDEX.md",
        "docs/PROJECT_STRUCTURE.md",
    ];

    for doc in &key_docs {
        if Path::new(doc).exists() {
            print_success(doc);
            passed += 1;
        } else {
            print_warning(&format!("{} (missing)", doc));
            warnings += 1;
        }
    }

    // Check src directory structure
    println!("\n  Checking src directory structure...");
    let required_dirs = [
        ("src/app", "App Router directory"),
        ("src/components", "Components directory"),
        ("src/lib", "Library directory"),
    ];

    for (dir, desc) in &required_dirs {
        if Path::new(dir).is_dir() {
            print_success(desc);
            passed += 1;
        } else {
            print_error(&format!("{} not found", desc));
            failed += 1;
        }
    }

    // Summary
    println!();
    print_header("Verification Summary");
    println!();
    print_success(&format!("Passed: {}", passed));
    if warnings > 0 {
        print_warning(&format!("Warnings: {}", warnings));
    }
    if failed > 0 {
        print_error(&format!("Failed: {}", failed));
    }

    if failed == 0 && warnings == 0 {
        println!();
        print_success("Project structure verification PASSED");
        Ok(())
    } else if failed == 0 {
        println!();
        print_warning("Project structure needs attention - review warnings above");
        Ok(())
    } else {
        println!();
        print_error("Project structure verification FAILED");
        Err(anyhow::anyhow!("Structure check failed"))
    }
}

fn count_files_with_ext(dir: &str, ext: &str, max_depth: usize) -> usize {
    walkdir::WalkDir::new(dir)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| {
            e.path()
                .extension()
                .map(|e| format!(".{}", e.to_string_lossy()) == ext)
                .unwrap_or(false)
        })
        .count()
}

fn count_files_with_ext_depth1(dir: &str, ext: &str) -> usize {
    fs::read_dir(dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_file())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|e| format!(".{}", e.to_string_lossy()) == ext)
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0)
}
