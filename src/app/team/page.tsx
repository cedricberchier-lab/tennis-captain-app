"use client";

import { useState, useEffect } from "react";
import { Player } from "@/types";
import { usePlayers } from "@/hooks/usePlayers";
import { exportPlayersToJSON, exportPlayersToCSV, copyPlayersToClipboard } from "@/utils/dataExport";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Activity, Settings, Key, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AddPlayerFormData {
  name: string;
  email: string;
  phone: string;
  ranking: number;
}

const rankingOptions = [
  { value: 0, label: "Unranked" },
  { value: 1, label: "N1" },
  { value: 2, label: "N2" },
  { value: 3, label: "N3" },
  { value: 4, label: "R1" },
  { value: 5, label: "R2" },
  { value: 6, label: "R3" },
  { value: 7, label: "R4" },
  { value: 8, label: "R5" },
  { value: 9, label: "R6" },
  { value: 10, label: "R7" },
  { value: 11, label: "R8" },
  { value: 12, label: "R9" }
];

export default function TeamMode() {
  const { user, token } = useAuth();
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
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
  };

  // Check if current user can edit this player (only their own info, not delete)
  const canEditPlayer = (player: Player) => {
    return user && (user.email === player.email || user.name === player.name);
  };

  // Check if current user is admin (can edit/delete all players)
  const isAdmin = () => {
    return user && user.role === 'admin';
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


  const closePlayerDetails = () => {
    setShowPlayerDetails(false);
    setSelectedPlayer(null);
    setIsEditingPlayer(false);
    setIsChangingPassword(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (!token) {
      setPasswordError('Authentication required');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess(true);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordSuccess(false);
        }, 2000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('Network error. Please try again.');
    }
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

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.ranking === 0 && b.ranking === 0) return a.name.localeCompare(b.name);
    if (a.ranking === 0) return 1;
    if (b.ranking === 0) return -1;
    return b.ranking - a.ranking; // Higher ranking values first (R9 before R1)
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">

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
          <div className="space-y-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-3 text-purple-600" />
              <p className="text-gray-600 dark:text-gray-300">Loading players...</p>
            </div>
            {/* Loading skeleton cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="h-48">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div>
          {/* Team Stats Overview */}

          <div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Team Players
              </h2>
              
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 dark:text-gray-600 mb-4">
                    <Activity className="h-16 w-16 mx-auto" />
                  </div>
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
                          {rankingOptions.find(r => r.value === player.ranking)?.label || "UR"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {player.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {player.email || "No email"} • {player.phone || "No phone"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {isAdmin() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlayer(player.id);
                            }}
                            className="text-red-500 hover:text-red-700 p-2"
                            title="Delete player (Admin only)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
                  <select
                    value={formData.ranking || 0}
                    onChange={(e) => setFormData({ ...formData, ranking: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    {rankingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                  {(isAdmin() || canEditPlayer(selectedPlayer)) && (
                    <button
                      onClick={() => setIsEditingPlayer(!isEditingPlayer)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {isEditingPlayer ? "Cancel Edit" : "✏️ Edit Info"}
                    </button>
                  )}
                </div>

                {isEditingPlayer && (isAdmin() || canEditPlayer(selectedPlayer)) ? (
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
                        <select
                          value={editPlayerData.ranking || 0}
                          onChange={(e) => setEditPlayerData({ ...editPlayerData, ranking: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        >
                          {rankingOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
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
                      <div><strong>Ranking:</strong> {rankingOptions.find(r => r.value === selectedPlayer.ranking)?.label || "Unranked"}</div>
                    </div>
                    <div className="space-y-2">
                      <div><strong>Email:</strong> {selectedPlayer.email || "Not provided"}</div>
                      <div><strong>Phone:</strong> {selectedPlayer.phone || "Not provided"}</div>
                    </div>
                    {isAdmin() && (
                      <div className="md:col-span-2 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-blue-800 dark:text-blue-200 text-sm">
                          <Settings className="h-4 w-4 inline mr-1" />
                        Admin: You can edit and delete all player accounts
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Change Section - Only for logged user's own account (not admin override) */}
              {canEditPlayer(selectedPlayer) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Password Management
                    </h4>
                    {!isChangingPassword && (
                      <button
                        onClick={() => setIsChangingPassword(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <Key className="h-4 w-4 inline mr-1" />
                        Change Password
                      </button>
                    )}
                  </div>

                  {isChangingPassword ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Current Password *
                        </label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            New Password *
                          </label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="New password (min 6 chars)"
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirm New Password *
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Confirm new password"
                            minLength={6}
                          />
                        </div>
                      </div>
                      
                      {passwordError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-red-700 dark:text-red-200 text-sm">{passwordError}</p>
                        </div>
                      )}
                      
                      {passwordSuccess && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-green-700 dark:text-green-200 text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Password changed successfully!
                          </p>
                        </div>
                      )}
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={handlePasswordChange}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          Change Password
                        </button>
                        <button
                          onClick={() => {
                            setIsChangingPassword(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setPasswordError('');
                            setPasswordSuccess(false);
                          }}
                          className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click "Change Password" to update your account password
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
}