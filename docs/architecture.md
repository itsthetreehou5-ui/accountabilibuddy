# Architecture & safeguards

## Current infrastructure
- Independent Cloudflare Worker `accountabilibuddy` provides a read-only foundation preview.
- U.S.-jurisdiction D1 `accountabilibuddy-core` contains indexed, relational provenance, review and activity tables.
- Private R2 bucket `accountabilibuddy-evidence-private` is reserved for licensed evidence snapshots. Never expose it as a public writable bucket.
- GitHub repository is source-of-truth. GitHub-to-Cloudflare repository connection exists; automatic build/deployment still requires a dedicated, scoped build credential and a verified deployment trigger.

## Planned expansion
- PostgreSQL primary database with partitioning and Cloudflare Hyperdrive for long-term large-scale write-intensive datasets; source archival in private R2; cache public read-heavy endpoints.
- Source ingestors fetch Congress.gov, House and Senate official voting sources, FEC and Census geometry using documented terms, quotas and refresh cadences.
- Separate ingestion, staging, editorial review, published-record and immutable event/history boundaries.
- Role-based auth enforced in server endpoints, SSO/passkeys and mandatory MFA for staff; approval workflow for impactful updates.
- Scoped admin roles: owner, system administrator, source ingestion maintainer, editor, fact checker, community moderator, auditor (read-only).
- Allow contributor submissions, but no direct writes to published official records.
- Public methodology dashboard: source freshness, coverage gaps, corrections, disputed records, audit export, and methodology versions.
- Downloadable signed, timestamped, versioned public data snapshots (license permitting) with integrity checks; service worker alone only caches the public site shell.
- Automated restores from off-site encrypted backups, test restores, incident response, vulnerability disclosure, WAF and Turnstile on risky endpoints, rate limits, dependency scanning, and deployment rollbacks.

## Data principles
- Raw original evidence is distinct from extracted assertions and editor commentary.
- Voting record associations are not automatically interpreted as promise fulfillment.
- Every published fact links to provenance; contested interpretations are explicitly attributed.
- Historical geographic boundaries must be versioned by congressional session.
- Never claim unlimited scalability, perfect neutrality or invulnerability; measure error rates and source coverage publicly.
