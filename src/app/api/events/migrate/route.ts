import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

/**
 * GET /api/events/migrate
 * One-time migration: creates the events table and copies trainings into it.
 * Safe to call multiple times — uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
 */
export async function GET() {
  const steps: string[] = [];

  try {
    // 1. Create events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id            VARCHAR(255)  PRIMARY KEY,
        event_type    VARCHAR(20)   NOT NULL DEFAULT 'training',
        title         TEXT,
        date          TIMESTAMP     NOT NULL,
        day_name      VARCHAR(20),
        time_start    VARCHAR(10)   NOT NULL,
        time_end      VARCHAR(10),
        court_number  VARCHAR(10),
        opponent      VARCHAR(255),
        location      TEXT,
        is_home       BOOLEAN       DEFAULT true,
        score_us      SMALLINT,
        score_them    SMALLINT,
        participants  JSONB         NOT NULL DEFAULT '[]',
        comment       TEXT          DEFAULT '',
        created_at    TIMESTAMP     DEFAULT NOW(),
        updated_at    TIMESTAMP     DEFAULT NOW()
      )
    `;
    steps.push("events table created (or already existed)");

    // 2. Copy trainings → events (skip duplicates)
    const { rowCount } = await sql`
      INSERT INTO events (
        id, event_type, date, day_name,
        time_start, time_end, court_number,
        participants, comment, created_at, updated_at
      )
      SELECT
        id, 'training', date, day_name,
        time_start, time_end, court_number,
        participants, comment, created_at, updated_at
      FROM trainings
      ON CONFLICT (id) DO NOTHING
    `;
    steps.push(`${rowCount} training rows migrated to events`);

    return NextResponse.json({ ok: true, steps });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, steps, error: message }, { status: 500 });
  }
}
