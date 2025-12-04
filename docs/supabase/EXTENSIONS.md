# PostgreSQL Extensions

## Overview

FoodShare uses 80+ PostgreSQL extensions. Key extensions are highlighted below.

## Key Extensions

### PostGIS (Geographic Data)

| Extension | Version | Description |
|-----------|---------|-------------|
| `postgis` | 3.3.2 | Geographic object support |
| `postgis_topology` | 3.3.2 | Topology data types |
| `postgis_raster` | 3.3.2 | Raster data support |
| `address_standardizer` | 3.3.2 | Address parsing |

**Usage**: The `posts.location` column uses `geography(Point, 4326)` for lat/lng storage.

---

### Scheduling & Jobs

| Extension | Version | Description |
|-----------|---------|-------------|
| `pg_cron` | 1.6 | Job scheduling within PostgreSQL |

**Usage**: Scheduled tasks for cleanup, statistics, and maintenance.

---

### Vector & AI

| Extension | Version | Description |
|-----------|---------|-------------|
| `vector` | 0.7.0 | pgvector for embeddings |

**Usage**: AI/ML features, semantic search capabilities.

---

### Full-Text Search

| Extension | Version | Description |
|-----------|---------|-------------|
| `pg_trgm` | 1.6 | Trigram text similarity |
| `unaccent` | 1.1 | Accent-insensitive search |
| `fuzzystrmatch` | 1.1 | Fuzzy string matching |

**Usage**: Product search with typo tolerance.

---

### Security & Encryption

| Extension | Version | Description |
|-----------|---------|-------------|
| `pgcrypto` | 1.3 | Cryptographic functions |
| `pgjwt` | 0.2.0 | JWT token handling |

---

### Data Types

| Extension | Version | Description |
|-----------|---------|-------------|
| `uuid-ossp` | 1.1 | UUID generation |
| `hstore` | 1.8 | Key-value store |
| `ltree` | 1.2 | Hierarchical labels |
| `citext` | 1.6 | Case-insensitive text |

---

### Performance & Indexing

| Extension | Version | Description |
|-----------|---------|-------------|
| `btree_gin` | 1.3 | GIN index for btree types |
| `btree_gist` | 1.7 | GiST index for btree types |
| `pg_stat_statements` | 1.10 | Query statistics |

---

### Supabase-Specific

| Extension | Version | Description |
|-----------|---------|-------------|
| `supabase_vault` | 0.2.8 | Secrets management |
| `pgsodium` | 3.1.9 | Encryption with libsodium |
| `pg_graphql` | 1.5.11 | GraphQL support |
| `pg_net` | 0.14.0 | HTTP requests from SQL |
| `wrappers` | 0.4.4 | Foreign data wrappers |

---

## All Installed Extensions

```
address_standardizer, address_standardizer_data_us, amcheck, autoinc,
bloom, btree_gin, btree_gist, citext, cube, dblink, dict_int, dict_xsyn,
earthdistance, file_fdw, fuzzystrmatch, hstore, http, hypopg, index_advisor,
insert_username, intagg, intarray, isn, lo, ltree, moddatetime, old_snapshot,
pageinspect, pg_buffercache, pg_cron, pg_freespacemap, pg_graphql, pg_hashids,
pg_jsonschema, pg_net, pg_prewarm, pg_repack, pg_stat_monitor, pg_stat_statements,
pg_surgery, pg_trgm, pg_visibility, pg_walinspect, pgaudit, pgcrypto, pgjwt,
pgroonga, pgroonga_database, pgrouting, pgsodium, pgstattuple, pgtap, plcoffee,
pljava, plls, plpgsql, plpgsql_check, plv8, postgis, postgis_raster,
postgis_sfcgal, postgis_tiger_geocoder, postgis_topology, postgres_fdw, refint,
rum, seg, sslinfo, supabase_vault, tablefunc, tcn, timescaledb, tsm_system_rows,
tsm_system_time, unaccent, uuid-ossp, vector, wrappers, xml2
```

---

## Enabling Extensions

Extensions can be enabled via SQL:

```sql
CREATE EXTENSION IF NOT EXISTS "extension_name";
```

Or via Supabase Dashboard: Database > Extensions

---

*Last updated: December 2024*
