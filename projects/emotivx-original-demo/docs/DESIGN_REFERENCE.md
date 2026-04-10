# EmotivX — Design Reference (from Demo Video)
*Extracted 2026-03-05 from David's previous platform demo*

---

## Global Design Language

### Color System
- **Background**: Near-black `#0A0A0A` or `#0D0A0A` (very dark, slight warm tint)
- **Card/panel bg**: `#111111` or `#1A1111` — subtle dark red/maroon undertone
- **Card borders**: Very faint dark red/maroon (`rgba(220,38,38,0.15)`) 
- **Primary text**: White `#FFFFFF`
- **Secondary text**: Muted gray `#888888` / `#9CA3AF`
- **Accent / CTA**: Red `#DC2626` / `#DA291C`
- **Active indicators**: Red underline, red dot, red fill

### Typography
- **Font**: Monospaced / slab-serif throughout (gives technical, premium feel)
- **Headings**: Bold, white, monospaced
- **Body**: Regular, gray, monospaced
- **Labels**: Uppercase, gray, small, letter-spaced
- **Numbers/stats**: Large, bold, white

### Components
- **Buttons (primary)**: Red background, white text, rounded-rectangle
- **Buttons (secondary)**: Dark background, subtle border, white text
- **Buttons (outline)**: Transparent bg, red border, red text
- **Cards**: Dark bg, very subtle red-tinted border, rounded corners
- **Badges/pills**: Small rounded capsule, red or dark bg
- **Tabs**: Horizontal, icon prefix, red underline on active
- **Inputs**: Dark background `#1F1F1F`, subtle border, gray placeholder
- **Modals**: Dark bg, subtle border, centered, with X close button

### Team-Specific Theming
**CRITICAL RULE**: When viewing a team's pages (admin or fan), the accent colour and border tints shift to that team's primary colour:
- Man Utd: Red `#DA291C` (as shown in demo)
- Each Euro 2024 team: their actual primary colour
- The dark background stays the same, only accents change
- Club admin panels are fully themed to their club colours

### Data Line Colour
**CRITICAL**: The data line drawn on the black canvas uses the **team's primary colour**, NOT always red. Red was only shown because the demo used Man Utd. Examples:
- Spain → Red `#AA151B`
- France → Blue `#002395`
- Germany → Black `#000000` (use secondary gold `#FFCC00` on dark bg for visibility)
- England → White `#FFFFFF` (or navy `#1D3461` if white is too invisible)
- Wrexham → Red `#E4002B`
When team primary colour has insufficient contrast on black canvas, fall back to secondary colour.

---

## Page Inventory (from Demo)

### 1. Homepage / Landing
- **Hero**: Two-column — text left (headline + subtitle + search + CTA), product collage right
- **Headline**: "Premium Assets (Digital & Physical Merchandise) From **Iconic Sporting Moments**" (last part in red)
- **CTA**: "Find Your Moment →" red button
- **Search**: "Search for your team..." dark input
- **Sections below**: Featured Teams (grid of team cards), "Moments Go Live During Matches" promo with LIVE indicator

### 2. Team Page
- **Header**: Team crest + team name + "Official Personalized Merchandise" subtitle
- **Three tabs**: Featured | Players | Matches (each with icon prefix)
- **Players tab**: 
  - Toggle: "Active Squad" / "Legends"
  - Grid of player cards (6-col): circular avatar + red jersey number badge + name
- **Matches tab**: 
  - "Select a Match" heading
  - Match rows: teams + score + date
  - Empty state: calendar icon + "Select a match to view moments"

### 3. Player Detail Modal
- **Header**: Player photo + "#[number] [Name]" + close X
- **Tabs**: Assets | Matches
- **Matches tab**: Match cards with score (red), metadata (date, competition, venue)
- **Expandable events**: "1 event" badge → expands to show:
  - Minute badge (red) + Event icon + "Goal" label
  - Event description text
  - Dataline thumbnail
  - "Dataline" button (outline) + "Create Moment" button (red)

### 4. Create Historical Moment Modal
- **Summary card**: Red-tinted, event badge + "Wayne Rooney - 78'" + match info
- **SOURCE DATALINE**: Large black canvas with red trajectory line art
- **Caption**: Description of the moment
- **Event Description**: Paragraph text
- **Art History**: Toggle to show previously generated art
- **Action buttons**: Generate art / save

### 5. Staff/Admin Dashboard
- **Nav**: Dashboard | Approvals | Featured | IP Manager (with red dot indicator)
- **Header**: "Staff Dashboard" + "Welcome back, [name]" + action buttons
- **Stats row**: 4 cards (count + label per card)
- **Two columns**: Pending Approvals (left) | Quick Actions (right, 2×2 grid)

### 6. IP Asset Manager (per team)
- **Header**: Team crest + "IP Asset Manager" + team name
- **Three tabs**: Players (count) | Team Branding | Artistic Backgrounds (count)
- **Players tab**: Grid/list of all players with avatars
- **Team Branding tab**:
  - Primary Logo upload (with thumbnail preview)
  - Apparel Sponsor upload
  - Avatar Style Reference upload (cartoon/illustrated style)
  - Team Colors: 3 colour pickers (Primary, Secondary, Tertiary) with hex inputs
  - Save Branding button
- **Artistic Backgrounds tab**:
  - Form: Background Name + Style dropdown + Custom Prompt textarea
  - Reference Image upload zone (dashed border)
  - "Generate Background" red button
  - Gallery: Generated background cards with title + style tag + download/delete icons

---

## Logo
- "EMOTIVX" — uppercase, monospaced, letter-spaced
- The "X" is in red/accent colour
- Clean, minimal, no icon (text-only logo)

## Header/Nav
- **Fan-facing**: Logo left | Search center-right | User avatar+name dropdown far right
- **Admin**: Logo left | Nav items center (Dashboard, Approvals, Featured, IP Manager) | User dropdown right
- **Active nav item**: Red dot/indicator

## Footer
- Logo left
- Links center: Privacy Policy | Terms of Service | Cookies Settings | FAQ
- Version number below links
- Social icons right: Facebook, Instagram, X, YouTube

---

## Key Design Principles
1. **Dark-first**: Everything on near-black, never light backgrounds
2. **Monospaced typography**: Gives technical/premium feel, used everywhere
3. **Red accent**: Primary CTA, active states, badges, team default colour
4. **Team-coloured theming**: Accent shifts to team colours on team-specific pages
5. **Minimal borders**: Very subtle, dark-red tinted, never harsh
6. **Cards everywhere**: Content lives in dark cards with subtle borders
7. **Modals for detail**: Player detail, moment creation, etc. are modal overlays
8. **Progressive disclosure**: Collapsible sections (events expand/collapse)
9. **Monospaced labels**: All form labels uppercase, gray, small
10. **Upload zones**: Dashed borders, centered icon + instruction text

---

---

## NEW: Details from 1fps Extraction (missed in 5s sample)

### Iconic Moment Showcase Section (between hero and footer)
- Shows a specific goal moment as a "how it works" showcase
- **Four ingredient pills with "+" separators**: 🎨 Artistic Background + 📊 Real Play Data + 🏃 Player Representation + ✍️ Signed Card
- Centre: stylised vector illustration of the moment (Rooney bicycle kick)
- Foreground: **4 real people wearing the actual merch hoodies** — demonstrates physical product
- This section explains "what you get" — art + data + player + autograph = the product

### Search Autocomplete
- Dark dropdown panel (#2a2a2a) appears below search input
- Shows "⏳ Searching..." with spinner while loading
- Clear/X button appears in search field when typing
- This is a global search that works across teams

### Player Badge Preview (inside Assets tab of player modal)
- **BADGE PREVIEW** section
- Red background card with dotted pattern
- Club crest + "GOAL" label
- Player name bar: "#10 WAYNE ROONEY"
- **3D stylised avatar** of player in team kit, doing thumbs-up
- **Player signature** reproduced at bottom
- This is the **merch patch/badge** that gets sewn onto hoodies (from Phase 4 of our plan)

### Art History / Version Management
- When generating dataline art, previous versions are stored
- "Show/Hide Art History" toggle button
- Gallery of past generations with timestamps
- **CURRENT** badge (green) on the active version
- **Restore** button on previous versions
- **Delete** (trash) icon on non-current versions
- The generated art transforms trajectory data into fiery/energy abstract art in team colours

### Dataline Art Generation
- Source dataline shown as line art (team colour on black canvas)
- "Generate Dataline Art" red button creates AI art FROM the trajectory
- The AI art is dramatic — flames, energy effects, abstract patterns following the path shape
- Multiple versions can be generated and compared
- This is the core creative engine of the product

### Player Roster Details
- Table columns: # | NAME (with photo) | POSITION | IMAGE RIGHTS | ACTIONS
- Actions per row: 👁 View | ✏️ Edit | 🗑 Delete
- Search with live filtering
- Sort by dropdown (Name, etc.)
- Pagination: "Previous | Page X of Y (N players) | Next"
- "Add Player" red button

### User Dropdown
- Shows email address
- **"STAFF" role badge** in red (for admin users)
- Menu: "Staff Dashboard" link | "Sign Out"
- This is how users navigate between fan-facing and admin views

### URL Structure (from dev environment)
- `/staff/dashboard` — admin dashboard
- `/staff/ip-manager` — IP asset manager
- Staff routes are under `/staff/*` prefix

---

*Source frames stored in `docs/video-frames/` (25 frames at 5s) and `docs/video-frames-full/` (123 frames at 1fps)*
*This document is the design bible — all new pages/components must follow these patterns.*
Celebrating the Emotion of Sport

Technology Deck for DVLT Meeting / Workshop
March 2026

Creating the leading global fan engagement ecosystem by
immortalising every emotive moment in sport

What is EmotivX?
EmotivX is a Web 3.0 engagement and reward ecosystem for leading global brands and IP owners (sports
clubs & federations, brands, athletes, and media & content owners) focused on leveraging the ‘most emotive
moments in sport’ to create unique 1-of-1 digital and physical assets.
EmotivX is a technology business using sporting data feeds to create commemorative assets of the most
emotive moments across sports, then converting those assets into data-driven outcomes that generate new
revenue streams, fan engagement, and long-term brand equity.
The key component parts of EmotivX are:
Secure, trusted, walled-garden digital asset marketplace
Latest applications of AI/ML technologies
Global community of passionate sports fans, brands and IP owners
Unique, customised digital collectibles and merchandise created from sports data (archive & live)
Recurring commercial model through continuous engagement and reward
Print-on-demand fulfilment model for all physical goods

EmotivX Product

Ecosystem Process Flow

Data Processing Platform

Content Creation Platform

Digital Assets
Near-instantaneously
available to the fans

Physical Merch

Data lines of sporting moments
(live or archive) across global
sport are near-instantaneously
created via automation

All pre-approved, contracted assets
and artistic design styles are preloaded to ensure partner / brand IP
integrity

EmotivX Product

Digital & Merch Assets
Digital Assets

Digital Asset Management:
Instantaneous and automated production of digital assets, based on every
emotive moment in sport (goals, touchdowns, tries, knock-outs...etc.)
Digital assets are securely stored on the blockchain (walled garden)
Initially free ‘digital twins’ for fans buying EmotivX physical merch
Tradable digital assets, assigned initial values based on the ‘moment’ and
managed scarcity of created assets
Secondary marketplace provides recurring revenue for EmotivX and partners

Physical Merch

Physical Merchandise Management:
40+ SKUs available from Content Creation Platform (e.g., 1:1 hoodies, tshirts, bags, hats, phone covers etc.), all created in under one minute
Spiralling AI technologies ensure patterns are throughout the entire product
Incentives for purchasing at live events / in-stadia (end-to-end purchasing
via app or kiosk)
Fans can customise with seat numbers etc.
Third-party, print-on-demand fulfilment (via Printful)

EmotivX Product
Additional Graphical Elements:
A ‘featured moment’ banner within the consumer app focused on that Rooney wonder goal
Some of the many SKUs of physical merchandise that the Ronney goal produces

EmotivX Product - The Demo

EmotivX Product

In-Stadia Fan Engagement

“Putting fans and brands at the beating heart of sport” - digital opportunity for the partner /
brand to engage with their fans at an emotive time as soon as a ‘moment’ has occurred and
been captured.
Above, there is a digital momento that can be shown to the fans on an in-stadium screen
and/ or via the club app. To the right, the EmotivX plan includes in-stadia / in retail kiosks for
fans to buy digital & physical assets of goals etc. from the team (archive to present day).

Exponential Growth Engine
Ecosystem: Exponential Growth

EmotivX
Building an Ecosystem
Sports

8

Leagues / Federations

11

Teams / Clubs

>950

Athletes

>600,000

Brands

>4,100

Exponential Growth Engine

Ecosystem: Single Large Brand Growth Potential

Phase One GTM Strategy
A Considered Approach to Digital Assets: Club / Team
1. Launch
a. Focus will be on the creation of digital assets from archive data (e.g., the Top 100 Goals in the club’s history)
b. Potential for fan engagement ahead of the launch (a fan poll to confirm the top 100 goals to become digital assets)

2. Strategy
a. All digital assets will have five levels of scarcity (Common, Uncommon, Rare, Epic & Legendary), as well as a defined
number of assets released per goal
b. Tiered (increasing) prices will be applied to these digital assets (where the Common will remain at no cost to the fan)
c. All digital assets, including the Common, will be linked to a range of redeemable real-world assets (e.g., drinks, food,
apparel, access etc.) that have a ‘value’ to the fan if redeemed
i. Real-world value will be linked to EmotivX assets (e.g., higher level of scarcity digital assets, merch etc.)
ii. The partner will select their chosen real-world assets, ensuring that a sensible margin is maintained

d. Merch designs will be developed in advance to cover the campaign (e.g., Top 100 Goals)

3. Roadmap
a. Lagged live goals (‘Archive Moments’ available to the fan within days of the ‘moment’)
b. Key ‘moments’: Goal of the Week, Goal of the Month etc.
c. Live data creation of assets, available to the fan within seconds of the emotive moments

Technology & Component Parts
High-Level Workflow & Component Parts

Third-party, real-time sports data feeds into EmotivX
DPP - the Data Processing Platform digests, interrogates and repurposes the sports data
CCP - the Content Creation Platform transforms the data objects from the DPP into distributable assets
(both Digital and Physical)
CMS - the Campaign Management System is the ‘ordering system’ and triggers campaign flows
CVM - the Content Verification Module checks and verifies all physical & digital assets before distribution
Physical Fulfiment - merchandise produced to order and fulfilled by expert third-party (Printful)
Digital Fulfilment - digital assets sent to the primary marketplace
TRS - the Tracking & Reporting System is the back-office for EmotivX and single source of truth

Please see the dedicated Technology Deck for more in-depth information

Technology & Component Parts
Flow Visual

DPP

CCP

CONSUMERS

Data Processing Platform

Content Creation platform

Various channels: Mobile app, kiosks + more

The DPP and the CCP are Critical and Integrated Components
at the Heart of EmotivX

Technology & Component Parts
Workflow Schematic
Rejected
Asset
Review

Secondary
Digital
Market
Place

Primary
Digital
MarketPlace
Digital
Asset
Creation

XML
Data
Feeds

Data
Processing
Platform
(DPP)

Content
Creation
Platform
(CCP)

Campaign
Management
System
(CMS)

Content
Verification
Module
(CVM)

Store
front
Availability

Payment
Platform

Digital
Product
Customer
Physical
Product
Customer

Physical
Asset
Creation
Merchandise
Market
Place

Rejected
Asset
Review

Data Aquisition Data Processing

Asset
Creation

Campaign
Managememt

Content
Verification

Marketplace

Tracking & Reporting System (TRS)

Fullfilmet
Platform
(PrintFul)

Payment

Fullfilment

Technology & Component Parts
Key Technological Component Parts: Phase One Launch
Sports Data Feeds
Captured and managed by the EmotivX team
Initially football (archive data in phase one)

CCP
Already developed by the EmotivX team
Physical fulfilment already integrated to Printful (with payment mechanism)

EmotivX Front-End
Part built in-house
Decision on how launch partner consumers will interact with EmotivX (partner iFrame and/ or EmotivX App)
EmotivX will fully develop and deploy the front-end

Outstanding Items
DPP - full build is not required for phase one, but is important for the roadmap and commitment to launch partners
CMS - can be handled in-house initially for launch partners
TRS - can be handled in-house initially for launch partners
DAM - we need the ability to mint digital assets, but not secondary market trading initially
CVM - for launch, this will be manual pre-checking with no fan customisation functionality available

Collaboration with DVLT
Mutual Commercial Synergies
EmotivX would work with DVLT in numerous ways to add value to both propositions:
Launch collaboration

EmotivX to launch with ADIO technology embedded as suitable and subject to time & resources
Discussions / workshops to be had about physical crypto anchors going into physical merchandise
Archive and lagged live can make use of ADIO triggers in certain scenarios, BUT fully live implementations are the
‘killer app’ for both parties

Synergistic products / partners

Cross-promotion of products - not just ADIO, but holograms, the in-stadia options via API Media and more
Mutual PR opportunities in global sport will natural develop over time
Roadmap of opportunities to be set out

Revenue generation

EmotivX product sales (digital and physical in primary and secondary markets)
Data Score & Data Value = revenue for DVLT, EmotivX & partners (clubs, brands etc) over time

Collaboration with DVLT
ADIO Collaboration Visual
The Stadium EmotivX
Experience:
Amazing / crucial goal
scored by the home team
Jumbotron message and
ADIO signal
Opted-in fans get immediate
offer to ‘OWN THAT GOAL’
Purchase your ‘I WAS THERE’
momento on your phone or
via the stadium kiosk
Opted-in fans at home also
get the signal / opportunity

Summary
EmotivX will partner with DVLT to initially create a PoC with a midtier UK launch partner in football
Limited technology input required from DVLT for the initial launch
DPP build and ADIO integration / operation as suitable
Decision on the DAM strategy to be had

Global MSA will include the longer-term intent for collaboration on
technology
Significant mutual benefits for the parties along the roadmap
EmotivX greatly looks forward to working with DVLT and bringing
this shared vision to life

Celebrating the Emotion of Sport

