import { NextRequest, NextResponse } from "next/server";
import { MytennisPlayerProvider } from "@/lib/players/mytennis-provider";
import {
  getTennisPlayerByExternalId,
  upsertTennisPlayer,
  upsertTennisPlayerClubs,
  logTennisSync,
} from "@/db/players-db";

/**
 * GET /api/tennis-players/[id]
 *
 * [id] is the mytennis externalId (integer).
 *
 * Strategy:
 *   1. Check the local Neon cache first — serve instantly if found.
 *   2. Try a live fetch via MytennisPlayerProvider if a token is available.
 *      (Currently a TODO — the provider returns null until ST exposes a detail endpoint.)
 *   3. Return 404 if nothing found.
 *
 * TODO: Implement MytennisPlayerProvider.getPlayerById() when Swiss Tennis
 *       provides a player-detail endpoint.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const externalId = Number(id);

  if (!Number.isInteger(externalId) || externalId <= 0) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  // 1. Check DB cache
  if (process.env.POSTGRES_URL) {
    try {
      const cached = await getTennisPlayerByExternalId(externalId);
      if (cached.player) {
        return NextResponse.json({ ...cached, fromCache: true });
      }
    } catch (e) {
      console.warn("[tennis-players/id] DB lookup failed:", e);
    }
  }

  // 2. Try live fetch
  const token = req.cookies.get("mytennis_token")?.value;
  if (token) {
    try {
      const provider = new MytennisPlayerProvider(token);
      const result = await provider.getPlayerById(externalId);
      if (result) {
        // Persist to cache
        if (process.env.POSTGRES_URL) {
          upsertTennisPlayer(result.player).catch(() => {});
          upsertTennisPlayerClubs(result.clubs).catch(() => {});
          logTennisSync({
            operation: "get_player",
            externalId,
            status: "ok",
          }).catch(() => {});
        }
        return NextResponse.json({ ...result, fromCache: false });
      }
    } catch (e) {
      console.warn("[tennis-players/id] live fetch failed:", e);
    }
  }

  return NextResponse.json({ error: "Player not found" }, { status: 404 });
}
