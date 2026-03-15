import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { AppEvent } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEvent(row: any): AppEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    title: row.title ?? undefined,
    date: new Date(row.date),
    dayName: row.day_name ?? undefined,
    timeStart: row.time_start,
    timeEnd: row.time_end ?? undefined,
    courtNumber: row.court_number ?? undefined,
    opponent: row.opponent ?? undefined,
    location: row.location ?? undefined,
    isHome: row.is_home ?? true,
    scoreUs: row.score_us ?? null,
    scoreThem: row.score_them ?? null,
    participants: row.participants || [],
    comment: row.comment || '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** GET /api/events?type=training|match|meeting  (omit for all) */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  try {
    const result = type
      ? await sql`SELECT * FROM events WHERE event_type = ${type} ORDER BY date ASC`
      : await sql`SELECT * FROM events ORDER BY date ASC`;

    return NextResponse.json({ events: result.rows.map(rowToEvent) });
  } catch (error) {
    console.error('events GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

/** POST /api/events */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || crypto.randomUUID();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO events (
        id, event_type, title, date, day_name,
        time_start, time_end, court_number,
        opponent, location, is_home, score_us, score_them,
        participants, comment, created_at, updated_at
      ) VALUES (
        ${id},
        ${body.eventType ?? 'training'},
        ${body.title ?? null},
        ${body.date},
        ${body.dayName ?? null},
        ${body.timeStart},
        ${body.timeEnd ?? null},
        ${body.courtNumber ?? null},
        ${body.opponent ?? null},
        ${body.location ?? null},
        ${body.isHome ?? true},
        ${body.scoreUs ?? null},
        ${body.scoreThem ?? null},
        ${JSON.stringify(body.participants ?? [])},
        ${body.comment ?? ''},
        ${now}, ${now}
      )
    `;

    const result = await sql`SELECT * FROM events WHERE id = ${id}`;
    return NextResponse.json({ event: rowToEvent(result.rows[0]) }, { status: 201 });
  } catch (error) {
    console.error('events POST error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
