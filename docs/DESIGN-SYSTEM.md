# ABB interface design system — v0.1

**Working public brand:** ABB. **Repository/project:** Accountabilibuddy. **Positioning:** The public record, in motion. **Tagline:** Democracy has receipts.

## Editorial influences

- **NBC-style:** data fluency, live-board energy, on-screen data storytelling, compelling interactive controls.
- **CNN-style:** cinematic map focus, animated geography, clear modular news hierarchy.
- **AP-style:** restrained copy, source attribution, accessible information density and corrections.
- Avoid copying any news organization's logos, trade dress or proprietary artwork.

## Interaction architecture

1. **Top utility strip**: publication phase, data freshness and relevant status.
2. **Persistent masthead**: ABB working identity, coverage, Big Board, exploration and transparency.
3. **Editorial hero**: typography + geographic overview.
4. **Editorial story modules**: evidence-first explainers, original document access and news connections.
5. **The Big Board**: 50-state geographic outline with selectable state paths, click/keyboard zoom, contextual panel, layer changes and reset.
6. **Depth on demand**: Quick Read, Context and Deep Dive modes.
7. **Evidence drawer and source stack**: planned source references, hashes, archived version and correction history.
8. **Accessible alternatives**: state dropdown and reduced-motion treatment.
9. **Admin Control Room**: private, no unauthorized UI or writable routes.

## Core palette

- Background ink: `#101D2C`
- Primary surface: `#FFFFFF`
- Paper: `#F3F5F7`
- Coral editorial accent: `#DD6046`
- Secondary blue: `#28526D`
- Source/metadata text: `#667986`

Never use editorial accent to indicate a party or evaluate a politician. Use explicit labels, not red/blue-only meaning.

## Content discipline

The current page is a **working prototype**: no artificial congressional stories, elected official names, vote claims, live badge, fake sources, or fabricated statistics. National seat count is descriptive, not a data freshness claim. The geographic map is a preview adapted from a public repository with state GeoJSON; official Census geometry and licensing checks are still needed before formal publication. County/district resolution must not be inferred from one ZIP or county. All missing data needs a visible explanation.

## Motion

Use motion to orient geographic context, stage progression and provenance relationships; do not create a permanent urgent-news spectacle. Provide reduced-motion support and avoid continuous CPU-heavy animation on low-end devices.

## Reference-led editorial revision — November 15, 2026

User-provided visual directions:
- Airy, white/off-white editorial typography with expressive serif headlines, expansive whitespace and high-quality article photography, referencing the View Island tablet mockup.
- Sports-news homepage pacing from the OnField mockup: deliberate visual hierarchy, a strong hero, compact summary cards and a navigable information rail.
- Oregon county vote-square example: geographic analysis should distinguish land area from people/votes, and offer equal-unit dot/square encodings when they communicate better than filled maps.
- CNN election map behavior: map drill-down and scoped information panels, not its brand/trade dress.
- Flourish election visualization guide: seat matrices, historical timelines, geographic overlays, small multiples, sourced tables and selectable chart modes.
- Press Gazette audience research: design for direct, repeat news readership with trust and helpful navigation, not traffic-driven sensationalism.

The revised homepage is predominantly **paper white** with dark ink typography and selective green/coral accents. The Big Board remains a cinematic dark contrast workspace. The interactive data lab includes 100 neutral Senate seat cells, an illustrative bill process timeline, and an illustrative evidence relationship diagram; none presents fictitious election outcomes.

Prioritize responsive photography and real source-linked graphics as actual licensed/public-domain assets become available. Do not fake live news, portray invented claims as real, borrow third-party newspaper identities, or infer partisanship from decorative colors. All graphics require captions, accessible alternatives, source attribution and an "as of" timestamp when they represent measured facts.

## Verification before production

- Check layouts at 320, 375, 768, 1024 and 1440+ widths.
- Validate geographic paths and their keyboard focus, zoom boundaries and state labels.
- Check reduced-motion preferences and keyboard focus trapping in dialogs.
- Validate content security policy against scripts, styles and any later image domains.
- Confirm SVG geographical projections against an authoritative Census source.
- Add licensed editorial photography with provenance and localized caching before classifying the newsroom as editorially complete.
