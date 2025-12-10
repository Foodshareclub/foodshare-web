use crate::utils::{get_current_branch, print_info, print_success, print_warning};
use anyhow::Result;

const PROTECTED_BRANCHES: &[&str] = &["main", "master", "production", "develop"];

pub fn run() -> Result<()> {
    let current_branch = get_current_branch();

    if PROTECTED_BRANCHES.contains(&current_branch.as_str()) {
        print_warning(&format!(
            "Pushing to protected branch '{}'",
            current_branch
        ));
        print_info("Auto-approving for local development");
    } else {
        print_success(&format!("Branch '{}' is not protected", current_branch));
    }

    Ok(())
}
