# Reverse Funnel — Build Spec

**A self-diagnosis tool inside the GOST app.** The user inputs their target revenue and their current conversion rates (or accepts defaults). The tool calculates how many right-fit visitors they need to land that revenue, how many months of organic effort that represents, and how much that compresses if positioning is sharper. The output seeds a GOST plan they can act on.

This document is the build spec. Hand it to Cursor or to a developer; it should be enough to ship a working v1 in a focused half-day.

---

## What it is

A page in the GOST app at `/tools/reverse-funnel` that:

1. Takes a target revenue goal as input.
2. Takes funnel conversion rates as input (with sensible defaults pre-filled and cited).
3. Calculates the number of right-fit visitors needed to land that goal.
4. Shows the same math under "with sharper positioning" assumptions, and the multiplier reduction.
5. Translates the visitor target into months of effort across realistic organic channels.
6. Lets the user click "Build a plan from this" — which creates a new GOST project pre-populated with a Goal layer and 2-3 starter Objectives derived from the math.

---

## Why it earns a place in the app

Three reasons:

**Pre-sale acquisition asset.** A prospect lands on it (either via direct link Khaled shares, or via a landing page CTA). They input their numbers. They see their own version of the leak math. The output is undeniable in a way the static leaky funnel visual is not. It also builds urgency ("I need to fix this") without Khaled having to argue for it.

**Diagnostic-tier deliverable.** The Quick Diagnostic ($150) can use this tool live during the 45-minute call. Khaled walks the prospect through their numbers on screen. The 2-page doc Khaled sends within 48 hours is essentially the tool's output, lightly narrated.

**Beachhead onramp.** The "Build a plan from this" button moves the prospect from diagnosis to GOST plan in one click. Their math becomes their Goal. Their leaks become their Objectives. The tool is the bridge between *understanding the problem* and *committing to the solution.*

---

## Page structure

Single-page tool, no auth required for the calculation itself (so it can be linked from anywhere). Auth required only for the "Build a plan from this" action that creates a GOST project.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER (sticky)                                            │
│  Reverse Funnel · "How many visitors do you need?"         │
├──────────────────────────┬─────────────────────────────────┤
│                          │                                  │
│  INPUTS (left, ~40%)     │  RESULTS (right, ~60%)           │
│                          │                                  │
│  Step 1. Goal            │  The math                        │
│  Step 2. Sales math      │  (cascade visualization)         │
│  Step 3. Site math       │                                  │
│  Step 4. Channels        │  Months of effort                │
│                          │                                  │
│                          │  With sharp positioning          │
│                          │  (side-by-side compression)      │
│                          │                                  │
│                          │  [Build a plan from this →]     │
└──────────────────────────┴─────────────────────────────────┘
```

The results panel updates live as inputs change. No "calculate" button — recalc on every keystroke (debounced ~300ms).

---

## Inputs

### Step 1. Goal

| Field | Type | Default | Validation |
|---|---|---|---|
| Target client revenue per month | Currency, USD | $3,000 | min $100, max $100,000 |
| Lifetime in months | Integer | 12 | min 1, max 60 |
| Number of clients you want | Integer | 1 | min 1, max 100 |

**Computed:** Total LTV target = revenue/mo × months × clients

### Step 2. Sales math

| Field | Type | Default | Citation note |
|---|---|---|---|
| Close rate on qualified opportunities | % | 25% | "Industry midpoint, B2B services 15-40%" |
| Lead → qualified opportunity rate | % | 25% | "Industry midpoint, varies 20-40% by lead source" |

### Step 3. Site math

| Field | Type | Default | Citation note |
|---|---|---|---|
| Right-fit visitor → lead conversion | % | 1.5% | "Conservative end of HubSpot B2B SaaS benchmark (1.5-3%)" |
| Bounce rate on top-of-funnel pages | % | 60% | "Industry midpoint, B2B top-of-funnel runs 60-80%" |
| Audience efficiency (% right-fit) | % | 40% | "Estimate based on Demandbase 2024 reach studies" |

### Step 4. Channels

A weighted mix selector. User assigns percentages across channels. Must sum to 100%.

| Channel | Default % | Visitors per month at organic ceiling | Cost per visitor (paid path) |
|---|---|---|---|
| Warm referrals | 20% | 30-50 | $0 (capped by network) |
| Founder LinkedIn organic | 30% | 100-200 (after 8-12 weeks) | $0.50-$2 (time cost) |
| Cold outbound | 30% | 30-60 | $1-$3 |
| Content / SEO inbound | 10% | 50-150 (after 3-6 months) | $0.50-$2 (time cost) |
| Paid ads (LinkedIn / Google) | 10% | unlimited | $8-$40 |

User can move sliders. Each slider is labeled with realistic ceiling notes so they understand the tradeoff.

---

## Math (exact formulas)

Let:
- `R` = revenue per month per client (USD)
- `M` = lifetime months
- `N` = clients wanted
- `c_close` = close rate on qualified opps (decimal)
- `c_qual` = lead-to-qualified rate (decimal)
- `c_lead` = visitor-to-lead conversion (decimal)
- `b_bounce` = bounce rate (decimal)
- `a_match` = audience match / efficiency (decimal)

### Working backwards

```
closes_needed         = N
qualified_opps_needed = closes_needed / c_close
leads_needed          = qualified_opps_needed / c_qual
engaged_visitors      = leads_needed / c_lead
right_fit_visitors    = engaged_visitors / (1 - b_bounce)
total_visitors        = right_fit_visitors / a_match
```

`total_visitors` is the headline number — visitors needed at the top of the funnel.

### Months of effort

For each channel `ch` with weight `w_ch` (decimal, summing to 1) and monthly visitor ceiling `cap_ch`:

```
visitors_per_month_from_channel = w_ch × cap_ch
total_visitors_per_month        = sum across channels
months_to_target                = total_visitors / total_visitors_per_month
```

Show the result as a range using both the low and high ends of each channel's ceiling.

### With sharp positioning (the compression)

Three rates shift up by published ranges (these multipliers are themselves estimates, not measured):

```
c_lead_sharp   = c_lead × 2.0         // conversion improves
b_bounce_sharp = b_bounce × 0.55      // bounce reduces by 45%
a_match_sharp  = a_match × 1.65       // audience efficiency improves
```

Rerun the cascade with these sharper rates. Display:
- Total visitors needed (sharp)
- Compression factor = total_visitors / total_visitors_sharp
- Months to target (sharp)

The compression factor should typically be 4-6x in the default scenario.

---

## Output visualization

### Cascade panel (top of results)

A vertical stack matching the visual grammar of the existing $3K scenario visual:
- 6 rows, top-to-bottom, working backwards from goal to visitor count.
- Each row shows: stage label, conversion rate applied, running number.
- Numbers count up as the user types.

### Effort panel (middle of results)

```
At your channel mix, this requires:

 4-12 months  ←  if positioning is sharp
 18-30 months ←  if positioning stays fuzzy

(The wider the gap, the more positioning is the lever you don't yet have.)
```

### Compression panel (bottom of results)

Side-by-side card identical to the existing visual. Two columns:
- "Today" with current rates and visitor target.
- "After sharper positioning" with shifted rates and reduced visitor target.
- Below: the multiplier (e.g., "4.8x compression").

### CTA card

```
The math says this is hard.
We can make it easier.

[ Build a starter GOST plan from these numbers → ]
```

---

## "Build a plan from this" action

When clicked (auth required, redirect to login if not authenticated):

1. Create a new GOST project named "{Today's date} reverse-funnel plan."
2. Pre-populate the Goal layer:
   ```
   Land {N} client(s) at ${R}/month over {M} months
   (Total target: ${total_LTV})
   ```
3. Pre-populate 3 starter Objectives, derived from the math:
   - **"Lift visitor-to-lead conversion from {c_lead}% to {c_lead × 2}%"** — baseline {c_lead}, target {c_lead × 2}, timeframe 90 days
   - **"Reduce bounce rate from {b_bounce}% to {b_bounce × 0.55}%"** — baseline {b_bounce}, target {b_bounce × 0.55}, timeframe 90 days
   - **"Improve audience efficiency from {a_match}% to {a_match × 1.65}%"** — baseline {a_match}, target {a_match × 1.65}, timeframe 90 days
4. Open the GOSTBuilder editor on the new project. User can keep the suggestions, edit, or delete.

This is the moment the prospect transitions from "looking at math" to "building a plan in your app." Don't make them retype anything they already gave you.

---

## Defaults — sourced and labeled

Every default in the form has a tooltip with the source. Verbatim text:

| Default | Tooltip text |
|---|---|
| Close rate 25% | "Industry midpoint for B2B services. Range: 15-40% by sector. Source: Aggregated from CRM benchmark studies." |
| Lead → qual 25% | "Industry midpoint. Varies 20-40% by lead source quality. Source: HubSpot 2025 sales benchmarks." |
| Visitor → lead 1.5% | "Lower bound of HubSpot 2025 B2B SaaS benchmark (1.5-3% range). Source: HubSpot 2025 marketing statistics." |
| Bounce 60% | "Industry midpoint for top-of-funnel B2B pages (range 60-80%). Source: 2024 GA4 cohort benchmarks." |
| Audience efficiency 40% | "Estimate based on Demandbase 2024 reach research. Demandbase reports 50%+ of B2B marketers cite reaching right buying groups as their top challenge." |

**Important:** the "audience efficiency" tooltip should NOT cite a specific Demandbase percentage that doesn't exist in their actual reports. The 40% is a Merv-grade estimate that lands in the middle of the published Demandbase pain-point data. Be honest about that.

The compression multipliers (2.0×, 0.55×, 1.65×) should also have a tooltip:
> "These are illustrative shifts assuming a sharpened positioning + ICP. Real-world deltas vary widely. Use the tool to model the shape of the math, not as a forecast."

---

## Acceptance criteria

The v1 ships when all of these are true:

- [ ] Page renders at `/tools/reverse-funnel` without auth
- [ ] All inputs accept reasonable values and reject invalid ones (negative numbers, non-numerics)
- [ ] Cascade updates live as inputs change (debounced ~300ms)
- [ ] Channel mix sliders sum to 100% and rebalance when one is changed
- [ ] Compression panel shows current vs sharp scenarios with correct math
- [ ] All defaults are correctly cited in tooltips
- [ ] "Build a plan from this" creates a real GOST project for authenticated users
- [ ] Unauthenticated users clicking the CTA are redirected to sign in, then back to the tool with their inputs preserved
- [ ] Mobile-responsive (single column under 768px)
- [ ] No console errors

---

## What's deferred for v2

- Channel-cost-in-dollars output (we know the conversion rates; v2 layers in $ cost per channel for a paid-spend forecast).
- Saved scenarios (logged-in users can save multiple "what if" scenarios per project).
- A shareable read-only link to a specific scenario (so prospects can send their math to a cofounder or board).
- Comparison view (overlay 2-3 scenarios side-by-side).
- Industry-specific defaults (auto-pre-fill different defaults if user picks "SaaS," "consulting services," "agency," etc.).

Don't build any of these in v1. They're traps for shipping.

---

## Implementation notes for Cursor

- **Page location:** `src/pages/tools/ReverseFunnel.tsx` (new). Add route `/tools/reverse-funnel` in `App.tsx`.
- **Math:** put the cascade and compression formulas in a pure function `src/lib/reverseFunnelMath.ts` so it's testable in isolation.
- **State:** local useState for inputs. No global store needed.
- **Persistence:** none in v1. Refresh = lose the inputs. v2 adds saved scenarios.
- **Cascade visualization:** reuse the visual grammar of `playbooks/visuals/leaky-funnel-scenario-3k.html` — Fraunces serif headers, JetBrains Mono labels, leak red for "current" and gold/teal for "sharp." Don't slavishly copy; adapt to React/Tailwind/shadcn.
- **CTA action:** call the existing `useProjects()` hook's `createProject` function. Pre-populate `data.executionGoal.text` and `data.objectives` before the redirect into GOSTBuilder.

---

## What this tool is not

- It is not a forecast. The output is a thinking aid, not a promise.
- It is not a substitute for sales judgment. The math says "you need 6,000 visitors a month"; sales judgment decides whether 6,000 visitors is achievable, worth chasing, or whether the goal needs to change.
- It is not a Merv proprietary framework. The funnel cascade is standard B2B sales math. The compression-via-positioning argument is the Merv layer, but the calculation is universal.

If a prospect uses it once and never returns, the tool worked. If they use it monthly to recalibrate as their business changes, it earned a place in your stack.
