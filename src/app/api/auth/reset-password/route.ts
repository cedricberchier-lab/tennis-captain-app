import { NextRequest, NextResponse } from 'next/server';
import { validatePasswordResetToken, updateUserPassword, deletePasswordResetToken } from '@/lib/db';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = ResetPasswordSchema.parse(body);

    // Validate the reset token
    const userId = await validatePasswordResetToken(token);

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired reset token'
      }, { status: 400 });
    }

    // Update the user's password
    const passwordUpdated = await updateUserPassword(userId, password);

    if (!passwordUpdated) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update password'
      }, { status: 500 });
    }

    // Delete the used reset token
    await deletePasswordResetToken(token);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: error.errors[0].message
      }, { status: 400 });
    }

    console.error('Reset password error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred while resetting your password'
    }, { status: 500 });
  }
}