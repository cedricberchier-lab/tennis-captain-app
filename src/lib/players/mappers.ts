import { TennisPlayer, TennisPlayerClub } from "./schemas";

/**
 * Map a raw mytennis API player object to the normalized TennisPlayer model.
 * The mytennis autocomplete returns inconsistent field names — we handle all variants.
 */
export function mapRawToTennisPlayer(raw: Record<string, unknown>): TennisPlayer {
  const rawId = raw.id ?? raw.externalId ?? raw.playerId;
  const externalId = rawId != null ? Number(rawId) : 0;

  const firstName = String(raw.firstName ?? raw.first_name ?? "");
  const lastName = String(raw.lastName ?? raw.last_name ?? "");
  const fullName =
    String(raw.fullName ?? raw.name ?? [firstName, lastName].filter(Boolean).join(" ") || "—");

  const toNum = (v: unknown) => (v != null && v !== "" ? Number(v) : null);
  const toStr = (v: unknown) => (v != null && v !== "" ? String(v) : null);

  return {
    id: `mytennis:${externalId}`,
    externalSource: "mytennis",
    externalId,
    firstName,
    lastName,
    fullName,
    licenceNumber: toStr(raw.licenseNumber ?? raw.licenceNumber),
    classification: toStr(raw.classification),
    classificationValue: toNum(raw.classificationValue),
    competitionValue: toNum(raw.competitionValue),
    ranking: toNum(raw.ranking ?? raw.nationalRanking),
    bestClassification: toStr(raw.bestClassification),
    bestRanking: toNum(raw.bestRanking),
    lastClassification: toStr(raw.lastClassification),
    lastRanking: toNum(raw.lastRanking),
    ageCategory: toStr(raw.ageCategory ?? raw.category),
    licenseStatus: toStr(raw.licenseStatus),
    interclubStatus: toStr(raw.interclubStatus),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Map raw club data from mytennis to normalized TennisPlayerClub[].
 */
export function mapRawToClubs(
  externalId: number,
  raw: unknown
): TennisPlayerClub[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.clubs)
    ? ((raw as Record<string, unknown>).clubs as unknown[])
    : [];

  return list.map((c) => {
    const club = c as Record<string, unknown>;
    return {
      playerExternalId: externalId,
      clubName: String(club.clubName ?? club.name ?? club.club ?? ""),
      memberRelationship:
        club.memberRelationship != null ? Number(club.memberRelationship) : null,
    };
  });
}
