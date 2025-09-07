"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayers } from "@/hooks/usePlayers";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CalendarOff, 
  Plus, 
  Trash2,
  Calendar,
  User
} from "lucide-react";

interface Absence {
  id: string;
  playerId: string;
  playerName: string;
  date: Date;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AddAbsenceFormData {
  date: string;
  reason: string;
}

export default function AbsencePage() {
  const { user } = useAuth();
  const { players, updatePlayer, refreshPlayers } = usePlayers();
  
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddAbsenceFormData>({
    date: "",
    reason: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user's player record
  const currentPlayer = user?.email ? players.find(p => p.email === user.email) : null;

  // Load all absences from players data
  useEffect(() => {
    if (players.length > 0) {
      const allAbsences: Absence[] = [];
      
      players.forEach(player => {
        player.absences.forEach((absenceStr, index) => {
          const [dateStr, ...reasonParts] = absenceStr.split(' - ');
          const reason = reasonParts.join(' - ') || '';
          
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              allAbsences.push({
                id: `${player.id}-${index}`,
                playerId: player.id,
                playerName: player.name,
                date,
                reason,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          } catch (error) {
            console.warn('Invalid absence date:', dateStr);
          }
        });
      });

      // Sort by date (newest first)
      allAbsences.sort((a, b) => b.date.getTime() - a.date.getTime());
      setAbsences(allAbsences);
      setLoading(false);
    }
  }, [players]);

  // Reset form
  const resetForm = () => {
    setFormData({
      date: "",
      reason: ""
    });
  };

  // Handle adding absence
  const handleAddAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPlayer) {
      alert('No player record found. Please ensure you are registered as a player.');
      return;
    }
    
    if (!formData.date.trim()) {
      alert('Please select a date.');
      return;
    }
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const absenceEntry = `${formData.date}${formData.reason.trim() ? ` - ${formData.reason.trim()}` : ''}`;
      const updatedAbsences = [...currentPlayer.absences, absenceEntry];
      
      const updatedPlayer = await updatePlayer(currentPlayer.id, { absences: updatedAbsences });
      
      if (updatedPlayer) {
        await refreshPlayers();
        resetForm();
        setShowAddForm(false);
      } else {
        console.error('updatePlayer returned null');
        alert('Failed to add absence. Please try again.');
      }
    } catch (error) {
      console.error('Error adding absence:', error);
      alert(`Failed to add absence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle removing absence
  const handleRemoveAbsence = async (absence: Absence) => {
    const player = players.find(p => p.id === absence.playerId);
    if (!player) return;

    try {
      const absenceString = `${absence.date.toISOString().split('T')[0]}${absence.reason ? ` - ${absence.reason}` : ''}`;
      const updatedAbsences = player.absences.filter(a => a !== absenceString);
      
      const updatedPlayer = await updatePlayer(player.id, { absences: updatedAbsences });
      if (updatedPlayer) {
        await refreshPlayers();
      } else {
        alert('Failed to remove absence. Please try again.');
      }
    } catch (error) {
      console.error('Error removing absence:', error);
      alert('Failed to remove absence. Please try again.');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8"></div>

          {/* Quick Add Button */}
          <div className="mb-6">
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              disabled={!currentPlayer}
            >
              <Plus className="h-4 w-4" />
              Add Absence
            </Button>
            {!currentPlayer && (
              <p className="text-sm text-gray-500 mt-2">
                You need to be linked to a player record to add absences.
              </p>
            )}
          </div>

          {/* Absences List */}
          <div className="space-y-4">
            {loading ? (
              <Card className="p-8">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Loading absences...
                </div>
              </Card>
            ) : absences.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No absences recorded</p>
                  <p className="text-sm">Click "Add Absence" to report when you won't be available.</p>
                </div>
              </Card>
            ) : (
              absences.map((absence) => (
                <Card key={absence.id} className="p-6 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                          <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {absence.date.toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                            <User className="h-4 w-4" />
                            <span>{absence.playerName}</span>
                          </div>
                          {absence.reason && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                              {absence.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Only allow removal if it's current user's absence */}
                      {currentPlayer && absence.playerId === currentPlayer.id && (
                        <Button
                          onClick={() => handleRemoveAbsence(absence)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Add Absence Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-red-600" />
                Add Absence
              </h3>
              
              <form onSubmit={handleAddAbsence} className="space-y-4">
                <div>
                  <Label htmlFor="absence-date">Date *</Label>
                  <Input
                    id="absence-date"
                    type="date"
                    value={formData.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="absence-reason">Reason (optional)</Label>
                  <Input
                    id="absence-reason"
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Vacation, Work trip, Medical appointment"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowAddForm(false);
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={!formData.date.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Absence'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}