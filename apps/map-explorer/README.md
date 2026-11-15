# ABB Next-Generation Big Board

**Staged React + MapLibre geographic explorer**, not yet a replacement for the live Worker homepage.

It uses 2026 U.S. Census state and county GeoJSON through ABB's read-only `/api/geography/states` and `/api/geography/counties?state=XX` endpoints and an OpenFreeMap basemap. OpenFreeMap/OpenStreetMap attribution is displayed by MapLibre. Geographic boundaries do **not** provide evidence of election results.

Current national coloring is a **2024 FEC presidential statewide popular-vote winner baseline**, explicitly not 2026 House/Senate results. There is no county partisan-color inference. No private data, admin editing or PRIM RPC is exposed to the browser.

## Work locally

```bash
cd apps/map-explorer
npm install
npm run build
npm run dev
```

The project needs a verified CI/build-and-assets deployment to Cloudflare Workers Static Assets before switching the live homepage. The current Worker must stay live until those checks succeed.

## Release gate

1. Verify npm dependency versions with a generated lockfile in CI.
2. Confirm the state and county Census endpoints, GeoJSON completeness, cache headers and failure fallback.
3. Run map navigation QA for Alaska, Hawaii, all other states, counties, geographic enclaves and touch gestures.
4. Ensure reduced motion, keyboard-accessible state/county selection, color-contrast and WebGL-disabled fallback.
5. Review third-party basemap availability/privacy and decide whether to host a regional vector-tile service for offline availability.
6. Connect Cloudflare Workers Static Assets deployment on a dedicated staging route or Worker with protected CI; no production changes until tested.

## External data

- TIGERweb Current 2026: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/layers
- OpenFreeMap: https://openfreemap.org/quick_start/
- FEC historical baseline: https://www.fec.gov/resources/cms-content/documents/2024presgeresults.pdf

This directory does **not** implement fully offline basemap tiles. Basic Worker shell caching alone is not a complete offline map.
