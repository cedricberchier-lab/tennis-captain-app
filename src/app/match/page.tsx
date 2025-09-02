"use client";

import Link from "next/link";
import { useState } from "react";
import { Match, MatchStatus } from "@/types";
import { useMatches } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import ProtectedRoute from "@/components/ProtectedRoute";
import MatchLineup from "@/components/MatchLineup";
import MatchResults from "@/components/MatchResults";

interface AddMatchFormData {
  season: string;
  category: string;
  group: string;
  matchId: string;
  date: string;
  time: string;
  location: string;
  isHome: boolean;
  opponentTeamName: string;
  opponentCaptainName: string;
  opponentCaptainEmail: string;
  opponentCaptainPhone: string;
}

export default function MatchMode() {
  const { 
    matches, 
    loading, 
    error, 
    addMatch, 
    updateMatch, 
    deleteMatch 
  } = useMatches();
  
  const { players, loading: playersLoading, updatePlayer } = usePlayers();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'lineup' | 'results'>('overview');
  
  const [formData, setFormData] = useState<AddMatchFormData>({
    season: "2024-25",
    category: "NC 55",
    group: "Group A",
    matchId: "",
    date: "",
    time: "14:00",
    location: "",
    isHome: true,
    opponentTeamName: "",
    opponentCaptainName: "",
    opponentCaptainEmail: "",
    opponentCaptainPhone: ""
  });

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.season.trim() || !formData.category.trim() || !formData.date || !formData.opponentTeamName.trim()) return;

    const matchData = {
      season: formData.season.trim(),
      category: formData.category.trim(),
      group: formData.group.trim(),
      matchId: formData.matchId.trim() || `${formData.category}-${formData.group}-${Date.now()}`,
      date: new Date(formData.date),
      time: formData.time,
      location: formData.location.trim(),
      isHome: formData.isHome,
      opponentTeam: {
        name: formData.opponentTeamName.trim(),
        captain: {
          name: formData.opponentCaptainName.trim(),
          email: formData.opponentCaptainEmail.trim(),
          phone: formData.opponentCaptainPhone.trim()
        }
      },
      teamScore: {
        home: 0,
        away: 0,
        autoCalculated: false
      },
      status: MatchStatus.SCHEDULED,
      validation: {
        captainAConfirmed: false,
        captainBConfirmed: false
      }
    };

    const newMatch = await addMatch(matchData);
    if (newMatch) {
      setFormData({
        season: "2024-25",
        category: "NC 55",
        group: "Group A",
        matchId: "",
        date: "",
        time: "14:00",
        location: "",
        isHome: true,
        opponentTeamName: "",
        opponentCaptainName: "",
        opponentCaptainEmail: "",
        opponentCaptainPhone: ""
      });
      setShowAddForm(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (confirm("Are you sure you want to delete this match?")) {
      await deleteMatch(matchId);
    }
  };

  const handleViewMatch = (match: Match) => {
    setSelectedMatch(match);
    setShowMatchDetails(true);
    setActiveTab('overview');
  };

  const handleUpdateMatch = async (updatedMatch: Match) => {
    const result = await updateMatch(updatedMatch.id, updatedMatch);
    if (result) {
      setSelectedMatch(result);
    }
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    const formDataToSet = {
      season: match.season || '',
      category: match.category || '',
      group: match.group || '',
      matchId: match.matchId || '',
      date: match.date ? (match.date instanceof Date ? match.date.toISOString().split('T')[0] : new Date(match.date).toISOString().split('T')[0]) : '',
      time: match.time || '',
      location: match.location || '',
      isHome: match.isHome || false,
      opponentTeamName: match.opponentTeam?.name || '',
      opponentCaptainName: match.opponentTeam?.captain?.name || '',
      opponentCaptainEmail: match.opponentTeam?.captain?.email || '',
      opponentCaptainPhone: match.opponentTeam?.captain?.phone || ''
    };
    setFormData(formDataToSet);
    setShowEditForm(true);
  };

  const handleUpdateMatchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingMatch || !formData.season.trim() || !formData.category.trim() || !formData.date || !formData.opponentTeamName.trim()) return;

    const matchData = {
      season: formData.season.trim(),
      category: formData.category.trim(),
      group: formData.group.trim(),
      matchId: formData.matchId.trim() || editingMatch.matchId,
      date: new Date(formData.date),
      time: formData.time,
      location: formData.location.trim(),
      isHome: formData.isHome,
      opponentTeam: {
        name: formData.opponentTeamName.trim(),
        captain: {
          name: formData.opponentCaptainName.trim(),
          email: formData.opponentCaptainEmail.trim(),
          phone: formData.opponentCaptainPhone.trim()
        }
      },
      teamScore: editingMatch.teamScore,
      status: editingMatch.status,
      validation: editingMatch.validation
    };

    const updatedMatch = await updateMatch(editingMatch.id, matchData);
    if (updatedMatch) {
      setShowEditForm(false);
      setEditingMatch(null);
      // If this match is currently selected in details view, update it
      if (selectedMatch && selectedMatch.id === editingMatch.id) {
        setSelectedMatch(updatedMatch);
      }
    }
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.SCHEDULED: return 'bg-blue-100 text-blue-800';
      case MatchStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-800';
      case MatchStatus.COMPLETED: return 'bg-green-100 text-green-800';
      case MatchStatus.CANCELLED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showMatchDetails && selectedMatch) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 py-8">
            <header className="flex items-center justify-between mb-8">
              <button
                onClick={() => setShowMatchDetails(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← Back to Matches
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {selectedMatch.matchId}
              </h1>
              <div></div>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-8 pt-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: '📋' },
                    { id: 'lineup', label: 'Lineup', icon: '👥' },
                    { id: 'results', label: 'Results', icon: '🏆' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'overview' | 'lineup' | 'results')}
                      className={`flex items-center gap-2 pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {activeTab === 'overview' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">{selectedMatch.category} - {selectedMatch.group}</h2>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedMatch.status)}`}>
                          {selectedMatch.status}
                        </span>
                        <button
                          onClick={() => handleEditMatch(selectedMatch)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          ✏️ Edit Match
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-bold mb-4 text-lg">Match Details</h3>
                        <div className="space-y-2">
                          <p><strong>Date:</strong> {selectedMatch.date.toLocaleDateString()}</p>
                          <p><strong>Time:</strong> {selectedMatch.time}</p>
                          <p><strong>Location:</strong> {selectedMatch.location}</p>
                          <p><strong>Type:</strong> {selectedMatch.isHome ? '🏠 Home' : '✈️ Away'}</p>
                          <p><strong>Season:</strong> {selectedMatch.season}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold mb-4 text-lg">Opponent Team</h3>
                        <div className="space-y-2">
                          <p><strong>Team:</strong> {selectedMatch.opponentTeam.name}</p>
                          <p><strong>Captain:</strong> {selectedMatch.opponentTeam.captain.name}</p>
                          {selectedMatch.opponentTeam.captain.email && (
                            <p><strong>Email:</strong> {selectedMatch.opponentTeam.captain.email}</p>
                          )}
                          {selectedMatch.opponentTeam.captain.phone && (
                            <p><strong>Phone:</strong> {selectedMatch.opponentTeam.captain.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="font-bold mb-4 text-lg">Team Score</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">
                          {selectedMatch.isHome 
                            ? `${selectedMatch.teamScore.home} - ${selectedMatch.teamScore.away}` 
                            : `${selectedMatch.teamScore.away} - ${selectedMatch.teamScore.home}`
                          }
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {selectedMatch.teamScore.autoCalculated ? 'Auto-calculated' : 'Manual entry'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'lineup' && (
                  <div>
                    {playersLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading players...</p>
                      </div>
                    ) : (
                      <MatchLineup 
                        match={selectedMatch} 
                        players={players} 
                        onUpdateMatch={handleUpdateMatch} 
                      />
                    )}
                  </div>
                )}

                {activeTab === 'results' && (
                  <div>
                    {playersLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading players...</p>
                      </div>
                    ) : (
                      <MatchResults 
                        match={selectedMatch} 
                        players={players} 
                        onUpdateMatch={handleUpdateMatch}
                        onUpdatePlayer={updatePlayer}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <header className="flex items-center justify-between mb-8">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🏆 Match Management
            </h1>
            <div></div>
          </header>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Matches ({matches.length})
              </h2>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 border-2 border-green-700"
            >
              ➕ Add Match
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No matches yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Create your first match to get started</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Add First Match
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.map(match => (
                <div key={match.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {match.matchId}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${match.isHome ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {match.isHome ? '🏠 Home' : '✈️ Away'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <p><strong>Competition:</strong> {match.category}</p>
                          <p><strong>Group:</strong> {match.group}</p>
                        </div>
                        <div>
                          <p><strong>Date:</strong> {match.date.toLocaleDateString()}</p>
                          <p><strong>Time:</strong> {match.time}</p>
                        </div>
                        <div>
                          <p><strong>Opponent:</strong> {match.opponentTeam.name}</p>
                          <p><strong>Location:</strong> {match.location}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleViewMatch(match)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Match Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Match</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleAddMatch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Season *
                      </label>
                      <input
                        type="text"
                        value={formData.season}
                        onChange={(e) => setFormData({...formData, season: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="2024-25"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category *
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="NC 55"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Group
                      </label>
                      <input
                        type="text"
                        value={formData.group}
                        onChange={(e) => setFormData({...formData, group: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Group A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Match ID
                      </label>
                      <input
                        type="text"
                        value={formData.matchId}
                        onChange={(e) => setFormData({...formData, matchId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Auto-generated"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tennis Club Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Match Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.isHome}
                          onChange={() => setFormData({...formData, isHome: true})}
                          className="mr-2"
                        />
                        🏠 Home
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!formData.isHome}
                          onChange={() => setFormData({...formData, isHome: false})}
                          className="mr-2"
                        />
                        ✈️ Away
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opponent Team *
                    </label>
                    <input
                      type="text"
                      value={formData.opponentTeamName}
                      onChange={(e) => setFormData({...formData, opponentTeamName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="TC Lausanne"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opponent Captain
                    </label>
                    <input
                      type="text"
                      value={formData.opponentCaptainName}
                      onChange={(e) => setFormData({...formData, opponentCaptainName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Captain Name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Captain Email
                      </label>
                      <input
                        type="email"
                        value={formData.opponentCaptainEmail}
                        onChange={(e) => setFormData({...formData, opponentCaptainEmail: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="captain@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Captain Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.opponentCaptainPhone}
                        onChange={(e) => setFormData({...formData, opponentCaptainPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+41 79 123 4567"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Create Match
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Match Form Modal */}
          {showEditForm && editingMatch && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Match</h2>
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingMatch(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdateMatchInfo} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Season *
                      </label>
                      <input
                        type="text"
                        value={formData.season}
                        onChange={(e) => setFormData({...formData, season: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="2024-25"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category *
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="NC 55"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Group
                      </label>
                      <input
                        type="text"
                        value={formData.group}
                        onChange={(e) => setFormData({...formData, group: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Group A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Match ID
                      </label>
                      <input
                        type="text"
                        value={formData.matchId}
                        onChange={(e) => setFormData({...formData, matchId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Auto-generated"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tennis Club Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Match Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.isHome}
                          onChange={() => setFormData({...formData, isHome: true})}
                          className="mr-2"
                        />
                        🏠 Home
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!formData.isHome}
                          onChange={() => setFormData({...formData, isHome: false})}
                          className="mr-2"
                        />
                        ✈️ Away
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opponent Team *
                    </label>
                    <input
                      type="text"
                      value={formData.opponentTeamName}
                      onChange={(e) => setFormData({...formData, opponentTeamName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="TC Lausanne"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opponent Captain
                    </label>
                    <input
                      type="text"
                      value={formData.opponentCaptainName}
                      onChange={(e) => setFormData({...formData, opponentCaptainName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Captain Name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Captain Email
                      </label>
                      <input
                        type="email"
                        value={formData.opponentCaptainEmail}
                        onChange={(e) => setFormData({...formData, opponentCaptainEmail: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="captain@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Captain Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.opponentCaptainPhone}
                        onChange={(e) => setFormData({...formData, opponentCaptainPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+41 79 123 4567"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingMatch(null);
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Update Match
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