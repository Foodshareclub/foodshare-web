# 🗺️ PostGIS Architecture & Location Handling

## Overview

Yes! We **do use PostGIS** for location standardization and spatial queries in the FoodShare platform.

---

## 🏗️ Architecture

### 1. **PostGIS Extension** ✅ Enabled

```sql
-- PostGIS is installed and active
postgis v3.3.2 (installed)
postgis_tiger_geocoder v3.3.2 (installed)
postgis_topology v3.3.2 (installed)
postgis_raster v3.3.2 (installed)
postgis_sfcgal v3.3.2 (installed)
```

### 2. **Database Schema**

The `posts` table has a PostGIS `location` column:

```sql
-- posts table structure
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  post_name TEXT,
  post_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326),  -- PostGIS column!
  -- ... other columns
);

-- Spatial index for fast queries
CREATE INDEX idx_posts_location ON posts USING GIST (location);
```

---

## 🔄 Location Processing Flow

### **Flow 1: Telegram Bot → Direct Geocoding**

When a user shares food via Telegram:

```
User types location
    ↓
Telegram Bot (geocodeLocation function)
    ↓
Nominatim API (OpenStreetMap)
    ↓
Returns lat/lng coordinates
    ↓
Bot saves to database:
  - latitude: decimal
  - longitude: decimal
  - location: NULL (not set yet!)
    ↓
Database trigger or edge function
    ↓
Converts to PostGIS POINT
```

**Current Bot Code:**

```typescript
// supabase/functions/telegram-bot-foodshare/index.ts (line 808)
async function geocodeLocation(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    const response = await fetch(url, {
      headers: { "User-Agent": "FoodShare-Bot/1.0" },
    });

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
```

**Problem:** The bot saves `latitude` and `longitude` but **doesn't set the PostGIS `location` column**!

---

### **Flow 2: Edge Function → PostGIS Standardization**

The `update-post-coordinates` edge function handles proper PostGIS conversion:

```
Post created with address
    ↓
Edge function triggered
    ↓
Geocodes address via Nominatim
    ↓
Converts to PostGIS format:
  location = SRID=4326;POINT(lon lat)
    ↓
Updates database with proper geometry
```

**Edge Function Code:**

```typescript
// supabase/functions/update-post-coordinates/index.ts
const { error: updateError } = await supabase
  .from("posts")
  .update({
    location: `SRID=4326;POINT(${lon} ${lat})`, // ✅ PostGIS format!
  })
  .eq("id", post.id);
```

---

## 🎯 PostGIS Spatial Functions

### **1. Nearby Posts Query**

```sql
-- Function: nearby_posts
CREATE OR REPLACE FUNCTION public.nearby_posts(
  lat double precision,
  long double precision,
  p_post_type text
)
RETURNS SETOF record
LANGUAGE sql
AS $function$
  SELECT
    id,
    post_name,
    post_type,
    st_astext(location) as location,
    st_distance(location, st_point(long, lat)::geography) as dist_meters
  FROM public.posts
  WHERE post_type = p_post_type
  ORDER BY location <-> st_point(long, lat)::geography;
$function$
```

**Key PostGIS Functions Used:**

- `ST_Point(lon, lat)` - Creates a point geometry
- `ST_Distance(geom1, geom2)` - Calculates distance in meters
- `<->` operator - KNN (K-Nearest Neighbor) for fast spatial sorting
- `::geography` - Cast to geography type for accurate Earth distances

### **2. Distance Calculation**

```sql
-- Calculate distance between two points
SELECT ST_Distance(
  location::geography,
  ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography
) as distance_meters
FROM posts;
```

### **3. Radius Search**

```sql
-- Find posts within 5km radius
SELECT *
FROM posts
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography,
  5000  -- 5km in meters
);
```

---

## 🐛 Current Issue in Telegram Bot

### **Problem:**

The Telegram bot's `completeSharing` function saves coordinates but **doesn't create the PostGIS `location` column**:

```typescript
// Current code (line 1027)
const { data: post, error } = await supabase
  .from("posts")
  .insert({
    profile_id: profile.id,
    post_name: foodName,
    post_description: description,
    post_type: "food",
    latitude: latitude, // ✅ Saved
    longitude: longitude, // ✅ Saved
    post_address: data.locationText || null,
    gif_url: data.photo,
    active: true,
    // ❌ location column NOT set!
  })
  .select("id")
  .single();
```

### **Solution Options:**

#### **Option 1: Update Bot to Set PostGIS Location** (Recommended)

```typescript
const { data: post, error } = await supabase
  .from("posts")
  .insert({
    profile_id: profile.id,
    post_name: foodName,
    post_description: description,
    post_type: "food",
    latitude: latitude,
    longitude: longitude,
    location: `SRID=4326;POINT(${longitude} ${latitude})`, // ✅ Add this!
    post_address: data.locationText || null,
    gif_url: data.photo,
    active: true,
  })
  .select("id")
  .single();
```

#### **Option 2: Database Trigger** (Automatic)

Create a trigger to auto-populate `location` from `latitude`/`longitude`:

```sql
CREATE OR REPLACE FUNCTION update_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_update_location
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_location_from_coords();
```

#### **Option 3: Call Edge Function** (Current System)

The bot could call the `update-post-coordinates` edge function after creating the post:

```typescript
// After creating post
await fetch(`${SUPABASE_URL}/functions/v1/update-post-coordinates`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    id: post.id,
    post_address: data.locationText,
  }),
});
```

---

## 📊 Benefits of PostGIS

### **1. Accurate Distance Calculations**

PostGIS uses proper geodetic calculations (Earth's curvature):

```sql
-- Accurate distance in meters
SELECT ST_Distance(
  'SRID=4326;POINT(-122.4194 37.7749)'::geography,  -- San Francisco
  'SRID=4326;POINT(-118.2437 34.0522)'::geography   -- Los Angeles
) as distance_meters;
-- Result: ~559,120 meters (559 km) ✅ Accurate!
```

vs simple Euclidean distance (wrong):

```sql
-- Inaccurate flat distance
SELECT ST_Distance(
  'SRID=4326;POINT(-122.4194 37.7749)'::geometry,
  'SRID=4326;POINT(-118.2437 34.0522)'::geometry
);
-- Result: ~4.5 degrees ❌ Wrong!
```

### **2. Fast Spatial Indexing**

GIST indexes enable fast nearest-neighbor queries:

```sql
-- Fast KNN query using spatial index
SELECT * FROM posts
ORDER BY location <-> ST_Point(-122.4194, 37.7749)::geography
LIMIT 10;
-- Uses index, very fast! ⚡
```

### **3. Advanced Spatial Operations**

- **Within radius**: `ST_DWithin()`
- **Bounding box**: `ST_MakeEnvelope()`
- **Polygon containment**: `ST_Contains()`
- **Route distance**: `ST_Length()`
- **Area calculation**: `ST_Area()`

---

## 🔧 Recommended Fix

### **Update the Telegram Bot**

Add PostGIS location when creating posts:

```typescript
// In completeSharing function (line 1027)
const { data: post, error } = await supabase
  .from("posts")
  .insert({
    profile_id: profile.id,
    post_name: foodName,
    post_description: description,
    post_type: "food",
    latitude: latitude,
    longitude: longitude,
    location: `SRID=4326;POINT(${longitude} ${latitude})`, // ✅ Add PostGIS!
    post_address: data.locationText || null,
    gif_url: data.photo,
    active: true,
  })
  .select("id")
  .single();
```

**Benefits:**

- ✅ Immediate PostGIS support
- ✅ No need for edge function call
- ✅ Enables spatial queries right away
- ✅ Consistent with database schema

---

## 📝 Summary

### **Current State:**

| Component         | PostGIS Support               | Status        |
| ----------------- | ----------------------------- | ------------- |
| Database          | ✅ PostGIS enabled            | Working       |
| `posts` table     | ✅ `location` column          | Working       |
| Spatial functions | ✅ `nearby_posts()`           | Working       |
| Edge function     | ✅ Converts to PostGIS        | Working       |
| **Telegram Bot**  | ❌ **Doesn't set `location`** | **Needs Fix** |

### **The Answer:**

**Yes, we use PostGIS for location standardization**, but the **Telegram bot currently doesn't populate the PostGIS `location` column** when creating posts. It only sets `latitude` and `longitude` as decimal values.

**Recommendation:** Update the bot to set the `location` column in PostGIS format when creating posts.

---

## 🚀 Next Steps

1. **Fix the bot** to set PostGIS `location` column
2. **Test** that spatial queries work for bot-created posts
3. **Verify** nearby posts function returns correct results
4. **Consider** adding a database trigger as backup

Would you like me to implement the fix now?
