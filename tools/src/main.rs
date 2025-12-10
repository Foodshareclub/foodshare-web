mod checks;
mod utils;

use anyhow::Result;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "lefthook-rs")]
#[command(about = "Fast git hooks for FoodShare", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Enable verbose output
    #[arg(short, long, global = true)]
    verbose: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Security checks (secrets, credentials, debug statements)
    Security {
        /// Files to check (reads from stdin if not provided)
        #[arg(trailing_var_arg = true)]
        files: Vec<String>,
    },
    /// Validate conventional commit message format
    ConventionalCommit {
        /// Path to commit message file
        #[arg(required = true)]
        message_file: String,
    },
    /// Check for protected branch push
    ProtectedBranch,
    /// Check for large files in staging
    LargeFiles {
        /// Maximum file size in KB (default: 500)
        #[arg(short, long, default_value = "500")]
        max_size: u64,
    },
    /// Check code complexity
    Complexity {
        /// Files to check
        #[arg(trailing_var_arg = true)]
        files: Vec<String>,
    },
    /// Check for console statements
    NoConsole {
        /// Files to check
        #[arg(trailing_var_arg = true)]
        files: Vec<String>,
    },
    /// Check import organization
    ImportCheck {
        /// Files to check
        #[arg(trailing_var_arg = true)]
        files: Vec<String>,
    },
    /// Run dependency vulnerability audit
    DependencyAudit,
    /// Check accessibility in JSX/TSX files
    Accessibility {
        /// Files to check
        #[arg(trailing_var_arg = true)]
        files: Vec<String>,
    },
    /// Analyze bundle size
    BundleSize,
    /// Check test coverage
    TestCoverage,
    /// Check for unused exports / dead code
    UnusedExports,
    /// Next.js/React/Vercel security vulnerabilities check
    NextjsSecurity {
        /// Files to check
        #[arg(trailing_var_arg = true)]
        files: Vec<String>,
    },
    /// Run all pre-commit checks
    PreCommit {
        /// Files to check
        #[arg(trailing_var_arg = true)]
        files: Vec<String>,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    utils::set_verbose(cli.verbose);

    let result = match cli.command {
        Commands::Security { files } => checks::security::run(&files),
        Commands::ConventionalCommit { message_file } => {
            checks::conventional_commit::run(&message_file)
        }
        Commands::ProtectedBranch => checks::protected_branch::run(),
        Commands::LargeFiles { max_size } => checks::large_files::run(max_size),
        Commands::Complexity { files } => checks::complexity::run(&files),
        Commands::NoConsole { files } => checks::no_console::run(&files),
        Commands::ImportCheck { files } => checks::import_check::run(&files),
        Commands::DependencyAudit => checks::dependency_audit::run(),
        Commands::Accessibility { files } => checks::accessibility::run(&files),
        Commands::BundleSize => checks::bundle_size::run(),
        Commands::TestCoverage => checks::test_coverage::run(),
        Commands::UnusedExports => checks::unused_exports::run(),
        Commands::NextjsSecurity { files } => checks::nextjs_security::run(&files),
        Commands::PreCommit { files } => checks::pre_commit::run(&files),
    };

    std::process::exit(if result.is_ok() { 0 } else { 1 });
}
