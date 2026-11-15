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

## Warm editorial motion revision — November 15, 2026

Inspired by the user-supplied AquaCrop reference, ABB's neutral interface moves from hard white/blue to warm off-white/cream, soft olive/forest greens, rounded surfaces and a calmer visual rhythm. Preserve credibility, accessible contrast and restrained typography. Avoid adopting the source application's specific branding or layout.

The map remains the dominant hero element and currently renders static state geography in SVG. Animated navigation now uses `requestAnimationFrame`, cubic ease-in-out interpolation between viewBox coordinates, cancellation of superseded animations, and a reduced-motion bypass. The full Big Board and hero map remain synchronized through their shared state selection. An animated answer panel reinforces cause and effect without delaying readable answers.

This is an incremental SVG implementation, **not a React migration**. Consider React when routing, shared state across complex pages, district tiles, and streaming updates justify a component architecture; do not regress the existing Worker security model or depend on third-party CDN scripts for the offline-ready shell.

Next validation: external browser QA, real touch gesture/pan behavior, performance with county geometries, 60fps motion budgets, reduced-motion audit, keyboard navigation, and high contrast. For broader geography, favor MapLibre/vector tiles plus React state transitions over ever-larger SVG path sets.

## Red / white / blue and county race mapping — November 15, 2026

ABB's core palette is now American red, white and blue:
- Editorial paper/white: `#FCFCFA` and `#FFFFFF`.
- Navy navigation/map stage: `#112C4A`.
- Newsroom red for UI actions and editorial emphasis: `#C72E44`.
- Data blue for **verified Democratic results only**: `#1F5DA8`.
- Data red for **verified Republican results only**: `#C72E44`.
- Neutral geography without published results: `#D4DCE3` and subdued slate blues; always label as **no verified result**.

Do not confuse blue interface chrome or decorative backgrounds with partisan outcomes. Once real election data is available, geographic fills must be keyed to the selected contest, year, geography and published source. Avoid coloring a county based on statewide vote totals or using a raw 2026 election snapshot as an undated claim of long-term partisan lean.

### Geographic information hierarchy

1. **U.S. overview:** 50 state map; user selects state.
2. **State view:** animate zoom; query the Census TIGERweb 2026 counties feature layer, show selectable county boundaries and update race cards in the right-side panel.
3. **County view:** county label and FIPS identifier; list intersecting House races only after official congressional boundaries have been intersected; Senate is a statewide contest only where one is actually on the ballot.
4. **Race view:** verified candidates, contest status, vote shares, turnout, reporting/certification flags, source links, time, changes and historical comparison, once ingested.
5. **Person dossier:** biographical tenure, official positions, promises, votes, committees, finances, sourced news, contradictions and changes with moderated context and corrections.

The current preview supports state selection, live Census geography fetch via a validated Worker proxy, county selection, and Senate/House explanatory race cards. **It does not have county votes, recorded county lean, candidate results, house-district overlap geometries or live individuals yet.** Never fabricate them.

Geography: U.S. Census Bureau TIGERweb current-2026 Counties layer 82, with state FIPS allowlisting, server-side filtered GeoJSON, short-term caching and error notice. Before launch, validate all state geometry projections and request performance, and replace the hand-projected 50-state base with authoritative tile-backed geography as scale requires.

## One-screen decision experience and local event attribution

The homepage Big Board is a **decision surface**, not a scrolling article. Keep the state map large, the right summary concise, and the deeper race/evidence cards directly below. Show a maximum of a few meaningful next actions first; only expand detail at the visitor's request.

A map selection changes the **entire context together**: geography, race listings, 2024 presidential baseline where relevant, 2026 sourced contests, verified local civic developments and provenance. The location-linked events module shows one short status line first and an optional source-backed event list; individual events open an action trail with:
- What happened and when, and at what level of government.
- Precisely which officials signed, sponsored, voted for/against, ordered, or merely commented.
- Original bills, vote records, executive documents or court rulings.
- Related campaign promises and separately reviewed alignment assessment.
- Review and publication provenance; contradictory evidence and corrections.

Avoid conflating federal House/Senate authority with state governors, state legislatures, courts, or local officials. An event affecting a county is not necessarily a county-enacted law. A state measure affects all counties under its jurisdiction unless exceptions or injunctions apply. No automatic claim that a politician "caused" an outcome without evidentiary grounds.

Example about an Iowa abortion measure is **hypothetical**, not a pre-verified news event or accusation. Nothing is published as a local news fact without primary sources and review.

Current build: versioned civic-event schema, granular actor roles, source-linked attributions, moderated promise alignment, read-only published-event APIs, compact location contextual module and event details. No actual verified local civic event corpus is populated yet. The event module must state incomplete coverage instead of making up headlines.

## Kinetic map and contextual editorial system — November 15, 2026

The geographic stage is the primary interaction, not a decorative illustration or a gateway to disconnected pages.

**Focus-state treatments**
- A selected state/county produces a smoothly interpolated map viewport, geographic context label, focus shadow, layer emphasis and translucent information surfaces. County labels and borders enter after official geometry is retrieved.
- Hover feedback previews geographic names without changing the user's selected context.
- Zoom-in/zoom-out, previous/next geography, national reset, keyboard selection and reduced-motion handling remain available.
- Dark navy / newsroom red / clear white and neutral county coloring are maintained. The red and blue nationwide map uses a dated 2024 FEC-certified presidential winner baseline, **not 2026 congressional results or predicted partisan lean**.

**Map-attached contextual newsroom**
- The standalone “EXPLORE / MORE THAN THE HEADLINES” feature strip has been retired. Its three functional concepts now exist as map-linked contextual lenses: **At a glance**, **Timeline**, **Promises & actions**, and **Evidence & context**.
- The side rail stays short and decision-oriented; information and relevant actions can expand in the dock immediately under the map.
- The editorial briefing below receives the active state/county and explicitly remains an explainer until real verified local reporting is ingested.
- Contextual lenses describe future sources honestly when publication coverage is empty. No placeholder election winner or unverified political accusation may be published.
- Visual animation is bounded, interruptible, accessible, and is never required to obtain an answer.
- The native SVG geographic prototype should be upgraded to MapLibre/vector tiles plus React coordinated state when verified district/large county geometry and actual reporting demand it.

**QA required before public launch:** external browser snapshots at laptop/desktop/mobile widths; map readability for AK/HI, small northeastern states and county enclaves; keyboard/zoom/a11y tests; frame-budget performance; browser-based interaction tests; verify absence of console errors. Script syntax and Cloudflare deployment acceptance alone are not equivalent to full rendering QA.
