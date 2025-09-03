import { NextRequest, NextResponse } from 'next/server';
import { getPlayerById, updatePlayer, deletePlayer } from '@/lib/db';
import { getAllLocalPlayers, getStoredPlayers, savePlayers } from '@/lib/localAuth';
import { Player } from '@/types';

// Helper function to get stored players (server-side localStorage)
function getStoredPlayersServer(): Player[] {
  if (typeof window === 'undefined') {
    const fs = require('fs');
    const path = require('path');
    const LOCAL_PLAYERS_FILE = path.join(process.cwd(), '.local-players.json');
    try {
      if (fs.existsSync(LOCAL_PLAYERS_FILE)) {
        const fileContent = fs.readFileSync(LOCAL_PLAYERS_FILE, 'utf8');
        return JSON.parse(fileContent);
      }
      return [];
    } catch (error) {
      console.error('Error reading players from file:', error);
      return [];
    }
  }
  return [];
}

// Helper function to save players (server-side localStorage)
function savePlayersServer(players: Player[]): void {
  if (typeof window === 'undefined') {
    const fs = require('fs');
    const path = require('path');
    const LOCAL_PLAYERS_FILE = path.join(process.cwd(), '.local-players.json');
    try {
      fs.writeFileSync(LOCAL_PLAYERS_FILE, JSON.stringify(players, null, 2));
    } catch (error) {
      console.error('Error saving players to file:', error);
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let player = null;
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        player = await getPlayerById(id);
      } catch (dbError) {
        console.warn('Database operation failed, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage || !player) {
      const players = getStoredPlayersServer();
      player = players.find(p => p.id === id) || null;
      isUsingLocalStorage = true;
    }
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ player, usingLocalStorage: isUsingLocalStorage });
  } catch (error) {
    console.error(`GET /api/players/${(await params).id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    let player = null;
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        player = await updatePlayer(id, updates);
      } catch (dbError) {
        console.warn('Database operation failed, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage || !player) {
      const players = getStoredPlayersServer();
      const playerIndex = players.findIndex(p => p.id === id);
      
      if (playerIndex === -1) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }
      
      // Update player with new data
      const updatedPlayer = {
        ...players[playerIndex],
        ...updates,
        updatedAt: new Date()
      };
      
      players[playerIndex] = updatedPlayer;
      savePlayersServer(players);
      player = updatedPlayer;
      isUsingLocalStorage = true;
    }
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ player, usingLocalStorage: isUsingLocalStorage });
  } catch (error) {
    console.error(`PUT /api/players/${(await params).id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let success = false;
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        success = await deletePlayer(id);
      } catch (dbError) {
        console.warn('Database operation failed, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage || !success) {
      const players = getStoredPlayersServer();
      const playerIndex = players.findIndex(p => p.id === id);
      
      if (playerIndex === -1) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }
      
      players.splice(playerIndex, 1);
      savePlayersServer(players);
      success = true;
      isUsingLocalStorage = true;
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, usingLocalStorage: isUsingLocalStorage });
  } catch (error) {
    console.error(`DELETE /api/players/${(await params).id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}