use crate::utils::{format_bytes, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

const MAX_MAIN_BUNDLE_KB: u64 = 500;
const MAX_TOTAL_SIZE_MB: u64 = 10;

pub fn run() -> Result<()> {
    print_header("📦 Bundle Size Check");

    // Check .next directory for Next.js builds
    let build_dir = Path::new(".next");

    if !build_dir.exists() {
        print_info("Build directory (.next) not found, skipping bundle size check");
        print_info("Run 'npm run build' first to analyze bundle size");
        return Ok(());
    }

    let static_dir = build_dir.join("static");
    if !static_dir.exists() {
        print_info("No static assets found");
        return Ok(());
    }

    let mut total_size: u64 = 0;
    let mut js_files: Vec<(String, u64)> = Vec::new();

    // Walk through the build directory
    for entry in WalkDir::new(&static_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() {
            if let Ok(metadata) = fs::metadata(path) {
                let size = metadata.len();
                total_size += size;

                if path.extension().map_or(false, |ext| ext == "js") {
                    js_files.push((path.display().to_string(), size));
                }
            }
        }
    }

    // Sort JS files by size (largest first)
    js_files.sort_by(|a, b| b.1.cmp(&a.1));

    println!("Largest JavaScript bundles:");
    for (file, size) in js_files.iter().take(5) {
        let filename = Path::new(file)
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_else(|| file.clone());

        let size_kb = size / 1024;
        if size_kb > MAX_MAIN_BUNDLE_KB {
            print_warning(&format!("  {} - {} (exceeds {}KB limit)", filename, format_bytes(*size), MAX_MAIN_BUNDLE_KB));
        } else {
            print_info(&format!("  {} - {}", filename, format_bytes(*size)));
        }
    }

    println!();
    let total_mb = total_size / (1024 * 1024);
    if total_mb > MAX_TOTAL_SIZE_MB {
        print_warning(&format!(
            "Total build size: {} (exceeds {}MB limit)",
            format_bytes(total_size),
            MAX_TOTAL_SIZE_MB
        ));
        print_info("Consider code splitting or removing unused dependencies");
    } else {
        print_success(&format!("Total build size: {}", format_bytes(total_size)));
    }

    Ok(())
}
