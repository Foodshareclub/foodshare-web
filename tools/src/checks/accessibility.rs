use crate::utils::{filter_files_by_extension, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use regex::Regex;
use std::fs;

pub fn run(files: &[String]) -> Result<()> {
    print_header("♿ Accessibility Check");

    let files = filter_files_by_extension(files, &[".tsx", ".jsx"]);

    if files.is_empty() {
        print_info("No JSX/TSX files to check");
        return Ok(());
    }

    let img_pattern = Regex::new(r"<img[^>]*>").unwrap();
    let alt_pattern = Regex::new(r"alt=").unwrap();
    let input_pattern = Regex::new(r"<input[^>]*>").unwrap();
    let label_pattern = Regex::new(r"(aria-label=|id=)").unwrap();
    let div_onclick_pattern = Regex::new(r"<div[^>]*onClick=").unwrap();

    let mut has_issues = false;

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            let lines: Vec<&str> = content.lines().collect();

            for (i, line) in lines.iter().enumerate() {
                // Check for images without alt text
                if img_pattern.is_match(line) && !alt_pattern.is_match(line) {
                    print_warning(&format!("{}:{} Image without alt text", file, i + 1));
                    println!("    {}", line.trim());
                    has_issues = true;
                }

                // Check for inputs without labels
                if input_pattern.is_match(line) && !label_pattern.is_match(line) {
                    print_warning(&format!(
                        "{}:{} Input should have aria-label or associated label",
                        file,
                        i + 1
                    ));
                    has_issues = true;
                }

                // Check for onClick on divs
                if div_onclick_pattern.is_match(line) {
                    print_warning(&format!(
                        "{}:{} onClick on div - consider using button or add role/keyboard handlers",
                        file,
                        i + 1
                    ));
                    has_issues = true;
                }
            }
        }
    }

    if has_issues {
        println!();
        print_info("Fix accessibility issues to ensure your app is usable by everyone");
    } else {
        print_success("No obvious accessibility issues found");
    }

    // Warning only, not blocking
    Ok(())
}
