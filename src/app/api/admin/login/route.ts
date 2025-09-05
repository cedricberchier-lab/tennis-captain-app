import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Admin credentials - In production, this should be stored securely
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123' // Plain text for development
};

interface AdminLoginRequest {
  username: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password }: AdminLoginRequest = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if username matches
    if (username !== ADMIN_CREDENTIALS.username) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password (plain text comparison for development)
    if (password !== ADMIN_CREDENTIALS.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate admin token
    const adminUser = {
      id: 'admin',
      username: ADMIN_CREDENTIALS.username,
      email: 'admin@tenniscaptain.app',
      name: 'Administrator',
      phone: '',
      ranking: 0,
      role: 'admin',
      teamId: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const token = generateToken(adminUser);

    return NextResponse.json({
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role
      },
      token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}