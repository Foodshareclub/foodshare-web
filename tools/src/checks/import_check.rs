use crate::utils::{filter_files_by_extension, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use regex::Regex;
use std::fs;

pub fn run(files: &[String]) -> Result<()> {
    print_header("📦 Import Organization Check");

    let files = filter_files_by_extension(files, &[".ts", ".tsx", ".js", ".jsx"]);

    if files.is_empty() {
        print_info("No files to check");
        return Ok(());
    }

    let deep_import_pattern = Regex::new(r#"from ['"]\.\.\/\.\.\/\.\.\/"#).unwrap();
    let import_pattern = Regex::new(r"^import ").unwrap();
    let require_pattern = Regex::new(r"require\(").unwrap();

    let mut has_issues = false;

    for file in &files {
        if let Ok(content) = fs::read_to_string(file) {
            // Check for deep relative imports
            let deep_imports: Vec<(usize, &str)> = content
                .lines()
                .enumerate()
                .filter(|(_, line)| deep_import_pattern.is_match(line))
                .collect();

            if !deep_imports.is_empty() {
                print_warning(&format!(
                    "{}: Deep relative imports found (consider using absolute imports):",
                    file
                ));
                for (line_num, line) in deep_imports.iter().take(3) {
                    println!("    {}:{}", line_num + 1, line.trim());
                }
                has_issues = true;
            }

            // Check for mixed import styles
            let has_import = content.lines().any(|line| import_pattern.is_match(line));
            let has_require = content.lines().any(|line| require_pattern.is_match(line));

            if has_import && has_require {
                print_warning(&format!(
                    "{}: Mixed import styles (import and require)",
                    file
                ));
                has_issues = true;
            }
        }
    }

    if has_issues {
        println!();
        print_info("Consider organizing imports using absolute paths (@/) and consistent import style");
    } else {
        print_success("Import organization looks good");
    }

    // Warning only, not blocking
    Ok(())
}
