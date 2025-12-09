use colored::Colorize;
use once_cell::sync::OnceCell;
use std::process::Command;

static VERBOSE: OnceCell<bool> = OnceCell::new();

pub fn set_verbose(v: bool) {
    let _ = VERBOSE.set(v);
}

pub fn is_verbose() -> bool {
    *VERBOSE.get().unwrap_or(&false)
}

// Output helpers
pub fn print_header(title: &str) {
    println!();
    println!("{}", "━".repeat(54).magenta());
    println!("  {}", title.magenta());
    println!("{}", "━".repeat(54).magenta());
}

pub fn print_success(msg: &str) {
    println!("  {} {}", "✓".green(), msg);
}

pub fn print_error(msg: &str) {
    println!("  {} {}", "✗".red(), msg);
}

pub fn print_warning(msg: &str) {
    println!("  {} {}", "⚠️".yellow(), msg);
}

pub fn print_info(msg: &str) {
    println!("  {} {}", "ℹ️".cyan(), msg);
}

pub fn print_verbose(msg: &str) {
    if is_verbose() {
        print_info(msg);
    }
}

// Git helpers
pub fn get_staged_files() -> Vec<String> {
    let output = Command::new("git")
        .args(["diff", "--cached", "--name-only", "--diff-filter=ACM"])
        .output()
        .ok();

    output
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .map(String::from)
                .collect()
        })
        .unwrap_or_default()
}

pub fn get_staged_diff() -> String {
    Command::new("git")
        .args(["diff", "--cached"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default()
}

pub fn get_current_branch() -> String {
    Command::new("git")
        .args(["branch", "--show-current"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2}GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2}MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2}KB", bytes as f64 / KB as f64)
    } else {
        format!("{}B", bytes)
    }
}

pub fn filter_files_by_extension(files: &[String], extensions: &[&str]) -> Vec<String> {
    files
        .iter()
        .filter(|f| extensions.iter().any(|ext| f.ends_with(ext)))
        .cloned()
        .collect()
}

pub fn is_test_file(file: &str) -> bool {
    file.contains(".test.") || file.contains(".spec.")
}
