use crate::utils::{print_error, print_info, print_success};
use anyhow::Result;
use regex::Regex;
use std::fs;

pub fn run(message_file: &str) -> Result<()> {
    let commit_msg = fs::read_to_string(message_file)?;
    let commit_msg = commit_msg.trim();

    // Allow merge commits
    if commit_msg.starts_with("Merge ") {
        print_success("Merge commit - skipping validation");
        return Ok(());
    }

    // Allow revert commits
    if commit_msg.starts_with("Revert ") {
        print_success("Revert commit - skipping validation");
        return Ok(());
    }

    // Validate conventional commit format
    let pattern = Regex::new(
        r"^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,72}",
    )
    .unwrap();

    if pattern.is_match(commit_msg) {
        print_success("Commit message follows Conventional Commits format");
        return Ok(());
    }

    print_error("Commit message must follow Conventional Commits format");
    println!();
    println!("Format: <type>(<scope>): <description>");
    println!();
    println!("Valid types:");
    println!("  feat     - New feature");
    println!("  fix      - Bug fix");
    println!("  docs     - Documentation changes");
    println!("  style    - Code style/formatting (no logic change)");
    println!("  refactor - Code restructuring (no behavior change)");
    println!("  test     - Adding or updating tests");
    println!("  chore    - Build/tooling changes");
    println!("  perf     - Performance improvements");
    println!("  ci       - CI/CD configuration");
    println!("  build    - Build system changes");
    println!();
    println!("Common scopes for FoodShare:");
    println!("  products - Product listings and search");
    println!("  chat     - Real-time messaging");
    println!("  map      - Leaflet map integration");
    println!("  auth     - Authentication and user management");
    println!("  ui       - User interface components");
    println!("  api      - API layer and Supabase integration");
    println!("  i18n     - Internationalization");
    println!();
    println!("Examples:");
    println!("  feat(products): add distance-based filtering");
    println!("  fix(chat): resolve message duplication in realtime");
    println!("  docs: update API reference documentation");
    println!("  refactor(map): simplify marker clustering logic");
    println!();
    print_info(&format!("Your message: {}", commit_msg));

    Err(anyhow::anyhow!("Invalid commit message format"))
}
