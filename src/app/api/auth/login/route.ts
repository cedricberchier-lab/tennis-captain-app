import { NextRequest, NextResponse } from 'next/server';
import { validateUserCredentials } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { LoginCredentials } from '@/types';
import { validateLocalCredentials, localUserToUser } from '@/lib/localAuth';

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

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      email: user.email,
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