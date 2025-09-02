import { NextRequest, NextResponse } from 'next/server';
import { createPlayer, getAllPlayers, initializeDatabase } from '@/lib/db';
import { Player } from '@/types';

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
    await ensureDbInitialized();
    const players = await getAllPlayers();
    return NextResponse.json({ players });
  } catch (error) {
    console.error('GET /api/players error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create player object
    const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
      name: body.name.trim(),
      email: body.email?.trim() || '',
      phone: body.phone?.trim() || '',
      ranking: body.ranking || 0,
      absences: body.absences || [],
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winsIn2Sets: 0,
        winsIn3Sets: 0,
        lossesIn2Sets: 0,
        lossesIn3Sets: 0,
        performance: 0,
        underperformance: 0,
        trainingAttendance: 0
      }
    };

    const player = await createPlayer(playerData);
    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error('POST /api/players error:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}

// Handle migration from localStorage
export async function PUT(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const { players } = await request.json();
    
    if (!Array.isArray(players)) {
      return NextResponse.json(
        { error: 'Players must be an array' },
        { status: 400 }
      );
    }

    const migratedPlayers = [];
    for (const playerData of players) {
      try {
        const player = await createPlayer({
          name: playerData.name,
          email: playerData.email || '',
          phone: playerData.phone || '',
          ranking: playerData.ranking || 0,
          absences: playerData.absences || [],
          stats: playerData.stats || {
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            winsIn2Sets: 0,
            winsIn3Sets: 0,
            lossesIn2Sets: 0,
            lossesIn3Sets: 0,
            performance: 0,
            underperformance: 0,
            trainingAttendance: 0
          }
        });
        migratedPlayers.push(player);
      } catch (error) {
        console.warn(`Failed to migrate player ${playerData.name}:`, error);
      }
    }

    return NextResponse.json({ 
      migrated: migratedPlayers.length,
      players: migratedPlayers 
    });
  } catch (error) {
    console.error('PUT /api/players (migration) error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate players' },
      { status: 500 }
    );
  }
}