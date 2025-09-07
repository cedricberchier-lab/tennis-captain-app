'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function FreeCourtsList() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (time) params.set('time', time);
      
      const response = await fetch(`/api/free-courts?${params}`);
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

  const setQuickTime = () => {
    setTime('20:30');
  };

  const renderResults = () => {
    if (!data) return null;
    
    if (data.slots.length === 0) {
      if (data.time) {
        return (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No free courts at {data.time} on {data.date}.
          </p>
        );
      } else {
        return (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No free slots on {data.date}.
          </p>
        );
      }
    }
    
    if (data.time) {
      // Show flat list when filtering by time
      return (
        <div className="space-y-2">
          {data.slots.map((slot, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {slot.court} — {slot.start}–{slot.end}
            </div>
          ))}
        </div>
      );
    } else {
      // Group by court when showing all times
      const groupedSlots = data.slots.reduce((acc, slot) => {
        if (!acc[slot.court]) {
          acc[slot.court] = [];
        }
        acc[slot.court].push(slot);
        return acc;
      }, {} as Record<string, Slot[]>);
      
      return (
        <div className="space-y-4">
          {Object.entries(groupedSlots).map(([court, slots]) => (
            <Card key={court}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{court}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {slots.map((slot, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      {slot.start}–{slot.end}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Free tennis courts
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Available court slots at Centre FairPlay
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time (optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="HH:MM"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={setQuickTime}
                    className="whitespace-nowrap"
                  >
                    20:30
                  </Button>
                </div>
              </div>
              
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