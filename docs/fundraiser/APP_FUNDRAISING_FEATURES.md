# Foodshare App Fundraising Features Roadmap

## In-App Features to Support Fundraising Goals

**Document Version:** 1.0
**Created:** December 25, 2025

---

## Current State Analysis

### What Exists

| Feature | Location | Status |
|---------|----------|--------|
| Donation View | `Features/Donation/` | Ko-Fi external link only |
| Impact Stats | `ImpactStat.swift` | Static hardcoded data |
| StoreKit Subscriptions | `Core/Services/StoreKitService.swift` | Implemented (not for donations) |
| FoodItem donation fields | `FoodItem.swift` | Exists but unused in UI |

### Current Donation Flow

```
User → Settings → Donation → Ko-Fi (external Safari) → Payment → No tracking
```

### Gaps

- No in-app payment processing
- No donation tracking
- No fundraising campaigns
- No GoFundMe integration
- No impact attribution
- Unused `FoodItem.donation` fields

---

## Proposed Features

### Phase 1: Quick Wins (1-2 Sprints)

#### 1.1 Display Fundraising Info on Listings

**What:** Show `donation` and `donationRules` fields on fridge/foodbank detail views

**Files to Modify:**
- `Features/Listing/Presentation/Views/ListingDetailView.swift`
- `Features/Map/Presentation/Views/FridgeDetailView.swift`

**Implementation:**
```swift
// In ListingDetailView.swift
if let donationInfo = listing.donation {
    GlassCard {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Label("Support This Location", systemImage: "heart.fill")
                .font(.DesignSystem.headlineSmall)
            Text(donationInfo)
                .font(.DesignSystem.bodyMedium)
            if let rules = listing.donationRules {
                Text(rules)
                    .font(.DesignSystem.caption)
                    .foregroundStyle(Color.DesignSystem.textSecondary)
            }
        }
    }
}
```

#### 1.2 Make Donation URL Configurable

**What:** Move Ko-Fi URL to Supabase remote config

**Files to Modify:**
- `Features/Donation/Presentation/Views/DonationView.swift`
- Add Supabase `app_config` table query

**Current:**
```swift
let donationURL = URL(string: "https://ko-fi.com/organicnz")!
```

**Proposed:**
```swift
// From Supabase app_config table
@Published var donationURL: URL?
@Published var donationPlatform: String = "Ko-Fi"
@Published var fundraisingGoal: Double?
@Published var fundraisingProgress: Double?
```

#### 1.3 Add GoFundMe Deep Link

**What:** Add GoFundMe campaign link alongside Ko-Fi

**UI Addition:**
```swift
VStack(spacing: Spacing.md) {
    GlassButton("Donate via Ko-Fi", icon: "cup.and.saucer.fill", style: .secondary) {
        // Ko-Fi external link
    }

    GlassButton("Support Our Nonprofit Goal", icon: "heart.circle.fill", style: .primary) {
        // GoFundMe campaign link
    }

    Text("Help us raise $500 to become an official 501(c)(3)")
        .font(.DesignSystem.caption)
}
```

### Phase 2: Fundraising Dashboard (2-3 Sprints)

#### 2.1 Fundraising Progress View

**New View:** `FundraisingProgressView.swift`

```swift
struct FundraisingProgressView: View {
    let goal: Double
    let raised: Double
    let donors: Int
    let daysLeft: Int

    var progress: Double { raised / goal }

    var body: some View {
        GlassCard {
            VStack(spacing: Spacing.md) {
                // Progress ring
                ZStack {
                    Circle()
                        .stroke(Color.DesignSystem.glassBackground, lineWidth: 12)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(Color.DesignSystem.primary, lineWidth: 12)
                        .rotationEffect(.degrees(-90))
                    VStack {
                        Text("$\(Int(raised))")
                            .font(.DesignSystem.displayMedium)
                        Text("of $\(Int(goal))")
                            .font(.DesignSystem.caption)
                    }
                }
                .frame(width: 120, height: 120)

                // Stats row
                HStack(spacing: Spacing.xl) {
                    StatItem(value: "\(donors)", label: "Donors")
                    StatItem(value: "\(Int(progress * 100))%", label: "Funded")
                    StatItem(value: "\(daysLeft)", label: "Days Left")
                }

                // CTA
                GlassButton("Donate Now", style: .primary) {
                    // Open donation flow
                }
            }
        }
    }
}
```

#### 2.2 Supabase Schema for Fundraising

**New Table:** `fundraising_campaigns`

```sql
CREATE TABLE fundraising_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    goal_amount DECIMAL(10,2) NOT NULL,
    raised_amount DECIMAL(10,2) DEFAULT 0,
    donor_count INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    campaign_url TEXT,
    platform TEXT DEFAULT 'gofundme',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE fundraising_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active campaigns" ON fundraising_campaigns
    FOR SELECT USING (is_active = true);
```

**New Table:** `donations`

```sql
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES fundraising_campaigns(id),
    donor_name TEXT,
    amount DECIMAL(10,2) NOT NULL,
    platform TEXT NOT NULL,
    external_id TEXT,
    donated_at TIMESTAMPTZ DEFAULT NOW(),
    is_anonymous BOOLEAN DEFAULT false
);
```

#### 2.3 Admin Donation Entry

**Edge Function:** `update-fundraising`

```typescript
// supabase/functions/update-fundraising/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
    const { campaign_id, amount, donor_count } = await req.json()

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Update campaign totals
    const { data, error } = await supabase
        .from('fundraising_campaigns')
        .update({
            raised_amount: amount,
            donor_count: donor_count,
            updated_at: new Date().toISOString()
        })
        .eq('id', campaign_id)

    return new Response(JSON.stringify({ success: !error }))
})
```

### Phase 3: In-App Payments (3-4 Sprints)

#### 3.1 Stripe Integration

**New Service:** `PaymentService.swift`

```swift
import StripePaymentSheet

@MainActor
@Observable
final class PaymentService {
    private var paymentSheet: PaymentSheet?

    func preparePaymentSheet(amount: Int, campaignId: String) async throws {
        // Call Edge Function to create PaymentIntent
        let response = try await supabase.functions
            .invoke("create-payment-intent", options: .init(body: [
                "amount": amount,
                "campaign_id": campaignId
            ]))

        let intent: PaymentIntentResponse = try response.decode()

        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = "Foodshare"
        config.applePay = .init(merchantId: "merchant.foodshare.app", merchantCountryCode: "US")

        paymentSheet = PaymentSheet(
            paymentIntentClientSecret: intent.clientSecret,
            configuration: config
        )
    }

    func presentPayment() async throws -> Bool {
        guard let sheet = paymentSheet else { throw PaymentError.notPrepared }
        let result = await sheet.present(from: /* rootVC */)
        return result == .completed
    }
}
```

#### 3.2 Edge Function for Stripe

```typescript
// supabase/functions/create-payment-intent/index.ts
import Stripe from 'stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
    const { amount, campaign_id } = await req.json()

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // in cents
        currency: 'usd',
        metadata: {
            campaign_id,
            source: 'foodshare_ios'
        }
    })

    return new Response(JSON.stringify({
        clientSecret: paymentIntent.client_secret
    }))
})
```

### Phase 4: Social Fundraising (4+ Sprints)

#### 4.1 Fundraiser Sharing

```swift
struct ShareFundraiserView: View {
    let campaign: FundraisingCampaign

    var body: some View {
        VStack(spacing: Spacing.md) {
            // Preview card
            FundraisingProgressView(campaign: campaign)

            // Share buttons
            HStack(spacing: Spacing.lg) {
                ShareButton(platform: .nextdoor, campaign: campaign)
                ShareButton(platform: .instagram, campaign: campaign)
                ShareButton(platform: .facebook, campaign: campaign)
                ShareButton(platform: .twitter, campaign: campaign)
            }

            // Copy link
            GlassButton("Copy Link", icon: "link", style: .secondary) {
                UIPasteboard.general.string = campaign.shareURL
                HapticManager.shared.notification(type: .success)
            }
        }
    }
}
```

#### 4.2 Impact Dashboard

```swift
struct ImpactDashboardView: View {
    @State private var stats: ImpactStats?

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Personal impact
                GlassCard {
                    VStack {
                        Text("Your Impact")
                            .font(.DesignSystem.headlineLarge)

                        HStack(spacing: Spacing.xl) {
                            ImpactMetric(value: stats?.foodSaved ?? 0, unit: "lbs", label: "Food Saved")
                            ImpactMetric(value: stats?.mealsProvided ?? 0, unit: "", label: "Meals Provided")
                            ImpactMetric(value: stats?.co2Prevented ?? 0, unit: "kg", label: "CO2 Prevented")
                        }
                    }
                }

                // Community fundraising progress
                if let campaign = stats?.activeCampaign {
                    FundraisingProgressView(campaign: campaign)
                }

                // Recent donations
                DonationActivityFeed()
            }
            .padding(Spacing.md)
        }
    }
}
```

---

## Database Schema Summary

### New Tables

| Table | Purpose |
|-------|---------|
| `fundraising_campaigns` | Track fundraising goals and progress |
| `donations` | Log individual donations |
| `app_config` | Remote configuration (URLs, feature flags) |

### Modified Tables

| Table | Changes |
|-------|---------|
| `posts` | Enable `donation` and `donation_rules` display |
| `fridges` | Add optional fundraising campaign reference |

---

## Implementation Priority

### Immediate (Before GoFundMe Launch)

1. Add GoFundMe deep link to DonationView
2. Create `app_config` table with fundraising URLs
3. Display basic fundraising progress (manually updated)

### Short-Term (During Campaign)

1. Fundraising progress widget
2. Social sharing buttons
3. Basic donation tracking

### Medium-Term (Post-501(c)(3))

1. Stripe integration for in-app donations
2. Tax receipt generation
3. Recurring donation support

### Long-Term

1. Peer-to-peer fundraising
2. Team campaigns
3. Donation matching

---

## Files to Create

| File | Location | Purpose |
|------|----------|---------|
| `FundraisingProgressView.swift` | `Features/Donation/Presentation/Views/` | Progress widget |
| `PaymentService.swift` | `Core/Services/` | Stripe integration |
| `FundraisingCampaign.swift` | `Features/Donation/Domain/Models/` | Campaign model |
| `ShareFundraiserView.swift` | `Features/Donation/Presentation/Views/` | Social sharing |
| `ImpactDashboardView.swift` | `Features/Profile/Presentation/Views/` | User impact stats |

---

## Quick Win: GoFundMe Link Addition

To add GoFundMe link before campaign launch, modify `DonationView.swift`:

```swift
// Add after Ko-Fi button
Divider()
    .background(Color.DesignSystem.glassBackground)

VStack(spacing: Spacing.sm) {
    Text("Help Us Become Official")
        .font(.DesignSystem.headlineSmall)

    Text("We're raising $500 to establish Foodshare as a 501(c)(3) nonprofit")
        .font(.DesignSystem.bodyMedium)
        .foregroundStyle(Color.DesignSystem.textSecondary)
        .multilineTextAlignment(.center)

    GlassButton("Support Our GoFundMe", icon: "heart.circle.fill", style: .primary) {
        if let url = URL(string: "https://gofundme.com/foodshare-sacramento") {
            openURL(url)
        }
    }
}
.padding(.top, Spacing.md)
```

---

## Summary

This roadmap transforms Foodshare's donation feature from a simple Ko-Fi link to a comprehensive fundraising platform supporting:

1. **Campaign visibility** within the app
2. **Progress tracking** for donors
3. **Social sharing** to Nextdoor/social media
4. **In-app payments** (Phase 3+)
5. **Impact attribution** for community building

The phased approach allows quick wins before the January 2026 campaign launch while building toward long-term sustainability.

---

*Document prepared for Foodshare iOS development team.*
