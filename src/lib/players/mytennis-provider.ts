import { PlayerProvider, PlayerSearchResult, PlayerDetailResult } from "./provider";
import { mapRawToTennisPlayer } from "./mappers";

const SEARCH_ENDPOINT =
  "https://high-scalability.microservices.swisstennis.ch/player-autocomplete-query";

/**
 * Live mytennis.ch provider.
 * Requires a valid Bearer token obtained via the /api/mytennis/auth-credential flow.
 *
 * TODO: implement getPlayerById when Swiss Tennis exposes a player detail endpoint.
 */
export class MytennisPlayerProvider implements PlayerProvider {
  constructor(private readonly token: string) {}

  async searchPlayers(
    keyword: string,
    offset = 0,
    limit = 50
  ): Promise<PlayerSearchResult> {
    const res = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "X-DP-Access-Token": this.token,
      },
      body: JSON.stringify({
        keyword: keyword.trim(),
        filters: { licenseStatus: "1,2" },
        offset,
        limit,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Swiss Tennis API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawList = normalizeSearchResponse(data);
    const players = rawList.map(mapRawToTennisPlayer);

    return { players, total: data.total ?? players.length };
  }

  async getPlayerById(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _externalId: number
  ): Promise<PlayerDetailResult | null> {
    // TODO: call the Swiss Tennis player detail endpoint when available.
    // For now fall back to the DB cache (handled in the API route).
    return null;
  }
}

function normalizeSearchResponse(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d?.players)) return d.players as Record<string, unknown>[];
  if (Array.isArray((d?.data as Record<string, unknown>)?.players))
    return (d.data as Record<string, unknown>).players as Record<string, unknown>[];
  if (Array.isArray(d?.results)) return d.results as Record<string, unknown>[];
  if (Array.isArray(d?.data)) return d.data as Record<string, unknown>[];
  return [];
}
