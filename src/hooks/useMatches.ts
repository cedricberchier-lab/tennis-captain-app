import { useState, useEffect } from 'react';
import { Match } from '@/types';

interface UseMatchesReturn {
  matches: Match[];
  loading: boolean;
  error: string | null;
  addMatch: (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt' | 'roster' | 'results'>) => Promise<Match | null>;
  updateMatch: (id: string, updates: Partial<Match>) => Promise<Match | null>;
  deleteMatch: (id: string) => Promise<boolean>;
  getMatchById: (id: string) => Match | undefined;
  refreshMatches: () => Promise<void>;
}

export function useMatches(): UseMatchesReturn {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/matches', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        console.warn('Database API failed, falling back to localStorage');
        throw new Error('Database not available');
      }
      
      const data = await response.json();
      
      // If we have matches from database, use them
      if (data.matches && data.matches.length > 0) {
        const matchesWithDates = data.matches.map((match: Record<string, unknown>) => ({
          ...match,
          date: new Date(match.date as string),
          createdAt: new Date(match.createdAt as string),
          updatedAt: new Date(match.updatedAt as string)
        }));
        setMatches(matchesWithDates);
        return;
      }
      
      // If database returns empty, check localStorage
      const localMatches = localStorage.getItem('tennis-captain-matches');
      if (localMatches) {
        const parsedMatches = JSON.parse(localMatches).map((match: Record<string, unknown>) => ({
          ...match,
          date: new Date(match.date as string),
          createdAt: new Date(match.createdAt as string),
          updatedAt: new Date(match.updatedAt as string)
        }));
        setMatches(parsedMatches);
      } else {
        setMatches([]);
      }
    } catch (err: unknown) {
      console.warn('Database not available, using localStorage:', err);
      
      // Don't show error for database unavailable in development
      if (err instanceof Error && !err.message.includes('Database not available')) {
        setError(err.message);
      }
      
      // Fallback to localStorage for development
      try {
        const localMatches = localStorage.getItem('tennis-captain-matches');
        if (localMatches) {
          const parsedMatches = JSON.parse(localMatches).map((match: Record<string, unknown>) => ({
            ...match,
            date: new Date(match.date as string),
            createdAt: new Date(match.createdAt as string),
            updatedAt: new Date(match.updatedAt as string)
          }));
          setMatches(parsedMatches);
        } else {
          setMatches([]);
        }
      } catch (localErr) {
        console.error('Error loading local matches:', localErr);
        setError('Failed to load matches');
        setMatches([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshMatches = async () => {
    await fetchMatches();
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const addMatch = async (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt' | 'roster' | 'results'>): Promise<Match | null> => {
    try {
      setError(null);
      
      // Add default values for roster and results
      const fullMatchData = {
        ...matchData,
        roster: {
          homeLineup: [],
          opponentLineup: [],
          homeDoublesLineup: [],
          opponentDoublesLineup: []
        },
        results: []
      };

      // Try database first
      try {
        const response = await fetch('/api/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fullMatchData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.match) {
          const newMatch = {
            ...data.match,
            date: new Date(data.match.date),
            createdAt: new Date(data.match.createdAt),
            updatedAt: new Date(data.match.updatedAt)
          };
          
          setMatches(prev => {
            const updated = [...prev, newMatch];
            // Save to localStorage as backup
            localStorage.setItem('tennis-captain-matches', JSON.stringify(updated));
            return updated;
          });
          
          return newMatch;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for add:', dbError);
      }
      
      // Fallback to localStorage
      const newMatch: Match = {
        id: crypto.randomUUID(),
        ...fullMatchData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setMatches(prev => {
        const updated = [...prev, newMatch];
        localStorage.setItem('tennis-captain-matches', JSON.stringify(updated));
        return updated;
      });
      
      return newMatch;
    } catch (err: unknown) {
      console.error('Error adding match:', err);
      setError(err instanceof Error ? err.message : 'Failed to create match');
      return null;
    }
  };

  const updateMatch = async (id: string, updates: Partial<Match>): Promise<Match | null> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch(`/api/matches/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
        
        const data = await response.json();
        
        if (response.ok && data.match) {
          const updatedMatch = {
            ...data.match,
            date: new Date(data.match.date),
            createdAt: new Date(data.match.createdAt),
            updatedAt: new Date(data.match.updatedAt)
          };
          
          setMatches(prev => {
            const updated = prev.map(m => m.id === id ? updatedMatch : m);
            // Update localStorage
            localStorage.setItem('tennis-captain-matches', JSON.stringify(updated));
            return updated;
          });
          
          return updatedMatch;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for update:', dbError);
      }
      
      // Fallback to localStorage
      const currentMatch = matches.find(m => m.id === id);
      if (!currentMatch) return null;
      
      const updatedMatch = {
        ...currentMatch,
        ...updates,
        updatedAt: new Date()
      };
      
      setMatches(prev => {
        const updated = prev.map(m => m.id === id ? updatedMatch : m);
        localStorage.setItem('tennis-captain-matches', JSON.stringify(updated));
        return updated;
      });
      
      return updatedMatch;
    } catch (err: unknown) {
      console.error('Error updating match:', err);
      setError(err instanceof Error ? err.message : 'Failed to update match');
      return null;
    }
  };

  const deleteMatch = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch(`/api/matches/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setMatches(prev => {
            const updated = prev.filter(m => m.id !== id);
            // Update localStorage
            localStorage.setItem('tennis-captain-matches', JSON.stringify(updated));
            return updated;
          });
          
          return true;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for delete:', dbError);
      }
      
      // Fallback to localStorage
      setMatches(prev => {
        const updated = prev.filter(m => m.id !== id);
        localStorage.setItem('tennis-captain-matches', JSON.stringify(updated));
        return updated;
      });
      
      return true;
    } catch (err: unknown) {
      console.error('Error deleting match:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete match');
      return false;
    }
  };

  const getMatchById = (id: string): Match | undefined => {
    return matches.find(m => m.id === id);
  };

  return {
    matches,
    loading,
    error,
    addMatch,
    updateMatch,
    deleteMatch,
    getMatchById,
    refreshMatches
  };
}