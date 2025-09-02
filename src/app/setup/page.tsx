'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function SetupPage() {
  const [hasLocal, setHasLocal] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for local users via API
    const checkLocalUsers = async () => {
      try {
        const response = await fetch('/api/auth/local-status');
        const data = await response.json();
        setHasLocal(data.hasLocalUsers);
        setLocalCount(data.count);
      } catch (error) {
        console.error('Error checking local users:', error);
        setHasLocal(false);
        setLocalCount(0);
      } finally {
        setLoading(false);
      }
    };

    checkLocalUsers();
  }, []);

  const handleMigration = async () => {
    setMigrating(true);
    setMigrationResult('');

    try {
      const response = await fetch('/api/auth/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (response.ok) {
        setMigrationResult(`✅ ${result.message}`);
        if (result.clearedLocalStorage) {
          setHasLocal(false);
          setLocalCount(0);
        }
      } else {
        setMigrationResult(`❌ ${result.error || 'Migration failed'}`);
      }
    } catch (error) {
      setMigrationResult(`❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-600 to-yellow-500 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">⚙️ Database Setup Required</h1>
            <p className="text-gray-600">Your Tennis Captain app needs a database connection</p>
          </div>

          <div className="space-y-6">
            {loading && (
              <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Checking for local users...</p>
              </div>
            )}

            {!loading && hasLocal && (
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <h2 className="font-bold text-green-800 mb-2">🔄 Local Users Found ({localCount})</h2>
                <p className="text-green-700 mb-3">
                  You have {localCount} local user account{localCount !== 1 ? 's' : ''} that can be migrated to the database once it&apos;s set up.
                </p>
                <button
                  onClick={handleMigration}
                  disabled={migrating}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  {migrating ? '⏳ Migrating...' : '🚀 Migrate to Database'}
                </button>
                {migrationResult && (
                  <p className="mt-3 text-sm font-medium">{migrationResult}</p>
                )}
              </div>
            )}

            <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
              <h2 className="font-bold text-yellow-800 mb-2">⚙️ Database Setup</h2>
              <p className="text-yellow-700">
                {hasLocal ? 
                  'Set up your database and then migrate your local users above.' :
                  'The authentication system works locally but setting up a database enables cross-device access and backups.'
                }
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <h2 className="font-bold text-blue-800 mb-3">📋 Quick Setup Steps</h2>
              <ol className="list-decimal list-inside space-y-2 text-blue-700">
                <li>Create a Vercel account and deploy your app</li>
                <li>Add a Postgres database in your Vercel project</li>
                <li>Copy the database environment variables</li>
                <li>Create <code className="bg-blue-100 px-1 rounded">.env.local</code> file in your project root</li>
                <li>Paste the database credentials</li>
                <li>Restart your development server</li>
              </ol>
            </div>

            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
              <h2 className="font-bold text-green-800 mb-2">📖 Detailed Instructions</h2>
              <p className="text-green-700 mb-2">
                Follow the complete setup guide in your project:
              </p>
              <code className="bg-green-100 text-green-800 p-2 rounded block">
                README-DATABASE.md
              </code>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <h2 className="font-bold text-gray-800 mb-2">🔧 Environment Variables Needed</h2>
              <pre className="text-sm text-gray-700 bg-gray-100 p-3 rounded overflow-x-auto">
{`POSTGRES_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."`}
              </pre>
            </div>

            <div className="text-center pt-4">
              <Link 
                href="/"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 border-2 border-blue-700"
              >
                ← Back to App
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}