import { useState, useEffect } from 'react';
import { Training, TrainingParticipant } from '@/types';

interface UseTrainingsReturn {
  trainings: Training[];
  loading: boolean;
  error: string | null;
  addTraining: (trainingData: Omit<Training, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Training | null>;
  updateTraining: (id: string, updates: Partial<Training>) => Promise<Training | null>;
  deleteTraining: (id: string) => Promise<boolean>;
  getTrainingById: (id: string) => Training | undefined;
  getUpcomingTrainings: (count?: number) => Training[];
  refreshTrainings: () => Promise<void>;
}

export function useTrainings(): UseTrainingsReturn {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainings = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/trainings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        console.warn('Database API failed, falling back to localStorage');
        throw new Error('Database not available');
      }
      
      const data = await response.json();
      
      // If we have trainings from database, use them
      if (data.trainings && data.trainings.length > 0) {
        const trainingsWithDates = data.trainings.map((training: Record<string, unknown>) => ({
          ...training,
          date: new Date(training.date as string),
          createdAt: new Date(training.createdAt as string),
          updatedAt: new Date(training.updatedAt as string)
        }));
        setTrainings(trainingsWithDates);
        return;
      }
      
      // If database returns empty, check localStorage
      const localTrainings = localStorage.getItem('tennis-captain-trainings');
      if (localTrainings) {
        const parsedTrainings = JSON.parse(localTrainings).map((training: Record<string, unknown>) => ({
          ...training,
          date: new Date(training.date as string),
          createdAt: new Date(training.createdAt as string),
          updatedAt: new Date(training.updatedAt as string)
        }));
        setTrainings(parsedTrainings);
      } else {
        setTrainings([]);
      }
    } catch (err: unknown) {
      console.warn('Database not available, using localStorage:', err);
      
      // Don't show error for database unavailable in development
      if (err instanceof Error && !err.message.includes('Database not available')) {
        setError(err.message);
      }
      
      // Fallback to localStorage for development
      try {
        const localTrainings = localStorage.getItem('tennis-captain-trainings');
        if (localTrainings) {
          const parsedTrainings = JSON.parse(localTrainings).map((training: Record<string, unknown>) => ({
            ...training,
            date: new Date(training.date as string),
            createdAt: new Date(training.createdAt as string),
            updatedAt: new Date(training.updatedAt as string)
          }));
          setTrainings(parsedTrainings);
        } else {
          setTrainings([]);
        }
      } catch (localErr) {
        console.error('Error loading local trainings:', localErr);
        setError('Failed to load trainings');
        setTrainings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshTrainings = async () => {
    await fetchTrainings();
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const addTraining = async (trainingData: Omit<Training, 'id' | 'createdAt' | 'updatedAt'>): Promise<Training | null> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch('/api/trainings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(trainingData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.training) {
          const newTraining = {
            ...data.training,
            date: new Date(data.training.date),
            createdAt: new Date(data.training.createdAt),
            updatedAt: new Date(data.training.updatedAt)
          };
          
          setTrainings(prev => {
            const updated = [...prev, newTraining].sort((a, b) => a.date.getTime() - b.date.getTime());
            // Save to localStorage as backup
            localStorage.setItem('tennis-captain-trainings', JSON.stringify(updated));
            return updated;
          });
          
          return newTraining;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for add:', dbError);
      }
      
      // Fallback to localStorage
      const newTraining: Training = {
        id: crypto.randomUUID(),
        ...trainingData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setTrainings(prev => {
        const updated = [...prev, newTraining].sort((a, b) => a.date.getTime() - b.date.getTime());
        localStorage.setItem('tennis-captain-trainings', JSON.stringify(updated));
        return updated;
      });
      
      return newTraining;
    } catch (err: unknown) {
      console.error('Error adding training:', err);
      setError(err instanceof Error ? err.message : 'Failed to create training');
      return null;
    }
  };

  const updateTraining = async (id: string, updates: Partial<Training>): Promise<Training | null> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch(`/api/trainings/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
        
        const data = await response.json();
        
        if (response.ok && data.training) {
          const updatedTraining = {
            ...data.training,
            date: new Date(data.training.date),
            createdAt: new Date(data.training.createdAt),
            updatedAt: new Date(data.training.updatedAt)
          };
          
          setTrainings(prev => {
            const updated = prev.map(t => t.id === id ? updatedTraining : t)
              .sort((a, b) => a.date.getTime() - b.date.getTime());
            // Update localStorage
            localStorage.setItem('tennis-captain-trainings', JSON.stringify(updated));
            return updated;
          });
          
          return updatedTraining;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for update:', dbError);
      }
      
      // Fallback to localStorage
      const currentTraining = trainings.find(t => t.id === id);
      if (!currentTraining) return null;
      
      const updatedTraining = {
        ...currentTraining,
        ...updates,
        updatedAt: new Date()
      };
      
      setTrainings(prev => {
        const updated = prev.map(t => t.id === id ? updatedTraining : t)
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        localStorage.setItem('tennis-captain-trainings', JSON.stringify(updated));
        return updated;
      });
      
      return updatedTraining;
    } catch (err: unknown) {
      console.error('Error updating training:', err);
      setError(err instanceof Error ? err.message : 'Failed to update training');
      return null;
    }
  };

  const deleteTraining = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Try database first
      try {
        const response = await fetch(`/api/trainings/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setTrainings(prev => {
            const updated = prev.filter(t => t.id !== id);
            // Update localStorage
            localStorage.setItem('tennis-captain-trainings', JSON.stringify(updated));
            return updated;
          });
          
          return true;
        }
      } catch (dbError) {
        console.warn('Database not available, falling back to localStorage for delete:', dbError);
      }
      
      // Fallback to localStorage
      setTrainings(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('tennis-captain-trainings', JSON.stringify(updated));
        return updated;
      });
      
      return true;
    } catch (err: unknown) {
      console.error('Error deleting training:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete training');
      return false;
    }
  };

  const getTrainingById = (id: string): Training | undefined => {
    return trainings.find(t => t.id === id);
  };

  const getUpcomingTrainings = (count: number = 3): Training[] => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    return trainings
      .filter(training => training.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, count);
  };

  return {
    trainings,
    loading,
    error,
    addTraining,
    updateTraining,
    deleteTraining,
    getTrainingById,
    getUpcomingTrainings,
    refreshTrainings
  };
}