import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Training } from '@/types';

export async function GET() {
  try {
    // Create trainings table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS trainings (
        id VARCHAR(255) PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        day_name VARCHAR(20) NOT NULL,
        time_start VARCHAR(10) NOT NULL,
        time_end VARCHAR(10) NOT NULL,
        court_number VARCHAR(10) NOT NULL,
        participants JSONB NOT NULL DEFAULT '[]',
        comment TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const result = await sql`
      SELECT * FROM trainings 
      ORDER BY date ASC
    `;

    const trainings = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      dayName: row.day_name,
      timeStart: row.time_start,
      timeEnd: row.time_end,
      courtNumber: row.court_number,
      participants: row.participants || [],
      comment: row.comment || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ trainings });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const training = await request.json();
    
    // Generate ID if not provided
    const id = training.id || crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Create trainings table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS trainings (
        id VARCHAR(255) PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        day_name VARCHAR(20) NOT NULL,
        time_start VARCHAR(10) NOT NULL,
        time_end VARCHAR(10) NOT NULL,
        court_number VARCHAR(10) NOT NULL,
        participants JSONB NOT NULL DEFAULT '[]',
        comment TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO trainings (
        id, date, day_name, time_start, time_end, court_number, 
        participants, comment, created_at, updated_at
      ) VALUES (
        ${id},
        ${training.date},
        ${training.dayName},
        ${training.timeStart},
        ${training.timeEnd},
        ${training.courtNumber},
        ${JSON.stringify(training.participants)},
        ${training.comment || ''},
        ${now},
        ${now}
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
      updatedAt: new Date(now)
    };

    return NextResponse.json({ training: newTraining });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to create training' },
      { status: 500 }
    );
  }
}