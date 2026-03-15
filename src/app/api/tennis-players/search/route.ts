import { NextRequest, NextResponse } from "next/server";
import { MytennisPlayerProvider } from "@/lib/players/mytennis-provider";
import {
  initTennisPlayersTables,
  upsertTennisPlayer,
  logTennisSync,
  searchTennisPlayers,
} from "@/db/players-db";

let tablesReady = false;

async function ensureTables() {
  if (tablesReady || !process.env.POSTGRES_URL) return;
  try {
    await initTennisPlayersTables();
    tablesReady = true;
  } catch (e) {
    console.warn("[tennis-players/search] table init failed:", e);
  }
}

/**
 * GET /api/tennis-players/search?q=<keyword>
 *
 * Priority:
 *   1. If mytennis_token cookie present → live search via MytennisPlayerProvider,
 *      results cached to Neon.
 *   2. Otherwise → search tennis_players cache table in Neon.
 *
 * TODO: Replace Neon-only fallback with a real public Swiss Tennis endpoint
 *       if one becomes available without authentication.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters" },
      { status: 400 }
    );
  }

  const token = req.cookies.get("mytennis_token")?.value;

  // ── Live search (authenticated) ────────────────────────────────────────────
  if (token) {
    const provider = new MytennisPlayerProvider(token);
    try {
      const { players, total } = await provider.searchPlayers(q);

      // Cache results to Neon in background
      if (process.env.POSTGRES_URL) {
        ensureTables().then(async () => {
          for (const player of players) {
            await upsertTennisPlayer(player).catch(() => {});
          }
          await logTennisSync({
            operation: "search",
            keyword: q,
            status: "ok",
            recordCount: players.length,
          }).catch(() => {});
        });
      }

      return NextResponse.json({ players, total, usingMock: false, source: "live" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[tennis-players/search] live search error:", message);
      logTennisSync({ operation: "search", keyword: q, status: "error", errorMessage: message }).catch(() => {});
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── DB cache search (unauthenticated) ──────────────────────────────────────
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ players: [], total: 0, source: "empty", usingMock: false });
  }

  try {
    await ensureTables();
    const players = await searchTennisPlayers(q);
    return NextResponse.json({ players, total: players.length, usingMock: false, source: "cache" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[tennis-players/search] db search error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
