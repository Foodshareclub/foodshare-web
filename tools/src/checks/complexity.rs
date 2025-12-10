use crate::utils::{filter_files_by_extension, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use regex::Regex;
use std::fs;

const MAX_FUNCTION_LINES: usize = 100;
const MAX_NESTING_LEVEL: usize = 5;

pub fn run(files: &[String]) -> Result<()> {
    print_header("🧮 Code Complexity Check");

    let files = filter_files_by_extension(files, &[".ts", ".tsx", ".js", ".jsx"]);

    if files.is_empty() {
        print_info("No files to check");
        return Ok(());
    }

    let mut has_issues = false;
    let deep_nesting_pattern = Regex::new(r"^\s{8,}(if|for|while|switch)").unwrap();
    let function_start_pattern = Regex::new(r"^\s*(function|const.*=.*\(|=>)").unwrap();

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            let lines: Vec<&str> = content.lines().collect();

            // Check for deep nesting
            let nesting_count = lines
                .iter()
                .filter(|line| deep_nesting_pattern.is_match(line))
                .count();

            if nesting_count > MAX_NESTING_LEVEL {
                print_warning(&format!(
                    "{}: Excessive nesting detected ({} deep levels)",
                    file, nesting_count
                ));
                has_issues = true;
            }

            // Check for long functions (simplified heuristic)
            let mut in_function = false;
            let mut function_start = 0;
            let mut brace_count = 0;

            for (i, line) in lines.iter().enumerate() {
                if function_start_pattern.is_match(line) && !in_function {
                    in_function = true;
                    function_start = i;
                    brace_count = 0;
                }

                if in_function {
                    brace_count += line.matches('{').count() as i32;
                    brace_count -= line.matches('}').count() as i32;

                    if brace_count <= 0 && i > function_start {
                        let function_length = i - function_start;
                        if function_length > MAX_FUNCTION_LINES {
                            print_warning(&format!(
                                "{}: Function at line {} is too long ({} lines)",
                                file,
                                function_start + 1,
                                function_length
                            ));
                            has_issues = true;
                        }
                        in_function = false;
                    }
                }
            }
        }
    }

    if has_issues {
        println!();
        print_info("Consider refactoring complex functions into smaller, more maintainable pieces");
    } else {
        print_success("Code complexity is within acceptable limits");
    }

    // Complexity check is a warning, not a blocker
    Ok(())
}
