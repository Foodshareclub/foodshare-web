# FoodShare Scripts

Utility scripts for deployment, database operations, and data import.

## Directory Structure

```
scripts/
├── database/         # Database utilities
├── deploy/           # Deployment scripts
├── foodbank-import/  # Foodbank data import from OSM
├── monitoring/       # SQL dashboards
├── telegram-bot/     # Telegram bot utilities
├── vercel-setup/     # Vercel environment configuration
└── README.md
```

## Git Hooks

Git hooks are implemented in Rust for performance. See `tools/` directory.

```bash
# Build
cd tools && cargo build --release

# Available commands
./tools/target/release/lefthook-rs --help
```

Lefthook configuration in `lefthook.yml` uses these Rust tools automatically.

## Database Scripts

### `database/backup.sh`
Creates a backup of the Supabase database.

### `database/sync-translations-to-db.ts`
Syncs translation files to database for edge function use.

```bash
npx tsx scripts/database/sync-translations-to-db.ts
```

## Deployment Scripts

### `deploy/deploy-vercel.sh`
Deploys to Vercel.

```bash
./scripts/deploy/deploy-vercel.sh [production|preview]
```

### `deploy/edge-functions/`
Supabase edge function deployment scripts.

## Foodbank Import

Imports foodbank and community fridge data from OpenStreetMap.

```bash
npx tsx scripts/foodbank-import/index.ts --country=US --dry-run
npx tsx scripts/foodbank-import/index.ts --country=all --type=fridge
```

See `scripts/foodbank-import/README.md` for details.

## Vercel Setup

Environment variable configuration scripts for Vercel projects.

## Environment Variables

Required for scripts:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN` (for deploy scripts)

---

**Last Updated:** December 2025
