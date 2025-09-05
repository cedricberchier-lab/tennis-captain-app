import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Admin credentials - In production, this should be stored securely
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD_HASH || '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGEAw7Bqk8DQWk6' // 'admin123'
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
    if (!isValidPassword) {
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