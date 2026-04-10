# EmotivX Tier System — Premium Merch with Real-World Perks

**Created:** 2026-03-09  
**Status:** Spec / Not Started  
**Priority:** High (post-launch feature)

---

## Overview

A 5-tier product system where higher tiers unlock real-world experiences and use premium manufacturing (embroidered logos, metal plates, secondary suppliers).

**Goal:** Differentiate merch value beyond just "another hoodie" — turn top-tier purchases into VIP access and collectibles.

---

## The 5 Tiers

| Tier | Price Range | Perks | Manufacturing |
|------|-------------|-------|---------------|
| **Common** | £40-80 | Standard merch, 20% club shop discount | Printful all-over print |
| **Uncommon** | £100-150 | Club shop discount + priority shipping + exclusive colorways | Printful all-over print, premium materials |
| **Rare** | £150-300 | Tunnel pass experience OR meet-and-greet with player | Printful all-over print + embroidered logo |
| **Epic** | £500-1,000 | Match-day VIP box access + signed shirt | Secondary supplier: embroidered logo + metal moment plate (riveted) |
| **Legendary** | £1,500-3,000 | Free season ticket OR lifetime 50% club shop discount | Secondary supplier: premium embroidery + engraved metal plate + certificate of authenticity |

---

## Real-World Perks Library

Each tier unlocks perks. Clubs can customize which perks are available per tier.

### Common
- 20% off club shop (digital voucher, auto-applied)
- Early access to new merch drops

### Uncommon
- 25% off club shop
- Priority shipping (2-3 days)
- Exclusive colorways (club can gate certain art styles to Uncommon+)

### Rare
- **Tunnel pass experience** — walk onto the pitch pre-match, take photos
- **Player meet-and-greet** — 15-minute session with squad member (club schedules)
- VIP lounge access (1 match)

### Epic
- **Match-day VIP box** — 1 match, includes food/drink
- **Signed shirt** — squad-signed home shirt (club provides)
- **Behind-the-scenes tour** — training ground access

### Legendary
- **Free season ticket** — full season (club absorbs cost or gets rev share)
- **Lifetime 50% club shop discount** (digital membership)
- **On-pitch moment recreation** — club arranges for fan to recreate the goal on matchday (halftime or pre-match)
- **Framed original match-worn shirt** (if available)

**Perk fulfillment:** EmotivX coordinates with club admin. Club confirms availability and schedules experiences.

---

## Premium Manufacturing (Epic + Legendary)

### Standard Tiers (Common, Uncommon, Rare)
- **Supplier:** Printful (current)
- **Logo:** All-over print (part of the artwork)
- **Badge:** Printed moment badge (as current)

### Premium Tiers (Epic, Legendary)
- **Supplier:** Secondary (TBD — research embroidery + metal plate specialists)
- **Logo:** **Embroidered team crest** (left chest, ~8cm diameter, high-thread-count)
- **Moment plate:** **Engraved metal plate** (stainless steel or brass)
  - Size: ~5cm x 3cm rectangle
  - Content: Player name, minute, score, date, match name
  - Attachment: Riveted to inside collar or kangaroo pocket grommet
- **Packaging:** Premium box with certificate of authenticity (numbered edition)

**Why this matters:**
- Embroidery = perceived quality jump (fans know it costs more)
- Metal plate = tangible proof of scarcity, collectible element
- Builds "this is special" feeling that justifies £500-£3,000 price

---

## Technical Requirements

### 1. Database Schema

**New tables:**

#### `tiers`
```sql
CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- Common, Uncommon, Rare, Epic, Legendary
  display_order INT NOT NULL, -- 1-5
  description TEXT,
  price_multiplier DECIMAL(3,2) DEFAULT 1.0, -- e.g. 2.5× for Epic
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tier_perks`
```sql
CREATE TABLE tier_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES tiers(id),
  perk_name VARCHAR(255) NOT NULL,
  perk_description TEXT,
  requires_club_fulfillment BOOLEAN DEFAULT FALSE, -- true = club must schedule
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `moment_tier_inventory`
```sql
CREATE TABLE moment_tier_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id VARCHAR(50) NOT NULL,
  goal_index INT NOT NULL,
  tier_id UUID REFERENCES tiers(id),
  total_quantity INT DEFAULT 0, -- how many Epic available for this goal
  sold_quantity INT DEFAULT 0,
  team_id UUID REFERENCES teams(id), -- which club sets this
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, goal_index, tier_id)
);
```

#### `orders` (extend existing)
Add columns:
- `tier_id UUID REFERENCES tiers(id)`
- `perk_status VARCHAR(50)` — pending, scheduled, fulfilled
- `perk_fulfillment_notes TEXT` — club admin adds scheduling info

---

### 2. Merch Configurator UI

**Location:** `/merch-preview` page

**New section:** "Edition Tier" (above or alongside product grid)

**UI:**
- 5 cards in a row (horizontal scroll on mobile)
- Each card shows:
  - Tier name + icon
  - Price for current product (e.g. "Hoodie: £1,500" for Legendary)
  - List of perks (bullet points)
  - Availability badge (e.g. "3 of 5 remaining")
  - "Select" button (disabled if sold out)

**Selected tier:**
- Highlights card with glow/border
- Updates price breakdown
- Shows "You're getting:" perk summary below

**Constraints:**
- If tier sold out → greyed out, "Sold Out" badge
- If user downgrades tier → perks removed from summary
- Cart shows tier + perks clearly

---

### 3. Admin Area (Platform)

**Location:** `/admin/tiers`

**Features:**
- Create/edit/delete tiers (name, multiplier, description)
- Manage global perk library (add new perks, mark which require club fulfillment)
- Assign perks to tiers (drag-and-drop or checkboxes)
- View all moments with tier inventory set
- Generate tier revenue reports

---

### 4. Team Admin Area (Club Staff)

**Location:** `/club/moments/{matchId}/{goalIndex}/tiers`

**Features:**
- View the moment (artwork preview)
- Set quantity per tier (e.g. "5 Legendary, 20 Epic, 100 Rare, unlimited Common")
- Preview pricing (based on multiplier + base product price)
- Mark tiers as "exclusive drop" (time-limited)
- View orders per tier for this moment
- Manage perk fulfillment:
  - See list of Epic/Legendary buyers
  - Mark perks as "scheduled" / "fulfilled"
  - Add notes (e.g. "Tunnel pass booked for Mar 15")

---

### 5. Order Fulfillment Routing

**Logic:**
1. Order placed → check `tier_id`
2. If Common/Uncommon/Rare → route to Printful (current flow)
3. If Epic/Legendary:
   - Create draft order in **secondary supplier system** (TBD — API integration needed)
   - Include:
     - Base garment with all-over print artwork
     - Embroidery specs (logo position, thread colors)
     - Metal plate engraving text
   - Notify club admin: "Epic/Legendary order placed — perk fulfillment required"
   - Email buyer: "Your order is being handcrafted — expect 3-4 weeks"

**Secondary supplier candidates (research needed):**
- Custom embroidery shops (UK-based for fast shipping)
- Metal plate engravers (Etsy, Alibaba, local jewellers?)
- All-in-one premium merch platforms (alternatives to Printful)

---

## Pricing Logic

**Formula:**
```
Final Price = (Base Product Price) × (Tier Multiplier) + (Manufacturing Add-On)
```

**Example (Hoodie):**
- Base: £79
- Common (1.0×): £79
- Uncommon (1.5×): £118
- Rare (2.0× + embroidery): £158 + £30 = £188
- Epic (6.0× + embroidery + plate): £474 + £50 + £40 = £564
- Legendary (20× + premium embroidery + engraved plate + packaging): £1,580 + £100 + £80 + £50 = £1,810

**Club can override multipliers** per moment (e.g. cup final goal = higher multipliers).

---

## UX Flow (Customer)

1. Land on `/merch-preview?goalId=...`
2. Artwork generates (as current)
3. **New:** Tier selector appears above product grid
4. User taps "Epic" tier card
5. Price updates: "Total: £564 (includes VIP box access + signed shirt)"
6. User selects size, adds to cart
7. Checkout shows perk details: "Club will contact you to schedule VIP box"
8. Order confirmed
9. **If Epic/Legendary:**
   - Email: "Your premium order is being handcrafted by our partner. Expect delivery in 3-4 weeks."
   - Club admin gets notification: "Epic order #1234 — perk fulfillment needed"
   - Club emails buyer to schedule VIP box

---

## Revenue Model

**For clubs:**
- Common/Uncommon/Rare: Standard rev share (e.g. 30% to club)
- Epic/Legendary: Higher rev share (e.g. 50% to club) because they're fulfilling perks

**For EmotivX:**
- Transaction fee on all tiers
- Premium tier orders = higher margin (justify secondary supplier cost)

**Break-even example (Legendary £1,800 hoodie):**
- Cost of goods: £200 (premium garment + embroidery + plate + packaging)
- Perk cost: £500 (season ticket absorbed by club or split 50/50)
- EmotivX margin: £550
- Club margin: £550
- Net to both: £550 each (30% margin — acceptable for premium tier)

---

## Open Questions / Research Needed

1. **Secondary suppliers:**
   - Who can do embroidery + metal plate riveting at scale?
   - Lead time? (target: 2-3 weeks for Epic/Legendary)
   - Minimum order quantities?

2. **Perk fulfillment:**
   - Which clubs are willing to offer season tickets as perks?
   - Legal: Can we guarantee perks or is it "subject to availability"?
   - Insurance: What if perk can't be fulfilled (e.g. player leaves club)?

3. **Scarcity enforcement:**
   - How do we prevent bots from buying all Legendary tiers?
   - Verified fan accounts? (e.g. must be club member to buy Legendary)

4. **Certification:**
   - Do Legendary editions need numbered certificates? (e.g. "Edition 3 of 5")
   - Blockchain authentication? (overkill or value-add?)

5. **Tier naming:**
   - Are "Epic" and "Legendary" too gamer-y for football fans?
   - Alternative names: Bronze/Silver/Gold/Platinum/Diamond?

---

## Implementation Phases

### Phase 1: Database + Admin Setup (Week 1-2)
- Create tier tables
- Build `/admin/tiers` UI
- Seed initial 5 tiers + perk library

### Phase 2: Team Admin Inventory (Week 2-3)
- Build `/club/moments/.../tiers` UI
- Allow clubs to set quantities per tier per moment
- Test with 1-2 pilot clubs

### Phase 3: Merch Configurator UI (Week 3-4)
- Add tier selector to `/merch-preview`
- Wire up pricing logic
- Cart + checkout show tier + perks

### Phase 4: Secondary Supplier Integration (Week 4-6)
- Research + select supplier
- API integration for Epic/Legendary orders
- Test embroidery + metal plate samples

### Phase 5: Perk Fulfillment Workflow (Week 6-8)
- Club admin perk scheduling UI
- Email automation (buyer + club notifications)
- Perk status tracking

### Phase 6: Launch (Week 8+)
- Pilot with 1 club, 1 big moment
- Monitor sales + fulfillment
- Iterate based on feedback

---

## Success Metrics

- **Tier distribution:** Are people buying Epic/Legendary? (target: 5-10% of orders)
- **Perk fulfillment rate:** % of perks successfully scheduled within 30 days (target: >90%)
- **Average order value:** Increase from £79 (Common hoodie) to £150+ (tier uplift)
- **Club satisfaction:** Do clubs find perk fulfillment manageable? (survey after 3 months)

---

## Dependencies

- Database schema changes (Supabase)
- Admin UI build (React/Next.js)
- Secondary supplier contract
- Club onboarding (legal, perk agreements)
- Metal plate design + engraving specs

---

## Risks

1. **Perk fulfillment bottleneck:** Clubs can't keep up with scheduling → bad customer experience
2. **Secondary supplier unreliable:** Long lead times or poor quality → refunds, angry buyers
3. **Scarcity abuse:** Bots buy all Legendary tiers → real fans locked out
4. **Legal issues:** Season ticket perks have tax/legal implications (gift vs purchase)

**Mitigation:**
- Start with pilot clubs who have strong ops teams
- Test secondary supplier with sample orders first
- Implement account verification for Legendary tier
- Consult legal before launch (UK consumer law, VAT on bundled perks)

---

## Tier-Gated Customization (Advanced Feature)

**Concept:** Higher tiers unlock exclusive customization options. This creates visual differentiation beyond just price.

### Examples of Tier-Gated Options

| Customization | Common | Uncommon | Rare | Epic | Legendary |
|---------------|--------|----------|------|------|-----------|
| **Logo options** | Printed only | Printed only | Embroidered | Embroidered + gold thread option | Embroidered + gold + custom placement |
| **Art styles** | Classic, Geometric, Camo | + Street, Marble | + Smoky, Jackson | + Futuristic | + Dali (exclusive) |
| **Colorways** | Standard palette (8 colors) | + 2 exclusive colors | + 3 exclusive colors | + 5 exclusive colors | Full palette (20+ colors) |
| **Line effects** | Default, Laser | + Flame | + Lightning | + Ink, Spray | All effects + custom intensity |
| **Moment badge** | Printed | Printed | Printed + foil accent | Metal plate (riveted) | Engraved metal plate + numbered |
| **Player name/number** | Printed | Printed | Embroidered | Embroidered + premium font | Embroidered + match-worn style |

### Implementation

**Database schema addition:**

#### `tier_customization_gates`
```sql
CREATE TABLE tier_customization_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES tiers(id),
  customization_type VARCHAR(50) NOT NULL, -- 'logo_type', 'art_style', 'colorway', 'line_effect'
  customization_value VARCHAR(100) NOT NULL, -- e.g. 'gold_embroidered', 'dali', 'neon_pink'
  is_exclusive BOOLEAN DEFAULT FALSE, -- true = ONLY this tier can use it
  team_controllable BOOLEAN DEFAULT TRUE, -- true = team can override per moment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_id, customization_type, customization_value)
);
```

**Team Admin UI:**
- New section in `/club/moments/{id}/tiers`: "Customization Limits"
- Checkboxes per tier per option:
  - ✅ "Allow gold logo for Epic tier"
  - ✅ "Make Dali style Legendary-exclusive for this moment"
  - ✅ "Lock neon colorways to Rare+ for this match"

**Merch Configurator Logic:**
1. User selects a tier (e.g. "Rare")
2. UI polls: `GET /api/customization-gates?tier=rare&matchId=1377235&goalIndex=6`
3. Response: `{ allowedStyles: ['classic', 'geometric', 'camo', 'street', 'marble', 'smoky'], allowedColors: [...], ... }`
4. UI greys out unavailable options with "Upgrade to Epic" badge
5. Hover tooltip: "This style is Epic-tier exclusive for this moment"

**Visual cues:**
- Greyed-out options show lock icon 🔒
- Tooltip: "Unlock with Epic tier"
- Tier upgrade prompt: "Upgrade to Epic (+£250) to use Dali style"

### Why This Works

**Psychological triggers:**
- **Scarcity:** "Only Legendary buyers can use gold"
- **Status:** "This style is exclusive to our premium tier"
- **FOMO:** "Upgrade to unlock 12 more customization options"

**Revenue impact:**
- Users who want specific styles/colors will pay for tier upgrade
- Visual differentiation makes tier value tangible (not just "it costs more")
- Encourages upselling without feeling pushy

### Build Order

**Phase 1:** Build full art engine (all options available, no gates)
**Phase 2:** Add tier system (price tiers + perks)
**Phase 3:** Add customization gating (this section)

**Reasoning:** Easier to add permission layers on top of working features than build conditionally from scratch.

---

## Real-World Value Guarantee

**Core principle:** Every digital asset (moment NFT, tier badge, whatever we call it) has a MINIMUM guaranteed real-world value. It can never drop to zero.

### Hard Floor Value Per Tier

| Tier | Purchase Price | Hard Floor Value | Guaranteed Redemption |
|------|---------------|------------------|----------------------|
| **Common** | £79 | £15 | 20% off club shop (always redeemable) |
| **Uncommon** | £118 | £30 | 25% off club shop + priority merch drops |
| **Rare** | £188 | £75 | £75 club shop voucher OR one-time tunnel pass |
| **Epic** | £564 | £200 | £200 VIP experience voucher OR match ticket upgrade |
| **Legendary** | £1,810 | £500 | £500 season ticket credit OR lifetime 50% discount |

### How It Works

**At purchase:**
- User buys Legendary hoodie for £1,810
- Receives digital twin badge (blockchain/database entry, tied to order)
- Badge grants 2 things:
  1. **Immediate perk** (e.g. free season ticket this year)
  2. **Permanent floor value** (£500 redeemable credit, never expires)

**Floor value redemption:**
- User can redeem floor value at ANY time via their EmotivX account
- Redemption options (club configurable):
  - Club shop credit (instant)
  - Match ticket upgrade (subject to availability)
  - Season ticket discount (applied to renewal)
  - VIP experience voucher (book via club admin)
- Once redeemed, badge is marked "redeemed" but user keeps the physical hoodie

**Why this matters:**
- **Trust:** "Even if I never use the tunnel pass, I can always get £75 back"
- **Resale value:** Secondary market for badges has a known floor
- **Club loyalty:** Floor value ties fans to the club long-term
- **No regret:** "I spent £1,810 but I got a season ticket + I still have £500 credit"

### Admin Configuration

**Platform admin sets:**
- Global floor value % (e.g. "Legendary = 30% of purchase price minimum")
- Redemption options library (clubs pick which to offer)

**Club admin sets per tier:**
- Which redemption options are available (e.g. "We don't offer season ticket credit, only shop vouchers")
- Expiry rules (if any — default: never expires)
- Blackout dates (e.g. "No VIP vouchers during playoffs")

---

## Reverse Pricing Models (Buy the Perk, Get the Merch)

**Concept:** Instead of "buy merch, get perk free," offer "buy perk at full price, get merch free/discounted."

### Example 1: Season Ticket Bundle

**Traditional model:**
- Legendary hoodie: £1,810 (includes free season ticket worth £600)

**Reverse model:**
- Season ticket: £600 (standard price)
- **+£200 upgrade:** Get Legendary hoodie free + £500 floor value credit
- Total: £800 (£1,010 discount vs buying separately)

**Why clubs love this:**
- Upsells season tickets (their primary revenue)
- Hoodie becomes "free gift" in buyer's mind
- Still generates £200 profit for EmotivX + club

### Example 2: VIP Box Experience

**Traditional:**
- Epic hoodie: £564 (includes VIP box access)

**Reverse:**
- VIP box: £300 (standard price)
- **+£150 upgrade:** Get Epic hoodie free + signed shirt + £200 floor value
- Total: £450 (£114 discount)

**Why this works:**
- VIP boxes often don't sell out → club fills seats
- Buyer feels like they got a deal (£564 hoodie for £150)
- EmotivX + club split £150 profit

### Database Schema for Reverse Pricing

**New table:**

#### `reverse_pricing_offers`
```sql
CREATE TABLE reverse_pricing_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  base_perk VARCHAR(255) NOT NULL, -- e.g. 'season_ticket', 'vip_box'
  base_price DECIMAL(10,2) NOT NULL, -- standard price of perk
  bundle_tier_id UUID REFERENCES tiers(id), -- which tier merch is bundled
  bundle_price DECIMAL(10,2) NOT NULL, -- upgrade cost (base + this = total)
  includes TEXT[], -- array of what's included (e.g. ['legendary_hoodie', 'floor_value_500'])
  available_from DATE,
  available_until DATE,
  max_redemptions INT DEFAULT NULL, -- limit per season (e.g. only 50 season ticket bundles)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Admin UI for Reverse Pricing

**Location:** `/club/pricing/bundles`

**Features:**
- Create bundle offers (e.g. "Season Ticket + Legendary Hoodie")
- Set pricing:
  - Base price (perk at standard rate)
  - Bundle price (upgrade cost)
  - Total shown to buyer
- Preview buyer-facing UI ("You save £X!")
- Set availability (dates, max redemptions)
- Track redemptions (how many sold vs limit)

**Example form:**
```
Bundle Name: Season Ticket + Legendary Hoodie
Base Perk: Season Ticket (£600)
Upgrade Cost: +£200
Total Price: £800
Includes:
  ✅ Season ticket (2026/27 season)
  ✅ Legendary hoodie (your choice of moment)
  ✅ £500 floor value credit (never expires)
Buyer Saves: £1,010 vs buying separately
Available: Now → Aug 31, 2026
Max Redemptions: 100
```

### Buyer UX (Reverse Pricing Flow)

**Entry point 1: Club shop**
- User browsing club shop → sees "Season Tickets" product
- Banner: "🎁 Upgrade for £200 — Get FREE Legendary Hoodie + £500 Credit"
- Click → redirected to EmotivX bundle page

**Entry point 2: EmotivX merch page**
- User configuring Legendary hoodie (£1,810)
- Alert banner: "💡 Save £1,010 — Buy this hoodie with a season ticket for just £800 total"
- Click → shows bundle offer, swap to reverse pricing

**Checkout flow:**
1. User selects "Season Ticket + Legendary Hoodie Bundle (£800)"
2. Picks their moment (for the hoodie artwork)
3. Confirms size, customization (still tier-gated — Legendary perks apply)
4. Checkout → pays £800
5. Receives:
   - Season ticket (email delivery or physical card via club)
   - Legendary hoodie (ships in 3-4 weeks)
   - Digital badge with £500 floor value credit (in EmotivX account)

### Why Reverse Pricing is Genius

**For clubs:**
- Upsells their core products (tickets, VIP boxes)
- Doesn't cannibalize ticket sales (bundle is cheaper than separate)
- Gets fans into the stadium (where they spend more on concessions)

**For EmotivX:**
- Converts "can't afford £1,810 hoodie" buyers (£800 is more accessible)
- Differentiates from competitors (no one else bundles merch with tickets)
- Builds long-term loyalty (floor value keeps users engaged)

**For fans:**
- Feels like a deal (£1,010 savings!)
- Gets the premium merch they want
- Locks in season ticket at a "discount"

---

## Configuration & Admin Control

All of the above (floor values, redemption options, reverse pricing bundles) needs to be **fully configurable** in the admin system.

### Platform Admin Controls

**Location:** `/admin/tier-config`

**Settings:**
- Global floor value %s per tier (e.g. "Epic = 35% minimum")
- Redemption options library:
  - Add new redemption types (e.g. "Training ground tour")
  - Set suggested value ranges
  - Mark which require club fulfillment
- Reverse pricing templates (reusable bundle structures)

### Club Admin Controls

**Location:** `/club/settings/tiers`

**Per-tier settings:**
- Enable/disable tiers for this club
- Customize floor value % (override platform default)
- Select which redemption options to offer
- Set blackout dates (e.g. "No VIP vouchers in May/June")

**Reverse pricing bundles:**
- Create club-specific bundles (season ticket + hoodie, VIP box + tee, etc.)
- Set pricing, availability, limits
- Preview buyer-facing offer
- Track redemptions in real-time

### Database Queries Needed

**Check tier availability for a moment:**
```sql
SELECT t.name, t.price_multiplier, mti.total_quantity, mti.sold_quantity
FROM tiers t
LEFT JOIN moment_tier_inventory mti ON t.id = mti.tier_id
WHERE mti.match_id = ? AND mti.goal_index = ?
AND (mti.total_quantity IS NULL OR mti.sold_quantity < mti.total_quantity);
```

**Get redemption options for a tier:**
```sql
SELECT tp.perk_name, tp.perk_description, tp.requires_club_fulfillment
FROM tier_perks tp
WHERE tp.tier_id = ?;
```

**Check reverse pricing bundles available:**
```sql
SELECT * FROM reverse_pricing_offers
WHERE team_id = ?
AND available_from <= NOW()
AND (available_until IS NULL OR available_until >= NOW())
AND (max_redemptions IS NULL OR 
     (SELECT COUNT(*) FROM orders WHERE reverse_pricing_offer_id = id) < max_redemptions);
```

---

## Next Steps (When Ready to Build)

1. Legal review: Perk fulfillment contracts with clubs
2. Secondary supplier RFP (request quotes from 3-5 vendors)
3. Design metal plate mockups (show to clubs for feedback)
4. Build database schema + seed tiers
5. Create `/admin/tiers` + `/club/moments/.../tiers` UIs
6. Test tier selector in merch configurator (localhost)
7. Pilot with 1 club, 1 moment (e.g. Wrexham playoff final goal)
8. Iterate based on feedback
9. Full rollout

---

**Document status:** Spec complete, ready for backlog prioritization.
