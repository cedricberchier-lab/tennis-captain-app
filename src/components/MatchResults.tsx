"use client";

import { useState } from "react";
import { Match, MatchResult, SetResult, MatchOutcome, Player } from "@/types";

interface MatchResultsProps {
  match: Match;
  players: Player[];
  onUpdateMatch: (updatedMatch: Match) => void;
  onUpdatePlayer?: (playerId: string, updates: Partial<Player>) => Promise<Player | null>;
}

interface ResultFormData {
  homePlayer: string;
  awayPlayer: string;
  sets: SetResult[];
  outcome: MatchOutcome;
  forfeit: boolean;
}

export default function MatchResults({ match, players, onUpdateMatch, onUpdatePlayer }: MatchResultsProps) {
  const [results, setResults] = useState<MatchResult[]>(match.results || []);
  const [editingResult, setEditingResult] = useState<number | null>(null);
  
  const initialResultData: ResultFormData = {
    homePlayer: "",
    awayPlayer: "",
    sets: [{ setNumber: 1, homeGames: 0, awayGames: 0 }],
    outcome: MatchOutcome.WIN,
    forfeit: false
  };
  
  const [resultFormData, setResultFormData] = useState<ResultFormData>(initialResultData);

  // Create template results for standard Swiss Tennis format (6 singles, 3 doubles)
  const initializeResults = () => {
    const newResults: MatchResult[] = [];
    
    // Get lineup data
    const homeLineup = match.roster.homeLineup || [];
    const opponentLineup = match.roster.opponentLineup || [];
    const homeDoublesLineup = match.roster.homeDoublesLineup || [];
    const opponentDoublesLineup = match.roster.opponentDoublesLineup || [];
    
    // 6 Singles matches
    for (let i = 1; i <= 6; i++) {
      const homePlayer = homeLineup.find(p => p.position === i);
      const opponentPlayer = opponentLineup.find(p => p.position === i);
      
      newResults.push({
        id: crypto.randomUUID(),
        type: "singles",
        position: i,
        homePlayer: homePlayer ? homePlayer.playerName : "",
        awayPlayer: opponentPlayer ? opponentPlayer.playerName : "",
        sets: [],
        outcome: MatchOutcome.WIN,
        forfeit: false
      });
    }
    
    // 3 Doubles matches
    for (let i = 1; i <= 3; i++) {
      const homeDoublesPlayers = homeDoublesLineup.filter(p => p.position === i);
      const opponentDoublesPlayers = opponentDoublesLineup.filter(p => p.position === i);
      
      // Format doubles team names
      const homeTeamName = homeDoublesPlayers.length === 2 
        ? `${homeDoublesPlayers[0].playerName} / ${homeDoublesPlayers[1].playerName}`
        : "";
      const opponentTeamName = opponentDoublesPlayers.length === 2 
        ? `${opponentDoublesPlayers[0].playerName} / ${opponentDoublesPlayers[1].playerName}`
        : "";
      
      newResults.push({
        id: crypto.randomUUID(),
        type: "doubles",
        position: i,
        homePlayer: homeTeamName,
        awayPlayer: opponentTeamName,
        sets: [],
        outcome: MatchOutcome.WIN,
        forfeit: false
      });
    }
    
    setResults(newResults);
    updateMatchResults(newResults);
  };

  const restartResults = () => {
    if (confirm("Are you sure you want to restart results entry? This will clear all entered scores but keep player names from the lineup.")) {
      initializeResults();
    }
  };

  const updatePlayerStats = (result: MatchResult) => {
    // Only update stats for completed results
    if (!result.sets.length && !result.forfeit) {
      console.log(`Skipping stats update for ${result.type} ${result.position} - no sets or forfeit`);
      return;
    }

    console.log(`Updating stats for ${result.type} ${result.position}:`, result);

    try {
      // Get home team lineup to find player IDs
      const homeLineup = match.roster.homeLineup || [];
      const homeDoublesLineup = match.roster.homeDoublesLineup || [];

      if (result.type === "singles") {
        // Find the home player for this singles position
        const homePlayer = homeLineup.find(p => p.position === result.position);
        console.log(`Found home player for singles ${result.position}:`, homePlayer);
        
        if (homePlayer && homePlayer.playerId) {
          const player = players.find(p => p.id === homePlayer.playerId);
          console.log(`Found player in players list:`, player);
          
          if (player) {
            const isWin = result.outcome === MatchOutcome.WIN;
            const setsWon = result.sets.filter(set => set.homeGames > set.awayGames).length;
            const setsLost = result.sets.filter(set => set.awayGames > set.homeGames).length;
            const isIn2Sets = Math.abs(setsWon - setsLost) === 2 && Math.max(setsWon, setsLost) === 2;
            const isIn3Sets = result.sets.length === 3;

            console.log(`Match outcome for ${player.name}: Win=${isWin}, Sets=${setsWon}-${setsLost}`);

            // Update player stats
            const updatedStats = {
              ...player.stats,
              matchesPlayed: player.stats.matchesPlayed + 1,
              wins: player.stats.wins + (isWin ? 1 : 0),
              losses: player.stats.losses + (isWin ? 0 : 1),
              winsIn2Sets: player.stats.winsIn2Sets + (isWin && isIn2Sets ? 1 : 0),
              winsIn3Sets: player.stats.winsIn3Sets + (isWin && isIn3Sets ? 1 : 0),
              lossesIn2Sets: player.stats.lossesIn2Sets + (!isWin && isIn2Sets ? 1 : 0),
              lossesIn3Sets: player.stats.lossesIn3Sets + (!isWin && isIn3Sets ? 1 : 0)
            };

            console.log(`New stats for ${player.name}:`, updatedStats);

            // Update the player stats
            if (onUpdatePlayer) {
              console.log(`Calling onUpdatePlayer for ${player.name}`);
              onUpdatePlayer(player.id, { stats: updatedStats }).then((updatedPlayer) => {
                console.log(`Successfully updated stats for ${player.name}:`, updatedPlayer);
              }).catch((error) => {
                console.error(`Error updating stats for ${player.name}:`, error);
              });
            } else {
              console.log(`No onUpdatePlayer function available for ${player.name}:`, updatedStats);
            }
          } else {
            console.log(`Player not found in players list for ID: ${homePlayer.playerId}`);
          }
        } else {
          console.log(`No home player or playerId for singles position ${result.position}`);
        }
      } else if (result.type === "doubles") {
        // Find both home players for this doubles position
        const homeDoublesPlayers = homeDoublesLineup.filter(p => p.position === result.position);
        console.log(`Found home doubles players for position ${result.position}:`, homeDoublesPlayers);
        
        homeDoublesPlayers.forEach(lineupPlayer => {
          if (lineupPlayer.playerId) {
            const player = players.find(p => p.id === lineupPlayer.playerId);
            console.log(`Found doubles player in players list:`, player);
            
            if (player) {
              const isWin = result.outcome === MatchOutcome.WIN;
              const setsWon = result.sets.filter(set => set.homeGames > set.awayGames).length;
              const setsLost = result.sets.filter(set => set.awayGames > set.homeGames).length;
              const isIn2Sets = Math.abs(setsWon - setsLost) === 2 && Math.max(setsWon, setsLost) === 2;
              const isIn3Sets = result.sets.length === 3;

              console.log(`Doubles match outcome for ${player.name}: Win=${isWin}, Sets=${setsWon}-${setsLost}`);

              // Update player stats (doubles games count the same as singles for individual stats)
              const updatedStats = {
                ...player.stats,
                matchesPlayed: player.stats.matchesPlayed + 1,
                wins: player.stats.wins + (isWin ? 1 : 0),
                losses: player.stats.losses + (isWin ? 0 : 1),
                winsIn2Sets: player.stats.winsIn2Sets + (isWin && isIn2Sets ? 1 : 0),
                winsIn3Sets: player.stats.winsIn3Sets + (isWin && isIn3Sets ? 1 : 0),
                lossesIn2Sets: player.stats.lossesIn2Sets + (!isWin && isIn2Sets ? 1 : 0),
                lossesIn3Sets: player.stats.lossesIn3Sets + (!isWin && isIn3Sets ? 1 : 0)
              };

              console.log(`New doubles stats for ${player.name}:`, updatedStats);

              // Update the player stats
              if (onUpdatePlayer) {
                console.log(`Calling onUpdatePlayer for doubles player ${player.name}`);
                onUpdatePlayer(player.id, { stats: updatedStats }).then((updatedPlayer) => {
                  console.log(`Successfully updated doubles stats for ${player.name}:`, updatedPlayer);
                }).catch((error) => {
                  console.error(`Error updating doubles stats for ${player.name}:`, error);
                });
              } else {
                console.log(`No onUpdatePlayer function available for doubles player ${player.name}:`, updatedStats);
              }
            } else {
              console.log(`Doubles player not found in players list for ID: ${lineupPlayer.playerId}`);
            }
          } else {
            console.log(`No playerId for doubles lineup player:`, lineupPlayer);
          }
        });
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  };

  const updateMatchResults = (updatedResults: MatchResult[]) => {
    // Calculate team score
    const homeWins = updatedResults.filter(r => r.sets.length > 0 && r.outcome === MatchOutcome.WIN).length;
    const awayWins = updatedResults.filter(r => r.sets.length > 0 && r.outcome === MatchOutcome.LOSS).length;
    
    const isCompleted = updatedResults.every(r => r.sets.length > 0 || r.forfeit);
    const updatedMatch: Match = {
      ...match,
      results: updatedResults,
      teamScore: {
        home: homeWins,
        away: awayWins,
        autoCalculated: true
      },
      status: isCompleted ? "completed" : "in_progress",
      updatedAt: new Date()
    };
    
    // Stats are now updated immediately when each result is saved
    // No need to update stats here again
    
    onUpdateMatch(updatedMatch);
  };

  const handleEditResult = (index: number) => {
    const result = results[index];
    setResultFormData({
      homePlayer: result.homePlayer,
      awayPlayer: result.awayPlayer,
      sets: result.sets.length > 0 ? result.sets : [{ setNumber: 1, homeGames: 0, awayGames: 0 }],
      outcome: result.outcome,
      forfeit: result.forfeit || false
    });
    setEditingResult(index);
  };

  const handleSaveResult = () => {
    if (editingResult === null) return;
    
    // Determine outcome based on sets
    let outcome = MatchOutcome.WIN;
    if (!resultFormData.forfeit && resultFormData.sets.length > 0) {
      const homeSetsWon = resultFormData.sets.filter(set => set.homeGames > set.awayGames).length;
      const awaySetsWon = resultFormData.sets.filter(set => set.awayGames > set.homeGames).length;
      outcome = homeSetsWon > awaySetsWon ? MatchOutcome.WIN : MatchOutcome.LOSS;
    } else if (resultFormData.forfeit) {
      outcome = MatchOutcome.FORFEIT;
    }
    
    const updatedResult = {
      ...results[editingResult],
      homePlayer: resultFormData.homePlayer,
      awayPlayer: resultFormData.awayPlayer,
      sets: resultFormData.forfeit ? [] : resultFormData.sets,
      outcome,
      forfeit: resultFormData.forfeit
    };
    
    const updatedResults = [...results];
    updatedResults[editingResult] = updatedResult;
    
    // Update player stats immediately for this result
    console.log('Updating player stats for result:', updatedResult);
    updatePlayerStats(updatedResult);
    
    setResults(updatedResults);
    updateMatchResults(updatedResults);
    setEditingResult(null);
    setResultFormData(initialResultData);
  };

  const addSet = () => {
    setResultFormData({
      ...resultFormData,
      sets: [
        ...resultFormData.sets,
        { setNumber: resultFormData.sets.length + 1, homeGames: 0, awayGames: 0 }
      ]
    });
  };

  const updateSet = (setIndex: number, field: 'homeGames' | 'awayGames', value: number) => {
    const updatedSets = [...resultFormData.sets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
    setResultFormData({ ...resultFormData, sets: updatedSets });
  };

  const removeSet = (setIndex: number) => {
    if (resultFormData.sets.length <= 1) return;
    const updatedSets = resultFormData.sets.filter((_, index) => index !== setIndex);
    setResultFormData({ ...resultFormData, sets: updatedSets });
  };

  if (results.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          📊 Match Results Entry
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🏁</div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Initialize the match results template with 6 singles and 3 doubles matches.<br/>
            Player names will be automatically populated from the lineup.
          </p>
          <button
            onClick={initializeResults}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Initialize Results Template
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        📊 Match Results Entry
      </h3>
      
      {/* Match Progress */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Match Progress:</span>
            <span className="ml-2 font-semibold">
              {results.filter(r => r.sets.length > 0 || r.forfeit).length} / {results.length} completed
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={initializeResults}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded transition-colors"
              title="Re-populate player names from current lineup"
            >
              🔄 Update Names
            </button>
            <button
              onClick={restartResults}
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-1 px-3 rounded transition-colors"
              title="Clear all results and restart entry"
            >
              🗑️ Restart Results
            </button>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {match.teamScore.home} - {match.teamScore.away}
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        {/* Singles Results */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Singles (1-6)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.filter(r => r.type === "singles").map((result, index) => (
              <div
                key={result.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      S{result.position}: {result.homePlayer || "TBD"} vs {result.awayPlayer || "TBD"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {result.forfeit ? (
                        <span className="text-orange-600">Forfeit</span>
                      ) : result.sets.length > 0 ? (
                        result.sets.map(set => `${set.homeGames}-${set.awayGames}`).join(", ")
                      ) : (
                        "Not played"
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.sets.length > 0 || result.forfeit ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.outcome === MatchOutcome.WIN 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : result.outcome === MatchOutcome.FORFEIT
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {result.outcome}
                      </span>
                    ) : null}
                    <button
                      onClick={() => handleEditResult(results.indexOf(result))}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {result.sets.length > 0 || result.forfeit ? "Edit" : "Enter"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doubles Results */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Doubles (1-3)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.filter(r => r.type === "doubles").map((result, index) => (
              <div
                key={result.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white mb-2">
                      Doubles {result.position}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="text-gray-900 dark:text-white">
                        🏠 {result.homePlayer || "TBD"}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        🏆 {result.awayPlayer || "TBD"}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {result.forfeit ? (
                        <span className="text-orange-600">Forfeit</span>
                      ) : result.sets.length > 0 ? (
                        result.sets.map(set => `${set.homeGames}-${set.awayGames}`).join(", ")
                      ) : (
                        "Not played"
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 ml-3">
                    {result.sets.length > 0 || result.forfeit ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.outcome === MatchOutcome.WIN 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : result.outcome === MatchOutcome.FORFEIT
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {result.outcome}
                      </span>
                    ) : null}
                    <button
                      onClick={() => handleEditResult(results.indexOf(result))}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {result.sets.length > 0 || result.forfeit ? "Edit" : "Enter"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Result Modal */}
      {editingResult !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit {results[editingResult].type === "singles" ? "Singles" : "Doubles"} Result
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Home Player(s)
                </label>
                <input
                  type="text"
                  value={resultFormData.homePlayer}
                  onChange={(e) => setResultFormData({ ...resultFormData, homePlayer: e.target.value })}
                  placeholder="Player name(s)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Away Player(s)
                </label>
                <input
                  type="text"
                  value={resultFormData.awayPlayer}
                  onChange={(e) => setResultFormData({ ...resultFormData, awayPlayer: e.target.value })}
                  placeholder="Player name(s)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={resultFormData.forfeit}
                    onChange={(e) => setResultFormData({ ...resultFormData, forfeit: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Forfeit</span>
                </label>
              </div>

              {!resultFormData.forfeit && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sets
                    </label>
                    <button
                      type="button"
                      onClick={addSet}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Set
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {resultFormData.sets.map((set, setIndex) => (
                      <div key={setIndex} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300 w-12">
                          Set {set.setNumber}:
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="7"
                          value={set.homeGames}
                          onChange={(e) => updateSet(setIndex, 'homeGames', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          min="0"
                          max="7"
                          value={set.awayGames}
                          onChange={(e) => updateSet(setIndex, 'awayGames', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center"
                        />
                        {resultFormData.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSet(setIndex)}
                            className="text-red-500 hover:text-red-700 text-sm ml-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={handleSaveResult}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Save Result
              </button>
              <button
                onClick={() => {
                  setEditingResult(null);
                  setResultFormData(initialResultData);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}