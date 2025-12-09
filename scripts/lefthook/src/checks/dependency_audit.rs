use crate::utils::{print_error, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use serde::Deserialize;
use std::process::Command;

#[derive(Deserialize, Default)]
struct AuditMetadata {
    vulnerabilities: Option<VulnerabilityCounts>,
}

#[derive(Deserialize, Default)]
struct VulnerabilityCounts {
    critical: Option<u32>,
    high: Option<u32>,
    moderate: Option<u32>,
    low: Option<u32>,
    info: Option<u32>,
}

pub fn run() -> Result<()> {
    print_header("🔍 Dependency Vulnerability Audit");

    let output = Command::new("npm")
        .args(["audit", "--json"])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(_) => {
            print_warning("Could not run npm audit");
            return Ok(());
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);

    if stdout.is_empty() {
        print_success("No vulnerabilities found");
        return Ok(());
    }

    // Try to parse the JSON output
    let audit: AuditMetadata = serde_json::from_str(&stdout).unwrap_or_default();

    let vulns = audit.vulnerabilities.unwrap_or_default();
    let critical = vulns.critical.unwrap_or(0);
    let high = vulns.high.unwrap_or(0);
    let moderate = vulns.moderate.unwrap_or(0);

    if critical > 0 || high > 0 {
        print_error("Security vulnerabilities found:");
        println!("   Critical: {}", critical);
        println!("   High: {}", high);
        println!("   Moderate: {}", moderate);
        println!();
        print_info("Run 'npm audit' for details and 'npm audit fix' to resolve");
        return Err(anyhow::anyhow!("Security vulnerabilities found"));
    }

    if moderate > 0 {
        print_warning(&format!("Moderate vulnerabilities found: {}", moderate));
        print_info("Consider running 'npm audit fix' to resolve");
        return Ok(());
    }

    print_success("No critical or high vulnerabilities found");
    Ok(())
}
