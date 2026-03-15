import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

/** GET /api/tennis-players/inspect — show actual players table structure + sample row */
export async function GET() {
  try {
    const { rows: columns } = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'players'
      ORDER BY ordinal_position
    `;

    const { rows: sample } = await sql`SELECT * FROM players LIMIT 3`;
    const { rows: count } = await sql`SELECT COUNT(*) FROM players`;

    return NextResponse.json({ columns, sample, count: count[0].count });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
