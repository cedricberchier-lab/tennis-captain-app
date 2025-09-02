import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername, initializeDatabase } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { RegisterData, UserRole } from '@/types';
import { createLocalUser, localUserToUser } from '@/lib/localAuth';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterData = await request.json();
    const { username, email, password, role } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    let newUser;
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        await initializeDatabase();
        
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
          return NextResponse.json(
            { error: 'Username already exists' },
            { status: 409 }
          );
        }

        newUser = await createUser({
          username,
          email,
          password,
          role: role || UserRole.CAPTAIN
        });
      } catch (dbError) {
        console.warn('Database operation failed, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage) {
      try {
        const localUser = await createLocalUser({
          username,
          email,
          password,
          role: role || UserRole.CAPTAIN
        });
        newUser = localUserToUser(localUser);
      } catch (localError) {
        if (localError instanceof Error && localError.message === 'Username already exists') {
          return NextResponse.json(
            { error: 'Username already exists' },
            { status: 409 }
          );
        }
        throw localError;
      }
    }

    const token = generateToken({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      teamId: newUser.teamId,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    });

    const userWithoutPassword = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      teamId: newUser.teamId,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      usingLocalStorage: isUsingLocalStorage
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}