"use client";

import { useState, useEffect } from "react";
import { Match, LineupPlayer, Player } from "@/types";

// Helper function to convert numeric ranking to proper tennis ranking display
const formatTennisRanking = (ranking: number): string => {
  const rankingMap: { [key: number]: string } = {
    0: "Unranked",
    1: "N1",
    2: "N2", 
    3: "N3",
    4: "R1",
    5: "R2",
    6: "R3",
    7: "R4",
    8: "R5",
    9: "R6",
    10: "R7",
    11: "R8",
    12: "R9"
  };
  return rankingMap[ranking] || `R${ranking}`;
};

interface MatchLineupProps {
  match: Match;
  players: Player[];
  onUpdateMatch: (updatedMatch: Match) => void;
}

interface PlayerSlotProps {
  position: number;
  lineupPlayer: LineupPlayer | null;
  availablePlayers: Player[];
  isOpponent: boolean;
  isDoubles?: boolean;
  onUpdate: (player: LineupPlayer) => void;
  onRemove: () => void;
}

interface DoublesSlotProps {
  position: number;
  lineupPlayers: LineupPlayer[];
  availablePlayers: Player[];
  singlesPlayers: LineupPlayer[]; // Players from singles who can be selected for doubles
  isOpponent: boolean;
  onUpdate: (players: LineupPlayer[]) => void;
  onRemove: () => void;
}

function PlayerSlot({ position, lineupPlayer, availablePlayers, isOpponent, isDoubles = false, onUpdate, onRemove }: PlayerSlotProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [entryMode, setEntryMode] = useState<'roster' | 'manual'>(isOpponent ? 'manual' : 'roster');
  const [formData, setFormData] = useState({
    selectedPlayerId: '',
    manualName: '',
    manualRanking: 0,
    manualEmail: '',
    manualPhone: ''
  });

  useEffect(() => {
    if (lineupPlayer) {
      setFormData({
        selectedPlayerId: lineupPlayer.playerId || '',
        manualName: lineupPlayer.isManualEntry ? lineupPlayer.playerName : '',
        manualRanking: lineupPlayer.isManualEntry ? lineupPlayer.ranking : 0,
        manualEmail: lineupPlayer.email || '',
        manualPhone: lineupPlayer.phone || ''
      });
      setEntryMode(lineupPlayer.isManualEntry ? 'manual' : 'roster');
    }
  }, [lineupPlayer]);

  const handleSave = () => {
    if (entryMode === 'roster' && !isOpponent) {
      const selectedPlayer = availablePlayers.find(p => p.id === formData.selectedPlayerId);
      if (!selectedPlayer) return;

      const newLineupPlayer: LineupPlayer = {
        id: crypto.randomUUID(),
        position,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        ranking: selectedPlayer.ranking,
        email: selectedPlayer.email,
        phone: selectedPlayer.phone,
        isOpponent,
        isManualEntry: false,
        type: isDoubles ? 'doubles' : 'singles'
      };
      onUpdate(newLineupPlayer);
    } else {
      // Manual entry for both home team and opponent team
      if (!formData.manualName.trim()) return;

      const newLineupPlayer: LineupPlayer = {
        id: crypto.randomUUID(),
        position,
        playerId: undefined,
        playerName: formData.manualName.trim(),
        ranking: formData.manualRanking || 0,
        email: isOpponent ? undefined : formData.manualEmail.trim(),
        phone: isOpponent ? undefined : formData.manualPhone.trim(),
        isOpponent,
        isManualEntry: true,
        type: isDoubles ? 'doubles' : 'singles'
      };
      onUpdate(newLineupPlayer);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      selectedPlayerId: lineupPlayer?.playerId || '',
      manualName: lineupPlayer?.isManualEntry ? lineupPlayer.playerName : '',
      manualRanking: lineupPlayer?.isManualEntry ? lineupPlayer.ranking : 0,
      manualEmail: lineupPlayer?.email || '',
      manualPhone: lineupPlayer?.phone || ''
    });
  };

  if (!isEditing && !lineupPlayer) {
    return (
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            {isDoubles ? `Doubles ${position}` : `Singles ${position}`}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add Player
          </button>
        </div>
      </div>
    );
  }

  if (!isEditing && lineupPlayer) {
    return (
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 dark:text-white">
                {lineupPlayer.playerName}
              </span>
              {lineupPlayer.ranking > 0 && (
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded text-xs font-medium">
                  {formatTennisRanking(lineupPlayer.ranking)}
                </span>
              )}
              {lineupPlayer.isManualEntry && (
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-xs">
                  Manual
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {isDoubles ? `Doubles ${position}` : `Singles ${position}`}
              {lineupPlayer.email && (
                <span className="ml-2">• {lineupPlayer.email}</span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
            <button
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          {isDoubles ? `Doubles ${position}` : `Singles ${position}`}
        </h4>
        
        {!isOpponent && (
          <div className="flex space-x-4 mb-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={entryMode === 'roster'}
                onChange={() => setEntryMode('roster')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">From Team</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={entryMode === 'manual'}
                onChange={() => setEntryMode('manual')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Manual Entry</span>
            </label>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {entryMode === 'roster' && !isOpponent ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Player
            </label>
            <select
              value={formData.selectedPlayerId}
              onChange={(e) => setFormData({ ...formData, selectedPlayerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose a player...</option>
              {availablePlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.ranking > 0 && `(${formatTennisRanking(player.ranking)})`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.manualName}
                  onChange={(e) => setFormData({ ...formData, manualName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Player name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ranking
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.manualRanking || ''}
                  onChange={(e) => setFormData({ ...formData, manualRanking: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>
            
            {!isOpponent && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.manualEmail}
                    onChange={(e) => setFormData({ ...formData, manualEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.manualPhone}
                    onChange={(e) => setFormData({ ...formData, manualPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleSave}
          disabled={
            (entryMode === 'roster' && !formData.selectedPlayerId) ||
            (entryMode === 'manual' && !formData.manualName.trim())
          }
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DoublesSlot({ position, lineupPlayers, availablePlayers, singlesPlayers, isOpponent, onUpdate, onRemove }: DoublesSlotProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [entryMode, setEntryMode] = useState<'roster' | 'manual'>(isOpponent ? 'manual' : 'roster');
  const [formData, setFormData] = useState({
    player1Id: '',
    player2Id: '',
    manualName1: '',
    manualName2: '',
    manualRanking1: 0,
    manualRanking2: 0,
    manualEmail1: '',
    manualEmail2: '',
    manualPhone1: '',
    manualPhone2: ''
  });

  useEffect(() => {
    if (lineupPlayers.length === 2) {
      const player1 = lineupPlayers[0];
      const player2 = lineupPlayers[1];
      setFormData({
        player1Id: player1.playerId || '',
        player2Id: player2.playerId || '',
        manualName1: player1.isManualEntry ? player1.playerName : '',
        manualName2: player2.isManualEntry ? player2.playerName : '',
        manualRanking1: player1.isManualEntry ? player1.ranking : 0,
        manualRanking2: player2.isManualEntry ? player2.ranking : 0,
        manualEmail1: player1.email || '',
        manualEmail2: player2.email || '',
        manualPhone1: player1.phone || '',
        manualPhone2: player2.phone || ''
      });
      setEntryMode((player1.isManualEntry || player2.isManualEntry) ? 'manual' : 'roster');
    }
  }, [lineupPlayers]);

  const handleSave = () => {
    let players: LineupPlayer[] = [];

    if (entryMode === 'roster' && !isOpponent) {
      const player1 = availablePlayers.find(p => p.id === formData.player1Id);
      const player2 = availablePlayers.find(p => p.id === formData.player2Id);
      
      if (!player1 || !player2) return;

      players = [
        {
          id: crypto.randomUUID(),
          position,
          playerId: player1.id,
          playerName: player1.name,
          ranking: player1.ranking,
          email: player1.email,
          phone: player1.phone,
          isOpponent,
          isManualEntry: false,
          type: 'doubles',
          partnerId: player2.id,
          partnerName: player2.name
        },
        {
          id: crypto.randomUUID(),
          position,
          playerId: player2.id,
          playerName: player2.name,
          ranking: player2.ranking,
          email: player2.email,
          phone: player2.phone,
          isOpponent,
          isManualEntry: false,
          type: 'doubles',
          partnerId: player1.id,
          partnerName: player1.name
        }
      ];
    } else {
      // Manual entry for both home team and opponent team
      if (!formData.manualName1.trim() || !formData.manualName2.trim()) return;

      players = [
        {
          id: crypto.randomUUID(),
          position,
          playerId: undefined,
          playerName: formData.manualName1.trim(),
          ranking: formData.manualRanking1 || 0,
          email: isOpponent ? undefined : formData.manualEmail1.trim(),
          phone: isOpponent ? undefined : formData.manualPhone1.trim(),
          isOpponent,
          isManualEntry: true,
          type: 'doubles',
          partnerName: formData.manualName2.trim()
        },
        {
          id: crypto.randomUUID(),
          position,
          playerId: undefined,
          playerName: formData.manualName2.trim(),
          ranking: formData.manualRanking2 || 0,
          email: isOpponent ? undefined : formData.manualEmail2.trim(),
          phone: isOpponent ? undefined : formData.manualPhone2.trim(),
          isOpponent,
          isManualEntry: true,
          type: 'doubles',
          partnerName: formData.manualName1.trim()
        }
      ];
    }

    onUpdate(players);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (!isEditing && lineupPlayers.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">Doubles {position}</div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add Doubles Team
          </button>
        </div>
      </div>
    );
  }

  if (!isEditing && lineupPlayers.length === 2) {
    return (
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Doubles {position}</span>
            </div>
            <div className="space-y-1">
              {lineupPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {player.playerName}
                  </span>
                  {player.ranking > 0 && (
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded text-xs font-medium">
                      {formatTennisRanking(player.ranking)}
                    </span>
                  )}
                  {player.isManualEntry && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-xs">
                      Manual
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
            <button
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Available players for doubles (either from team roster or from singles positions)
  const doublesAvailablePlayers = !isOpponent 
    ? [...availablePlayers, ...singlesPlayers.map(sp => ({
        id: sp.playerId || sp.id,
        name: sp.playerName,
        email: sp.email || '',
        phone: sp.phone || '',
        ranking: sp.ranking,
        absences: [],
        stats: { matchesPlayed: 0, wins: 0, losses: 0, winsIn2Sets: 0, winsIn3Sets: 0, lossesIn2Sets: 0, lossesIn3Sets: 0, performance: 0, underperformance: 0, trainingAttendance: 0 },
        createdAt: new Date(),
        updatedAt: new Date()
      }))]
    : [];

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Doubles {position}
        </h4>
        
        {!isOpponent && (
          <div className="flex space-x-4 mb-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={entryMode === 'roster'}
                onChange={() => setEntryMode('roster')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">From Team</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={entryMode === 'manual'}
                onChange={() => setEntryMode('manual')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Manual Entry</span>
            </label>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {entryMode === 'roster' && !isOpponent ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Player 1
              </label>
              <select
                value={formData.player1Id}
                onChange={(e) => setFormData({ ...formData, player1Id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose player 1...</option>
                {doublesAvailablePlayers.filter(p => p.id !== formData.player2Id).map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} {player.ranking > 0 && `(${formatTennisRanking(player.ranking)})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Player 2
              </label>
              <select
                value={formData.player2Id}
                onChange={(e) => setFormData({ ...formData, player2Id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose player 2...</option>
                {doublesAvailablePlayers.filter(p => p.id !== formData.player1Id).map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} {player.ranking > 0 && `(${formatTennisRanking(player.ranking)})`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Player 1 Name *
                </label>
                <input
                  type="text"
                  value={formData.manualName1}
                  onChange={(e) => setFormData({ ...formData, manualName1: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Player 1 name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Player 2 Name *
                </label>
                <input
                  type="text"
                  value={formData.manualName2}
                  onChange={(e) => setFormData({ ...formData, manualName2: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Player 2 name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Player 1 Ranking
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.manualRanking1 || ''}
                  onChange={(e) => setFormData({ ...formData, manualRanking1: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Player 2 Ranking
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.manualRanking2 || ''}
                  onChange={(e) => setFormData({ ...formData, manualRanking2: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleSave}
          disabled={
            (entryMode === 'roster' && (!formData.player1Id || !formData.player2Id)) ||
            (entryMode === 'manual' && (!formData.manualName1.trim() || !formData.manualName2.trim()))
          }
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function MatchLineup({ match, players, onUpdateMatch }: MatchLineupProps) {
  const [homeLineup, setHomeLineup] = useState<LineupPlayer[]>(match.roster.homeLineup || []);
  const [opponentLineup, setOpponentLineup] = useState<LineupPlayer[]>(match.roster.opponentLineup || []);
  const [homeDoublesLineup, setHomeDoublesLineup] = useState<LineupPlayer[]>(match.roster.homeDoublesLineup || []);
  const [opponentDoublesLineup, setOpponentDoublesLineup] = useState<LineupPlayer[]>(match.roster.opponentDoublesLineup || []);

  const updateLineup = (newHomeLineup: LineupPlayer[], newOpponentLineup: LineupPlayer[], newHomeDoublesLineup: LineupPlayer[], newOpponentDoublesLineup: LineupPlayer[]) => {
    const updatedMatch: Match = {
      ...match,
      roster: {
        homeLineup: newHomeLineup,
        opponentLineup: newOpponentLineup,
        homeDoublesLineup: newHomeDoublesLineup,
        opponentDoublesLineup: newOpponentDoublesLineup
      },
      updatedAt: new Date()
    };
    onUpdateMatch(updatedMatch);
  };

  const handleHomePlayerUpdate = (position: number, player: LineupPlayer) => {
    const newLineup = [...homeLineup];
    const existingIndex = newLineup.findIndex(p => p.position === position);
    
    if (existingIndex >= 0) {
      newLineup[existingIndex] = player;
    } else {
      newLineup.push(player);
    }
    
    setHomeLineup(newLineup);
    updateLineup(newLineup, opponentLineup, homeDoublesLineup, opponentDoublesLineup);
  };

  const handleOpponentPlayerUpdate = (position: number, player: LineupPlayer) => {
    const newLineup = [...opponentLineup];
    const existingIndex = newLineup.findIndex(p => p.position === position);
    
    if (existingIndex >= 0) {
      newLineup[existingIndex] = player;
    } else {
      newLineup.push(player);
    }
    
    setOpponentLineup(newLineup);
    updateLineup(homeLineup, newLineup, homeDoublesLineup, opponentDoublesLineup);
  };

  const handleHomeDoublesUpdate = (position: number, players: LineupPlayer[]) => {
    const newLineup = [...homeDoublesLineup];
    // Remove existing players for this position
    const filteredLineup = newLineup.filter(p => p.position !== position);
    // Add new players
    const updatedLineup = [...filteredLineup, ...players];
    
    setHomeDoublesLineup(updatedLineup);
    updateLineup(homeLineup, opponentLineup, updatedLineup, opponentDoublesLineup);
  };

  const handleOpponentDoublesUpdate = (position: number, players: LineupPlayer[]) => {
    const newLineup = [...opponentDoublesLineup];
    // Remove existing players for this position
    const filteredLineup = newLineup.filter(p => p.position !== position);
    // Add new players
    const updatedLineup = [...filteredLineup, ...players];
    
    setOpponentDoublesLineup(updatedLineup);
    updateLineup(homeLineup, opponentLineup, homeDoublesLineup, updatedLineup);
  };

  const handleHomePlayerRemove = (position: number) => {
    const newLineup = homeLineup.filter(p => p.position !== position);
    setHomeLineup(newLineup);
    updateLineup(newLineup, opponentLineup, homeDoublesLineup, opponentDoublesLineup);
  };

  const handleOpponentPlayerRemove = (position: number) => {
    const newLineup = opponentLineup.filter(p => p.position !== position);
    setOpponentLineup(newLineup);
    updateLineup(homeLineup, newLineup, homeDoublesLineup, opponentDoublesLineup);
  };

  const handleHomeDoublesRemove = (position: number) => {
    const newLineup = homeDoublesLineup.filter(p => p.position !== position);
    setHomeDoublesLineup(newLineup);
    updateLineup(homeLineup, opponentLineup, newLineup, opponentDoublesLineup);
  };

  const handleOpponentDoublesRemove = (position: number) => {
    const newLineup = opponentDoublesLineup.filter(p => p.position !== position);
    setOpponentDoublesLineup(newLineup);
    updateLineup(homeLineup, opponentLineup, homeDoublesLineup, newLineup);
  };

  const getLineupValidation = () => {
    const homeCount = homeLineup.length;
    const opponentCount = opponentLineup.length;
    const homeDoublesCount = homeDoublesLineup.length / 2; // Each doubles position has 2 players
    const opponentDoublesCount = opponentDoublesLineup.length / 2;
    
    const singlesComplete = homeCount === 6 && opponentCount === 6;
    const doublesComplete = homeDoublesCount === 3 && opponentDoublesCount === 3;
    const isValid = singlesComplete && doublesComplete;
    
    return {
      isValid,
      homeCount,
      opponentCount,
      homeDoublesCount,
      opponentDoublesCount,
      message: isValid 
        ? "✅ All lineups complete"
        : `⚠️ Incomplete - Singles: Home ${homeCount}/6, Opponent ${opponentCount}/6 | Doubles: Home ${homeDoublesCount}/3, Opponent ${opponentDoublesCount}/3`
    };
  };

  const validation = getLineupValidation();

  // Get available players for singles (exclude those already in singles lineup)
  const usedPlayerIds = homeLineup.filter(p => p.playerId).map(p => p.playerId);
  const availablePlayers = players.filter(p => !usedPlayerIds.includes(p.id));

  // Get available players for doubles (exclude those already used in doubles for this position)
  const getAvailableDoublesPlayers = (position: number) => {
    const usedInDoubles = homeDoublesLineup
      .filter(p => p.position !== position && p.playerId)
      .map(p => p.playerId);
    return players.filter(p => !usedInDoubles.includes(p.id));
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            🎾 Singles Lineup
          </h3>
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            validation.homeCount === 6 && validation.opponentCount === 6
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
          }`}>
            Singles: Home {validation.homeCount}/6, Opponent {validation.opponentCount}/6
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Home Team Singles */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              🏠 Home Team
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                ({validation.homeCount}/6)
              </span>
            </h4>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(position => {
                const lineupPlayer = homeLineup.find(p => p.position === position);
                return (
                  <PlayerSlot
                    key={`home-singles-${position}`}
                    position={position}
                    lineupPlayer={lineupPlayer || null}
                    availablePlayers={availablePlayers}
                    isOpponent={false}
                    onUpdate={(player) => handleHomePlayerUpdate(position, player)}
                    onRemove={() => handleHomePlayerRemove(position)}
                  />
                );
              })}
            </div>
          </div>

          {/* Opponent Team Singles */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              🏆 {match.opponentTeam.name}
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                ({validation.opponentCount}/6)
              </span>
            </h4>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(position => {
                const lineupPlayer = opponentLineup.find(p => p.position === position);
                return (
                  <PlayerSlot
                    key={`opponent-singles-${position}`}
                    position={position}
                    lineupPlayer={lineupPlayer || null}
                    availablePlayers={[]}
                    isOpponent={true}
                    onUpdate={(player) => handleOpponentPlayerUpdate(position, player)}
                    onRemove={() => handleOpponentPlayerRemove(position)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Doubles Lineup */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            👥 Doubles Lineup
          </h3>
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            validation.homeDoublesCount === 3 && validation.opponentDoublesCount === 3
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
          }`}>
            Doubles: Home {validation.homeDoublesCount}/3, Opponent {validation.opponentDoublesCount}/3
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Home Team Doubles */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              🏠 Home Team
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                ({validation.homeDoublesCount}/3)
              </span>
            </h4>
            <div className="space-y-4">
              {[1, 2, 3].map(position => {
                const lineupPlayers = homeDoublesLineup.filter(p => p.position === position);
                return (
                  <DoublesSlot
                    key={`home-doubles-${position}`}
                    position={position}
                    lineupPlayers={lineupPlayers}
                    availablePlayers={getAvailableDoublesPlayers(position)}
                    singlesPlayers={homeLineup}
                    isOpponent={false}
                    onUpdate={(players) => handleHomeDoublesUpdate(position, players)}
                    onRemove={() => handleHomeDoublesRemove(position)}
                  />
                );
              })}
            </div>
          </div>

          {/* Opponent Team Doubles */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              🏆 {match.opponentTeam.name}
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                ({validation.opponentDoublesCount}/3)
              </span>
            </h4>
            <div className="space-y-4">
              {[1, 2, 3].map(position => {
                const lineupPlayers = opponentDoublesLineup.filter(p => p.position === position);
                return (
                  <DoublesSlot
                    key={`opponent-doubles-${position}`}
                    position={position}
                    lineupPlayers={lineupPlayers}
                    availablePlayers={[]}
                    singlesPlayers={opponentLineup}
                    isOpponent={true}
                    onUpdate={(players) => handleOpponentDoublesUpdate(position, players)}
                    onRemove={() => handleOpponentDoublesRemove(position)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      {!validation.isValid && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Complete lineup requires 6 singles players and 3 doubles teams for each side. 
            For doubles, you can select players from your singles lineup or available team members.
          </p>
        </div>
      )}
    </div>
  );
}