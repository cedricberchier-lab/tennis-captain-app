'use client';

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { user, logout } = useAuth();
  const [showLocalStorageNotice, setShowLocalStorageNotice] = useState(false);

  useEffect(() => {
    // Check if user is using localStorage auth
    const isUsingLocalStorage = localStorage.getItem('authUsingLocalStorage') === 'true';
    setShowLocalStorageNotice(isUsingLocalStorage);
  }, []);

  const dismissNotice = () => {
    localStorage.removeItem('authUsingLocalStorage');
    setShowLocalStorageNotice(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {showLocalStorageNotice && (
            <Card className="mb-8 border-blue-200 bg-blue-50 relative">
              <Button
                onClick={dismissNotice}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </Button>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 text-2xl">💾</div>
                  <div>
                    <CardTitle className="text-blue-800 text-lg">Using Local Storage</CardTitle>
                    <CardDescription className="text-blue-700">
                      Your account is stored locally in your browser. To access your data from other devices and get automatic backups, consider setting up cloud storage.
                    </CardDescription>
                    <Link 
                      href="/setup" 
                      className="text-blue-800 underline text-sm font-semibold hover:text-blue-900 mt-2 inline-block"
                    >
                      → Set up database migration
                    </Link>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}
          
          <header className="text-center mb-12">
            <div className="flex justify-between items-center mb-6">
              <div></div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600 dark:text-gray-300">
                  Welcome, {user?.username}
                </span>
                <Button
                  onClick={logout}
                  variant="destructive"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              🎾 Tennis Captain
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Simple captain tools for match day success
            </p>
          </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Link href="/team" className="group">
            <Card className="p-8 transition-all duration-300 group-hover:scale-105 cursor-pointer border-2 border-transparent group-hover:border-green-200 hover:shadow-lg">
              <CardContent className="p-0 text-center">
                <div className="text-6xl mb-4">👥</div>
                <CardTitle className="text-2xl mb-3">Team</CardTitle>
                <CardDescription>
                  Manage players, rankings & stats
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/match" className="group">
            <Card className="p-8 transition-all duration-300 group-hover:scale-105 cursor-pointer border-2 border-transparent group-hover:border-blue-200 hover:shadow-lg">
              <CardContent className="p-0 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <CardTitle className="text-2xl mb-3">Match</CardTitle>
                <CardDescription>
                  Chat, results entry & export
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/training" className="group">
            <Card className="p-8 transition-all duration-300 group-hover:scale-105 cursor-pointer border-2 border-transparent group-hover:border-purple-200 hover:shadow-lg">
              <CardContent className="p-0 text-center">
                <div className="text-6xl mb-4">🏃‍♂️</div>
                <CardTitle className="text-2xl mb-3">Training</CardTitle>
                <CardDescription>
                  Track availability & attendance
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center mt-12">
          <Link href="/test/playground" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            🧪 Developer Playground
          </Link>
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
