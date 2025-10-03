import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken } from '@/lib/db';
import { z } from 'zod';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = ForgotPasswordSchema.parse(body);

    // Find user by email
    const user = await getUserByEmail(email);

    if (!user) {
      // Don't reveal whether email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Create password reset token
    const resetToken = await createPasswordResetToken(user.id);

    // In a real application, you would send an email here
    // For now, we'll just log the reset link and return it in the response
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/reset-password?token=${resetToken}`;

    console.log('Password reset link for', email, ':', resetUrl);

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Remove this in production - only for testing
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email address'
      }, { status: 400 });
    }

    console.error('Forgot password error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred while processing your request'
    }, { status: 500 });
  }
}