'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Player, Training, TrainingParticipant } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useTrainings } from '@/hooks/useTrainings';
import { exportPlayersToJSON, exportPlayersToCSV, copyPlayersToClipboard } from '@/utils/dataExport';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Upload, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AddPlayerFormData {
  name: string;
  email: string;
  phone: string;
  ranking: number;
}

interface TrainingUploadData {
  date: string;
  courtNumber: string;
  timeStart: string;
  timeEnd: string;
  player1?: string;
  player2?: string;
  player3?: string;
  player4?: string;
  comment: string;
}

export default function SetupPage() {
  const { token } = useAuth();

  // Player management state
  const { players, addPlayer, refreshPlayers } = usePlayers();
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [playerFormData, setPlayerFormData] = useState<AddPlayerFormData>({
    name: '',
    email: '',
    phone: '',
    ranking: 0
  });

  // Training schedule upload state
  const { trainings, addTraining, refreshTrainings } = useTrainings();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [showPlayerMapping, setShowPlayerMapping] = useState(false);
  const [playerMappings, setPlayerMappings] = useState<{
    csvName: string;
    mappedPlayerId: string | null;
    suggestions: Player[];
  }[]>([]);
  const [pendingTrainingData, setPendingTrainingData] = useState<TrainingUploadData[]>([]);

  // Training view customization state
  const [showCustomHorizon, setShowCustomHorizon] = useState(false);
  const [horizonCount, setHorizonCount] = useState(3);

  // Load custom horizon settings from localStorage
  useEffect(() => {
    const savedCustomHorizon = localStorage.getItem('trainingCustomHorizon');
    const savedHorizonCount = localStorage.getItem('trainingHorizonCount');
    
    if (savedCustomHorizon === 'true') {
      setShowCustomHorizon(true);
    }
    if (savedHorizonCount) {
      setHorizonCount(parseInt(savedHorizonCount));
    }
  }, []);

  // Save custom horizon settings to localStorage when changed
  const handleCustomHorizonToggle = () => {
    const newValue = !showCustomHorizon;
    setShowCustomHorizon(newValue);
    localStorage.setItem('trainingCustomHorizon', newValue.toString());
  };

  const handleHorizonCountChange = (count: number) => {
    setHorizonCount(count);
    localStorage.setItem('trainingHorizonCount', count.toString());
  };

  // Password change function
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    if (!token) {
      alert('Authentication token not found. Please log in again.');
      return;
    }

    setPasswordChangeLoading(true);
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

      const result = await response.json();
      
      if (response.ok) {
        alert('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordDialog(false);
      } else {
        alert(result.error || 'Failed to change password');
      }
    } catch (error) {
      alert('Failed to change password. Please try again.');
      console.error('Password change error:', error);
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Player management functions
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerFormData.name.trim()) return;

    const playerData = {
      name: playerFormData.name.trim(),
      email: playerFormData.email.trim(),
      phone: playerFormData.phone.trim(),
      ranking: playerFormData.ranking || 0,
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
      setPlayerFormData({ name: '', email: '', phone: '', ranking: 0 });
      setShowAddPlayerDialog(false);
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

  // Get day name from date
  const getDayName = (date: Date | string): string => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = date instanceof Date ? date : new Date(date);
    return dayNames[dateObj.getDay()];
  };

  // File upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setUploadResults(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }

    // Ensure players data is loaded
    if (!players.length) {
      alert('Player data is still loading. Please wait and try again.');
      return;
    }

    console.log('Starting file upload:', selectedFile.name);
    console.log('Players available for mapping:', players.length);
    setIsUploading(true);
    setUploadResults(null);

    try {
      console.log('Parsing file...');
      const data = await parseFile(selectedFile);
      console.log('Parsed data:', data.length, 'rows');
      
      console.log('Creating player mappings...');
      createPlayerMappings(data);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadResults({
        success: 0,
        failed: 1,
        errors: [err instanceof Error ? err.message : 'Failed to process file']
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setUploadResults(null);
    setIsUploading(false);
    setShowPlayerMapping(false);
    setPlayerMappings([]);
    setPendingTrainingData([]);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Find similar player names using fuzzy matching
  const findSimilarPlayers = (csvName: string): Player[] => {
    if (!csvName.trim()) return [];
    
    const cleanName = csvName.toLowerCase().trim();
    
    return players
      .map(player => {
        const playerName = player.name.toLowerCase().trim();
        
        // Exact match
        if (playerName === cleanName) {
          return { player, score: 1.0 };
        }
        
        // Contains match
        if (playerName.includes(cleanName) || cleanName.includes(playerName)) {
          return { player, score: 0.8 };
        }
        
        // Name parts match (first name, last name)
        const csvParts = cleanName.split(' ');
        const playerParts = playerName.split(' ');
        
        let matchingParts = 0;
        for (const csvPart of csvParts) {
          for (const playerPart of playerParts) {
            if (csvPart === playerPart || csvPart.includes(playerPart) || playerPart.includes(csvPart)) {
              matchingParts++;
              break;
            }
          }
        }
        
        if (matchingParts > 0) {
          return { player, score: matchingParts / Math.max(csvParts.length, playerParts.length) };
        }
        
        return null;
      })
      .filter((match): match is { player: Player; score: number } => match !== null)
      .filter(match => match.score >= 0.3) // Only keep matches with 30% similarity or higher
      .sort((a, b) => b.score - a.score) // Sort by best match first
      .slice(0, 5) // Take top 5 matches
      .map(match => match.player);
  };

  // Create player mappings for CSV upload
  const createPlayerMappings = (data: TrainingUploadData[]): void => {
    const uniqueCsvNames = new Set<string>();
    
    // Collect all unique player names from CSV
    data.forEach(training => {
      [training.player1, training.player2, training.player3, training.player4]
        .filter(name => name && name.trim() !== '')
        .forEach(name => uniqueCsvNames.add(name.trim()));
    });
    
    // Create mappings for each unique name
    const mappings = Array.from(uniqueCsvNames).map(csvName => {
      const exactMatch = players.find(p => 
        p.name.toLowerCase().trim() === csvName.toLowerCase().trim()
      );
      
      return {
        csvName,
        mappedPlayerId: exactMatch?.id || null,
        suggestions: exactMatch ? [exactMatch] : findSimilarPlayers(csvName)
      };
    });
    
    // Filter to only show mappings that need user input
    const needsMapping = mappings.filter(mapping => !mapping.mappedPlayerId);
    
    if (needsMapping.length > 0) {
      setPlayerMappings(needsMapping);
      setPendingTrainingData(data);
      setShowPlayerMapping(true);
    } else {
      // All players matched exactly, proceed with upload
      processTrainingDataWithMappings(data, mappings);
    }
  };

  const parseFile = (file: File): Promise<TrainingUploadData[]> => {
    return new Promise((resolve, reject) => {
      console.log('Starting file parsing for:', file.name, file.type);
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('File loaded, processing...');
          
          let jsonData: any[][];
          
          if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            // Handle CSV files
            const csvText = e.target?.result as string;
            const lines = csvText.split('\n').filter(line => line.trim());
            jsonData = lines.map(line => line.split(',').map(cell => cell.trim()));
          } else {
            // Handle Excel files
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            console.log('Workbook sheets:', workbook.SheetNames);
            
            // Get the first worksheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          }
          
          console.log('Raw JSON data:', jsonData);
          
          // Skip header row and convert to our format
          const trainingData: TrainingUploadData[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows
            
            console.log('Processing row:', i + 1, row);
            
            const training: TrainingUploadData = {
              date: row[0]?.toString().trim() || '',
              courtNumber: row[1]?.toString().trim() || '',
              timeStart: row[2]?.toString().trim() || '',
              timeEnd: row[3]?.toString().trim() || '',
              player1: row[4]?.toString().trim() || '',
              player2: row[5]?.toString().trim() || '',
              player3: row[6]?.toString().trim() || '',
              player4: row[7]?.toString().trim() || '',
              comment: row[8]?.toString().trim() || ''
            };
            
            trainingData.push(training);
          }
          
          console.log('Final training data:', trainingData);
          resolve(trainingData);
        } catch (error) {
          console.error('Parse error:', error);
          reject(new Error('Failed to parse file. Please check the format: ' + (error instanceof Error ? error.message : 'Unknown error')));
        }
      };
      
      reader.onerror = () => {
        console.error('File reader error');
        reject(new Error('Failed to read file'));
      };
      
      // Use different read methods based on file type
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Process training data with player mappings
  const processTrainingDataWithMappings = async (
    data: TrainingUploadData[], 
    mappings: { csvName: string; mappedPlayerId: string | null; suggestions: Player[] }[]
  ) => {
    console.log('Processing training data with mappings:', mappings);
    console.log('Current players data for absence checking:', players.map(p => ({ 
      name: p.name, 
      id: p.id, 
      absences: p.absences 
    })));
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const [index, training] of data.entries()) {
      try {
        // Validate required fields
        if (!training.date || !training.timeStart || !training.timeEnd || !training.courtNumber) {
          throw new Error(`Row ${index + 2}: Missing required fields (date, start time, end time, or court number)`);
        }

        // Parse and validate date (MM/DD/YYYY format only)
        let trainingDate: Date;
        try {
          if (training.date.includes('/')) {
            const [month, day, year] = training.date.split('/');
            trainingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            throw new Error('Invalid date format');
          }
          
          if (isNaN(trainingDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch {
          throw new Error(`Row ${index + 2}: Invalid date format. Use MM/DD/YYYY format only`);
        }

        // Build participants list using mappings
        const trainingParticipants: TrainingParticipant[] = [];
        const playerNames = [training.player1, training.player2, training.player3, training.player4]
          .filter(name => name && name.trim() !== '');

        for (const playerName of playerNames) {
          if (trainingParticipants.length >= 4) break;

          // Find mapping for this player name
          const mapping = mappings.find(m => m.csvName.trim() === playerName.trim());
          const mappedPlayer = mapping?.mappedPlayerId 
            ? players.find(p => p.id === mapping.mappedPlayerId)
            : null;

          const participant: TrainingParticipant = {
            id: crypto.randomUUID(),
            playerName: playerName.trim(),
            isManualEntry: !mappedPlayer,
            playerId: mappedPlayer?.id,
            email: mappedPlayer?.email,
            phone: mappedPlayer?.phone
          };

          trainingParticipants.push(participant);
        }

        // Create training
        const newTraining = await addTraining({
          date: trainingDate,
          dayName: getDayName(trainingDate),
          timeStart: training.timeStart.trim(),
          timeEnd: training.timeEnd.trim(),
          courtNumber: training.courtNumber.trim(),
          participants: trainingParticipants,
          comment: training.comment?.trim() || ''
        });

        if (newTraining) {
          success++;
        } else {
          throw new Error('Failed to create training');
        }

      } catch (err) {
        failed++;
        errors.push(err instanceof Error ? err.message : `Row ${index + 2}: Unknown error`);
      }
    }

    const results = { success, failed, errors };
    setUploadResults(results);
    
    // Refresh data after successful CSV upload
    if (results.success > 0) {
      console.log('CSV upload successful, refreshing data...');
      
      try {
        await Promise.all([refreshTrainings(), refreshPlayers()]);
        console.log('Data refreshed after CSV upload');
      } catch (err) {
        console.error('Error refreshing data after CSV upload:', err);
      }
      
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
    
    return results;
  };

  const generateSampleFile = () => {
    const sampleData = [
      ['Date', 'Court Number', 'Start Time', 'End Time', 'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Comment'],
      ['01/15/2025', '1', '18:00', '20:00', 'John Doe', 'Jane Smith', '', '', 'Weekly training'],
      ['01/17/2025', '2', '19:00', '21:00', 'Mike Johnson', 'Sarah Wilson', 'Bob Brown', '', 'Advanced group'],
      ['01/20/2025', '1', '10:00', '12:00', 'Alice Davis', 'Tom Miller', 'Lisa Garcia', 'Chris Lee', 'Weekend training']
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Training Schedule');
    XLSX.writeFile(wb, 'training_schedule_sample.xlsx');
  };

  // Handle player mapping updates
  const updatePlayerMapping = (csvName: string, playerId: string | null) => {
    setPlayerMappings(prev => 
      prev.map(mapping => 
        mapping.csvName === csvName 
          ? { ...mapping, mappedPlayerId: playerId }
          : mapping
      )
    );
  };

  // Process mappings and create trainings
  const processMappingsAndCreateTrainings = async () => {
    if (!pendingTrainingData.length || !playerMappings.length) return;
    
    // Create complete mappings including both mapped and exact matches
    const allPlayerNames = new Set<string>();
    pendingTrainingData.forEach(training => {
      [training.player1, training.player2, training.player3, training.player4]
        .filter(name => name && name.trim() !== '')
        .forEach(name => allPlayerNames.add(name.trim()));
    });
    
    const completeMappings = Array.from(allPlayerNames).map(csvName => {
      // Check if this name needs mapping
      const needsMapping = playerMappings.find(m => m.csvName === csvName);
      if (needsMapping) {
        return {
          csvName,
          mappedPlayerId: needsMapping.mappedPlayerId,
          suggestions: needsMapping.suggestions
        };
      }
      
      // Check for exact match
      const exactMatch = players.find(p => 
        p.name.toLowerCase().trim() === csvName.toLowerCase().trim()
      );
      
      return {
        csvName,
        mappedPlayerId: exactMatch?.id || null,
        suggestions: exactMatch ? [exactMatch] : []
      };
    });
    
    setIsUploading(true);
    
    try {
      const results = await processTrainingDataWithMappings(pendingTrainingData, completeMappings);
      
      // Refresh data after successful player mapping
      if (results && results.success > 0) {
        console.log('Player mapping successful, refreshing data...');
        try {
          await Promise.all([refreshTrainings(), refreshPlayers()]);
          console.log('Data refreshed after player mapping');
        } catch (err) {
          console.error('Error refreshing data after player mapping:', err);
        }
      }
      
      setShowPlayerMapping(false);
      setPlayerMappings([]);
      setPendingTrainingData([]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          
          {/* Welcome Header - Mobile Optimized */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-2">
                ← Back to Home
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Setup & Configuration
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Manage players and configure settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Main Setup Actions */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Setup Actions
              </h2>
              
              {/* Player Management Section */}
              <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-lg border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-700">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Player Management
                  </CardTitle>
                  <CardDescription>
                    Add new players and export player data
                  </CardDescription>
                </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Add Player */}
                <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      ➕ Add Player
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Player</DialogTitle>
                      <DialogDescription>
                        Add a new player to your team roster
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPlayer} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          value={playerFormData.name}
                          onChange={(e) => setPlayerFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Player name"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={playerFormData.email}
                          onChange={(e) => setPlayerFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="player@email.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={playerFormData.phone}
                          onChange={(e) => setPlayerFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+1 234 567 8900"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ranking">Ranking</Label>
                        <Input
                          id="ranking"
                          type="number"
                          value={playerFormData.ranking || ''}
                          onChange={(e) => setPlayerFormData(prev => ({ ...prev, ranking: parseInt(e.target.value) || 0 }))}
                          placeholder="Player ranking (1-10)"
                          min="1"
                          max="10"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddPlayerDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                          Add Player
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Export Player Data */}
                {players.length > 0 && (
                  <div className="relative">
                    <Button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      📤 Export Player Data
                    </Button>

                    {showExportMenu && (
                      <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                        <div className="p-2">
                          <button
                            onClick={handleExportJSON}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                          >
                            📄 Export as JSON
                          </button>
                          <button
                            onClick={handleExportCSV}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                          >
                            📊 Export as CSV
                          </button>
                          <button
                            onClick={handleCopyToClipboard}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                          >
                            📋 Copy to Clipboard
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 mt-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Account Settings</h3>
                  <Button
                    onClick={() => setShowPasswordDialog(true)}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    🔒 Change Password
                  </Button>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Current players: {players.length}
                </div>
              </CardContent>
            </Card>

            {/* Password Change Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="mt-1"
                      minLength={6}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="mt-1"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setShowPasswordDialog(false);
                      }}
                      className="flex-1"
                      disabled={passwordChangeLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={passwordChangeLoading}
                    >
                      {passwordChangeLoading ? 'Changing...' : 'Change Password'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Training Management Section */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Training Management
                </CardTitle>
                <CardDescription>
                  Upload schedules and customize training views
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Upload Schedule */}
                <Dialog open={showUploadDialog} onOpenChange={(open) => {
                  setShowUploadDialog(open);
                  if (!open) resetUploadState();
                }}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      📤 Upload Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload Training Schedule</DialogTitle>
                      <DialogDescription>
                        Upload a CSV or Excel file with your training schedule. Players will be automatically matched to existing roster.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileSelect}
                          className="mb-4"
                        />
                        <p className="text-sm text-gray-500">
                          Supported formats: Excel (.xlsx, .xls) or CSV (.csv)
                        </p>
                        {selectedFile && (
                          <p className="text-sm text-green-600 mt-2">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">File Format Requirements:</h4>
                        <p className="text-sm text-blue-700 mb-2">Your file should have these columns in order:</p>
                        <div className="text-xs text-blue-600 font-mono bg-white p-2 rounded border">
                          Date | Court Number | Start Time | End Time | Player 1 | Player 2 | Player 3 | Player 4 | Comment
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          • Date format: MM/DD/YYYY only<br/>
                          • Time format: HH:MM (24-hour)<br/>
                          • Player columns: Leave empty if fewer than 4 players
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Button
                          onClick={generateSampleFile}
                          variant="outline"
                          size="sm"
                        >
                          📥 Download Sample File
                        </Button>
                        
                        <Button
                          onClick={handleFileUpload}
                          disabled={!selectedFile || isUploading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isUploading ? 'Importing...' : '📤 Import Training Schedule'}
                        </Button>
                      </div>
                      
                      {uploadResults && (
                        <div className={`p-4 rounded-lg ${
                          uploadResults.failed > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                        }`}>
                          <h4 className={`font-medium mb-2 ${
                            uploadResults.failed > 0 ? 'text-red-800' : 'text-green-800'
                          }`}>
                            Import Results
                          </h4>
                          <p className={`text-sm ${
                            uploadResults.failed > 0 ? 'text-red-700' : 'text-green-700'
                          }`}>
                            Successfully imported: {uploadResults.success} trainings<br/>
                            Failed: {uploadResults.failed} trainings
                          </p>
                          {uploadResults.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-red-800">Errors:</p>
                              <ul className="text-xs text-red-700 mt-1">
                                {uploadResults.errors.map((error, index) => (
                                  <li key={index} className="mb-1">• {error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {uploadResults.success > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <Button
                                onClick={() => {
                                  setShowUploadDialog(false);
                                  resetUploadState();
                                }}
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-700"
                              >
                                Close & View Trainings
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Player Mapping Dialog */}
                <Dialog open={showPlayerMapping} onOpenChange={(open) => {
                  if (!open && !isUploading) {
                    setShowPlayerMapping(false);
                    setPlayerMappings([]);
                    setPendingTrainingData([]);
                  }
                }}>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Map CSV Players to Existing Roster</DialogTitle>
                      <DialogDescription>
                        Some player names in your CSV don't exactly match your roster. Please map them to existing players or leave unmapped to create as manual entries.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Player Mapping</h4>
                        <p className="text-sm text-blue-700">
                          Map CSV player names to your existing roster to link absence information and player details.
                          Unmapped players will be created as manual entries without roster data.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        {playerMappings.map((mapping, index) => (
                          <div key={mapping.csvName} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <Label className="font-medium">CSV Name: "{mapping.csvName}"</Label>
                                {mapping.suggestions.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {mapping.suggestions.length} similar player(s) found
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <Label className="text-sm">Map to existing player:</Label>
                                <Select
                                  value={mapping.mappedPlayerId || '__unmapped__'}
                                  onValueChange={(value) => updatePlayerMapping(mapping.csvName, value === '__unmapped__' ? null : value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a player or leave unmapped" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__unmapped__">Leave unmapped (manual entry)</SelectItem>
                                    
                                    {mapping.suggestions.length > 0 && (
                                      <>
                                        <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b">
                                          Suggested matches:
                                        </div>
                                        {mapping.suggestions.map(player => (
                                          <SelectItem key={`suggestion-${player.id}`} value={player.id}>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="bg-green-50">★</Badge>
                                              {player.name}
                                              <span className="text-xs text-gray-500">R{player.ranking}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                        
                                        <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b border-t">
                                          All players:
                                        </div>
                                      </>
                                    )}
                                    
                                    {players
                                      .filter(player => !mapping.suggestions.some(s => s.id === player.id))
                                      .sort((a, b) => a.name.localeCompare(b.name))
                                      .map(player => (
                                        <SelectItem key={player.id} value={player.id}>
                                          <div className="flex items-center gap-2">
                                            {player.name}
                                            <span className="text-xs text-gray-500">R{player.ranking}</span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {mapping.mappedPlayerId && (
                                <div className="w-32">
                                  <Label className="text-sm">Preview:</Label>
                                  <div className="mt-1 p-2 bg-green-50 rounded text-sm">
                                    {players.find(p => p.id === mapping.mappedPlayerId)?.name}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          {playerMappings.filter(m => m.mappedPlayerId).length} of {playerMappings.length} players mapped
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowPlayerMapping(false);
                              setPlayerMappings([]);
                              setPendingTrainingData([]);
                            }}
                            disabled={isUploading}
                          >
                            Cancel
                          </Button>
                          
                          <Button
                            onClick={processMappingsAndCreateTrainings}
                            disabled={isUploading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isUploading ? 'Creating Trainings...' : 'Create Training Sessions'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Customize Training View */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCustomHorizonToggle}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showCustomHorizon ? 'Hide Custom View' : 'Customize Training View'}
                  </Button>
                  
                  {showCustomHorizon && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          Show next:
                        </label>
                        <select
                          value={horizonCount}
                          onChange={(e) => handleHorizonCountChange(parseInt(e.target.value))}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 10, 15, 20].map(num => (
                            <option key={num} value={num}>{num} trainings</option>
                          ))}
                        </select>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        This setting will apply to the Training page view. Changes are saved automatically.
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total trainings: {trainings.length}
                  </div>
                  {(() => {
                    const upcomingTrainings = trainings
                      .filter(t => new Date(t.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 5);
                    
                    return upcomingTrainings.length > 0 ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="font-medium mb-1">Next {upcomingTrainings.length} training{upcomingTrainings.length > 1 ? 's' : ''}:</div>
                        {upcomingTrainings.map((training, index) => (
                          <div key={training.id} className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {index + 1}. {new Date(training.date).toLocaleDateString()} at {training.timeStart} - Court {training.courtNumber} ({training.participants.length} players)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        No upcoming trainings scheduled
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Info
              </h2>
              
              {/* Player Stats */}
              <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Team Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}