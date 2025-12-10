use crate::utils::{format_bytes, get_staged_files, print_error, print_header, print_info, print_success, print_warning};
use anyhow::Result;
use std::fs;
use std::path::Path;

pub fn run(max_size_kb: u64) -> Result<()> {
    print_header("📏 Large Files Check");

    let staged_files = get_staged_files();

    if staged_files.is_empty() {
        print_success("No files to check");
        return Ok(());
    }

    let max_size_bytes = max_size_kb * 1024;
    let mut large_files = Vec::new();

    for file in &staged_files {
        let path = Path::new(file);
        if path.exists() {
            if let Ok(metadata) = fs::metadata(path) {
                let size = metadata.len();
                if size > max_size_bytes {
                    large_files.push((file.clone(), size));
                }
            }
        }
    }

    if large_files.is_empty() {
        print_success("No large files detected");
        return Ok(());
    }

    print_warning(&format!("Large files detected (>{}KB):", max_size_kb));
    for (file, size) in &large_files {
        print_error(&format!("  {} ({})", file, format_bytes(*size)));
    }

    println!();
    print_info("Consider using Git LFS for large binary files");
    print_info("Install: git lfs install && git lfs track '*.large-extension'");

    Err(anyhow::anyhow!("Large files detected"))
}
