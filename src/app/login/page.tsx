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

export default function LoginPage() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
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

      if (data.token && data.user) {
        // Store localStorage usage flag for migration notice
        if (data.usingLocalStorage) {
          localStorage.setItem('authUsingLocalStorage', 'true');
        }
        
        // Use AuthContext login method to update app state
        login(data.token, data.user);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <Card className="shadow-2xl border-0 sm:border-2">
          <CardHeader className="text-center px-6 sm:px-8 py-6 sm:py-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold mb-2">🎾 Tennis Captain</CardTitle>
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