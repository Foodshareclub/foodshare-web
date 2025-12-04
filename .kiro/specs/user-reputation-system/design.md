# Design Document

## Overview

The User Reputation System builds trust through ratings, reviews, badges, and verified status. Users earn reputation scores (0-100) based on completed transactions, reviews, and community contributions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Profile Card │  │ Review Form  │  │ Badge Display│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Reputation Engine                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Score Calculation (Edge Function)                   │   │
│  │  - Review scores (40%)                               │   │
│  │  - Completion rate (30%)                             │   │
│  │  - Response time (20%)                               │   │
│  │  - Verified status (10%)                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

```typescript
interface UserReputation {
  user_id: string;
  reputation_score: number; // 0-100
  trust_level: TrustLevel;
  total_reviews: number;
  average_rating: number;
  completion_rate: number;
  response_rate: number;
  response_time_avg: number; // minutes
  verified: boolean;
  badges: Badge[];
}

enum TrustLevel {
  NEW = "new", // < 5 transactions
  BRONZE = "bronze", // 50-69 score
  SILVER = "silver", // 70-84 score
  GOLD = "gold", // 85-94 score
  PLATINUM = "platinum", // 95-100 score
}

interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1-5
  punctuality?: number;
  communication?: number;
  courtesy?: number;
  comment?: string;
  response?: string;
  created_at: Date;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: Date;
  criteria: BadgeCriteria;
}
```

## Correctness Properties

### Property 1: Review uniqueness

_For any_ booking, each party can submit exactly one review.
**Validates: Requirements 1.4**

### Property 2: Reputation score bounds

_For any_ user, the reputation score should always be between 0 and 100.
**Validates: Requirements 3.1, 3.2**

### Property 3: Trust level consistency

_For any_ reputation score, the assigned trust level should match the defined thresholds.
**Validates: Requirements 3.3**

### Property 4: Badge criteria validation

_For any_ awarded badge, the user should meet all specified criteria.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: Review response uniqueness

_For any_ review, the reviewee can post exactly one response.
**Validates: Requirements 9.1, 9.2**

## Testing Strategy

Property-based tests for score calculation, badge awarding, and review validation.
