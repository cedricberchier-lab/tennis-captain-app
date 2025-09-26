import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    // Query to find all users and their details
    const { rows } = await sql`
      SELECT id, username, email, name, phone, ranking, role, created_at
      FROM users
      ORDER BY name ASC
    `;

    // Find Cédric specifically
    const cedric = rows.find(user =>
      user.name.toLowerCase().includes('cedric') ||
      user.name.toLowerCase().includes('cédric') ||
      user.email.toLowerCase().includes('cedric')
    );

    return NextResponse.json({
      success: true,
      totalUsers: rows.length,
      allUsers: rows.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        ranking: user.ranking
      })),
      cedricUser: cedric ? {
        id: cedric.id,
        name: cedric.name,
        email: cedric.email,
        username: cedric.username,
        role: cedric.role,
        ranking: cedric.ranking
      } : null,
      targetUserId: "31f66967-925c-4fec-be25-f0403e34c279"
    });

  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      },
      { status: 500 }
    );
  }
}