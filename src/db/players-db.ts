import { sql } from "@vercel/postgres";
import { TennisPlayer, TennisPlayerClub } from "@/lib/players/schemas";

// ─── Row → TennisPlayer mapper ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPlayer(row: any): TennisPlayer & { clubs?: string } {
  return {
    id: `mytennis:${row.id}`,
    externalSource: "mytennis" as const,
    externalId: Number(row.id),
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    fullName: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
    licenceNumber: row.license_nr ?? null,
    classification: row.classification ?? null,
    classificationValue: row.classification_value != null ? Number(row.classification_value) : null,
    competitionValue: row.competition_value != null ? Number(row.competition_value) : null,
    ranking: row.ranking != null ? Number(row.ranking) : null,
    bestClassification: row.best_classification ?? null,
    bestRanking: row.best_ranking != null ? Number(row.best_ranking) : null,
    lastClassification: row.last_classification ?? null,
    lastRanking: null,
    ageCategory: row.age_category ?? null,
    licenseStatus: row.license_status != null ? String(row.license_status) : null,
    interclubStatus: null,
    fetchedAt: row.synced_at ? String(row.synced_at) : null,
    // club is a flat column on the row
    clubs: row.club_name
      ? row.club_city
        ? `${row.club_name} (${row.club_city})`
        : row.club_name
      : null,
  };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchTennisPlayers(
  keyword: string,
  limit = 30
): Promise<TennisPlayer[]> {
  const like = `%${keyword}%`;
  const { rows } = await sql`
    SELECT *
    FROM players
    WHERE first_name       ILIKE ${like}
       OR last_name        ILIKE ${like}
       OR (first_name || ' ' || last_name) ILIKE ${like}
       OR license_nr       ILIKE ${like}
       OR classification   ILIKE ${like}
       OR club_name        ILIKE ${like}
       OR club_city        ILIKE ${like}
       OR canton           ILIKE ${like}
       OR age_category     ILIKE ${like}
    ORDER BY last_name ASC, first_name ASC
    LIMIT ${limit}
  `;

  return rows.map(rowToPlayer);
}

// ─── Lookup by id ────────────────────────────────────────────────────────────

export async function getTennisPlayerByExternalId(externalId: number): Promise<{
  player: TennisPlayer | null;
  clubs: TennisPlayerClub[];
}> {
  const { rows } = await sql`
    SELECT * FROM players WHERE id = ${externalId} LIMIT 1
  `;

  if (rows.length === 0) return { player: null, clubs: [] };

  const player = rowToPlayer(rows[0]);
  const clubs: TennisPlayerClub[] = rows[0].club_name
    ? [{ playerExternalId: externalId, clubName: rows[0].club_name, memberRelationship: null }]
    : [];

  return { player, clubs };
}

// ─── Schema init (no-op for players — table pre-exists) ──────────────────────

export async function initTennisPlayersTables(): Promise<void> {
  // The players table is managed externally — nothing to create.
}
