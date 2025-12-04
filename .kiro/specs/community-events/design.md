# Design Document

## Overview

Community Events enables users to organize and participate in food sharing events, manage community fridges, and coordinate collective pickup points.

## Architecture

Event management system with calendar integration, RSVP tracking, and location-based discovery.

## Data Models

```typescript
interface CommunityEvent {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  event_type: "swap" | "distribution" | "collection" | "social";
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  start_time: Date;
  end_time: Date;
  capacity: number;
  participants: string[]; // user_ids
  waitlist: string[];
  recurring: RecurringPattern | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
}

interface CommunityResource {
  id: string;
  name: string;
  type: "fridge" | "food_bank" | "pickup_point";
  location: { address: string; lat: number; lng: number };
  operating_hours: string;
  inventory: InventoryItem[];
  verified: boolean;
}
```

## Correctness Properties

### Property 1: Capacity enforcement

_For any_ event at capacity, new registrations should be added to waitlist only.
**Validates: Requirements 3.3**

### Property 2: Recurring event generation

_For any_ recurring event, future instances should be generated according to the recurrence pattern.
**Validates: Requirements 7.2**

### Property 3: Check-in location validation

_For any_ check-in attempt, the user's location should be within 100 meters of the event location.
**Validates: Requirements 8.2**

### Property 4: Participant notification

_For any_ event update or cancellation, all registered participants should receive notifications.
**Validates: Requirements 4.4, 4.5**

### Property 5: Inventory timestamp freshness

_For any_ community fridge inventory, updates older than 24 hours should be marked as stale.
**Validates: Requirements 6.4**

## Testing Strategy

Property-based tests for capacity management, recurring events, and location validation.
