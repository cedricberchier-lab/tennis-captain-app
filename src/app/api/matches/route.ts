import { NextRequest, NextResponse } from 'next/server';
import { createMatch, getAllMatches, initializeDatabase } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

export async function GET() {
  try {
    let matches: any[] = [];
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        await ensureDbInitialized();
        matches = await getAllMatches();
      } catch (dbError) {
        console.warn('Database operation failed for matches:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      console.warn('No database URL configured, using localStorage for matches');
      isUsingLocalStorage = true;
    }

    return NextResponse.json({ 
      matches,
      isUsingLocalStorage 
    });
  } catch (error) {
    console.error('GET /api/matches error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const matchData = await request.json();
    
    // Validate required fields
    if (!matchData.season || !matchData.category || !matchData.date || !matchData.opponentTeam?.name) {
      return NextResponse.json(
        { error: 'Missing required fields: season, category, date, opponent team name' },
        { status: 400 }
      );
    }

    // Convert date string to Date object if needed
    if (typeof matchData.date === 'string') {
      matchData.date = new Date(matchData.date);
    }

    let match;
    let isUsingLocalStorage = false;

    // Try database first
    if (process.env.POSTGRES_URL) {
      try {
        await ensureDbInitialized();
        match = await createMatch(matchData);
        console.log('Match created successfully in database:', match.id);
      } catch (dbError) {
        console.warn('Database operation failed for match creation:', dbError);
        isUsingLocalStorage = true;
        // Create temp match for localStorage
        match = {
          id: 'temp-' + Date.now(),
          ...matchData,
          roster: { homeLineup: [], opponentLineup: [], homeDoublesLineup: [], opponentDoublesLineup: [] },
          results: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    } else {
      console.warn('No database URL configured, creating temp match for localStorage');
      isUsingLocalStorage = true;
      match = {
        id: 'temp-' + Date.now(),
        ...matchData,
        roster: { homeLineup: [], opponentLineup: [], homeDoublesLineup: [], opponentDoublesLineup: [] },
        results: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return NextResponse.json({ 
      match,
      isUsingLocalStorage 
    });
  } catch (error) {
    console.error('POST /api/matches error:', error);
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    );
  }
}