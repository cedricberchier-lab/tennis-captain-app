import { Player } from '@/types';

// Export data to JSON file
export function exportPlayersToJSON(players: Player[], filename?: string): void {
  const dataStr = JSON.stringify(players, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename || `tennis-captain-players-${new Date().toISOString().split('T')[0]}.json`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(link.href);
}

// Export data to CSV file
export function exportPlayersToCSV(players: Player[], filename?: string): void {
  if (players.length === 0) {
    alert('No players to export');
    return;
  }

  // CSV headers
  const headers = [
    'Name',
    'Email', 
    'Phone',
    'Ranking',
    'Matches Played',
    'Wins',
    'Losses',
    'Wins in 2 Sets',
    'Wins in 3 Sets',
    'Losses in 2 Sets', 
    'Losses in 3 Sets',
    'Performance',
    'Underperformance',
    'Training Attendance',
    'Absences',
    'Created At',
    'Updated At'
  ];

  // Convert players to CSV rows
  const rows = players.map(player => [
    `"${player.name}"`,
    `"${player.email}"`,
    `"${player.phone}"`,
    player.ranking,
    player.stats.matchesPlayed,
    player.stats.wins,
    player.stats.losses,
    player.stats.winsIn2Sets,
    player.stats.winsIn3Sets,
    player.stats.lossesIn2Sets,
    player.stats.lossesIn3Sets,
    player.stats.performance,
    player.stats.underperformance,
    player.stats.trainingAttendance,
    `"${player.absences.join('; ')}"`,
    `"${player.createdAt.toISOString()}"`,
    `"${player.updatedAt.toISOString()}"`
  ]);

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  
  const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename || `tennis-captain-players-${new Date().toISOString().split('T')[0]}.csv`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(link.href);
}

// Import players from JSON file
export function importPlayersFromJSON(file: File): Promise<Player[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const players = JSON.parse(content);
        
        // Validate structure
        if (!Array.isArray(players)) {
          throw new Error('Invalid file format: expected array of players');
        }
        
        // Convert date strings back to Date objects
        const validPlayers = players.map((player: any) => ({
          ...player,
          createdAt: new Date(player.createdAt),
          updatedAt: new Date(player.updatedAt)
        }));
        
        resolve(validPlayers);
      } catch (error) {
        reject(new Error('Failed to parse JSON file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Get current localStorage data
export function getCurrentLocalStorageData(): Player[] | null {
  try {
    const savedPlayers = localStorage.getItem("tennis-captain-players");
    if (!savedPlayers) return null;
    
    const players = JSON.parse(savedPlayers);
    return players.map((player: any) => ({
      ...player,
      createdAt: new Date(player.createdAt),
      updatedAt: new Date(player.updatedAt)
    }));
  } catch (error) {
    console.error('Error reading localStorage:', error);
    return null;
  }
}

// Copy data to clipboard
export function copyPlayersToClipboard(players: Player[]): void {
  const dataStr = JSON.stringify(players, null, 2);
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(dataStr).then(() => {
      alert('Player data copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopyToClipboard(dataStr);
    });
  } else {
    fallbackCopyToClipboard(dataStr);
  }
}

function fallbackCopyToClipboard(text: string): void {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    alert('Player data copied to clipboard!');
  } catch (err) {
    alert('Failed to copy to clipboard. Please copy the data manually from the console.');
    console.log('Player data:', text);
  }
  
  document.body.removeChild(textArea);
}