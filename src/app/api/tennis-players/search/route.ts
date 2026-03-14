import { NextRequest, NextResponse } from "next/server";
import { MytennisPlayerProvider } from "@/lib/players/mytennis-provider";
import { MockPlayerProvider } from "@/lib/players/mock-provider";
import {
  initTennisPlayersTables,
  upsertTennisPlayer,
  logTennisSync,
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
 * Uses MytennisPlayerProvider when a mytennis_token cookie is present,
 * falls back to MockPlayerProvider otherwise.
 *
 * TODO: Replace MockPlayerProvider fallback with a proper public endpoint
 *       when Swiss Tennis provides unauthenticated search.
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
  const provider = token
    ? new MytennisPlayerProvider(token)
    : new MockPlayerProvider();

  const usingMock = !token;

  try {
    const { players, total } = await provider.searchPlayers(q);

    // Persist to DB in the background (non-blocking, best-effort)
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

    return NextResponse.json({ players, total, usingMock });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[tennis-players/search] error:", message);

    if (process.env.POSTGRES_URL) {
      logTennisSync({
        operation: "search",
        keyword: q,
        status: "error",
        errorMessage: message,
      }).catch(() => {});
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
