import { NextRequest, NextResponse } from 'next/server';
import { ensureAllUsersHavePlayerRecords } from '@/lib/db';
import { ensureAllLocalUsersHavePlayerRecords } from '@/lib/localAuth';

export async function POST(request: NextRequest) {
  try {
    let result = { created: 0, errors: 0 };
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        result = await ensureAllUsersHavePlayerRecords();
      } catch (dbError) {
        console.warn('Database operation failed, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage) {
      result = ensureAllLocalUsersHavePlayerRecords();
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed. Created ${result.created} player records with ${result.errors} errors.`,
      created: result.created,
      errors: result.errors,
      usingLocalStorage: isUsingLocalStorage
    });

  } catch (error) {
    console.error('Player migration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to migrate player records',
        created: 0,
        errors: 1
      },
      { status: 500 }
    );
  }
}