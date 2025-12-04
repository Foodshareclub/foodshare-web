# Foodbank Import Script

Imports foodbank locations from OpenStreetMap into the FoodShare database.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. Apply the system user migration:
   ```bash
   supabase db push
   ```

## Usage

### Dry Run (Preview Only)

Test without making database changes:

```bash
npm run import:foodbanks -- --country=US --dry-run
```

### Import Specific Countries

```bash
# Single country
npm run import:foodbanks -- --country=US

# Multiple countries
npm run import:foodbanks -- --country=US,UK,DE

# All supported countries
npm run import:foodbanks -- --country=all
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--country` | Country codes (comma-separated) or `all` | `US` |
| `--dry-run` | Preview without database changes | `false` |
| `--verbose` or `-v` | Show detailed output | `false` |
| `--batch-size` | Records per batch insert | `50` |

### Supported Countries

- `US` - United States
- `UK` - United Kingdom
- `CA` - Canada
- `AU` - Australia
- `DE` - Germany

## Data Source

The script fetches foodbank data from OpenStreetMap using the Overpass API:

- Queries for `amenity=food_bank` and `social_facility=food_bank` tags
- No API key required
- Data is community-contributed and may vary in quality

## How It Works

1. **Fetch** - Queries OSM Overpass API for foodbanks in each country
2. **Deduplicate** - Removes duplicates by name similarity + geographic proximity
3. **Geocode** - Geocodes addresses without coordinates via Nominatim
4. **Import** - Inserts records into the `posts` table with `post_type='food_bank'`

## Output Format

Imported foodbanks are stored in the `posts` table with:

- `post_type`: `'food_bank'`
- `post_name`: Foodbank name
- `post_description`: Structured metadata (phone, website, services, etc.)
- `location`: PostGIS geography point
- `profile_id`: System user UUID

### Description Format

Extended metadata is stored in a structured format:

```
[DESCRIPTION]
Community food bank in New York.

[PHONE]
+1-555-123-4567

[WEBSITE]
https://example-foodbank.org

[SERVICES]
- Emergency food boxes
- SNAP enrollment assistance

[ELIGIBILITY]
Open to all residents

[SOURCE]
Imported from OpenStreetMap (ID: node/12345)
```

## Troubleshooting

### "Missing Supabase configuration"

Ensure `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`.

### Rate Limiting

The script automatically rate-limits requests to comply with Nominatim's 1 request/second policy.

### No Foodbanks Found

OSM coverage varies by region. Some areas may have limited data.

## Files

```
scripts/foodbank-import/
├── index.ts              # Main CLI entry point
├── config.ts             # Configuration constants
├── types.ts              # TypeScript interfaces
├── sources/
│   └── osm-source.ts     # OpenStreetMap Overpass adapter
├── utils/
│   ├── geocoding.ts      # Nominatim geocoding
│   ├── deduplication.ts  # Duplicate detection
│   └── formatting.ts     # Description formatter
└── README.md             # This file
```
