import { NextResponse } from 'next/server';
import { getLocalUsersForMigration } from '@/lib/localAuth';

export async function GET() {
  try {
    const localUsers = getLocalUsersForMigration();
    
    return NextResponse.json({
      hasLocalUsers: localUsers.length > 0,
      count: localUsers.length,
      usernames: localUsers.map(u => u.username)
    });
  } catch (error) {
    console.error('Error checking local users:', error);
    return NextResponse.json({
      hasLocalUsers: false,
      count: 0,
      usernames: []
    });
  }
}