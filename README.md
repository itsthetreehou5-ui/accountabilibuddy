# Accountabilibuddy

**Democracy has receipts.**

A nonpartisan civic intelligence platform designed to connect official congressional records, election commitments, legislation, geographically accurate representation, independent reporting, and moderated community context through visual storytelling.

## Current status — infrastructure preview

The public foundation Worker exists, and the U.S.-jurisdiction D1 schema and private R2 evidence bucket are provisioned. **No verified congressional records have been ingested yet. No public editing and no admin login are enabled.**

## Project principles

- Facts, interpretations, source types and unresolved claims remain distinct.
- Cite original sources, timestamps, retrieval details, corrections and coverage gaps.
- Public users cannot directly edit verified records.
- Community contributions require evidence and editorial moderation before publication.
- Data and review decisions are versioned and auditable.
- Apply the same verification requirements regardless of party.
- Track data freshness publicly; admit uncertainty and missing coverage.
- Enable offline public shell now; signed, versioned, licensed dataset exports later.

## Architecture

- **Application:** Cloudflare Worker (`src/worker.js`), read-only public foundation.
- **Relational storage:** D1 `accountabilibuddy-core` (SQL migrations in `database/`). Future move to PostgreSQL + Hyperdrive when scale and write patterns justify it.
- **Private archives:** R2 `accountabilibuddy-evidence-private`.
- **Tests:** Node's built-in test runner and GitHub Actions checks.
- **Source integration:** GitHub repository connection to Cloudflare created. **Automated Builds deployment trigger is not yet enabled**; it needs a project-specific scoped credential. Do not use credentials from another project.
- **Security:** No published write API; privileged paths return 404; common security headers; publication/review schemas; no staff logins until proper server-side authorization exists.

## Get started locally

```bash
npm run check
npm test
```

## Transparency standard

The goal is to be more independently inspectable than conventional news aggregation: original references, evidence manifests, published corrections, ingestion timelines, moderation decisions, and known limitations. That's a design goal, **not a currently verified claim of superior accuracy**.

Read [architecture](docs/architecture.md) and [security](SECURITY.md).

## Next milestones

1. Dedicated CI/CD deployment identity; protect `main` and require checks.
2. Proper identity provider, MFA, scoped admin accounts, approval workflow and security review.
3. Official source ingestion with provenance and rate-limit safeguards.
4. National district geographic boundaries and address-to-district resolution.
5. Moderated context, correction, publication, audit and data-quality dashboards.
6. Large-scale storage migration if real load testing establishes the need.
7. Public downloadable dataset snapshots and offline map-data packages where licensing permits.
