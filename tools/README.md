# ⚠️ DEPRECATED - Moved to foodshare-tools

This tools directory has been merged into the unified **foodshare-tools** repository.

## New Location

https://github.com/Foodshareclub/foodshare-tools

## Migration

The unified repository provides the same `lefthook-rs` binary with additional features.

### Option 1: Use the unified repo (recommended)

```bash
# Clone the unified tools repo
git clone https://github.com/Foodshareclub/foodshare-tools.git ../foodshare-tools

# Build
cd ../foodshare-tools
cargo build --release

# Symlink the binary
ln -sf ../../foodshare-tools/target/release/lefthook-rs ./target/release/lefthook-rs
```

### Option 2: Keep using this directory

The existing code still works. Just run:

```bash
cargo build --release
```

## What Changed

The unified repo combines tools from:

- `foodshare/tools` (this directory) → Web/Next.js hooks
- `foodshare-android/tools` → Android hooks
- `foodshare-ios/tools` → iOS hooks

All share a common core for git operations, secrets scanning, and commit validation.
