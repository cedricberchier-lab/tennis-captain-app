import { NextRequest, NextResponse } from 'next/server';
import { validateUserCredentials, getPlayerByEmail, createPlayer } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { LoginCredentials } from '@/types';
import { validateLocalCredentials, localUserToUser, getLocalPlayerByEmail, createLocalPlayer } from '@/lib/localAuth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    let user;
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        user = await validateUserCredentials(username, password);
      } catch (dbError) {
        console.warn('Database operation failed, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage || !user) {
      const localUser = await validateLocalCredentials(username, password);
      if (localUser) {
        user = localUserToUser(localUser);
        isUsingLocalStorage = true;
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if a player record exists for this user, create one if it doesn't
    try {
      let playerExists = false;
      
      if (isUsingLocalStorage) {
        // Check local storage for player
        const existingPlayer = getLocalPlayerByEmail(user.email);
        playerExists = !!existingPlayer;
        
        if (!playerExists) {
          // Create local player record
          createLocalPlayer({
            name: user.name,
            email: user.email,
            phone: user.phone,
            ranking: user.ranking
          });
        }
      } else {
        // Check database for player
        const existingPlayer = await getPlayerByEmail(user.email);
        playerExists = !!existingPlayer;
        
        if (!playerExists) {
          // Create database player record
          await createPlayer({
            name: user.name,
            email: user.email,
            phone: user.phone,
            ranking: user.ranking,
            absences: [],
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
          });
        }
      }
    } catch (error) {
      console.error('Error creating player record during login:', error);
      // Don't fail the login if player creation fails
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone,
      ranking: user.ranking,
      role: user.role,
      teamId: user.teamId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone,
      ranking: user.ranking,
      role: user.role,
      teamId: user.teamId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      usingLocalStorage: isUsingLocalStorage
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}