'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, CheckCircle, AlertCircle } from 'lucide-react';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setMessage('Your password has been reset successfully! You can now log in with your new password.');

        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred while resetting your password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="w-full max-w-sm sm:max-w-md">
          <Card className="shadow-2xl border-0 sm:border-2">
            <CardHeader className="text-center px-6 sm:px-8 py-6 sm:py-8">
              <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-3">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                Tennis Captain
              </CardTitle>
              <CardDescription className="text-base">Password Reset</CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Reset Link</h3>
                <p className="text-gray-600 mb-4">
                  This password reset link is invalid or has expired. Please request a new password reset.
                </p>
                <Link href="/login">
                  <Button className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="w-full max-w-sm sm:max-w-md">
          <Card className="shadow-2xl border-0 sm:border-2">
            <CardHeader className="text-center px-6 sm:px-8 py-6 sm:py-8">
              <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-3">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                Tennis Captain
              </CardTitle>
              <CardDescription className="text-base">Password Reset</CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Password Reset Successfully</h3>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Redirecting to login page in 3 seconds...
                </p>
                <Link href="/login">
                  <Button className="w-full">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <Card className="shadow-2xl border-0 sm:border-2">
          <CardHeader className="text-center px-6 sm:px-8 py-6 sm:py-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-3">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              Tennis Captain
            </CardTitle>
            <CardDescription className="text-base">Reset Your Password</CardDescription>
          </CardHeader>
          <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
            {error && (
              <Card className="bg-red-50 border-red-200 mb-6">
                <CardContent className="pt-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </CardContent>
              </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">New Password</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="mobile-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="mobile-input"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mobile-button"
                size="lg"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
              >
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="w-full max-w-sm sm:max-w-md">
          <Card className="shadow-2xl border-0 sm:border-2">
            <CardHeader className="text-center px-6 sm:px-8 py-6 sm:py-8">
              <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-3">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                Tennis Captain
              </CardTitle>
              <CardDescription className="text-base">Loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}