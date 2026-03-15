import { NextRequest, NextResponse } from "next/server";
import { initTennisPlayersTables, searchTennisPlayers } from "@/db/players-db";

let tablesReady = false;

async function ensureTables() {
  if (tablesReady) return;
  try {
    await initTennisPlayersTables();
    tablesReady = true;
  } catch (e) {
    console.warn("[tennis-players/search] table init failed:", e);
  }
}

/** GET /api/tennis-players/search?q=<keyword> — searches Neon players table */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 3) {
    return NextResponse.json({ error: "Query must be at least 3 characters" }, { status: 400 });
  }

  try {
    await ensureTables();
    const players = await searchTennisPlayers(q);
    return NextResponse.json({ players, total: players.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[tennis-players/search] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
