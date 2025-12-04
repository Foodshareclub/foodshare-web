# Airbnb Clone Implementation Guide

## Next.js 16 + Supabase + Shadcn/ui + Tailwind CSS

A complete, production-ready guide for building an Airbnb-style application using the modern stack.

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Folder Structure](#folder-structure)
3. [Database Schema](#database-schema)
4. [Core Components](#core-components)
5. [Key Features Implementation](#key-features-implementation)
6. [Animation & Interactions](#animation--interactions)
7. [Performance Optimization](#performance-optimization)
8. [Deployment](#deployment)

---

## Project Setup

### Initialize Next.js 16 Project

```bash
# Create Next.js 16 app with TypeScript
npx create-next-app@latest airbnb-clone --typescript --tailwind --app --src-dir

cd airbnb-clone

# Install Shadcn/ui
npx shadcn@latest init

# Install required dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install date-fns react-day-picker
npm install framer-motion
npm install zustand
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react
npm install next-themes
```

### Shadcn Components to Install

```bash
# Core UI components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add sheet
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add toast
npx shadcn@latest add skeleton
npx shadcn@latest add tabs
npx shadcn@latest add slider
```

### Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
```

---

## Folder Structure

```
airbnb-clone/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Home/Search
│   │   │   ├── properties/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # Property details
│   │   │   ├── host/
│   │   │   │   ├── properties/
│   │   │   │   │   └── page.tsx            # Host dashboard
│   │   │   │   └── create/
│   │   │   │       └── page.tsx            # Create listing
│   │   │   ├── trips/
│   │   │   │   └── page.tsx                # User bookings
│   │   │   ├── favorites/
│   │   │   │   └── page.tsx                # Saved properties
│   │   │   └── profile/
│   │   │       └── page.tsx                # User profile
│   │   ├── api/
│   │   │   ├── properties/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── bookings/
│   │   │   │   └── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                             # Shadcn components
│   │   ├── navbar/
│   │   │   ├── navbar.tsx
│   │   │   ├── search-bar.tsx
│   │   │   ├── user-menu.tsx
│   │   │   └── categories.tsx
│   │   ├── properties/
│   │   │   ├── property-card.tsx
│   │   │   ├── property-grid.tsx
│   │   │   ├── property-details.tsx
│   │   │   └── image-gallery.tsx
│   │   ├── modals/
│   │   │   ├── auth-modal.tsx
│   │   │   ├── booking-modal.tsx
│   │   │   └── filter-modal.tsx
│   │   ├── forms/
│   │   │   ├── property-form.tsx
│   │   │   ├── booking-form.tsx
│   │   │   └── review-form.tsx
│   │   └── shared/
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── map.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-properties.ts
│   │   ├── use-bookings.ts
│   │   └── use-favorites.ts
│   ├── stores/
│   │   ├── auth-store.ts
│   │   ├── search-store.ts
│   │   └── booking-store.ts
│   ├── types/
│   │   ├── database.types.ts
│   │   ├── property.types.ts
│   │   └── booking.types.ts
│   └── styles/
│       └── airbnb-theme.css
├── public/
│   ├── images/
│   └── icons/
├── supabase/
│   └── migrations/
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
└── components.json
```

---

## Database Schema

### Supabase Schema (SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties table
CREATE TABLE properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  property_type TEXT NOT NULL,
  room_type TEXT NOT NULL,

  -- Location
  country TEXT NOT NULL,
  state TEXT,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Capacity
  guests INTEGER NOT NULL DEFAULT 1,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  beds INTEGER NOT NULL DEFAULT 1,
  bathrooms DECIMAL(3, 1) NOT NULL DEFAULT 1,

  -- Pricing
  price_per_night DECIMAL(10, 2) NOT NULL,
  cleaning_fee DECIMAL(10, 2) DEFAULT 0,
  service_fee_percentage DECIMAL(5, 2) DEFAULT 14,

  -- Amenities
  amenities JSONB DEFAULT '[]',

  -- Images
  images TEXT[] NOT NULL DEFAULT '{}',
  cover_image TEXT,

  -- Status
  is_published BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Dates
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,

  -- Pricing
  total_price DECIMAL(10, 2) NOT NULL,
  nights INTEGER NOT NULL,

  -- Guests
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent double booking
  CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
    property_id WITH =,
    daterange(check_in, check_out, '[]') WITH &&
  ) WHERE (status != 'cancelled')
);

-- Reviews table
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Ratings (1-5)
  cleanliness INTEGER CHECK (cleanliness BETWEEN 1 AND 5),
  accuracy INTEGER CHECK (accuracy BETWEEN 1 AND 5),
  check_in INTEGER CHECK (check_in BETWEEN 1 AND 5),
  communication INTEGER CHECK (communication BETWEEN 1 AND 5),
  location INTEGER CHECK (location BETWEEN 1 AND 5),
  value INTEGER CHECK (value BETWEEN 1 AND 5),
  overall_rating DECIMAL(3, 2),

  -- Review content
  comment TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One review per booking
  UNIQUE(booking_id)
);

-- Favorites table
CREATE TABLE favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One favorite per user per property
  UNIQUE(user_id, property_id)
);

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  description TEXT
);

-- Property categories junction table
CREATE TABLE property_categories (
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, category_id)
);

-- Indexes for performance
CREATE INDEX idx_properties_host ON properties(host_id);
CREATE INDEX idx_properties_location ON properties(country, city);
CREATE INDEX idx_properties_price ON properties(price_per_night);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_reviews_property ON reviews(property_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Properties policies
CREATE POLICY "Published properties are viewable by everyone"
  ON properties FOR SELECT USING (is_published = true OR host_id = auth.uid());

CREATE POLICY "Hosts can create properties"
  ON properties FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update own properties"
  ON properties FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete own properties"
  ON properties FOR DELETE USING (auth.uid() = host_id);

-- Bookings policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT USING (auth.uid() = guest_id OR auth.uid() IN (
    SELECT host_id FROM properties WHERE id = property_id
  ));

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = guest_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Guests can create reviews for their bookings"
  ON reviews FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_id AND guest_id = auth.uid() AND status = 'completed'
    )
  );

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create favorites"
  ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION calculate_overall_rating(review_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  avg_rating DECIMAL;
BEGIN
  SELECT (cleanliness + accuracy + check_in + communication + location + value) / 6.0
  INTO avg_rating
  FROM reviews
  WHERE id = review_id;

  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate overall rating
CREATE OR REPLACE FUNCTION update_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_rating := calculate_overall_rating(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_overall_rating
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_overall_rating();
```

---

## Core Components

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Airbnb color palette
        rausch: {
          DEFAULT: "#FF385C",
          50: "#FFE8ED",
          100: "#FFD1DB",
          200: "#FFA3B7",
          300: "#FF7593",
          400: "#FF476F",
          500: "#FF385C",
          600: "#E60039",
          700: "#B3002C",
          800: "#80001F",
          900: "#4D0012",
        },
        babu: "#00A699",
        arches: "#FC642D",
        hof: "#484848",
        foggy: "#767676",
      },
      borderRadius: {
        airbnb: "12px",
      },
      boxShadow: {
        airbnb: "0 2px 8px rgba(0, 0, 0, 0.08)",
        "airbnb-hover": "0 8px 24px rgba(0, 0, 0, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### Supabase Client Setup

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  );
}
```

### Custom Airbnb Theme CSS

```css
/* src/styles/airbnb-theme.css */
@layer base {
  :root {
    --airbnb-primary: 0 0% 100%;
    --airbnb-primary-foreground: 0 0% 9%;
    --airbnb-rausch: 350 100% 61%;
    --radius: 0.75rem;
  }

  .dark {
    --airbnb-primary: 0 0% 9%;
    --airbnb-primary-foreground: 0 0% 100%;
  }
}

@layer utilities {
  .airbnb-card-hover {
    @apply transition-all duration-300 hover:-translate-y-1 hover:shadow-airbnb-hover;
  }

  .airbnb-button {
    @apply rounded-lg px-6 py-3 font-semibold transition-all duration-200 
           hover:shadow-lg active:translate-y-0.5;
  }

  .airbnb-input {
    @apply rounded-lg border border-gray-300 px-4 py-3 
           focus:border-gray-800 focus:ring-2 focus:ring-gray-800/10 
           transition-all duration-200;
  }

  .airbnb-gradient {
    @apply bg-gradient-to-r from-arches via-rausch to-rausch-600;
  }
}
```

---

## Property Card Component

```tsx
// src/components/properties/property-card.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    cover_image: string;
    price_per_night: number;
    city: string;
    country: string;
    guests: number;
    bedrooms: number;
    bathrooms: number;
    rating?: number;
    reviews_count?: number;
    is_favorite?: boolean;
  };
  onFavoriteToggle?: (id: string) => void;
}

export function PropertyCard({ property, onFavoriteToggle }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(property.is_favorite || false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFavorite(!isFavorite);
    onFavoriteToggle?.(property.id);
  };

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="group cursor-pointer">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden rounded-airbnb mb-3">
          {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
          <Image
            src={property.cover_image}
            alt={property.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-105",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 bg-white/90 hover:bg-white hover:scale-110 transition-all duration-200"
            onClick={handleFavoriteClick}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorite ? "fill-rausch text-rausch" : "text-gray-700"
              )}
            />
          </Button>

          {/* Superhost Badge (if applicable) */}
          {property.rating && property.rating >= 4.8 && (
            <Badge className="absolute bottom-3 left-3 bg-white text-gray-800 font-semibold">
              Superhost
            </Badge>
          )}
        </div>

        {/* Property Info */}
        <div className="space-y-1">
          {/* Location & Rating */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 truncate">
              {property.city}, {property.country}
            </h3>
            {property.rating && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-gray-900">★</span>
                <span className="font-medium">{property.rating.toFixed(2)}</span>
                {property.reviews_count && (
                  <span className="text-gray-600">({property.reviews_count})</span>
                )}
              </div>
            )}
          </div>

          {/* Property Details */}
          <p className="text-sm text-gray-600">
            {property.guests} guests · {property.bedrooms} bedrooms · {property.bathrooms} baths
          </p>

          {/* Title */}
          <p className="text-sm text-gray-600 truncate">{property.title}</p>

          {/* Price */}
          <div className="flex items-baseline gap-1 pt-1">
            <span className="font-semibold text-gray-900">${property.price_per_night}</span>
            <span className="text-sm text-gray-600">/ night</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

---

## Search Bar Component

```tsx
// src/components/navbar/search-bar.tsx
"use client";

import { useState } from "react";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function SearchBar() {
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [activeField, setActiveField] = useState<string | null>(null);

  return (
    <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-airbnb hover:shadow-airbnb-hover transition-shadow duration-200">
      {/* Location */}
      <Popover
        open={activeField === "location"}
        onOpenChange={(open) => setActiveField(open ? "location" : null)}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex flex-col items-start px-6 py-3 rounded-full hover:bg-gray-100 transition-colors",
              activeField === "location" && "bg-white shadow-lg"
            )}
          >
            <span className="text-xs font-semibold text-gray-900">Where</span>
            <span className="text-sm text-gray-600">{location || "Search destinations"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg">
              <MapPin className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Where are you going?"
                className="flex-1 outline-none text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-8 w-px bg-gray-300" />

      {/* Check-in */}
      <Popover
        open={activeField === "checkin"}
        onOpenChange={(open) => setActiveField(open ? "checkin" : null)}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex flex-col items-start px-6 py-3 hover:bg-gray-100 transition-colors",
              activeField === "checkin" && "bg-white shadow-lg rounded-full"
            )}
          >
            <span className="text-xs font-semibold text-gray-900">Check in</span>
            <span className="text-sm text-gray-600">
              {checkIn ? format(checkIn, "MMM dd") : "Add dates"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={checkIn}
            onSelect={setCheckIn}
            disabled={(date) => date < new Date()}
          />
        </PopoverContent>
      </Popover>

      <div className="h-8 w-px bg-gray-300" />

      {/* Check-out */}
      <Popover
        open={activeField === "checkout"}
        onOpenChange={(open) => setActiveField(open ? "checkout" : null)}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex flex-col items-start px-6 py-3 hover:bg-gray-100 transition-colors",
              activeField === "checkout" && "bg-white shadow-lg rounded-full"
            )}
          >
            <span className="text-xs font-semibold text-gray-900">Check out</span>
            <span className="text-sm text-gray-600">
              {checkOut ? format(checkOut, "MMM dd") : "Add dates"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={checkOut}
            onSelect={setCheckOut}
            disabled={(date) => date < (checkIn || new Date())}
          />
        </PopoverContent>
      </Popover>

      <div className="h-8 w-px bg-gray-300" />

      {/* Guests */}
      <Popover
        open={activeField === "guests"}
        onOpenChange={(open) => setActiveField(open ? "guests" : null)}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex flex-col items-start px-6 py-3 hover:bg-gray-100 transition-colors rounded-r-full",
              activeField === "guests" && "bg-white shadow-lg"
            )}
          >
            <span className="text-xs font-semibold text-gray-900">Who</span>
            <span className="text-sm text-gray-600">
              {guests} {guests === 1 ? "guest" : "guests"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Adults</p>
                <p className="text-sm text-gray-600">Ages 13 or above</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                >
                  -
                </Button>
                <span className="w-8 text-center">{guests}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setGuests(guests + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Search Button */}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full bg-rausch hover:bg-rausch-600 text-white mr-2"
      >
        <Search className="h-5 w-5" />
      </Button>
    </div>
  );
}
```

---

## Animation & Interactions

### Framer Motion Variants

```typescript
// src/lib/animations.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideIn = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const propertyCardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};
```

### Animated Property Grid

```tsx
// src/components/properties/property-grid.tsx
"use client";

import { motion } from "framer-motion";
import { PropertyCard } from "./property-card";
import { staggerContainer, fadeInUp } from "@/lib/animations";

interface PropertyGridProps {
  properties: any[];
}

export function PropertyGrid({ properties }: PropertyGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {properties.map((property) => (
        <motion.div key={property.id} variants={fadeInUp}>
          <PropertyCard property={property} />
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

## Key Features Implementation

### 1. Property Listing Page

```tsx
// src/app/(main)/page.tsx
import { createClient } from "@/lib/supabase/server";
import { PropertyGrid } from "@/components/properties/property-grid";
import { SearchBar } from "@/components/navbar/search-bar";
import { Categories } from "@/components/navbar/categories";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; location?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("properties")
    .select(
      `
      *,
      profiles:host_id (
        full_name,
        avatar_url
      ),
      reviews (
        overall_rating
      )
    `
    )
    .eq("is_published", true);

  if (params.category) {
    query = query.contains("amenities", [params.category]);
  }

  if (params.location) {
    query = query.or(`city.ilike.%${params.location}%,country.ilike.%${params.location}%`);
  }

  const { data: properties } = await query;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Search */}
      <section className="border-b">
        <div className="container mx-auto px-6 py-4">
          <SearchBar />
        </div>
      </section>

      {/* Categories */}
      <section className="border-b sticky top-0 bg-white z-10">
        <div className="container mx-auto px-6">
          <Categories />
        </div>
      </section>

      {/* Properties Grid */}
      <section className="container mx-auto px-6 py-8">
        <PropertyGrid properties={properties || []} />
      </section>
    </div>
  );
}
```

### 2. Property Details Page

```tsx
// src/app/(main)/properties/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ImageGallery } from "@/components/properties/image-gallery";
import { BookingCard } from "@/components/properties/booking-card";
import { ReviewsList } from "@/components/properties/reviews-list";
import { MapView } from "@/components/shared/map";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Home, Bed, Bath, Star, Shield, Calendar, MessageCircle } from "lucide-react";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select(
      `
      *,
      profiles:host_id (
        id,
        full_name,
        avatar_url,
        bio,
        created_at
      ),
      reviews (
        id,
        overall_rating,
        cleanliness,
        accuracy,
        check_in,
        communication,
        location,
        value,
        comment,
        created_at,
        profiles:reviewer_id (
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!property) {
    notFound();
  }

  const avgRating = property.reviews?.length
    ? (
        property.reviews.reduce((sum, r) => sum + r.overall_rating, 0) / property.reviews.length
      ).toFixed(2)
    : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2">{property.title}</h1>
          <div className="flex items-center gap-4 text-sm">
            {avgRating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-semibold">{avgRating}</span>
                <span className="text-gray-600">({property.reviews.length} reviews)</span>
              </div>
            )}
            <span className="text-gray-600">
              {property.city}, {property.country}
            </span>
          </div>
        </div>

        {/* Image Gallery */}
        <ImageGallery images={property.images} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host Info */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Image
                  src={property.profiles.avatar_url || "/default-avatar.png"}
                  alt={property.profiles.full_name}
                  width={56}
                  height={56}
                  className="rounded-full"
                />
                <div>
                  <h2 className="text-xl font-semibold">Hosted by {property.profiles.full_name}</h2>
                  <p className="text-gray-600 text-sm">
                    {property.guests} guests · {property.bedrooms} bedrooms ·{property.beds} beds ·{" "}
                    {property.bathrooms} baths
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Home className="h-6 w-6 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Entire home</h3>
                  <p className="text-gray-600 text-sm">You'll have the entire place to yourself</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Shield className="h-6 w-6 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Enhanced Clean</h3>
                  <p className="text-gray-600 text-sm">
                    This host has committed to Airbnb's enhanced cleaning process
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Calendar className="h-6 w-6 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Free cancellation</h3>
                  <p className="text-gray-600 text-sm">Cancel before check-in for a full refund</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">About this place</h2>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {property.description}
              </p>
            </div>

            <Separator />

            {/* Amenities */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">What this place offers</h2>
              <div className="grid grid-cols-2 gap-4">
                {property.amenities?.map((amenity: string, index: number) => (
                  <div key={index} className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                      {amenity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Reviews */}
            {property.reviews?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Star className="h-6 w-6 fill-current" />
                  <h2 className="text-2xl font-semibold">
                    {avgRating} · {property.reviews.length} reviews
                  </h2>
                </div>
                <ReviewsList reviews={property.reviews} />
              </div>
            )}

            <Separator />

            {/* Map */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Where you'll be</h2>
              <p className="text-gray-600 mb-4">
                {property.city}, {property.country}
              </p>
              <MapView latitude={property.latitude} longitude={property.longitude} />
            </div>
          </div>

          {/* Right Column - Booking Card (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingCard property={property} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Booking Card Component

```tsx
// src/components/properties/booking-card.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingCardProps {
  property: {
    id: string;
    price_per_night: number;
    cleaning_fee: number;
    service_fee_percentage: number;
  };
}

export function BookingCard({ property }: BookingCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const subtotal = nights * property.price_per_night;
  const serviceFee = subtotal * (property.service_fee_percentage / 100);
  const total = subtotal + property.cleaning_fee + serviceFee;

  const handleReserve = async () => {
    if (!checkIn || !checkOut) {
      toast({
        title: "Missing dates",
        description: "Please select check-in and check-out dates",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        property_id: property.id,
        guest_id: user.id,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        nights,
        adults: guests,
        total_price: total,
        status: "pending",
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Booking successful!",
      description: "Your reservation has been confirmed",
    });

    router.push(`/trips`);
  };

  return (
    <Card className="shadow-airbnb-hover">
      <CardContent className="p-6">
        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold">${property.price_per_night}</span>
            <span className="text-gray-600">/ night</span>
          </div>
        </div>

        {/* Date Selection */}
        <div className="grid grid-cols-2 gap-0 border rounded-lg mb-4 overflow-hidden">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex flex-col items-start p-3 border-r border-b hover:bg-gray-50 transition-colors">
                <span className="text-xs font-semibold uppercase">Check-in</span>
                <span className="text-sm">
                  {checkIn ? format(checkIn, "MMM dd, yyyy") : "Add date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={setCheckIn}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex flex-col items-start p-3 border-b hover:bg-gray-50 transition-colors">
                <span className="text-xs font-semibold uppercase">Checkout</span>
                <span className="text-sm">
                  {checkOut ? format(checkOut, "MMM dd, yyyy") : "Add date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={setCheckOut}
                disabled={(date) => date < (checkIn || new Date())}
              />
            </PopoverContent>
          </Popover>

          <button className="col-span-2 flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-start">
              <span className="text-xs font-semibold uppercase">Guests</span>
              <span className="text-sm">
                {guests} guest{guests !== 1 ? "s" : ""}
              </span>
            </div>
            <Users className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Reserve Button */}
        <Button
          className="w-full bg-rausch hover:bg-rausch-600 text-white font-semibold py-6"
          onClick={handleReserve}
          disabled={isLoading || !checkIn || !checkOut}
        >
          {isLoading ? "Processing..." : "Reserve"}
        </Button>

        <p className="text-center text-sm text-gray-600 mt-3">You won't be charged yet</p>

        {/* Price Breakdown */}
        {nights > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="underline">
                ${property.price_per_night} x {nights} nights
              </span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="underline">Cleaning fee</span>
              <span>${property.cleaning_fee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="underline">Service fee</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Performance Optimization

### Image Optimization Strategy

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@/components/ui"],
  },
};

export default nextConfig;
```

### Loading States

```tsx
// src/app/(main)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-airbnb" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Infinite Scroll Hook

```typescript
// src/hooks/use-infinite-properties.ts
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const PROPERTIES_PER_PAGE = 20;

export function useInfiniteProperties(filters: any = {}) {
  const [properties, setProperties] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .range(page * PROPERTIES_PER_PAGE, (page + 1) * PROPERTIES_PER_PAGE - 1);

    if (data) {
      setProperties((prev) => [...prev, ...data]);
      setHasMore(data.length === PROPERTIES_PER_PAGE);
      setPage((p) => p + 1);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadMore();
  }, []);

  return { properties, loadMore, hasMore, isLoading };
}
```

---

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or use CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### Production Checklist

- [ ] Set up Supabase production database
- [ ] Configure RLS policies
- [ ] Set up Supabase Storage buckets for images
- [ ] Add proper error boundaries
- [ ] Implement rate limiting
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure CDN for static assets
- [ ] Add SEO metadata
- [ ] Implement sitemap generation
- [ ] Set up analytics (Google Analytics, Plausible)
- [ ] Test mobile responsiveness
- [ ] Lighthouse performance audit
- [ ] Security headers configuration

---

## Additional Features to Build

### Phase 2 Features

1. **Advanced Search & Filters**
   - Price range slider
   - Amenity filters
   - Property type filters
   - Map-based search

2. **User Dashboard**
   - Trip management
   - Booking history
   - Saved properties
   - Review management

3. **Host Dashboard**
   - Property management
   - Booking calendar
   - Earnings analytics
   - Guest communication

4. **Messaging System**
   - Real-time chat (Supabase Realtime)
   - Booking inquiries
   - Host-guest communication

5. **Payment Integration**
   - Stripe checkout
   - Payment processing
   - Refunds handling
   - Payout system

6. **Reviews & Ratings**
   - Post-stay reviews
   - Host responses
   - Rating breakdown
   - Review moderation

7. **Notifications**
   - Email notifications (Resend)
   - In-app notifications
   - Booking confirmations
   - Reminder system

---

## Resources & Next Steps

### Official Documentation

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Recommended Libraries

- **react-hook-form** + **zod** - Form validation
- **framer-motion** - Animations
- **zustand** - State management
- **react-day-picker** - Date selection
- **mapbox-gl** or **leaflet** - Interactive maps
- **recharts** - Analytics charts
- **resend** - Email notifications
- **uploadthing** - File uploads

### Learning Path

1. Start with basic property listing and detail pages
2. Implement authentication with Supabase Auth
3. Add booking functionality
4. Build host dashboard
5. Implement search and filters
6. Add reviews and ratings
7. Integrate payments
8. Build messaging system
9. Add advanced features (wishlists, trips, etc.)
10. Optimize and deploy

---

_This is a living document. Update as you build and discover new patterns!_
