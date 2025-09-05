import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAllUsers } from '@/lib/db';
import { getAllLocalUsers } from '@/lib/localAuth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    let users = [];
    let isUsingLocalStorage = false;

    // Try to get users from database first
    if (process.env.POSTGRES_URL) {
      try {
        users = await getAllUsers();
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage || !users.length) {
      const localUsers = getAllLocalUsers();
      users = localUsers;
      isUsingLocalStorage = true;
    }

    return NextResponse.json({
      users,
      usingLocalStorage: isUsingLocalStorage
    });

  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}