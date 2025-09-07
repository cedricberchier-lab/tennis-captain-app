'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Slot {
  court: string;
  start: string;
  end: string;
}

interface ApiResponse {
  date: string;
  time: string | null;
  slots: Slot[];
}

export default function TestTodayPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/free-courts?date=${today}&time=20:30`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch');
      }
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderResults = () => {
    if (!data) return null;
    
    if (data.slots.length === 0) {
      return (
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No free courts at 20:30 today.
        </p>
      );
    }
    
    return (
      <div className="space-y-2">
        {data.slots.map((slot, index) => (
          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {slot.court} — {slot.start}–{slot.end}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Test — Free courts today at 20:30
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Quick validation for availability
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex justify-center">
              <Button 
                onClick={fetchData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="text-red-600 dark:text-red-400">
                Error: {error}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          {renderResults()}
        </div>
      </div>
    </div>
  );
}