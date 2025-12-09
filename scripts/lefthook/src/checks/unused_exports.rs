use crate::utils::{print_header, print_info, print_success, print_warning};
use anyhow::Result;
use std::process::Command;

pub fn run() -> Result<()> {
    print_header("🪦 Dead Code / Unused Exports Check");

    // Try to run ts-prune if available
    let output = Command::new("npx")
        .args(["ts-prune", "--error"])
        .output();

    match output {
        Ok(result) => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            let stderr = String::from_utf8_lossy(&result.stderr);

            if stderr.contains("not found") || stderr.contains("ERR!") {
                print_warning("ts-prune not installed");
                print_info("Install with: npm install -D ts-prune");
                print_info("Then run: npx ts-prune");
                return Ok(());
            }

            let unused: Vec<&str> = stdout
                .lines()
                .filter(|line| !line.contains("(used in module)"))
                .take(20)
                .collect();

            if unused.is_empty() {
                print_success("No unused exports found");
            } else {
                print_warning(&format!("Found {} potentially unused exports:", unused.len()));
                for line in unused {
                    println!("    {}", line);
                }
                println!();
                print_info("Review these exports - they may be unused or only used dynamically");
            }
        }
        Err(_) => {
            print_warning("Could not run ts-prune");
            print_info("Install with: npm install -D ts-prune");
        }
    }

    // Warning only, not blocking
    Ok(())
}
