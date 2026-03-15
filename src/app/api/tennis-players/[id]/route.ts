import { NextRequest, NextResponse } from "next/server";
import { getTennisPlayerByExternalId } from "@/db/players-db";

/** GET /api/tennis-players/[id] — fetch player by id from Neon players table */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const externalId = Number(id);

  if (!Number.isInteger(externalId) || externalId <= 0) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  try {
    const result = await getTennisPlayerByExternalId(externalId);
    if (!result.player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
