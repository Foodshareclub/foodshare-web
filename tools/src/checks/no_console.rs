use crate::utils::{filter_files_by_extension, is_test_file, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use regex::Regex;
use std::fs;

pub fn run(files: &[String]) -> Result<()> {
    print_header("🔍 Console Statement Check");

    let files = filter_files_by_extension(files, &[".ts", ".tsx", ".js", ".jsx"]);

    if files.is_empty() {
        print_info("No files to check");
        return Ok(());
    }

    let console_pattern = Regex::new(r"console\.(log|debug|info|warn|error)").unwrap();
    let mut has_console = false;

    for file in &files {
        // Skip test files
        if is_test_file(file) {
            continue;
        }

        // Skip Supabase Edge Functions (Deno-based)
        if file.starts_with("supabase/functions/") {
            continue;
        }

        if let Ok(content) = fs::read_to_string(file) {
            let matches: Vec<(usize, &str)> = content
                .lines()
                .enumerate()
                .filter(|(_, line)| console_pattern.is_match(line))
                .collect();

            if !matches.is_empty() {
                print_warning(&format!("{} contains console statements:", file));
                for (line_num, line) in matches.iter().take(5) {
                    println!("    {}:{}", line_num + 1, line.trim());
                }
                if matches.len() > 5 {
                    println!("    ... and {} more", matches.len() - 5);
                }
                has_console = true;
            }
        }
    }

    if has_console {
        println!();
        print_info("Remove console statements before committing to production");
        print_info("Use a proper logging library for production logs");
    } else {
        print_success("No console statements found");
    }

    // Warning only, not blocking
    Ok(())
}
