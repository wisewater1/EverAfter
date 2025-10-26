# EverAfter AI - Quick Access Guide

## New Features Access

### 1. Legacy Vault
**URL:** `/legacy-vault`

**Sections:**
- **Continuity Plans:** Create time capsules, memorial pages, digital will, scheduled messages
- **Legacy Assurance:** Connect with estate planners, insurance, funeral services

**Pricing Tiers:**
- Free: 1 message
- Legacy Plus ($9.99/mo): 10GB storage, 10 messages
- Legacy Eternal ($49/yr): Perpetual hosting, blockchain verification

**Access:** Dashboard → Family → "Open Legacy Vault" button

---

### 2. Cognitive Insights
**Location:** Dashboard → Insights tab

**Free Features:**
- Emotional arc visualization
- Recurring themes detection

**Premium (Insight Pro - $7/mo):**
- Sentiment timeline
- Archetypal mapping
- Dream-word analysis
- Mood correlations
- Relationship patterns

---

### 3. Research Participation
**Location:** Dashboard → Insights tab (top card)

**Features:**
- Opt-in for anonymized data sharing
- Earn $5/month in credits
- Apply credits to any subscription
- Full privacy control

---

## Updated Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/pricing` | Updated pricing with new tiers |
| `/marketplace` | AI personality marketplace |
| `/dashboard` | Main dashboard with new Insights tab |
| `/legacy-vault` | NEW - Legacy Vault interface |
| `/digital-legacy` | Legacy page (backward compatible) |
| `/health-dashboard` | Health monitoring |

---

## Dashboard Navigation

**Updated Tabs:**
1. Saints AI
2. Engrams
3. **Insights** ⭐ NEW
4. Questions
5. Chat
6. Tasks
7. Family (links to Legacy Vault)
8. Health

---

## Subscription Tiers (Updated)

### Individual Tiers
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | St. Raphael, 2 engrams, 365 questions |
| Engram Premium | $14.99/mo | Fast-track, premium categories |
| **Insight Pro** | **$7/mo** | ⭐ **Cognitive analytics** |
| Health Premium | $24.99/mo | Nutrition, telemedicine |
| **Legacy Plus** | **$9.99/mo** | ⭐ **10GB storage, messages** |
| **Legacy Eternal** | **$49/yr** | ⭐ **Perpetual hosting** |

### Bundle
| Ultimate Bundle | $49.99/mo | All features included |

---

## Color Scheme

**Legacy Vault:** Muted gold (`amber-500` → `yellow-600`)
**Insights:** Violet/purple (`violet-500` → `purple-600`)
**Research:** Emerald/teal (`emerald-500` → `teal-600`)

---

## Database Changes

**New Tables:**
- `cognitive_insights`
- `insight_subscriptions`
- `research_consent`
- `research_credits`
- `institutional_partners`
- `dataset_requests`
- `insight_analytics_cache`

**Migration File:** `20251027000000_create_cognitive_insights_system.sql`

---

## Key Components

**New Components:**
- `LegacyVault.tsx` - Full legacy management interface
- `CognitiveInsights.tsx` - Analytics dashboard
- `ResearchParticipation.tsx` - Consent management

**Updated Components:**
- `Dashboard.tsx` - Added Insights tab
- `Pricing.tsx` - New subscription tiers

---

## Testing the Features

### To Test Legacy Vault:
1. Login to dashboard
2. Click "Family" tab
3. Click "Open Legacy Vault" button
4. Switch between "Continuity Plans" and "Legacy Assurance"
5. Create a time capsule or message
6. Try upgrade modal

### To Test Cognitive Insights:
1. Login to dashboard
2. Click "Insights" tab
3. View free emotional arc and themes
4. Try to access premium features (shows upgrade prompt)
5. Test research participation opt-in

### To Test Research Participation:
1. Navigate to Insights tab
2. Find "Research Participation" card at top
3. Click "Opt In" button
4. Expand "Privacy & Data Usage" section
5. Verify credit balance displays

---

## Build Command

```bash
npm run build
```

**Status:** ✅ Build successful (695KB bundle)

---

## Future Enhancements

1. AI-powered insight generation
2. Blockchain timestamp integration
3. Partner API portal
4. Memorial compilation generator
5. Mobile app with push notifications
6. Admin analytics dashboard

