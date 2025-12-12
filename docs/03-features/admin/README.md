# Admin CRM System

Comprehensive admin dashboard for managing the FoodShare platform.

## Documentation

- [Listings Management](#-interface-overview) - Bulk operations, filtering, moderation
- [User Management](./USER_MANAGEMENT.md) - User roles, search, statistics
- [AI Moderation](./AI_MODERATION.md) - Automated content moderation

## Navigation

### AdminSidebar (`src/components/admin/AdminSidebar.tsx`)

Persistent sidebar navigation for all admin pages with grouped navigation structure. Features:

- **Grouped navigation**: Routes organized by category (Overview, Content, CRM, Email Marketing)
- **Collapsible**: Toggle between expanded (256px) and collapsed (64px) states
- **Active state**: Highlights current route
- **i18n support**: All labels use `next-intl` translations
- **ScrollArea**: Scrollable content for many nav items

#### Navigation Groups

| Group               | Route                     | Label Key     | Icon            |
| ------------------- | ------------------------- | ------------- | --------------- |
| **Overview**        | `/admin`                  | `dashboard`   | LayoutDashboard |
|                     | `/admin/ai-insights`      | `ai_insights` | Sparkles        |
| **Content**         | `/admin/listings`         | `listings`    | ClipboardList   |
|                     | `/admin/reports`          | `reports`     | BarChart3       |
| **CRM**             | `/admin/crm`              | `customers`   | UserCircle      |
|                     | `/admin/users`            | `users`       | Users           |
| **Email Marketing** | `/admin/email`            | `email_crm`   | Mail            |
|                     | `/admin/email/campaigns`  | `campaigns`   | Send            |
|                     | `/admin/email/automation` | `automation`  | Workflow        |
|                     | `/admin/email/audience`   | `audience`    | Target          |

```
┌──────────────────┐
│ Admin    [<]     │  ← Collapse toggle
├──────────────────┤
│ OVERVIEW         │  ← Group label
│ 📊 Dashboard     │
│ ✨ AI Insights   │
│──────────────────│
│ CONTENT          │
│ 📋 Listings      │  ← Active state highlighted
│ 📈 Reports       │
│──────────────────│
│ CRM              │
│ 👤 Customers     │
│ 👥 Users         │
│──────────────────│
│ EMAIL MARKETING  │
│ ✉️ Email CRM     │
│ 📤 Campaigns     │
│ ⚡ Automation    │
│ 🎯 Audience      │
├──────────────────┤
│ ⚙️ Settings      │
└──────────────────┘
```

## CRM Data Layer

### Server Actions (`src/app/actions/crm.ts`)

Mutations for customer relationship management:

| Action                                     | Description                              |
| ------------------------------------------ | ---------------------------------------- |
| `importProfilesAsCRMCustomers()`           | Import profiles as CRM customers         |
| `updateCustomerLifecycle(id, stage)`       | Update lifecycle stage (lead → champion) |
| `updateEngagementScore(id, score)`         | Update engagement score (0-100)          |
| `archiveCustomer(id, reason?)`             | Archive a customer                       |
| `addCustomerNote(id, content, type)`       | Add admin note to customer               |
| `assignTagToCustomer(customerId, tagId)`   | Assign tag to customer                   |
| `removeTagFromCustomer(customerId, tagId)` | Remove tag from customer                 |
| `createTag(name, color, description?)`     | Create new customer tag                  |

### Data Functions (`src/lib/data/crm.ts`)

Server-side data fetching with caching:

| Function                          | Description                                         |
| --------------------------------- | --------------------------------------------------- |
| `getCRMCustomers(filters?)`       | Fetch customers with profile data                   |
| `getCRMCustomersCached(filters?)` | Cached version                                      |
| `getCustomerSummary(id)`          | Get single customer summary                         |
| `getCustomerNotes(customerId)`    | Fetch customer notes                                |
| `getCustomerTags()`               | Fetch all tags                                      |
| `getCRMDashboardStats()`          | Dashboard statistics                                |
| `getAdminCustomers(limit?)`       | Lightweight customer list for admin dashboard       |
| `getAdminCustomersCached(limit?)` | Cached version                                      |
| `getAdminCRMStats()`              | Admin dashboard stats (total, active, at-risk, new) |
| `getAdminCRMStatsCached()`        | Cached version                                      |

### Types (`src/types/crm.types.ts`)

Key types: `CRMCustomer`, `CRMCustomerWithProfile`, `CRMCustomerNote`, `CRMCustomerTag`, `LifecycleStage`, `CustomerType`

### Admin Dashboard Types (`src/lib/data/crm.ts`)

| Type            | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `AdminCustomer` | Lightweight customer with profile (id, status, scores, name)                    |
| `AdminCRMStats` | Dashboard stats (totalCustomers, activeCustomers, atRiskCustomers, newThisWeek) |

---

## Newsletter Data Layer (`src/lib/data/newsletter.ts`)

Server-side data fetching for email marketing and campaigns.

### Types

| Type              | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `Campaign`        | Newsletter campaign (id, name, subject, status, metrics)   |
| `Segment`         | Audience segment (id, name, criteria, cached_count, color) |
| `AutomationFlow`  | Email automation workflow (id, name, trigger_type, status) |
| `NewsletterStats` | Aggregate stats (totalCampaigns, avgOpenRate, subscribers) |

### Data Functions

| Function                       | Description                                  |
| ------------------------------ | -------------------------------------------- |
| `getCampaigns(limit?)`         | Fetch newsletter campaigns (default: 20)     |
| `getCampaignById(id)`          | Get single campaign by ID                    |
| `getSegments()`                | Fetch all audience segments                  |
| `calculateSegmentCount(id)`    | Calculate segment member count from criteria |
| `getAutomationFlows()`         | Fetch email automation workflows             |
| `getNewsletterStats()`         | Aggregate newsletter statistics              |
| `getSubscriberCount()`         | Count active newsletter subscribers          |
| `getRecentSubscribers(limit?)` | Fetch recent subscribers (default: 10)       |

### Database Tables

| Table                    | Description                     |
| ------------------------ | ------------------------------- |
| `newsletter_campaigns`   | Email campaigns with metrics    |
| `audience_segments`      | Customer segmentation rules     |
| `email_automation_flows` | Automation workflow definitions |
| `newsletter_subscribers` | Subscriber list with status     |

### Campaign Server Actions (`src/app/actions/campaigns.ts`)

Server actions for newsletter campaign CRUD operations with admin access verification.

| Action                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `createCampaign(input)` | Create new campaign (draft or scheduled)      |
| `updateCampaign(input)` | Update existing campaign fields               |
| `deleteCampaign(id)`    | Delete campaign (blocks if currently sending) |
| `duplicateCampaign(id)` | Clone campaign as new draft                   |
| `pauseCampaign(id)`     | Pause sending/scheduled campaign              |
| `resumeCampaign(id)`    | Resume paused campaign                        |

#### Types

```typescript
interface CreateCampaignInput {
  name: string; // Required
  subject: string; // Required
  content: string;
  campaignType?: string; // Default: 'newsletter'
  segmentId?: string;
  scheduledAt?: string; // ISO date - sets status to 'scheduled'
}

interface UpdateCampaignInput {
  id: string; // Required
  name?: string;
  subject?: string;
  content?: string;
  campaignType?: string;
  segmentId?: string;
  scheduledAt?: string;
}

interface CampaignResult {
  id: string;
  name: string;
  status: string;
}
```

#### Usage Example

```typescript
import { createCampaign, duplicateCampaign, pauseCampaign } from "@/app/actions/campaigns";

// Create a new draft campaign
const result = await createCampaign({
  name: "Weekly Newsletter",
  subject: "This Week in FoodShare",
  content: "<h1>Hello!</h1>...",
});

if (result.success) {
  console.log("Created campaign:", result.data.id);
}

// Duplicate an existing campaign
const copy = await duplicateCampaign(campaignId);

// Pause a running campaign
await pauseCampaign(campaignId);
```

---

## CRM Dashboard (`src/components/admin/crm/CRMDashboard.tsx`)

Modern CRM dashboard with fixed layout and scrollable content areas, now integrated with newsletter/email marketing data.

### Views

| View         | Description                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `overview`   | Metrics, segments, campaigns, automations at-a-glance                                                                             |
| `customers`  | Customer list with search and lifecycle filtering                                                                                 |
| `segments`   | Predefined audience segments (New Users 7d, Champions, At Risk, Donors, Receivers, Inactive 30d+) with custom tags management     |
| `engagement` | Engagement analytics with avg scores, churn risk, interactions, LTV, top champions leaderboard, and engagement distribution chart |
| `campaigns`  | Full-featured campaign management (see CampaignsClient below)                                                                     |
| `automation` | Workflow automations with enrollment and conversion metrics                                                                       |

### Components

| Component             | Description                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| `MetricCard`          | Displays KPI with value, change %, and color-coded icon                   |
| `LifecycleBadge`      | Customer lifecycle stage badge (lead, active, champion, at_risk, churned) |
| `ChurnRiskBadge`      | Visual badge for churn risk score with color coding                       |
| `EngagementScore`     | Visual progress bar for engagement score (0-100)                          |
| `CustomerRow`         | Customer list item with avatar, lifecycle, engagement, churn risk         |
| `SegmentCard`         | Quick segment card with count, description, and color-coded icon          |
| `CampaignCard`        | Campaign card with status, sent/opened/clicked metrics                    |
| `AutomationCard`      | Automation workflow card with trigger, status, enrollment, conversion     |
| `SegmentsTab`         | Audience segmentation view with predefined segments and custom tags       |
| `EngagementTab`       | Engagement analytics with metrics, top champions, and distribution chart  |
| `CustomerDetailModal` | Detailed customer view modal with stats, tags, and quick actions          |

### Features

- **Sticky header** with tab navigation (Overview, Customers, Segments, Engagement, Campaigns, Automation)
- **Profile sync** - Import profiles as CRM customers via Server Action
- **Customer filtering** - Search by name/email, filter by lifecycle stage
- **Scrollable content** - Fixed layout with ScrollArea for content
- **Animated transitions** - Framer Motion for view switching and notifications
- **Newsletter integration** - Campaigns, segments, automations, and stats from newsletter data layer
- **Audience segments** - Predefined segments (New Users, Champions, At Risk, Donors, Receivers, Inactive) with custom tags
- **Engagement analytics** - Metrics dashboard with engagement distribution visualization and top champions leaderboard
- **Customer detail modal** - Quick view of customer stats, lifecycle, tags, and action buttons (Send Email, Add Note)

### Props

| Prop              | Type               | Required | Description                     |
| ----------------- | ------------------ | -------- | ------------------------------- |
| `customers`       | `Customer[]`       | Yes      | CRM customer list               |
| `tags`            | `Tag[]`            | Yes      | Customer tags                   |
| `stats`           | `CRMStats`         | Yes      | CRM dashboard statistics        |
| `campaigns`       | `Campaign[]`       | No       | Newsletter campaigns            |
| `segments`        | `Segment[]`        | No       | Audience segments               |
| `automations`     | `AutomationFlow[]` | No       | Email automation workflows      |
| `newsletterStats` | `NewsletterStats`  | No       | Newsletter aggregate statistics |

### Usage

```tsx
import { CRMDashboard } from "@/components/admin/crm/CRMDashboard";
import {
  getCustomerTagsCached,
  getAdminCustomersCached,
  getAdminCRMStatsCached,
} from "@/lib/data/crm";
import {
  getCampaigns,
  getSegments,
  getAutomationFlows,
  getNewsletterStats,
} from "@/lib/data/newsletter";

// Server Component fetches data in parallel
const [tags, customers, crmStats, campaigns, segments, automations, newsletterStats] =
  await Promise.all([
    getCustomerTagsCached(),
    getAdminCustomersCached(100),
    getAdminCRMStatsCached(),
    getCampaigns(10),
    getSegments(),
    getAutomationFlows(),
    getNewsletterStats(),
  ]);

<CRMDashboard
  customers={customers}
  tags={tags}
  stats={crmStats}
  campaigns={campaigns}
  segments={segments}
  automations={automations}
  newsletterStats={newsletterStats}
/>;
```

---

# Listings Management Visual Guide

A visual walkthrough of the enhanced admin listings management interface.

---

## 🎨 Interface Overview

### Main Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Enhanced Listings Management              [Refresh] [Export]│
│  Bulk operations, inline editing, and advanced filtering     │
├─────────────────────────────────────────────────────────────┤
│  [Total: 150] [Pending: 25] [Approved: 100] [Flagged: 5]   │
├─────────────────────────────────────────────────────────────┤
│  Filters                                    [Show Advanced]  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search...  [All Categories ▼]  [Reset All]       │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ☐ │ Image │ Title        │ Category │ Status  │ Actions  │
│  ├──┼───────┼──────────────┼──────────┼─────────┼──────────┤
│  ☐ │ [img] │ Fresh Apples │ Food     │ PENDING │ [⋮]      │
│  ☑ │ [img] │ Bread Loaves │ Food     │ PENDING │ [⋮]      │
│  ☑ │ [img] │ Vegetables   │ Food     │ PENDING │ [⋮]      │
└─────────────────────────────────────────────────────────────┘
                              ┌──────────────────────────────┐
                              │ 2 selected                   │
                              │ [✓ Approve] [✗ Reject]      │
                              │ [⚑ Flag] [🗑 Delete] [Clear]│
                              └──────────────────────────────┘
```

---

## 🎯 Key UI Elements

### 1. Status Filter Badges

```
┌──────────────────────────────────────────────────────────┐
│ [Total: 150]  [Pending: 25]  [Approved: 100]  [Flagged: 5]│
│  ↑ Click to filter                                        │
└──────────────────────────────────────────────────────────┘
```

**Features**:

- One-click filtering
- Live counts
- Active state highlighting
- Color-coded (orange, green, purple)

### 2. Search & Filters Panel

```
┌──────────────────────────────────────────────────────────┐
│ Filters                              [Hide Advanced ▲]   │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 🔍 Search by title, description, or ID...          │  │
│ │ [All Categories ▼]  [Reset All]                    │  │
│ └────────────────────────────────────────────────────┘  │
│ ┌─ Advanced Filters ─────────────────────────────────┐  │
│ │ Date Range:  [From: ____] [To: ____]              │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Features**:

- Real-time search (debounced 300ms)
- Category dropdown
- Date range picker
- Collapsible advanced section
- Reset all button

### 3. Data Table with Selection

```
┌──────────────────────────────────────────────────────────┐
│ ☑ │ Image │ Title          │ Category │ Status  │ Actions│
├───┼───────┼────────────────┼──────────┼─────────┼────────┤
│ ☐ │ [🖼️] │ Fresh Apples   │ Food     │ PENDING │ [⋮]   │
│   │       │ Organic, local │          │         │        │
├───┼───────┼────────────────┼──────────┼─────────┼────────┤
│ ☑ │ [🖼️] │ Bread Loaves   │ Food     │ PENDING │ [⋮]   │
│   │       │ Whole wheat    │          │         │        │
├───┼───────┼────────────────┼──────────┼─────────┼────────┤
│ ☑ │ [🖼️] │ Vegetables     │ Food     │ APPROVED│ [⋮]   │
│   │       │ Mixed veggies  │          │         │        │
└──────────────────────────────────────────────────────────┘
```

**Features**:

- Checkbox selection
- Thumbnail images (lazy loaded)
- Status badges (color-coded)
- Action dropdown per row
- Hover effects
- Selected row highlighting

### 4. Bulk Action Bar (Floating)

```
                    ┌────────────────────────────────┐
                    │ 2 selected                     │
                    │ ─────────────────────────────  │
                    │ [✓ Approve] [✗ Reject]        │
                    │ [⚑ Flag] [🗑 Delete] │ [Clear]│
                    └────────────────────────────────┘
                              ↑
                    Fixed at bottom of screen
                    Slides in when items selected
```

**Features**:

- Fixed bottom positioning
- Slide-in animation
- Action buttons with icons
- Selection count
- Clear button
- Auto-hides when empty

### 5. Action Dropdown Menu

```
┌─────────────────┐
│ ✏️  Edit        │
│ ✓  Approve      │
│ ✗  Reject       │
│ ⚑  Flag         │
│ ─────────────── │
│ 🗑  Delete      │
└─────────────────┘
```

**Features**:

- Per-row actions
- Icon + label
- Color-coded (green, red, purple)
- Destructive actions separated
- Keyboard accessible

### 6. Export Dropdown

```
┌─────────────────┐
│ Export          │
├─────────────────┤
│ 📄 Export as CSV│
│ 📋 Export as JSON│
└─────────────────┘
```

**Features**:

- Multiple formats
- Exports filtered data
- Auto-named files
- Client-side generation

---

## 🎨 Color Scheme

### Status Colors

```
APPROVED  → 🟢 Green   (#10B981)
PENDING   → 🟠 Orange  (#F59E0B)
REJECTED  → 🔴 Red     (#EF4444)
FLAGGED   → 🟣 Purple  (#8B5CF6)
```

### UI Colors

```
Primary   → Green     (#10B981)
Secondary → Gray      (#6B7280)
Border    → Light Gray(#E5E7EB)
Hover     → Gray 50   (#F9FAFB)
Selected  → Blue 50   (#EFF6FF)
```

---

## 🔄 User Workflows

### Workflow 1: Bulk Approve Pending Listings

```
1. Click [Pending: 25] badge
   ↓
2. Review filtered listings
   ↓
3. Click checkbox header (select all)
   ↓
4. Bulk action bar appears
   ↓
5. Click [✓ Approve]
   ↓
6. Success! 25 listings approved
```

### Workflow 2: Search and Export

```
1. Type "bread" in search box
   ↓ (300ms debounce)
2. Results filter in real-time
   ↓
3. Click [Export ▼]
   ↓
4. Select "Export as CSV"
   ↓
5. File downloads: listings-export-2024-11-30.csv
```

### Workflow 3: Flag Suspicious Listing

```
1. Find listing in table
   ↓
2. Click [⋮] action menu
   ↓
3. Select [⚑ Flag]
   ↓
4. Enter reason in prompt
   ↓
5. Listing flagged for review
```

---

## 📱 Responsive Design

### Desktop (>1024px)

```
┌─────────────────────────────────────────────────────┐
│ Full table with all columns                         │
│ Filters in single row                               │
│ Action buttons visible                              │
└─────────────────────────────────────────────────────┘
```

### Tablet (768px - 1024px)

```
┌──────────────────────────────────┐
│ Table scrolls horizontally       │
│ Filters stack in 2 columns       │
│ Action menus compact             │
└──────────────────────────────────┘
```

### Mobile (<768px)

```
┌─────────────────────┐
│ Card-based layout   │
│ Filters stack       │
│ Bottom sheet actions│
└─────────────────────┘
```

---

## ⌨️ Keyboard Shortcuts (Future)

```
Ctrl/Cmd + A  → Select all
Ctrl/Cmd + D  → Deselect all
Ctrl/Cmd + E  → Export
Ctrl/Cmd + F  → Focus search
Ctrl/Cmd + R  → Refresh
Enter         → Open detail
Escape        → Close modal/clear
↑/↓           → Navigate rows
Space         → Toggle selection
```

---

## 🎭 Animation Details

### Slide-in Animation (Bulk Action Bar)

```css
@keyframes slideInFromBottom {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.bulk-action-bar {
  animation: slideInFromBottom 0.3s ease-out;
}
```

### Hover Effects

```css
.table-row:hover {
  background-color: #f9fafb;
  transition: background-color 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}
```

### Loading States

```css
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

---

## 🎯 Interaction States

### Button States

```
Default  → Gray border, white background
Hover    → Darker border, slight shadow
Active   → Pressed effect (translateY)
Disabled → Gray text, no interaction
Loading  → Spinner, disabled
```

### Checkbox States

```
Unchecked → Empty square
Checked   → Blue checkmark
Indeterminate → Blue dash (some selected)
Disabled  → Gray, no interaction
```

### Status Badge States

```
APPROVED → Green background, green text
PENDING  → Orange background, orange text
REJECTED → Red background, red text
FLAGGED  → Purple background, purple text
```

---

## 📊 Visual Hierarchy

### Priority Levels

```
1. Bulk Action Bar (highest - fixed position)
2. Status Filter Badges (high - prominent)
3. Search & Filters (medium - collapsible)
4. Data Table (medium - main content)
5. Pagination (low - bottom)
```

### Typography Scale

```
Page Title:    text-2xl (24px) font-bold
Section Title: text-lg (18px) font-bold
Table Header:  text-sm (14px) font-medium
Table Cell:    text-sm (14px) font-normal
Badge:         text-xs (12px) font-medium
```

---

## ✨ Polish Details

### Micro-interactions

- ✅ Smooth hover transitions (200ms)
- ✅ Button press feedback
- ✅ Checkbox animation
- ✅ Badge color transitions
- ✅ Loading spinner

### Visual Feedback

- ✅ Selected row highlighting
- ✅ Hover effects on all interactive elements
- ✅ Loading states during operations
- ✅ Success/error messages
- ✅ Empty state illustrations

### Accessibility

- ✅ ARIA labels on all buttons
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Color contrast (WCAG AA)

---

## 🎨 Design System Tokens

### Spacing

```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
```

### Border Radius

```
sm: 4px
md: 8px
lg: 12px
full: 9999px
```

### Shadows

```
sm:  0 1px 2px rgba(0,0,0,0.05)
md:  0 4px 6px rgba(0,0,0,0.1)
lg:  0 10px 15px rgba(0,0,0,0.1)
xl:  0 20px 25px rgba(0,0,0,0.1)
```

---

This visual guide demonstrates the comprehensive UI/UX improvements in the enhanced admin CRM system, focusing on usability, efficiency, and visual polish.
