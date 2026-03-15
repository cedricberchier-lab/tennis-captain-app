/**
 * SQL DDL for the tennis player cache tables.
 *
 * Run via /api/tennis-players/init-db (or call initTennisPlayersSchema() directly).
 *
 * Tables:
 *   players      — normalised cache of players fetched from mytennis
 *   player_clubs — one-to-many clubs per player
 *   sync_logs    — lightweight audit log for search/fetch operations
 */

export const CREATE_TENNIS_PLAYERS = `
CREATE TABLE IF NOT EXISTS players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source     VARCHAR(50)  NOT NULL DEFAULT 'mytennis',
  external_id         INTEGER      NOT NULL,
  first_name          VARCHAR(255) NOT NULL DEFAULT '',
  last_name           VARCHAR(255) NOT NULL DEFAULT '',
  full_name           VARCHAR(255) NOT NULL DEFAULT '',
  licence_number      VARCHAR(100),
  classification      VARCHAR(50),
  classification_value NUMERIC,
  competition_value   NUMERIC,
  ranking             INTEGER,
  best_classification VARCHAR(50),
  best_ranking        INTEGER,
  last_classification VARCHAR(50),
  last_ranking        INTEGER,
  age_category        VARCHAR(100),
  license_status      VARCHAR(50),
  interclub_status    VARCHAR(50),
  fetched_at          TIMESTAMPTZ  DEFAULT NOW(),
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (external_source, external_id)
);
`;

export const CREATE_TENNIS_PLAYER_CLUBS = `
CREATE TABLE IF NOT EXISTS player_clubs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_external_id  INTEGER      NOT NULL,
  club_name           VARCHAR(255) NOT NULL DEFAULT '',
  member_relationship INTEGER,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);
`;

export const CREATE_TENNIS_SYNC_LOGS = `
CREATE TABLE IF NOT EXISTS sync_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation     VARCHAR(50)  NOT NULL,
  keyword       VARCHAR(255),
  external_id   INTEGER,
  status        VARCHAR(20)  NOT NULL DEFAULT 'ok',
  record_count  INTEGER      DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
`;
