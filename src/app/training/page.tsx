"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Training, TrainingParticipant, Player } from "@/types";
import { useTrainings } from "@/hooks/useTrainings";
import { usePlayers } from "@/hooks/usePlayers";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddTrainingFormData {
  date: string;
  timeStart: string;
  timeEnd: string;
  courtNumber: string;
  comment: string;
}


export default function TrainingMode() {
  const { 
    trainings, 
    loading: trainingsLoading, 
    error, 
    addTraining, 
    updateTraining, 
    deleteTraining,
    getUpcomingTrainings,
    refreshTrainings
  } = useTrainings();
  
  const { players, loading: playersLoading, refreshPlayers } = usePlayers();
  const { user } = useAuth();
  
  // Check if current user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [formData, setFormData] = useState<AddTrainingFormData>({
    date: "",
    timeStart: "",
    timeEnd: "",
    courtNumber: "",
    comment: ""
  });
  const [participants, setParticipants] = useState<TrainingParticipant[]>([]);
  const [horizonCount, setHorizonCount] = useState(3);

  // Load custom horizon settings from localStorage
  useEffect(() => {
    const savedHorizonCount = localStorage.getItem('trainingHorizonCount');
    
    if (savedHorizonCount) {
      setHorizonCount(parseInt(savedHorizonCount));
    }
  }, []);

  // Save horizon count to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('trainingHorizonCount', horizonCount.toString());
  }, [horizonCount]);

  // Primary effect: Run absence checking whenever page loads or data changes
  useEffect(() => {
    if (!trainingsLoading && !playersLoading && trainings.length > 0 && players.length > 0) {
      console.log('=== RUNNING ABSENCE CHECK ON PAGE LOAD/REFRESH ===');
      console.log(`Checking ${trainings.length} trainings against ${players.length} players`);
      
      // Log all players with their absences
      players.forEach(player => {
        if (player.absences.length > 0) {
          console.log(`Player ${player.name} has ${player.absences.length} absences:`, player.absences);
        }
      });

      // Log training participants and check their absence status
      trainings.forEach(training => {
        const trainingDateStr = training.date.toISOString().split('T')[0];
        console.log(`Training on ${trainingDateStr} (${training.dayName}):`);
        
        training.participants.forEach(participant => {
          if (participant.playerId) {
            // Inline absence checking to avoid dependency issues
            const player = players.find(p => p.id === participant.playerId);
            const hasAbsence = player ? player.absences.some(absence => {
              const absenceDate = absence.split(' - ')[0];
              return absenceDate === trainingDateStr;
            }) : false;
            console.log(`  - ${participant.playerName}: ${hasAbsence ? 'ABSENT (should be RED)' : 'Available (should be GREEN)'}`);
          } else {
            console.log(`  - ${participant.playerName}: Manual entry (no absence check)`);
          }
        });
      });

      // Trigger re-render to apply absence checking
      setRefreshKey(prev => prev + 1);
      console.log('=== ABSENCE CHECK COMPLETED ===');
    }
  }, [trainingsLoading, playersLoading, trainings, players]);

  // Secondary effect: Additional refresh when data changes (for CSV imports)
  useEffect(() => {
    if (!playersLoading && players.length > 0) {
      console.log('Players data updated, scheduling absence check...');
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 100);
    }
  }, [players, playersLoading]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get day name from date
  const getDayName = (date: Date | string): string => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = date instanceof Date ? date : new Date(date);
    return dayNames[dateObj.getDay()];
  };

  // Manual absence checking function
  const checkAbsences = () => {
    console.log('=== MANUAL ABSENCE CHECK TRIGGERED ===');
    console.log(`Checking ${trainings.length} trainings against ${players.length} players`);
    
    if (trainings.length === 0) {
      console.log('No trainings found');
      return;
    }
    
    if (players.length === 0) {
      console.log('No players found');
      return;
    }
    
    // Log all players with their absences
    players.forEach(player => {
      if (player.absences.length > 0) {
        console.log(`Player ${player.name} has ${player.absences.length} absences:`, player.absences);
      }
    });

    // Log training participants and check their absence status
    let totalAbsences = 0;
    trainings.forEach(training => {
      const trainingDateStr = training.date.toISOString().split('T')[0];
      console.log(`Training on ${trainingDateStr} (${training.dayName}):`);
      
      training.participants.forEach(participant => {
        if (participant.playerId) {
          const player = players.find(p => p.id === participant.playerId);
          const hasAbsence = player ? player.absences.some(absence => {
            const absenceDate = absence.split(' - ')[0];
            return absenceDate === trainingDateStr;
          }) : false;
          
          if (hasAbsence) totalAbsences++;
          console.log(`  - ${participant.playerName}: ${hasAbsence ? 'ABSENT (should be RED)' : 'Available (should be GREEN)'}`);
        } else {
          console.log(`  - ${participant.playerName}: Manual entry (no absence check)`);
        }
      });
    });

    // Force re-render to apply absence checking
    setRefreshKey(prev => prev + 1);
    console.log(`=== ABSENCE CHECK COMPLETED - Found ${totalAbsences} absences ===`);
    
    // Show success message
    alert(`Absence check completed! Found ${totalAbsences} player absences. Check console for details.`);
  };


  // Memoized absence checking that recalculates when players data changes
  const playerHasAbsenceOnDate = useMemo(() => {
    return (playerId: string, date: Date): boolean => {
      const player = players.find(p => p.id === playerId);
      if (!player || !player.absences || player.absences.length === 0) {
        return false;
      }
      
      // Handle timezone issues by using local date string instead of ISO
      const trainingDate = new Date(date);
      const year = trainingDate.getFullYear();
      const month = String(trainingDate.getMonth() + 1).padStart(2, '0');
      const day = String(trainingDate.getDate()).padStart(2, '0');
      const trainingDateStr = `${year}-${month}-${day}`;
      
      const hasAbsence = player.absences.some(absence => {
        const absenceDate = absence.split(' - ')[0].trim(); // Get date part and trim whitespace
        return absenceDate === trainingDateStr;
      });
      
      return hasAbsence;
    };
  }, [players, refreshKey]); // Recalculate when players data changes or manual refresh

  // Memoized absence reason checking that recalculates when players data changes
  const getAbsenceReason = useMemo(() => {
    return (playerId: string, date: Date): string | null => {
      const player = players.find(p => p.id === playerId);
      if (!player || !player.absences || player.absences.length === 0) return null;
      
      // Handle timezone issues by using local date string instead of ISO
      const trainingDate = new Date(date);
      const year = trainingDate.getFullYear();
      const month = String(trainingDate.getMonth() + 1).padStart(2, '0');
      const day = String(trainingDate.getDate()).padStart(2, '0');
      const trainingDateStr = `${year}-${month}-${day}`;
      
      const absence = player.absences.find(absence => {
        const absenceDate = absence.split(' - ')[0].trim(); // Get date part and trim whitespace
        return absenceDate === trainingDateStr;
      });
      
      if (absence) {
        const parts = absence.split(' - ');
        const reason = parts.length > 1 ? parts.slice(1).join(' - ') : 'No reason provided';
        return reason;
      }
      
      return null;
    };
  }, [players, refreshKey]); // Recalculate when players data changes or manual refresh

  // Reset form
  const resetForm = () => {
    setFormData({
      date: "",
      timeStart: "",
      timeEnd: "",
      courtNumber: "",
      comment: ""
    });
    setParticipants([]);
  };

  // Handle training creation
  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.timeStart || !formData.timeEnd) return;

    const trainingData = {
      date: new Date(formData.date),
      dayName: getDayName(formData.date),
      timeStart: formData.timeStart,
      timeEnd: formData.timeEnd,
      courtNumber: formData.courtNumber,
      participants: participants,
      comment: formData.comment
    };

    const newTraining = await addTraining(trainingData);
    if (newTraining) {
      resetForm();
      setShowAddForm(false);
    }
  };

  // Handle training editing
  const handleEditTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTraining || !formData.date || !formData.timeStart || !formData.timeEnd) return;

    const updates = {
      date: new Date(formData.date),
      dayName: getDayName(formData.date),
      timeStart: formData.timeStart,
      timeEnd: formData.timeEnd,
      courtNumber: formData.courtNumber,
      participants: participants,
      comment: formData.comment
    };

    const updatedTraining = await updateTraining(editingTraining.id, updates);
    if (updatedTraining) {
      resetForm();
      setShowEditForm(false);
      setEditingTraining(null);
    }
  };

  // Handle training deletion
  const handleDeleteTraining = async (trainingId: string) => {
    if (confirm("Are you sure you want to delete this training session?")) {
      await deleteTraining(trainingId);
    }
  };

  // Open edit form
  const openEditForm = (training: Training) => {
    setEditingTraining(training);
    
    // Use local timezone-safe date formatting for date input
    const year = training.date.getFullYear();
    const month = String(training.date.getMonth() + 1).padStart(2, '0');
    const day = String(training.date.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    setFormData({
      date: localDateString,
      timeStart: training.timeStart,
      timeEnd: training.timeEnd,
      courtNumber: training.courtNumber,
      comment: training.comment
    });
    setParticipants([...training.participants]);
    setShowEditForm(true);
  };

  // Add participant
  const addParticipant = () => {
    if (participants.length >= 4) return; // Max 4 players
    
    const newParticipant: TrainingParticipant = {
      id: crypto.randomUUID(),
      playerName: "",
      isManualEntry: true
    };
    
    setParticipants([...participants, newParticipant]);
  };

  // Update participant
  const updateParticipant = (index: number, updates: Partial<TrainingParticipant>) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], ...updates };
    setParticipants(updated);
  };

  // Remove participant
  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  // Select player from roster
  const selectPlayerFromRoster = (index: number, player: Player) => {
    const updated = [...participants];
    updated[index] = {
      ...updated[index],
      playerId: player.id,
      playerName: player.name,
      email: player.email,
      phone: player.phone,
      isManualEntry: false
    };
    setParticipants(updated);
  };

  // Get displayable trainings based on custom horizon setting
  const displayableTrainings = getUpcomingTrainings(horizonCount);


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <header className="flex items-center justify-between mb-8">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🏃‍♂️ Training
            </h1>
            <div></div>
          </header>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Training Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              {/* Number of Trainings Dropdown */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show next:</span>
                <Select value={horizonCount.toString()} onValueChange={(value) => setHorizonCount(parseInt(value))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 training</SelectItem>
                    <SelectItem value="3">3 trainings</SelectItem>
                    <SelectItem value="5">5 trainings</SelectItem>
                    <SelectItem value="10">10 trainings</SelectItem>
                    <SelectItem value="20">20 trainings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Schedule Training Button */}
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                ➕ Schedule Training
              </Button>
            </div>
          </div>

          {/* Training List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Next {horizonCount} Training Session{horizonCount !== 1 ? 's' : ''}
            </h2>
            
            {trainingsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading trainings...</p>
              </div>
            ) : displayableTrainings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏃‍♂️</div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  No upcoming training sessions scheduled
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Schedule First Training
                </button>
              </div>
            ) : (
              <div className="space-y-4" key={`trainings-${refreshKey}-${players.length}-${JSON.stringify(players.map(p => p.absences)).substring(0, 50)}`}>
                {displayableTrainings.map((training) => (
                  <div
                    key={`${training.id}-${refreshKey}-${players.length}`}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {training.dayName}, {training.date.toLocaleDateString()}
                          </div>
                          <div className="text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                            Court {training.courtNumber}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                          <span>🕐 {training.timeStart} - {training.timeEnd}</span>
                          <span>👥 {training.participants.length}/4 players</span>
                        </div>

                        {training.participants.length > 0 && (
                          <div className="mb-2">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Players:</div>
                            <div className="flex flex-wrap gap-2">
                              {training.participants.map((participant, index) => {
                                // Debug info for absence checking
                                const playerId = participant.playerId || participant.id;
                                const hasAbsence = playerId && playerHasAbsenceOnDate(playerId, training.date);
                                const absenceReason = playerId ? getAbsenceReason(playerId, training.date) : null;
                                
                                return (
                                  <span
                                    key={participant.id}
                                    className={`px-2 py-1 rounded text-sm font-medium ${
                                      hasAbsence
                                        ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600"
                                        : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600"
                                    }`}
                                    title={hasAbsence 
                                      ? `Absent: ${absenceReason}` 
                                      : playerId 
                                        ? `Available (Player ID: ${playerId})`
                                        : `Manual Entry (No roster link)`
                                    }
                                  >
                                    {hasAbsence ? '⚠️ ' : '✓ '}{participant.playerName}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {training.comment && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            💬 {training.comment}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(training)}
                          className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded border border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          Edit
                        </button>
                        {isAdmin() && (
                          <button
                            onClick={() => handleDeleteTraining(training.id)}
                            className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded border border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete training (Admin only)"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Training Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Schedule New Training
                </h3>
                
                <form onSubmit={handleAddTraining} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Court Number
                      </label>
                      <input
                        type="text"
                        value={formData.courtNumber}
                        onChange={(e) => setFormData({ ...formData, courtNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g., 1, 2A, Center Court"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        value={formData.timeStart}
                        onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        value={formData.timeEnd}
                        onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Participants */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Players for Training ({participants.length}/4)
                      </label>
                      <button
                        type="button"
                        onClick={addParticipant}
                        disabled={participants.length >= 4}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-1 px-3 rounded transition-colors"
                      >
                        + Add Player
                      </button>
                    </div>

                    {participants.length === 0 && (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        Click "Add Player" to select from your team roster
                      </div>
                    )}

                    <div className="space-y-3">
                      {participants.map((participant, index) => (
                        <div key={participant.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          
                          <select
                            value={participant.playerId || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                const player = players.find(p => p.id === e.target.value);
                                if (player) {
                                  selectPlayerFromRoster(index, player);
                                }
                              } else {
                                updateParticipant(index, { 
                                  playerId: undefined, 
                                  playerName: '', 
                                  email: undefined, 
                                  phone: undefined, 
                                  isManualEntry: true 
                                });
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-600 dark:text-white"
                          >
                            <option value="">Choose a team player...</option>
                            {players.filter(player => 
                              // Don't show players already selected
                              !participants.some((p, i) => i !== index && p.playerId === player.id)
                            ).map(player => (
                              <option key={player.id} value={player.id}>
                                {player.name} {player.ranking > 0 && `(R${player.ranking})`}
                              </option>
                            ))}
                          </select>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-300 min-w-0">
                            {participant.playerId ? (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                ✓ {participant.playerName}
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                No player selected
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove player"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Comment
                    </label>
                    <textarea
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder="Optional notes about the training session"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Schedule Training
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Training Modal */}
          {showEditForm && editingTraining && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Edit Training Session
                </h3>
                
                <form onSubmit={handleEditTraining} className="space-y-6">
                  {/* Same form fields as Add Training */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Court Number
                      </label>
                      <input
                        type="text"
                        value={formData.courtNumber}
                        onChange={(e) => setFormData({ ...formData, courtNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g., 1, 2A, Center Court"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        value={formData.timeStart}
                        onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        value={formData.timeEnd}
                        onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Participants */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Players for Training ({participants.length}/4)
                      </label>
                      <button
                        type="button"
                        onClick={addParticipant}
                        disabled={participants.length >= 4}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-1 px-3 rounded transition-colors"
                      >
                        + Add Player
                      </button>
                    </div>

                    {participants.length === 0 && (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        Click "Add Player" to select from your team roster
                      </div>
                    )}

                    <div className="space-y-3">
                      {participants.map((participant, index) => (
                        <div key={participant.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          
                          <select
                            value={participant.playerId || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                const player = players.find(p => p.id === e.target.value);
                                if (player) {
                                  selectPlayerFromRoster(index, player);
                                }
                              } else {
                                updateParticipant(index, { 
                                  playerId: undefined, 
                                  playerName: '', 
                                  email: undefined, 
                                  phone: undefined, 
                                  isManualEntry: true 
                                });
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-600 dark:text-white"
                          >
                            <option value="">Choose a team player...</option>
                            {players.filter(player => 
                              // Don't show players already selected
                              !participants.some((p, i) => i !== index && p.playerId === player.id)
                            ).map(player => (
                              <option key={player.id} value={player.id}>
                                {player.name} {player.ranking > 0 && `(R${player.ranking})`}
                              </option>
                            ))}
                          </select>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-300 min-w-0">
                            {participant.playerId ? (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                ✓ {participant.playerName}
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                No player selected
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove player"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Comment
                    </label>
                    <textarea
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder="Optional notes about the training session"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Update Training
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingTraining(null);
                        resetForm();
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}