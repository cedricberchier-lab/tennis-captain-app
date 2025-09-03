"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Player } from "@/types";
import { usePlayers } from "@/hooks/usePlayers";
import { exportPlayersToJSON, exportPlayersToCSV, copyPlayersToClipboard } from "@/utils/dataExport";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarOff } from "lucide-react";

interface AddPlayerFormData {
  name: string;
  email: string;
  phone: string;
  ranking: number;
}

export default function TeamMode() {
  const { 
    players, 
    loading, 
    error, 
    addPlayer, 
    updatePlayer, 
    deletePlayer,
    migrateFromLocalStorage 
  } = usePlayers();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [showAddAbsence, setShowAddAbsence] = useState(false);
  const [editingAbsenceIndex, setEditingAbsenceIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddPlayerFormData>({
    name: "",
    email: "",
    phone: "",
    ranking: 0
  });
  const [editPlayerData, setEditPlayerData] = useState<AddPlayerFormData>({
    name: "",
    email: "",
    phone: "",
    ranking: 0
  });
  const [absenceData, setAbsenceData] = useState({
    date: "",
    reason: ""
  });

  // Check for localStorage data on mount and offer migration
  useEffect(() => {
    const savedPlayers = localStorage.getItem("tennis-captain-players");
    if (savedPlayers && !loading) {
      const localPlayers = JSON.parse(savedPlayers);
      if (localPlayers.length > 0 && players.length === 0) {
        setShowMigration(true);
      }
    }
  }, [loading, players.length]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    const playerData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      ranking: formData.ranking || 0,
      absences: [],
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winsIn2Sets: 0,
        winsIn3Sets: 0,
        lossesIn2Sets: 0,
        lossesIn3Sets: 0,
        performance: 0,
        underperformance: 0,
        trainingAttendance: 0
      }
    };

    const newPlayer = await addPlayer(playerData);
    if (newPlayer) {
      setFormData({ name: "", email: "", phone: "", ranking: 0 });
      setShowAddForm(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (confirm("Are you sure you want to remove this player?")) {
      await deletePlayer(playerId);
    }
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setEditPlayerData({
      name: player.name,
      email: player.email,
      phone: player.phone,
      ranking: player.ranking
    });
    setShowPlayerDetails(true);
    setIsEditingPlayer(false);
    setShowAddAbsence(false);
    setEditingAbsenceIndex(null);
  };

  const handleEditPlayer = async () => {
    if (!selectedPlayer) return;
    
    const updates = {
      name: editPlayerData.name.trim(),
      email: editPlayerData.email.trim(),
      phone: editPlayerData.phone.trim(),
      ranking: editPlayerData.ranking || 0,
    };

    const updatedPlayer = await updatePlayer(selectedPlayer.id, updates);
    if (updatedPlayer) {
      setSelectedPlayer(updatedPlayer);
      setIsEditingPlayer(false);
    }
  };

  const handleAddAbsence = async () => {
    if (!selectedPlayer || !absenceData.date.trim()) return;

    const absenceEntry = `${absenceData.date}${absenceData.reason.trim() ? ` - ${absenceData.reason.trim()}` : ''}`;
    const updatedAbsences = [...selectedPlayer.absences, absenceEntry];
    
    const updatedPlayer = await updatePlayer(selectedPlayer.id, { absences: updatedAbsences });
    if (updatedPlayer) {
      setSelectedPlayer(updatedPlayer);
      setAbsenceData({ date: "", reason: "" });
      setShowAddAbsence(false);
    }
  };

  const handleEditAbsence = (index: number) => {
    if (!selectedPlayer) return;
    
    const absence = selectedPlayer.absences[index];
    const [date, ...reasonParts] = absence.split(' - ');
    setAbsenceData({
      date: date,
      reason: reasonParts.join(' - ') || ""
    });
    setEditingAbsenceIndex(index);
    setShowAddAbsence(true);
  };

  const handleUpdateAbsence = async () => {
    if (!selectedPlayer || editingAbsenceIndex === null || !absenceData.date.trim()) return;

    const absenceEntry = `${absenceData.date}${absenceData.reason.trim() ? ` - ${absenceData.reason.trim()}` : ''}`;
    const updatedAbsences = [...selectedPlayer.absences];
    updatedAbsences[editingAbsenceIndex] = absenceEntry;

    const updatedPlayer = await updatePlayer(selectedPlayer.id, { absences: updatedAbsences });
    if (updatedPlayer) {
      setSelectedPlayer(updatedPlayer);
      setAbsenceData({ date: "", reason: "" });
      setShowAddAbsence(false);
      setEditingAbsenceIndex(null);
    }
  };

  const handleDeleteAbsence = async (index: number) => {
    if (!selectedPlayer) return;
    
    if (confirm("Are you sure you want to remove this absence?")) {
      const updatedAbsences = selectedPlayer.absences.filter((_, i) => i !== index);
      
      const updatedPlayer = await updatePlayer(selectedPlayer.id, { absences: updatedAbsences });
      if (updatedPlayer) {
        setSelectedPlayer(updatedPlayer);
      }
    }
  };

  const closePlayerDetails = () => {
    setShowPlayerDetails(false);
    setSelectedPlayer(null);
    setIsEditingPlayer(false);
    setShowAddAbsence(false);
    setEditingAbsenceIndex(null);
    setAbsenceData({ date: "", reason: "" });
  };

  const handleMigrateData = async () => {
    const savedPlayers = localStorage.getItem("tennis-captain-players");
    if (savedPlayers) {
      const localPlayers = JSON.parse(savedPlayers);
      const success = await migrateFromLocalStorage(localPlayers);
      if (success) {
        localStorage.removeItem("tennis-captain-players");
        setShowMigration(false);
      }
    }
  };

  const handleExportJSON = () => {
    exportPlayersToJSON(players);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    exportPlayersToCSV(players);
    setShowExportMenu(false);
  };

  const handleCopyToClipboard = () => {
    copyPlayersToClipboard(players);
    setShowExportMenu(false);
  };

  // Helper function to check if player has upcoming absences
  const hasUpcomingAbsences = (player: Player) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return player.absences.some(absence => {
      const [dateStr] = absence.split(' - ');
      const absenceDate = new Date(dateStr);
      absenceDate.setHours(0, 0, 0, 0);
      return absenceDate >= today;
    });
  };
  
  const getUpcomingAbsencesCount = (player: Player) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return player.absences.filter(absence => {
      const [dateStr] = absence.split(' - ');
      const absenceDate = new Date(dateStr);
      absenceDate.setHours(0, 0, 0, 0);
      return absenceDate >= today;
    }).length;
  };

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.ranking === 0 && b.ranking === 0) return a.name.localeCompare(b.name);
    if (a.ranking === 0) return 1;
    if (b.ranking === 0) return -1;
    return a.ranking - b.ranking;
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            👥 Team Roster
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Manage players, rankings, and track absences
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Migration Banner */}
        {showMigration && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>Data Migration Available:</strong> We found existing player data in your browser. 
                  Would you like to move it to the database?
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleMigrateData}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Migrate Data
                </button>
                <button
                  onClick={() => setShowMigration(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-300">Loading players...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Stats Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Team Overview
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Total Players:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{players.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Ranked Players:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {players.filter(p => p.ranking > 0).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center text-gray-500 dark:text-gray-400 mb-4">
              <p className="text-sm">Player management has been moved to the Setup page</p>
              <a href="/setup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm">
                Go to Setup →
              </a>
            </div>
          </div>

          {/* Player Roster */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Team Players
              </h2>
              
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎾</div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    No players added yet. Start building your team!
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Add First Player
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => handlePlayerClick(player)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {player.ranking > 0 ? `R${player.ranking}` : "UR"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {player.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {player.email || "No email"} • {player.phone || "No phone"}
                          </p>
                          {hasUpcomingAbsences(player) && (
                            <div className="flex items-center gap-1 mt-1">
                              <CalendarOff className="h-3 w-3 text-red-500" />
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                {getUpcomingAbsencesCount(player)} absence{getUpcomingAbsencesCount(player) !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {hasUpcomingAbsences(player) && (
                          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                            📅 Unavailable
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlayer(player.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-2"
                          title="Remove player"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Add Player Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Add New Player
              </h3>
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Player name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="player@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="+41 79 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ranking (Swiss Tennis)
                  </label>
                  <input
                    type="number"
                    value={formData.ranking || ""}
                    onChange={(e) => setFormData({ ...formData, ranking: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0 = unranked"
                    min="0"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Add Player
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({ name: "", email: "", phone: "", ranking: 0 });
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

        {/* Player Details Modal */}
        {showPlayerDetails && selectedPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Player Details
                </h3>
                <button
                  onClick={closePlayerDetails}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {/* Player Info Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Player Information
                  </h4>
                  <button
                    onClick={() => setIsEditingPlayer(!isEditingPlayer)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {isEditingPlayer ? "Cancel Edit" : "✏️ Edit Info"}
                  </button>
                </div>

                {isEditingPlayer ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={editPlayerData.name}
                          onChange={(e) => setEditPlayerData({ ...editPlayerData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Ranking
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editPlayerData.ranking || ""}
                          onChange={(e) => setEditPlayerData({ ...editPlayerData, ranking: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editPlayerData.email}
                          onChange={(e) => setEditPlayerData({ ...editPlayerData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={editPlayerData.phone}
                          onChange={(e) => setEditPlayerData({ ...editPlayerData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleEditPlayer}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditingPlayer(false)}
                        className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div><strong>Name:</strong> {selectedPlayer.name}</div>
                      <div><strong>Ranking:</strong> {selectedPlayer.ranking > 0 ? `R${selectedPlayer.ranking}` : "Unranked"}</div>
                    </div>
                    <div className="space-y-2">
                      <div><strong>Email:</strong> {selectedPlayer.email || "Not provided"}</div>
                      <div><strong>Phone:</strong> {selectedPlayer.phone || "Not provided"}</div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <div><strong>Record:</strong> {selectedPlayer.stats.wins}W - {selectedPlayer.stats.losses}L ({selectedPlayer.stats.matchesPlayed} matches)</div>
                      <div><strong>Joined:</strong> {selectedPlayer.createdAt.toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Absences Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Absences ({selectedPlayer.absences.length})
                  </h4>
                  <button
                    onClick={() => {
                      setShowAddAbsence(!showAddAbsence);
                      setEditingAbsenceIndex(null);
                      setAbsenceData({ date: "", reason: "" });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                  >
                    {showAddAbsence ? "Cancel" : "➕ Add Absence"}
                  </button>
                </div>

                {showAddAbsence && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date *
                        </label>
                        <input
                          type="date"
                          value={absenceData.date}
                          onChange={(e) => setAbsenceData({ ...absenceData, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Reason (optional)
                        </label>
                        <input
                          type="text"
                          value={absenceData.reason}
                          onChange={(e) => setAbsenceData({ ...absenceData, reason: e.target.value })}
                          placeholder="e.g. Vacation, Injury, etc."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={editingAbsenceIndex !== null ? handleUpdateAbsence : handleAddAbsence}
                        disabled={!absenceData.date.trim()}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        {editingAbsenceIndex !== null ? "Update Absence" : "Add Absence"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddAbsence(false);
                          setEditingAbsenceIndex(null);
                          setAbsenceData({ date: "", reason: "" });
                        }}
                        className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {selectedPlayer.absences.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No absences recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPlayer.absences.map((absence, index) => {
                      const [date, ...reasonParts] = absence.split(' - ');
                      const reason = reasonParts.join(' - ');
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {new Date(date).toLocaleDateString()}
                            </div>
                            {reason && (
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                {reason}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditAbsence(index)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAbsence(index)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
}