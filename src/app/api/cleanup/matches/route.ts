import { NextResponse } from 'next/server';
import { cleanupMatchTables } from '@/lib/db';

export async function DELETE() {
  try {
    const result = await cleanupMatchTables();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Match tables cleaned up successfully',
        tablesRemoved: result.tablesRemoved
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to cleanup match tables' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('DELETE /api/cleanup/matches error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup match tables' },
      { status: 500 }
    );
  }
}