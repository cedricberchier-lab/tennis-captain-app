import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/** PUT /api/events/[id] */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const now = new Date().toISOString();

    await sql`
      UPDATE events SET
        title        = COALESCE(${body.title ?? null},                  title),
        date         = COALESCE(${body.date ?? null},                   date),
        day_name     = COALESCE(${body.dayName ?? null},                day_name),
        time_start   = COALESCE(${body.timeStart ?? null},              time_start),
        time_end     = COALESCE(${body.timeEnd ?? null},                time_end),
        court_number = COALESCE(${body.courtNumber ?? null},            court_number),
        opponent     = COALESCE(${body.opponent ?? null},               opponent),
        location     = COALESCE(${body.location ?? null},               location),
        is_home      = COALESCE(${body.isHome ?? null},                 is_home),
        score_us     = COALESCE(${body.scoreUs ?? null},                score_us),
        score_them   = COALESCE(${body.scoreThem ?? null},              score_them),
        participants = COALESCE(${body.participants ? JSON.stringify(body.participants) : null}, participants),
        comment      = COALESCE(${body.comment ?? null},                comment),
        updated_at   = ${now}
      WHERE id = ${id}
    `;

    const result = await sql`SELECT * FROM events WHERE id = ${id}`;
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event: result.rows[0] });
  } catch (error) {
    console.error('events PUT error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

/** DELETE /api/events/[id] */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await sql`DELETE FROM events WHERE id = ${id}`;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('events DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
