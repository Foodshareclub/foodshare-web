use crate::utils::{print_error, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use serde::Deserialize;
use std::fs;
use std::process::Command;

const MIN_COVERAGE: f64 = 70.0;
const TARGET_COVERAGE: f64 = 80.0;

#[derive(Deserialize, Default)]
struct CoverageSummary {
    total: Option<CoverageTotal>,
}

#[derive(Deserialize, Default)]
struct CoverageTotal {
    lines: Option<CoverageMetric>,
    statements: Option<CoverageMetric>,
    functions: Option<CoverageMetric>,
    branches: Option<CoverageMetric>,
}

#[derive(Deserialize, Default)]
struct CoverageMetric {
    pct: Option<f64>,
}

pub fn run() -> Result<()> {
    print_header("📊 Test Coverage Check");

    // Run tests with coverage
    print_info("Running tests with coverage...");
    let output = Command::new("npm")
        .args(["run", "test:coverage", "--", "--reporter=json"])
        .output();

    if output.is_err() {
        print_warning("Could not run test coverage");
        return Ok(());
    }

    // Check for coverage summary file
    let coverage_file = "coverage/coverage-summary.json";
    if !fs::metadata(coverage_file).is_ok() {
        print_warning("Coverage report not found");
        print_info("Run 'npm run test:coverage' to generate coverage report");
        return Ok(());
    }

    let content = fs::read_to_string(coverage_file)?;
    let summary: CoverageSummary = serde_json::from_str(&content).unwrap_or_default();

    let total = summary.total.unwrap_or_default();
    let lines = total.lines.and_then(|m| m.pct).unwrap_or(0.0);
    let statements = total.statements.and_then(|m| m.pct).unwrap_or(0.0);
    let functions = total.functions.and_then(|m| m.pct).unwrap_or(0.0);
    let branches = total.branches.and_then(|m| m.pct).unwrap_or(0.0);

    println!("Coverage Results:");
    println!("  Lines:      {:.1}%", lines);
    println!("  Statements: {:.1}%", statements);
    println!("  Functions:  {:.1}%", functions);
    println!("  Branches:   {:.1}%", branches);
    println!();

    if lines < MIN_COVERAGE {
        print_error(&format!(
            "Line coverage ({:.1}%) is below minimum threshold ({:.1}%)",
            lines, MIN_COVERAGE
        ));
        return Err(anyhow::anyhow!("Coverage below minimum"));
    }

    if lines < TARGET_COVERAGE {
        print_warning(&format!(
            "Coverage is above minimum but below target ({:.1}%)",
            TARGET_COVERAGE
        ));
    } else {
        print_success("Coverage meets target threshold!");
    }

    Ok(())
}
