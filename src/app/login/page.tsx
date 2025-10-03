'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginCredentials, AuthResponse } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';

export default function LoginPage() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if admin credentials - route to admin endpoint
      const isAdminLogin = credentials.username === 'admin';
      const loginEndpoint = isAdminLogin ? '/api/admin/login' : '/api/auth/login';
      
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Handle different response formats for admin vs regular login
      const token = data.token;
      const user = data.user || data.admin; // Admin login returns 'admin' field instead of 'user'
      
      if (token && user) {
        // Store localStorage usage flag for migration notice (regular users only)
        if (data.usingLocalStorage) {
          localStorage.setItem('authUsingLocalStorage', 'true');
        }
        
        // Use AuthContext login method to update app state
        login(token, user);
      } else {
        throw new Error('Invalid response from server');
      }
      
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setForgotPasswordMessage(data.message);
        if (process.env.NODE_ENV === 'development' && data.resetUrl) {
          setForgotPasswordMessage(
            `${data.message}\n\nDevelopment only - Reset link: ${data.resetUrl}`
          );
        }
      } else {
        setForgotPasswordMessage(data.error || 'An error occurred');
      }
    } catch (err) {
      setForgotPasswordMessage('An error occurred while sending the reset email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <Card className="shadow-2xl border-0 sm:border-2">
          <CardHeader className="text-center px-6 sm:px-8 py-6 sm:py-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-3">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              Tennis Captain
            </CardTitle>
            <CardDescription className="text-base">Sign in to your account</CardDescription>
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
                <Label htmlFor="username" className="text-base font-medium">Username</Label>
                <Input
                  type="text"
                  id="username"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  className="mobile-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
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
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Forgot Password Section */}
            {!showForgotPassword ? (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
                >
                  Forgot your password?
                </button>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Reset Password</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordMessage('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>

                {forgotPasswordMessage && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <pre className="whitespace-pre-wrap font-sans">{forgotPasswordMessage}</pre>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div>
                    <Label htmlFor="forgotEmail" className="text-sm">Email Address</Label>
                    <Input
                      type="email"
                      id="forgotEmail"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="text-sm"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full"
                    size="sm"
                  >
                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              </div>
            )}

            <div className="mt-6 text-center space-y-3">
              <p className="text-gray-600 text-sm sm:text-base">
                Don&apos;t have an account?{' '}
                <Link 
                  href="/register" 
                  className="text-blue-600 hover:text-blue-800 font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
                >
                  Sign up here
                </Link>
              </p>
              
              <div className="border-t pt-3">
                <Link 
                  href="/admin/login" 
                  className="text-red-600 hover:text-red-800 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-1 py-1"
                >
                  Administrator Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}