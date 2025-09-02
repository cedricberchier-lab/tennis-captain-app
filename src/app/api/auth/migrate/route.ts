import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername, initializeDatabase } from '@/lib/db';
import { getLocalUsersForMigration, clearLocalUsers } from '@/lib/localAuth';
import { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up your .env.local file with database credentials.' },
        { status: 503 }
      );
    }

    await initializeDatabase();

    // Get local users to migrate
    const localUsers = getLocalUsersForMigration();
    
    if (localUsers.length === 0) {
      return NextResponse.json({
        message: 'No local users found to migrate',
        migrated: 0
      });
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const localUser of localUsers) {
      try {
        // Check if user already exists in database
        const existingUser = await getUserByUsername(localUser.username);
        if (existingUser) {
          skippedCount++;
          console.log(`Skipped user ${localUser.username} - already exists in database`);
          continue;
        }

        // Create user in database with pre-hashed password
        await createUser({
          username: localUser.username,
          email: localUser.email,
          password: localUser.password, // Already hashed
          role: localUser.role as UserRole
        }, true); // skipHashing = true

        migratedCount++;
        console.log(`Migrated user ${localUser.username} to database`);
      } catch (error) {
        const errorMsg = `Failed to migrate user ${localUser.username}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // If all users were successfully migrated, clear local storage
    const shouldClearLocal = migratedCount > 0 && errors.length === 0;
    if (shouldClearLocal) {
      clearLocalUsers();
    }

    return NextResponse.json({
      message: `Migration completed. ${migratedCount} users migrated, ${skippedCount} skipped.`,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      clearedLocalStorage: shouldClearLocal
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}