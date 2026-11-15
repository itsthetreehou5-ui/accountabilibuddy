PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS civic_events (
 id TEXT PRIMARY KEY, headline TEXT NOT NULL, summary TEXT NOT NULL,
 event_kind TEXT NOT NULL CHECK(event_kind IN ('legislation','executive_action','court_ruling','administrative_action','election','other')),
 happened_at TEXT NOT NULL, jurisdiction_level TEXT NOT NULL CHECK(jurisdiction_level IN ('federal','state','county','municipal')),
 state_code TEXT, county_geoid TEXT, affected_area_note TEXT,
 reported_status TEXT NOT NULL DEFAULT 'pending' CHECK(reported_status IN ('pending','reviewed','published','withdrawn')),
 source_id TEXT NOT NULL REFERENCES sources(id),
 published_version_id TEXT REFERENCES publication_versions(id),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_civic_event_area ON civic_events(state_code,county_geoid,happened_at);
CREATE TABLE IF NOT EXISTS civic_event_actors (
 event_id TEXT NOT NULL REFERENCES civic_events(id),
 person_id TEXT NOT NULL REFERENCES person_subjects(id),
 role TEXT NOT NULL CHECK(role IN ('signed','voted_for','voted_against','sponsored','introduced','administered','ordered','ruled','publicly_supported','publicly_opposed','other')),
 evidence_source_id TEXT NOT NULL REFERENCES sources(id),
 explanation TEXT NOT NULL,
 PRIMARY KEY(event_id,person_id,role,evidence_source_id)
);
CREATE TABLE IF NOT EXISTS civic_event_commitments (
 event_id TEXT NOT NULL REFERENCES civic_events(id),
 claim_id TEXT NOT NULL REFERENCES claims(id),
 alignment TEXT NOT NULL CHECK(alignment IN ('consistent','potential_conflict','unclear')),
 rationale TEXT NOT NULL,
 reviewed_by TEXT,
 PRIMARY KEY(event_id,claim_id)
);
CREATE TABLE IF NOT EXISTS civic_event_coverage (
 event_id TEXT NOT NULL REFERENCES civic_events(id),
 source_id TEXT NOT NULL REFERENCES sources(id),
 coverage_type TEXT NOT NULL CHECK(coverage_type IN ('primary','reporting','fact_check','analysis')),
 PRIMARY KEY(event_id,source_id)
);
