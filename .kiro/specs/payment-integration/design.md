# Design Document

## Overview

Payment Integration enables voluntary donations, premium subscriptions, and secure payment processing through Stripe while maintaining the free core food-sharing mission.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Stripe       │  │ Payment Form │  │ Subscription │      │
│  │ Elements     │  │              │  │ Manager      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Stripe API                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Payment Processing                                  │   │
│  │  - Tokenization                                      │   │
│  │  - Charge creation                                   │   │
│  │  - Subscription management                           │   │
│  │  - Payout processing                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  transactions table                                  │   │
│  │  subscriptions table                                 │   │
│  │  payment_methods table (tokenized)                   │   │
│  │  payouts table                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

```typescript
interface Transaction {
  id: string;
  type: "tip" | "donation" | "subscription";
  amount: number;
  currency: string;
  from_user_id: string;
  to_user_id?: string; // null for platform donations
  stripe_payment_intent_id: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  platform_fee: number;
  processing_fee: number;
  net_amount: number;
  created_at: Date;
}

interface Subscription {
  id: string;
  user_id: string;
  tier: "basic" | "pro" | "supporter";
  stripe_subscription_id: string;
  status: "active" | "cancelled" | "past_due";
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
}

interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string; // Tokenized
  type: "card" | "apple_pay" | "google_pay" | "paypal";
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

interface Payout {
  id: string;
  user_id: string;
  amount: number;
  stripe_payout_id: string;
  status: "pending" | "in_transit" | "paid" | "failed";
  arrival_date: Date;
  created_at: Date;
}
```

## Correctness Properties

### Property 1: Fee calculation accuracy

_For any_ transaction, the net amount should equal the gross amount minus platform fee and processing fee.
**Validates: Requirements 1.5**

### Property 2: Payment method security

_For any_ stored payment method, no raw card numbers should be stored in the database.
**Validates: Requirements 4.2, 9.2**

### Property 3: Refund window enforcement

_For any_ refund request, it should only be allowed within 48 hours of the original transaction.
**Validates: Requirements 6.1**

### Property 4: Subscription cancellation timing

_For any_ cancelled subscription, access should be maintained until the end of the current billing period.
**Validates: Requirements 2.4**

### Property 5: Payout minimum enforcement

_For any_ payout request, the user's balance should be at least $10.
**Validates: Requirements 3.2**

## Testing Strategy

Property-based tests for fee calculations, refund logic, and subscription management. Integration tests with Stripe test mode.

## API Endpoints

```typescript
// POST /api/payments/tip
// POST /api/payments/donate
// POST /api/subscriptions/create
// POST /api/subscriptions/cancel
// POST /api/payouts/request
// GET /api/transactions/history
// POST /api/payment-methods/add
// DELETE /api/payment-methods/:id
```

## Security Considerations

1. **PCI Compliance**: Use Stripe Elements, never handle raw card data
2. **Tokenization**: All payment methods tokenized by Stripe
3. **HTTPS Only**: All payment endpoints require HTTPS
4. **Fraud Detection**: Stripe Radar for fraud prevention
5. **Audit Logging**: Log all payment actions with timestamps

## Subscription Tiers

```typescript
const SUBSCRIPTION_TIERS = {
  basic: {
    price: 0,
    features: ["core_features"],
  },
  pro: {
    price: 4.99,
    features: ["core_features", "advanced_filters", "priority_listings", "analytics"],
  },
  supporter: {
    price: 9.99,
    features: [
      "core_features",
      "advanced_filters",
      "priority_listings",
      "analytics",
      "supporter_badge",
    ],
  },
};
```
