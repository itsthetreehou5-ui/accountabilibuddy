PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS staff_principals (
 id TEXT PRIMARY KEY, identity_provider_subject TEXT NOT NULL UNIQUE,
 display_name TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_authenticated_at TEXT
);
CREATE TABLE IF NOT EXISTS staff_role_grants (
 principal_id TEXT NOT NULL REFERENCES staff_principals(id),
 role TEXT NOT NULL CHECK(role IN ('owner','system_admin','ingestion_maintainer','editor','fact_checker','community_moderator','auditor')),
 granted_by TEXT NOT NULL, granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TEXT, revoked_at TEXT,
 PRIMARY KEY(principal_id,role,granted_at)
);
CREATE TABLE IF NOT EXISTS publication_versions (
 id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
 version_number INTEGER NOT NULL, published_payload_json TEXT NOT NULL,
 evidence_manifest_hash TEXT NOT NULL,
 approved_by TEXT NOT NULL, published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 supersedes_id TEXT, UNIQUE(entity_type,entity_id,version_number)
);
CREATE TABLE IF NOT EXISTS public_corrections (
 id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
 before_version_id TEXT, after_version_id TEXT,
 explanation TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_roles_principal ON staff_role_grants(principal_id,revoked_at);
CREATE INDEX IF NOT EXISTS idx_publication_versions ON publication_versions(entity_type,entity_id,version_number);
CREATE INDEX IF NOT EXISTS idx_corrections_entity ON public_corrections(entity_type,entity_id);
