# Isolated Cloudflare staging deployment

**Status:** staging configuration committed. It is *not* proof of a deployed URL. Never replace or update the current `accountabilibuddy` public Worker until the staging URL has been independently checked.

## Isolation

- Dedicated Worker: `accountabilibuddy-map-staging`, distinct from `accountabilibuddy`.
- Static React + MapLibre assets served from `/map-lab/`.
- `src/staging-worker.ts` proxies only GET/HEAD allowlisted public API paths to the current public ABB Worker.
- **No** D1/R2/PRIM or staff/admin bindings in the staging Worker. Private data and server-side publishing remain inaccessible.
- County geography uses official 2026 Census TIGERweb data through ABB's public GeoJSON proxy.
- Historical red/blue state map is the **2024 presidential popular-vote winner**, not 2026 partisan lean.

## Build and preview gates

1. Check `React Map Explorer Build` and `Validate public Worker` GitHub Actions on pull request #7.
2. In `apps/map-explorer`, use Node 22.18+ (cf configuration requirement), install dependencies and run `npm run build`.
3. Run `npm run check:staging`. This is the Cloudflare CLI's **dry-run** and must not modify Cloudflare.
4. When the account has an authorized scoped staging deploy credential, run `npm run deploy:staging`. Do not use PRM or other projects' Cloudflare build tokens.
5. Confirm `https://accountabilibuddy-map-staging.itsthetreehou5.workers.dev/map-lab/` **only after** the Worker deployment reports an exact live route. Until then, that string is an expected pattern, **not a verified URL**.
6. Browser QA: source loading, camera animation, pan and keyboard controls, back/URL history, Alaska/Hawaii, northeast, county click, 375/768/1440 widths, reduced motion, touch and WebGL fallback.
7. Verify `/api/health`, `/api/geography/states`, `/api/geography/counties?state=NM`, `/api/elections/contests?state=NM`, `/api/public/events?state=NM` and ballot-measure endpoints. Note: branch-added endpoints need separate, approved publication-side deployment; the preview will not invent data if unavailable.
8. Promote to the existing public homepage only after visual acceptance and full CI; do not deploy private staging PRM or unrelated Workers.

## Authentication limitation

ChatGPT's Cloudflare connector recently issued contradictory authorization prompts, including a non-functional browser setup URL. Read requests did work, but this was **not** proof of reliable authorization for a new static asset deployment. No repeated reconnection should be requested from the user. Automated staging deployment remains gated on a working scoped credential.

## Launch UX acceptance

Three paths must lead from the same map: (1) plain-language explanation for a beginner, (2) question-driven ballot/official follow-up for an engaged voter, and (3) evidence-grade sources for a professional. No false certainty about a person's vote, a county's partisan lean, or a promise contradiction.
