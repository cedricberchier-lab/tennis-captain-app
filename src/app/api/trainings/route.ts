import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Training } from '@/types';

// Row → Training mapper (reads from events table, event_type = 'training')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTraining(row: any): Training {
  return {
    id: row.id,
    date: row.date,
    dayName: row.day_name,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    courtNumber: row.court_number,
    participants: row.participants || [],
    comment: row.comment || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM events
      WHERE event_type = 'training'
      ORDER BY date ASC
    `;
    return NextResponse.json({ trainings: result.rows.map(rowToTraining) });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const training = await request.json();
    const id = training.id || crypto.randomUUID();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO events (
        id, event_type, date, day_name,
        time_start, time_end, court_number,
        participants, comment, created_at, updated_at
      ) VALUES (
        ${id}, 'training', ${training.date}, ${training.dayName},
        ${training.timeStart}, ${training.timeEnd}, ${training.courtNumber},
        ${JSON.stringify(training.participants)}, ${training.comment || ''},
        ${now}, ${now}
      )
    `;

    const newTraining: Training = {
      id,
      date: new Date(training.date),
      dayName: training.dayName,
      timeStart: training.timeStart,
      timeEnd: training.timeEnd,
      courtNumber: training.courtNumber,
      participants: training.participants,
      comment: training.comment || '',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    return NextResponse.json({ training: newTraining });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to create training' }, { status: 500 });
  }
}
