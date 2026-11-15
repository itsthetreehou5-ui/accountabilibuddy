# ABB ↔ PRIM / PRM integration contract

## Verified architecture

PRIM is the private Product Reality Model runtime in `itsthetreehou5-ui/prm-runtime`. ABB is an independent host application, not an owner of PRM's kernel or shared data. PRM's existing `WorkerEntrypoint` provides typed RPC methods including `health`, `ensureSpace`, `ensureSource`, `ensureEvidence`, `assertClaim`, `entitySnapshot`, `currentResolution`, and read-only control-room diagnostics. These methods are **not public HTTP endpoints**.

Current ABB Worker has a Cloudflare **service binding** named `PRM` to **`prm-runtime-staging` only**, plus a guarded read-only `GET /api/integrations/status` health check. No PRM claim, source, evidence or observation writes are enabled, and no production PRM data is accessed. This protects current PRIM/Meridian/Trailhead5 workflows from ABB experimentation.

## Future data contract

ABB maintains the canonical **editorial publication record** independently: source provenance, attribution, public corrections, publish approvals and user-visible snapshots. PRM can maintain **internal temporal evidence/claim continuity** using an ABB-specific space namespace, with source IDs linked to ABB public references.

An ABB ingestion adapter should:
1. Pull original official documents into an ABB staging area, validate license/hash/metadata, and never publish automatically.
2. Optionally upsert identity/evidence into an ABB-scoped PRM staging space through private RPC.
3. Read proposed current resolutions (never treat AI inference as published fact).
4. Require review by authorized ABB editors before writing to ABB's publication ledger.
5. Preserve ABB's public original-source links and versioned correction lineage.
6. Implement retries, idempotency keys, quotas, deduplication, audit events, contract tests, and a one-click kill switch.
7. Stay staged until the owner approves a separate production binding.

## Security boundary

- PRM's `workers_dev` and public preview URLs must remain disabled.
- Never pass private RPC objects or whole snapshots to a public browser.
- Do not reuse PRM production database credentials or open it to ABB.
- ABB's public routes remain GET-only and do not expose the PRM RPC method names beyond a generic connection status.
- Future writes should run from an independently authenticated queue consumer, never directly from user input.
- A PRM staging outage cannot disable ABB's independent public-read website.

## Current limitations

The binding exists, but no externally verified PRM RPC round-trip is available from this environment. Status may report unavailable during staging outages. This is not a production integration or proof of cross-service data correctness.
