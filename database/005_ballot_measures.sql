PRAGMA foreign_keys=ON;
-- Location-level ballot results are public; individual voters' choices are not collected.
CREATE TABLE IF NOT EXISTS ballot_measures (
 id TEXT PRIMARY KEY,
 state_code TEXT NOT NULL,
 election_date TEXT NOT NULL,
 designation TEXT NOT NULL,
 title TEXT NOT NULL,
 question_text TEXT,
 jurisdiction_level TEXT NOT NULL CHECK(jurisdiction_level IN ('state','county','city','special_district')),
 jurisdiction_geoid TEXT,
 measure_type TEXT,
 outcome TEXT NOT NULL DEFAULT 'unknown' CHECK(outcome IN ('unknown','approved','rejected','pending','invalidated')),
 outcome_status TEXT NOT NULL DEFAULT 'unknown' CHECK(outcome_status IN ('unknown','unofficial','certified','recount','contested')),
 legal_status TEXT NOT NULL DEFAULT 'unknown' CHECK(legal_status IN ('unknown','proposed','pending_implementation','partially_effective','in_effect','blocked','overturned','repealed','expired')),
 effective_date TEXT,
 source_id TEXT NOT NULL REFERENCES sources(id),
 publication_version_id TEXT REFERENCES publication_versions(id),
 published_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(state_code,election_date,jurisdiction_level,jurisdiction_geoid,designation)
);
CREATE INDEX IF NOT EXISTS idx_ballot_measures_lookup ON ballot_measures(state_code,election_date,jurisdiction_level,published_at);
CREATE TABLE IF NOT EXISTS ballot_measure_updates (
 id TEXT PRIMARY KEY,
 measure_id TEXT NOT NULL REFERENCES ballot_measures(id),
 event_date TEXT NOT NULL,
 event_kind TEXT NOT NULL CHECK(event_kind IN ('ballot_certified','result_updated','enacted','implementation','court_action','amended','repealed','other')),
 status_summary TEXT NOT NULL,
 legal_effect TEXT,
 source_id TEXT NOT NULL REFERENCES sources(id),
 publication_version_id TEXT REFERENCES publication_versions(id),
 published_at TEXT,
 supersedes_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_ballot_measure_updates ON ballot_measure_updates(measure_id,event_date,published_at);
