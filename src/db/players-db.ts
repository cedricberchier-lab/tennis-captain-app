import { sql } from "@vercel/postgres";
import { TennisPlayer, TennisPlayerClub } from "@/lib/players/schemas";
import {
  CREATE_TENNIS_PLAYERS,
  CREATE_TENNIS_PLAYER_CLUBS,
  CREATE_TENNIS_SYNC_LOGS,
} from "./schema";

// ─── Schema init ────────────────────────────────────────────────────────────

export async function initTennisPlayersTables(): Promise<void> {
  await sql.query(CREATE_TENNIS_PLAYERS);
  await sql.query(CREATE_TENNIS_PLAYER_CLUBS);
  await sql.query(CREATE_TENNIS_SYNC_LOGS);
}

// ─── Player upsert ──────────────────────────────────────────────────────────

export async function upsertTennisPlayer(player: TennisPlayer): Promise<void> {
  await sql`
    INSERT INTO tennis_players (
      external_source, external_id,
      first_name, last_name, full_name,
      licence_number, classification, classification_value,
      competition_value, ranking,
      best_classification, best_ranking,
      last_classification, last_ranking,
      age_category, license_status, interclub_status,
      fetched_at, updated_at
    ) VALUES (
      ${player.externalSource}, ${player.externalId},
      ${player.firstName}, ${player.lastName}, ${player.fullName},
      ${player.licenceNumber ?? null}, ${player.classification ?? null},
      ${player.classificationValue ?? null},
      ${player.competitionValue ?? null}, ${player.ranking ?? null},
      ${player.bestClassification ?? null}, ${player.bestRanking ?? null},
      ${player.lastClassification ?? null}, ${player.lastRanking ?? null},
      ${player.ageCategory ?? null}, ${player.licenseStatus ?? null},
      ${player.interclubStatus ?? null},
      ${player.fetchedAt ?? new Date().toISOString()}, NOW()
    )
    ON CONFLICT (external_source, external_id) DO UPDATE SET
      first_name          = EXCLUDED.first_name,
      last_name           = EXCLUDED.last_name,
      full_name           = EXCLUDED.full_name,
      licence_number      = COALESCE(EXCLUDED.licence_number, tennis_players.licence_number),
      classification      = COALESCE(EXCLUDED.classification, tennis_players.classification),
      classification_value= COALESCE(EXCLUDED.classification_value, tennis_players.classification_value),
      competition_value   = COALESCE(EXCLUDED.competition_value, tennis_players.competition_value),
      ranking             = COALESCE(EXCLUDED.ranking, tennis_players.ranking),
      best_classification = COALESCE(EXCLUDED.best_classification, tennis_players.best_classification),
      best_ranking        = COALESCE(EXCLUDED.best_ranking, tennis_players.best_ranking),
      last_classification = COALESCE(EXCLUDED.last_classification, tennis_players.last_classification),
      last_ranking        = COALESCE(EXCLUDED.last_ranking, tennis_players.last_ranking),
      age_category        = COALESCE(EXCLUDED.age_category, tennis_players.age_category),
      license_status      = COALESCE(EXCLUDED.license_status, tennis_players.license_status),
      interclub_status    = COALESCE(EXCLUDED.interclub_status, tennis_players.interclub_status),
      fetched_at          = EXCLUDED.fetched_at,
      updated_at          = NOW()
  `;
}

// ─── Club upsert ────────────────────────────────────────────────────────────

export async function upsertTennisPlayerClubs(
  clubs: TennisPlayerClub[]
): Promise<void> {
  if (clubs.length === 0) return;

  // Delete existing clubs for this player then re-insert
  const externalId = clubs[0].playerExternalId;
  await sql`DELETE FROM tennis_player_clubs WHERE player_external_id = ${externalId}`;

  for (const club of clubs) {
    await sql`
      INSERT INTO tennis_player_clubs (player_external_id, club_name, member_relationship)
      VALUES (${club.playerExternalId}, ${club.clubName}, ${club.memberRelationship ?? null})
    `;
  }
}

// ─── Lookup ─────────────────────────────────────────────────────────────────

export async function getTennisPlayerByExternalId(externalId: number): Promise<{
  player: TennisPlayer | null;
  clubs: TennisPlayerClub[];
}> {
  const { rows: playerRows } = await sql`
    SELECT * FROM tennis_players
    WHERE external_source = 'mytennis' AND external_id = ${externalId}
    LIMIT 1
  `;

  if (playerRows.length === 0) return { player: null, clubs: [] };

  const row = playerRows[0];
  const player: TennisPlayer = {
    id: `mytennis:${row.external_id}`,
    externalSource: "mytennis",
    externalId: Number(row.external_id),
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    fullName: row.full_name ?? "",
    licenceNumber: row.licence_number ?? null,
    classification: row.classification ?? null,
    classificationValue: row.classification_value != null ? Number(row.classification_value) : null,
    competitionValue: row.competition_value != null ? Number(row.competition_value) : null,
    ranking: row.ranking != null ? Number(row.ranking) : null,
    bestClassification: row.best_classification ?? null,
    bestRanking: row.best_ranking != null ? Number(row.best_ranking) : null,
    lastClassification: row.last_classification ?? null,
    lastRanking: row.last_ranking != null ? Number(row.last_ranking) : null,
    ageCategory: row.age_category ?? null,
    licenseStatus: row.license_status ?? null,
    interclubStatus: row.interclub_status ?? null,
    fetchedAt: row.fetched_at ? String(row.fetched_at) : null,
  };

  const { rows: clubRows } = await sql`
    SELECT * FROM tennis_player_clubs WHERE player_external_id = ${externalId}
  `;

  const clubs: TennisPlayerClub[] = clubRows.map((r) => ({
    playerExternalId: Number(r.player_external_id),
    clubName: r.club_name ?? "",
    memberRelationship: r.member_relationship != null ? Number(r.member_relationship) : null,
  }));

  return { player, clubs };
}

// ─── Search ─────────────────────────────────────────────────────────────────

export async function searchTennisPlayers(
  keyword: string,
  limit = 30
): Promise<TennisPlayer[]> {
  const like = `%${keyword}%`;
  const { rows } = await sql`
    SELECT tp.*, STRING_AGG(tpc.club_name, ', ' ORDER BY tpc.club_name) AS clubs
    FROM tennis_players tp
    LEFT JOIN tennis_player_clubs tpc ON tpc.player_external_id = tp.external_id
    WHERE tp.full_name ILIKE ${like}
       OR tp.first_name ILIKE ${like}
       OR tp.last_name  ILIKE ${like}
    GROUP BY tp.id
    ORDER BY tp.full_name ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: `mytennis:${row.external_id}`,
    externalSource: "mytennis" as const,
    externalId: Number(row.external_id),
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    fullName: row.full_name ?? "",
    licenceNumber: row.licence_number ?? null,
    classification: row.classification ?? null,
    classificationValue: row.classification_value != null ? Number(row.classification_value) : null,
    competitionValue: row.competition_value != null ? Number(row.competition_value) : null,
    ranking: row.ranking != null ? Number(row.ranking) : null,
    bestClassification: row.best_classification ?? null,
    bestRanking: row.best_ranking != null ? Number(row.best_ranking) : null,
    lastClassification: row.last_classification ?? null,
    lastRanking: row.last_ranking != null ? Number(row.last_ranking) : null,
    ageCategory: row.age_category ?? null,
    licenseStatus: row.license_status ?? null,
    interclubStatus: row.interclub_status ?? null,
    fetchedAt: row.fetched_at ? String(row.fetched_at) : null,
    // surface the joined club names on the player object for card display
    clubs: row.clubs ?? null,
  }));
}

// ─── Sync log ───────────────────────────────────────────────────────────────

export async function logTennisSync(entry: {
  operation: string;
  keyword?: string;
  externalId?: number;
  status: "ok" | "error";
  recordCount?: number;
  errorMessage?: string;
}): Promise<void> {
  await sql`
    INSERT INTO tennis_sync_logs
      (operation, keyword, external_id, status, record_count, error_message)
    VALUES (
      ${entry.operation},
      ${entry.keyword ?? null},
      ${entry.externalId ?? null},
      ${entry.status},
      ${entry.recordCount ?? 0},
      ${entry.errorMessage ?? null}
    )
  `;
}
