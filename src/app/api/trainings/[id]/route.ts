import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Training } from '@/types';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json();
    const { id } = params;
    const now = new Date().toISOString();

    await sql`
      UPDATE trainings 
      SET 
        date = COALESCE(${updates.date}, date),
        day_name = COALESCE(${updates.dayName}, day_name),
        time_start = COALESCE(${updates.timeStart}, time_start),
        time_end = COALESCE(${updates.timeEnd}, time_end),
        court_number = COALESCE(${updates.courtNumber}, court_number),
        participants = COALESCE(${JSON.stringify(updates.participants)}, participants),
        comment = COALESCE(${updates.comment}, comment),
        updated_at = ${now}
      WHERE id = ${id}
    `;

    // Get the updated training
    const result = await sql`
      SELECT * FROM trainings WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const updatedTraining: Training = {
      id: row.id,
      date: new Date(row.date),
      dayName: row.day_name,
      timeStart: row.time_start,
      timeEnd: row.time_end,
      courtNumber: row.court_number,
      participants: row.participants || [],
      comment: row.comment || '',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    return NextResponse.json({ training: updatedTraining });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to update training' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await sql`
      DELETE FROM trainings WHERE id = ${id}
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete training' },
      { status: 500 }
    );
  }
}