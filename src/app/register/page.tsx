'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterData, AuthResponse, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';

const rankingOptions = [
  { value: 0, label: "Unranked" },
  { value: 1, label: "N1" },
  { value: 2, label: "N2" },
  { value: 3, label: "N3" },
  { value: 4, label: "R1" },
  { value: 5, label: "R2" },
  { value: 6, label: "R3" },
  { value: 7, label: "R4" },
  { value: 8, label: "R5" },
  { value: 9, label: "R6" },
  { value: 10, label: "R7" },
  { value: 11, label: "R8" },
  { value: 12, label: "R9" }
];

// Swiss phone number validation and formatting
const formatSwissPhone = (value: string): string => {
  // Remove all non-numeric characters except +
  const numbers = value.replace(/[^\d+]/g, '');
  
  // If it starts with +41, format as +41 XX XXX XX XX
  if (numbers.startsWith('+41')) {
    const digits = numbers.substring(3);
    if (digits.length <= 2) return `+41 ${digits}`;
    if (digits.length <= 5) return `+41 ${digits.substring(0, 2)} ${digits.substring(2)}`;
    if (digits.length <= 7) return `+41 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    return `+41 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)}`;
  }
  
  // If it starts with 0, convert to +41 format
  if (numbers.startsWith('0')) {
    const digits = numbers.substring(1);
    if (digits.length <= 2) return `+41 ${digits}`;
    if (digits.length <= 5) return `+41 ${digits.substring(0, 2)} ${digits.substring(2)}`;
    if (digits.length <= 7) return `+41 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    return `+41 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)}`;
  }
  
  // If no prefix, assume Swiss number and add +41
  if (numbers.length > 0 && !numbers.startsWith('+')) {
    if (numbers.length <= 2) return `+41 ${numbers}`;
    if (numbers.length <= 5) return `+41 ${numbers.substring(0, 2)} ${numbers.substring(2)}`;
    if (numbers.length <= 7) return `+41 ${numbers.substring(0, 2)} ${numbers.substring(2, 5)} ${numbers.substring(5)}`;
    return `+41 ${numbers.substring(0, 2)} ${numbers.substring(2, 5)} ${numbers.substring(5, 7)} ${numbers.substring(7, 9)}`;
  }
  
  return numbers;
};

const validateSwissPhone = (phone: string): boolean => {
  if (!phone) return true; // Allow empty phone
  const phoneRegex = /^\+41 \d{2} \d{3} \d{2} \d{2}$/;
  return phoneRegex.test(phone);
};

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    name: '',
    phone: '',
    ranking: 0, // Default to unranked, will be set in backend
    password: '',
    role: UserRole.PLAYER
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Validate phone number format if provided
    if (formData.phone && !validateSwissPhone(formData.phone)) {
      setError('Please enter a valid Swiss phone number in format +41 XX XXX XX XX');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
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
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSwissPhone(e.target.value);
    setFormData(prev => ({
      ...prev,
      phone: formatted
    }));
  };
  
  // Auto-set username to email when email changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData(prev => ({
      ...prev,
      email: email,
      username: email // Set username to email by default
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-blue-600 to-purple-500 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-2xl border-0 sm:border-2">
          <CardHeader className="text-center px-6 sm:px-8 py-6 sm:py-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-3">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              Tennis Captain
            </CardTitle>
            <CardDescription className="text-base">Create your account</CardDescription>
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
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email (used as username)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleEmailChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mobile-input"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mobile-input"
                  placeholder="Your full name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mobile-input ${
                    formData.phone && !validateSwissPhone(formData.phone) 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="+41 XX XXX XX XX"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="ranking" className="block text-sm font-medium text-gray-700 mb-2">
                Tennis Ranking (Swiss Tennis)
              </label>
              <select
                id="ranking"
                name="ranking"
                value={formData.ranking || 0}
                onChange={(e) => setFormData({ ...formData, ranking: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mobile-input"
              >
                {rankingOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hidden username field - will be auto-filled with email */}
            <input type="hidden" name="username" value={formData.username} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mobile-input"
                  placeholder="Enter your password"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mobile-input"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 mobile-button"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm sm:text-base">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="text-blue-600 hover:text-blue-800 font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-1"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}