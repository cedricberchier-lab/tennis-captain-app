import { NextRequest, NextResponse } from 'next/server';
import { getUserById, validateUserCredentials } from '@/lib/db';
import { getAllLocalUsersWithPasswords, saveUsers } from '@/lib/localAuth';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword }: ChangePasswordRequest = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Get current user from JWT token
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let userId: string;
    try {
      const payload = jwt.verify(token.value, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
      userId = payload.userId;
    } catch {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    let success = false;
    let isUsingLocalStorage = false;

    // Try database first, fallback to localStorage
    if (process.env.POSTGRES_URL) {
      try {
        const user = await getUserById(userId);
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          );
        }

        // Hash new password and update
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        
        // Update password in database
        const { sql } = require('@vercel/postgres');
        await sql`
          UPDATE users 
          SET password = ${hashedNewPassword}, updated_at = ${new Date()}
          WHERE id = ${userId}
        `;
        
        success = true;
      } catch (dbError) {
        console.warn('Database operation failed, falling back to localStorage:', dbError);
        isUsingLocalStorage = true;
      }
    } else {
      isUsingLocalStorage = true;
    }

    // Use localStorage fallback
    if (isUsingLocalStorage || !success) {
      const users = getAllLocalUsersWithPasswords();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const user = users[userIndex];
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      // Hash new password and update
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      users[userIndex] = {
        ...user,
        password: hashedNewPassword,
        updatedAt: new Date()
      };

      saveUsers(users);
      success = true;
      isUsingLocalStorage = true;
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to change password' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Password changed successfully',
      usingLocalStorage: isUsingLocalStorage 
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}