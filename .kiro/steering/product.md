---
inclusion: always
---

# FoodShare Product Overview

FoodShare is a community-driven food sharing platform that connects people with surplus food to those who need it, reducing waste while strengthening local communities.

## Core Purpose

- **Reduce food waste** at household and community level
- **Connect sharers with seekers** through real-time listings and map-based discovery
- **Build community** through local food sharing networks
- **Zero-cost sharing** - no financial transactions, purely community-driven

## Key Features

- **Food Listings**: Users post surplus food with photos, descriptions, and locations
- **Interactive Map**: Leaflet-based map showing food availability, community fridges, food banks
- **Real-time Chat**: Secure messaging between sharers and seekers to coordinate pickup
- **Multi-language**: Supports 21 languages via next-intl
- **User Profiles**: Reputation system with reviews and ratings
- **Search & Filters**: Find food by type, distance, and availability

## Listing Types

- `food` - Surplus food items
- `thing` - Non-food items to share
- `borrow` - Items available for borrowing
- `wanted` - Items users are looking for
- `fridge` - Community fridges
- `foodbank` - Food banks
- `business` - Organisations (businesses, charities, community groups)
- `volunteer` - Volunteer opportunities
- `challenge` - Community challenges
- `zerowaste` - Zero waste initiatives
- `vegan` - Vegan-specific listings
- `community` - Community events

## User Types

1. **Food Sharers** - Post surplus food for others to collect
2. **Food Seekers** - Browse and request available food
3. **Community Organizations** - Food banks, fridges, volunteer groups
4. **Admins** - Platform administrators

## Technical Context

- Next.js 16 App Router with React 19
- Server Components for SEO and performance
- Backend powered by Supabase (PostgreSQL, Auth, Realtime, Storage)
- Deployed on Vercel with global CDN
- Mobile-responsive, progressive web app
