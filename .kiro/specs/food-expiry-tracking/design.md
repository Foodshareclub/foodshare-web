# Design Document

## Overview

The Food Expiry Tracking feature provides intelligent management of food expiry dates, helping sharers maintain fresh listings and helping seekers prioritize food that needs immediate consumption. The system includes automated reminders, urgency indicators, auto-archiving, and waste reduction analytics.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Urgency Badge│  │ Expiry Form  │  │ Reminder UI  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Background Jobs                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cron Jobs (Supabase Edge Functions)                │   │
│  │  - Check expiring listings (hourly)                 │   │
│  │  - Send reminders (24h, 3d before)                  │   │
│  │  - Auto-archive expired (hourly)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────┐
│                    Supabase Database                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  posts table                                         │   │
│  │  - expiry_date, urgency_level                       │   │
│  │  - Index on expiry_date for efficient queries       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

omponent

ript
interface UrgencyBadgeProps {

size?: 'sm'';
}

enum UrgencyLevel {
LOW = 'low', days
MEDIUM = 'medium', // 4-7ys
3 days

}

function calculateUrg {
const hoursUnti;

if (hoursL;
if (hour
if (hoursUnIUM;
return Urgency
}

```

nt

pt
interface ExperProps {
  value: Date | null;
  onChange: (date: ;
  foodType?: FoodType;
 Date;
}

// Suggested expiry dates by food type
const EXPIRY_SUGGESTIONS: Record<Foober> = {
  produce: 7,        // days
  baked_goods: 3,
 ,
: 5,
  meat: 2,
  pantry: 30,
  4,
  other: 7,
};
```

#

ipt
interface ReminderSettings {

reminderTimexpiry
batchReminders: boolean;
}

const DEFAULT_REMINDER_TIMES = [24, 72];nd 3 days

```

odels



script
interface Lis{
  // ... existing f

  ng
  expiry_date: Date;
  best_before_date?:;
  urgency_level: UrgencyLeel;

  // Reminder tracking
  reminder_24h_sent: boolean;
  reminder_3d_sent: b

 g
  er;


chive
  archived: blean;
  archived_at?: Date;
  archived_reason';
}

interface ExpiryExtension {
  extended_at: Date;
  old_expiry: Date;

  e
}
```

## Correctness Properties

\*A property is a characteristic or beh

### Property 1: Urgency level c

).
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 2: Expiry date validation

**Validates: Requirements 1.2**

### Property 3: Auto-archive timing

**Validates: Requirements 5.1**

### Property 4: Reminder deliveing

re expiry.
**Validates: Requirements 3.1, 3.2**

### Property 5: Expiry filter accuracy

ame.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Extension validation

.
**Validates: Requirements 7.2**

### Property 7: Days until expilay

.
**Validates: Requirements 6.1, 6.2, 6.3,.4**

### Property 8: Archived listing visy

y.
**Validates: Requirements 5.3**

### Property 9: Batch reminder g

ification.
**Validates: Requirements 3.5**

### Property 10: Expiry statist

**Validates: Requ, 9.3**

## Error Handling

### Validatio Errors

```typescript
enum ExpiryErrorType {
  PAST_DATE = 'past_date',
  INVALID_DATE = 'invalid_date',
 ',

}

// Validate expiry date
fun
  ) {
    return {
      valid: false,


        message: 'Expiry he past',
   },
   };
 }
  return { valid: true };

```

## Testing Strategy

### Unit Tests

1. **Urgency Calculation**
   - Test each urgency level old
     c.)
   - Test timezone han

2. **Date Validation**
   - Test past date rejection

   - Test invalid date formats

3. **Extension Logic**
   - Test extension count incnt
   - Test extension history tracking

d Tests

```typescript


describe('Expiry Tracking Properties', () => {
  it('Property
    fc.assert(
      fc.property(
        fc.date({ min: ne,
        (expiryDate) => {
          const urgency = calculateUrgency(expiryDate);
          ;

          if (hoursUntil < 24) {
            return urgency === UrgencyL
          } else if (hoursUntil < 72) {
            return urgency === UrgencyLeel.HIGH;
          } else if (hoursUntil < 168) {
            return
          } else {
           .LOW;
          }

      ),

    );
  });

{
    fc.assert(
ty(
        fc.date(),
e) => {
          cone(date);
          const isPast = isBefore(date, new D));

          return isPast ? !result.valid : result.valid;
      }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Background Jobs

##(Hourly)

```typescript
// Supabase Edge Ftion
export async funs() {
  const now = new Date();
  const in24Hours = addHours(now, 24);
  const in3Days = addDays(now, 3);

  der
  const { data: lisabase
    .from('posts')
    .select('*')
    .lte('expiry_d)
    .eq('reminder_24
    .eq('active', true);

  /

    await sendExpiryReminder(listing, '24h'
    await supabase
      .from('posts)
      .update({
      .eq('id', listing
  }

  // Similar logic for 3-day remins
  // ...

  // Auto-archive exings
  const { data:e
    .from('posts')
    .select('*')
    .lt('expiry_date', now)
    .eq(;

  fo{
    await archiveListing(listing.id, 'expi
  }
}
```

## Peon

###

```sql

CREATE
WHERE active = true;

-- Index for remindes
CREATE INDEX idx_posts_remin
WHER

-- Index for urgency filtering
CREATE INDEX idx_posts_urgency ON posts (urgency_level, expiry_dae)
WHER= true;
```

###

- Cache urgency calculation
  es
- Invalidate cache odate

## APIints

### Extend Expiry

ipt
// POST /api/listings/:id/exte
interface ExtendExpiryRequest {
newE
}

interface ExtendExpiryResponse {
success: boo
lisListing;
er;
}

tics

script
// GET /api/us
interface ExpiryStatsResponse {
activeByUrgency: Record<Urgenmber>;
expiredBeforePickup:

// hours
trends: {
month: string;
expired: number;
picked: number;
;
}

rations

1. **Date Validation**: Server-sid dates
2. **Extension Limits**: Limit vent abuse
3. \*\*Reminder Rate Limitng
4. \**Archive Permissions*e

## Accessibility

1. **Color + Icon**: Urgency uses both color and i
   2ng
2. le

## Future Enhancements

1. **Smart Expiry Prediction**: ML-based expiry suggestions
2. **Expiry Alerts**: SMS/push for critical expiry
3. **Donation Integration**: Auto-suggest donation before expiry
   s
