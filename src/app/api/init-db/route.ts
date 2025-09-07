import { NextResponse } from 'next/server';
import { initializeDatabase, getAllPlayers } from '@/lib/db';

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
      { error: 'Failed to initialize database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check database connection by trying to fetch data
    const players = await getAllPlayers();
    
    return NextResponse.json({ 
      message: 'Database is connected and operational',
      status: 'healthy',
      data: {
        playerCount: players.length
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      { 
        message: 'Database connection failed',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}