/**
 * The `players` table is managed externally (synced from mytennis.ch).
 *
 * Actual columns (as of 2026-03):
 *   id                  INTEGER PRIMARY KEY
 *   first_name          TEXT
 *   last_name           TEXT
 *   license_nr          TEXT
 *   classification      TEXT
 *   classification_value NUMERIC
 *   competition_value   NUMERIC
 *   ranking             INTEGER
 *   best_classification TEXT
 *   best_ranking        INTEGER
 *   last_classification TEXT
 *   age_category        TEXT
 *   license_status      SMALLINT
 *   gender              SMALLINT
 *   canton              TEXT
 *   club_id             INTEGER
 *   club_name           TEXT
 *   club_city           TEXT
 *   raw                 JSONB
 *   content_hash        TEXT
 *   synced_at           TIMESTAMPTZ
 *   created_at          TIMESTAMPTZ
 */
