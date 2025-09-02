import { useState, useEffect } from 'react';
import { Player } from '@/types';

interface UsePlayersReturn {
  players: Player[];
  loading: boolean;
  error: string | null;
  addPlayer: (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Player | null>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<Player | null>;
  deletePlayer: (id: string) => Promise<boolean>;
  migrateFromLocalStorage: (localStoragePlayers: Player[]) => Promise<boolean>;
  refreshPlayers: () => Promise<void>;
}

export function usePlayers(): UsePlayersReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch players from database (with fallback to localStorage)
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from database
      try {
        const response = await fetch('/api/players');
        const data = await response.json();
        
        if (response.ok && data.players) {
          // Convert date strings back to Date objects
          const playersWithDates = data.players.map((player: Record<string, unknown>) => ({
            ...player,
            createdAt: new Date(player.createdAt as string),
            updatedAt: new Date(player.updatedAt as string)
          }));
          
          setPlayers(playersWithDates);
          return;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage:', dbError);
      }
      
      // Fallback to localStorage if database is not available
      const savedPlayers = localStorage.getItem("tennis-captain-players");
      if (savedPlayers) {
        const localPlayers = JSON.parse(savedPlayers).map((player: Record<string, unknown>) => ({
          ...player,
          createdAt: player.createdAt ? new Date(player.createdAt as string) : new Date(),
          updatedAt: player.updatedAt ? new Date(player.updatedAt as string) : new Date()
        }));
        setPlayers(localPlayers);
      } else {
        setPlayers([]);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching players:', err);
      
      // Final fallback to empty array
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new player
  const addPlayer = async (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player | null> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(playerData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.player) {
          const newPlayer = {
            ...data.player,
            createdAt: new Date(data.player.createdAt),
            updatedAt: new Date(data.player.updatedAt)
          };
          
          setPlayers(prev => [...prev, newPlayer]);
          return newPlayer;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for add:', dbError);
      }
      
      // Fallback to localStorage
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const updatedPlayers = [...players, newPlayer];
      setPlayers(updatedPlayers);
      localStorage.setItem("tennis-captain-players", JSON.stringify(updatedPlayers));
      
      return newPlayer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating player:', err);
      return null;
    }
  };

  // Update player
  const updatePlayer = async (id: string, updates: Partial<Player>): Promise<Player | null> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch(`/api/players/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        
        const data = await response.json();
        
        if (response.ok && data.player) {
          const updatedPlayer = {
            ...data.player,
            createdAt: new Date(data.player.createdAt),
            updatedAt: new Date(data.player.updatedAt)
          };
          
          setPlayers(prev => prev.map(p => p.id === id ? updatedPlayer : p));
          return updatedPlayer;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for update:', dbError);
      }
      
      // Fallback to localStorage
      const currentPlayer = players.find(p => p.id === id);
      if (!currentPlayer) return null;
      
      const updatedPlayer = {
        ...currentPlayer,
        ...updates,
        updatedAt: new Date()
      };
      
      const updatedPlayers = players.map(p => p.id === id ? updatedPlayer : p);
      setPlayers(updatedPlayers);
      localStorage.setItem("tennis-captain-players", JSON.stringify(updatedPlayers));
      
      return updatedPlayer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating player:', err);
      return null;
    }
  };

  // Delete player
  const deletePlayer = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch(`/api/players/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setPlayers(prev => prev.filter(p => p.id !== id));
          return true;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for delete:', dbError);
      }
      
      // Fallback to localStorage
      const updatedPlayers = players.filter(p => p.id !== id);
      setPlayers(updatedPlayers);
      localStorage.setItem("tennis-captain-players", JSON.stringify(updatedPlayers));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting player:', err);
      return false;
    }
  };

  // Migrate from localStorage
  const migrateFromLocalStorage = async (localStoragePlayers: Player[]): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: localStoragePlayers })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to migrate players');
      }
      
      // Refresh players after migration
      await fetchPlayers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error migrating players:', err);
      return false;
    }
  };

  // Refresh players
  const refreshPlayers = async () => {
    await fetchPlayers();
  };

  // Load players on mount
  useEffect(() => {
    fetchPlayers();
  }, []);

  return {
    players,
    loading,
    error,
    addPlayer,
    updatePlayer,
    deletePlayer,
    migrateFromLocalStorage,
    refreshPlayers
  };
}