import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function POST() {
  try {
    const result = await initializeDatabase();
    
    if (result.success) {
      return NextResponse.json({ 
        message: 'Database initialized successfully',
        success: true 
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Database initialization failed',
          details: result.error 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}