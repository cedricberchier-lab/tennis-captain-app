import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAllUsers } from '@/lib/db';
import { getAllLocalUsersWithPasswords } from '@/lib/localAuth';
import { UserRole } from '@/types';

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
      const localUsers = getAllLocalUsersWithPasswords();
      users = localUsers;
      isUsingLocalStorage = true;
    }

    // Calculate stats
    const stats = {
      totalUsers: users.length,
      players: users.filter(u => u.role === UserRole.PLAYER).length,
      captains: users.filter(u => u.role === UserRole.CAPTAIN).length,
      admins: users.filter(u => u.role === UserRole.ADMIN).length,
      totalTrainings: 0, // TODO: Add when training stats are available
      totalMatches: 0, // TODO: Add when match stats are available
      usingLocalStorage: isUsingLocalStorage
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}