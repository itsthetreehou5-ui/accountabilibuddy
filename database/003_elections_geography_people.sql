PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS geographic_areas (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('state','county','congressional_district','territory','other')),
 fips_geoid TEXT,
 state_code TEXT,
 name TEXT NOT NULL,
 geographic_vintage TEXT NOT NULL,
 source_id TEXT REFERENCES sources(id),
 UNIQUE(kind,fips_geoid,geographic_vintage)
);
CREATE INDEX IF NOT EXISTS idx_geo_state_kind ON geographic_areas(state_code,kind,geographic_vintage);
CREATE TABLE IF NOT EXISTS electoral_contests (
 id TEXT PRIMARY KEY,
 election_date TEXT NOT NULL,
 election_type TEXT NOT NULL,
 state_code TEXT NOT NULL,
 office TEXT NOT NULL CHECK(office IN ('us_senate','us_house')),
 district TEXT,
 ballot_seat TEXT,
 publication_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK(publication_status IN ('unreviewed','under_review','published','withdrawn')),
 result_status TEXT NOT NULL DEFAULT 'unknown' CHECK(result_status IN ('unknown','unofficial','certified','recount','contested')),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK((office='us_senate' AND district IS NULL) OR (office='us_house' AND district IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_contests_state_date ON electoral_contests(state_code,election_date,office);
CREATE TABLE IF NOT EXISTS electoral_candidates (
 id TEXT PRIMARY KEY,
 contest_id TEXT NOT NULL REFERENCES electoral_contests(id),
 person_id TEXT,
 display_name TEXT NOT NULL,
 ballot_party TEXT,
 official_candidate_id TEXT,
 UNIQUE(contest_id,official_candidate_id)
);
CREATE TABLE IF NOT EXISTS contest_result_records (
 id TEXT PRIMARY KEY,
 contest_id TEXT NOT NULL REFERENCES electoral_contests(id),
 candidate_id TEXT NOT NULL REFERENCES electoral_candidates(id),
 geographic_area_id TEXT NOT NULL REFERENCES geographic_areas(id),
 votes INTEGER NOT NULL CHECK(votes>=0),
 as_of TEXT NOT NULL,
 source_id TEXT NOT NULL REFERENCES sources(id),
 official_status TEXT NOT NULL CHECK(official_status IN ('unofficial','certified','revised')),
 supersedes_id TEXT,
 published_version_id TEXT REFERENCES publication_versions(id)
);
CREATE INDEX IF NOT EXISTS idx_results_contest_geography ON contest_result_records(contest_id,geographic_area_id,as_of);
CREATE TABLE IF NOT EXISTS geographic_intersections (
 county_area_id TEXT NOT NULL REFERENCES geographic_areas(id),
 district_area_id TEXT NOT NULL REFERENCES geographic_areas(id),
 geographic_vintage TEXT NOT NULL,
 source_id TEXT NOT NULL REFERENCES sources(id),
 PRIMARY KEY(county_area_id,district_area_id,geographic_vintage)
);
CREATE TABLE IF NOT EXISTS person_subjects (
 id TEXT PRIMARY KEY,
 normalized_name TEXT NOT NULL,
 external_bioguide_id TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS person_report_sections (
 id TEXT PRIMARY KEY,
 person_id TEXT NOT NULL REFERENCES person_subjects(id),
 category TEXT NOT NULL,
 title TEXT NOT NULL,
 explanation TEXT,
 publication_version_id TEXT REFERENCES publication_versions(id),
 published_at TEXT,
 UNIQUE(person_id,category,title)
);
CREATE INDEX IF NOT EXISTS idx_person_reports ON person_report_sections(person_id,category);
