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
bunx tsx scripts/database/sync-translations-to-db.ts
```

## Deployment Scripts

### `deploy/edge-functions/`

Supabase edge function deployment scripts.

## Foodbank Import

Imports foodbank and community fridge data from OpenStreetMap.

```bash
bunx tsx scripts/foodbank-import/index.ts --country=US --dry-run
bunx tsx scripts/foodbank-import/index.ts --country=all --type=fridge
```

See `scripts/foodbank-import/README.md` for details.

## Environment Configuration

Deployment environment variables come exclusively via GitHub Actions secrets during deploy.

## Environment Variables

Required for scripts:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DOCKER_PASSWORD` (for registry authentication)

---

**Last Updated:** December 2025
