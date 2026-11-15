# ABB — Critical product, editorial and UX review
**November 15, 2026 — code/design inspection, not live-browser signoff**

## Executive assessment
The direction is compelling but the currently implemented product is a **geographic prototype with responsible data gaps**, not yet the public accountability destination implied by the brand promise. Its map can help users locate a state and county, but most important questions cannot be answered because verified electoral, legislative, ballot-measure and person-specific records are not yet populated.

### Creative direction
- **Strength:** restrained editorial red/white/blue palette, differentiated typographic tone, purposeful map centerpiece, calm context cards. Avoid a generic government portal.
- **Problem:** the map is visually dominant but the informational payoff is thin. Showing three empty-status cards at every location risks disappointment. A map must deliver an answer, not just a transition.
- **Priority:** tie camera movement, geography labels and 1–3 relevant facts into one responsive interaction; limit ornamental effects and deliver a graceful non-WebGL list alternative. Use official county/district layers and clear dated result legends, not inferred political colors.

### Copywriting
- **Strength:** “Every place has a story. Find yours.” is memorable and invitation-driven.
- **Problem:** repeated “pending,” “not yet,” “verified-only” language is accurate but reads as an apology when it dominates the experience.
- **Priority:** prioritize **what ABB can answer** before coverage limitations; present gaps once, contextually, next to the affected item. Define procedural terms inline with one-sentence explanations. Avoid unsupported absolute claims (“every vote,” “every record”).
- **Recommended decision copy:** “What changed where I live?”; “What happened to what I voted on?”; “What did this person actually vote for?”; “Show me the source.” Avoid treating a personal vote as retrievable: ABB cannot know who or what a person voted for.

### UX/product architecture
- **Strength:** state and county context is retained in URL query parameters and propagated into content; viewer-controlled geographic navigation; accessible select fallback.
- **Problem:** map, summary rail, quick questions and context cards may still require scrolling at laptop height. Some filters are choices about technical data rather than human questions. An empty statewide results index can be mistaken for “there was no election.”
- **Priority:** no more than **three prominent next actions** per state. Keep a location summary and an evidence status within the first viewport. Offer “Explain,” “Explore,” “Sources” levels, not completely different content silos. Preserve breadcrumb/back and selected location across every tab. Check mobile keyboard and touch behavior.
- **Geographic nuance:** counties can overlap congressional districts; Senate contests are statewide only in states with an election that year; state law can affect every county but is not county-enacted law. Geography is not authority. District coverage requires official intersection geometry.

## Three visitor journeys

### 1 — Politically new or overwhelmed
**Question:** “This happened here — what does it mean for me?”
**First-screen answer:** location + one plain-language event summary, practical status (proposed / passed / signed / effective / blocked), why it matters, named public authority with exact role, and a primary source. Unknown = clearly unknown.
**Next action:** “Explain the process” with a diagram and glossary, not a wall of legislative citations.
**Success:** can accurately explain what happened and whether it is currently in effect in under a minute, when verified data exists.

### 2 — Familiar, curious voter (primary)
**Question A:** “The things I voted on — what happened?”
**Correct handling:** the voter chooses an election, jurisdiction, measure or candidate. ABB **never claims access to their private ballot choices**. Show certified results, implementation status, subsequent court challenges, and policy consequences. Ballot measures may be state or municipal, not necessarily federal legislation.
**Question B:** “They said X, but what did they vote for?”
**Correct handling:** find official; show a dated exact quotation and its source, then a roll-call record with yea/nay/not voting, measure number, title, amendment version, stage, and outcome. Explain whether the two are truly comparable; don't mechanically label contradictions.
**Success:** reaches the relevant measure or official in 2–3 clear interactions, with optional fact-check depth.

### 3 — Researcher, journalist or civic professional
**Question:** “Can I reproduce and cite this claim?”
**Required:** unique canonical URLs, source provenance and capture dates, original legislative PDFs/roll calls, review history, correction history, as-of timestamps, distinctions between unofficial and certified results, tabular exports, machine-readable schemas, jurisdiction scope, and full-text search.
**Success:** can trace every factual statement to a reproducible original source and see unresolved ambiguity.

## Trust and political neutrality — mandatory
- Red = verified Republican result, blue = verified Democratic result, neutral = data unavailable. Don't color a county using state-level results.
- The national 2024 presidential baseline is a **historical election**, not a current 2026 race or a durable predictive partisan leaning.
- Event attribution separates signed, voted for/against, sponsored, introduced, administered, publicly supported/opposed and ruled. No guilt by association.
- Promise/action alignment is an editorial assessment with rationale and review status; publication cannot occur autonomously.
- Distinguish people who hold federal, state, county or judicial power, even when an event affects the same geography.
- Don't suggest that a user's ballot preferences have been read or inferred.

## Release gates and honesty
- [x] React + MapLibre TypeScript and Vite build passed in GitHub Actions (before latest UX additions; rerun required).
- [x] Existing Cloudflare Worker unit tests passed on staging PR.
- [x] Successful GitHub Actions artifact download and ZIP integrity verification.
- [ ] Cloudflare **staging deployment with public URL** (not yet achieved; connector showed conflicting authorization prompts).
- [ ] Real browser QA for state/county interactions and video/screen captures. Local headless Chromium network policy blocked loopback; no assertion of visual QA.
- [ ] Census 2026 endpoint end-to-end and map layer correctness, including 50 states, DC and territories policy, Alaska/Hawaii and county enclaves.
- [ ] Verified published federal contests, county results, ballot measures and person dossiers ingested and reviewed.
- [ ] Accessible keyboard map select, touch pan, reduced motion and performance validated across devices.
- [ ] Reproducible dependency lockfile and staged static-assets deployment pipeline.

## Top five next product deliverables
1. **Follow my ballot:** state/date/measure lookup, published results and legal implementation timeline with source record.
2. **Said vs did:** people search, exact commitments, official votes and contextual review, not false contradiction detection.
3. **What changed here?:** real published legislative and executive events, decision-maker roles and local impact.
4. **Geo-accuracy:** official congressional district geometry intersected with counties and source-dated contest maps.
5. **Professional transparency:** cited data exports, versioned evidence and corrections.

### Design north star
**The map chooses the context. The answer comes first. The receipts are always one tap away.**
