"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Training, TrainingParticipant, Player } from "@/types";
import { useTrainings } from "@/hooks/useTrainings";
import { usePlayers } from "@/hooks/usePlayers";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';

interface AddTrainingFormData {
  date: string;
  timeStart: string;
  timeEnd: string;
  courtNumber: string;
  comment: string;
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
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [showCustomHorizon, setShowCustomHorizon] = useState(false);
  const [horizonCount, setHorizonCount] = useState(3);
  const [formData, setFormData] = useState<AddTrainingFormData>({
    date: "",
    timeStart: "",
    timeEnd: "",
    courtNumber: "",
    comment: ""
  });
  const [participants, setParticipants] = useState<TrainingParticipant[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  


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
        const trainingDateStr = dateToLocalString(training.date);
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastAbsenceCheck, setLastAbsenceCheck] = useState(Date.now());

  // Get day name from date
  const getDayName = (date: Date | string): string => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = date instanceof Date ? date : new Date(date);
    return dayNames[dateObj.getDay()];
  };

  // Timezone-safe date to string conversion (avoids UTC conversion issues)
  const dateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
      const trainingDateStr = dateToLocalString(training.date);
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

    // Force multiple re-renders to ensure color changes are applied
    const checkTime = Date.now();
    setLastAbsenceCheck(checkTime);
    setRefreshKey(prev => prev + 1);
    
    // Additional re-render triggers to ensure React updates the display
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 10);
    
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 50);
    
    console.log(`=== ABSENCE CHECK COMPLETED - Found ${totalAbsences} absences ===`);
    
    // Show success message
    alert(`Absence check completed! Found ${totalAbsences} player absences. Colors should update now!`);
  };


  // Memoized absence checking that recalculates when players data changes
  const playerHasAbsenceOnDate = useMemo(() => {
    return (playerId: string, date: Date): boolean => {
      const player = players.find(p => p.id === playerId);
      if (!player) {
        console.log(`Player with ID ${playerId} not found in ${players.length} players`);
        return false;
      }
      
      const trainingDateStr = dateToLocalString(date); // YYYY-MM-DD format (timezone-safe)
      console.log(`Checking absence for player ${player.name} (ID: ${playerId}) on ${trainingDateStr}`);
      console.log(`Player absences:`, player.absences);
      
      const hasAbsence = player.absences.some(absence => {
        const absenceDate = absence.split(' - ')[0]; // Get date part before the reason
        const matches = absenceDate === trainingDateStr;
        console.log(`  Comparing absence date '${absenceDate}' with training date '${trainingDateStr}': ${matches}`);
        return matches;
      });
      
      console.log(`Result: Player ${player.name} has absence on ${trainingDateStr}: ${hasAbsence}`);
      return hasAbsence;
    };
  }, [players]); // Recalculate when players data changes

  // Memoized absence reason checking that recalculates when players data changes
  const getAbsenceReason = useMemo(() => {
    return (playerId: string, date: Date): string | null => {
      const player = players.find(p => p.id === playerId);
      if (!player) return null;
      
      const trainingDateStr = dateToLocalString(date); // YYYY-MM-DD format (timezone-safe)
      
      const absence = player.absences.find(absence => {
        const absenceDate = absence.split(' - ')[0]; // Get date part before the reason
        return absenceDate === trainingDateStr;
      });
      
      if (absence) {
        const parts = absence.split(' - ');
        const reason = parts.length > 1 ? parts.slice(1).join(' - ') : 'No reason provided';
        console.log(`Found absence reason for ${player.name} on ${trainingDateStr}: "${reason}"`);
        return reason;
      }
      
      return null;
    };
  }, [players]); // Recalculate when players data changes

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

  // Get displayable trainings
  const getDisplayableTrainings = () => {
    if (showCustomHorizon) {
      return getUpcomingTrainings(horizonCount);
    }
    return getUpcomingTrainings(3);
  };

  const displayableTrainings = getDisplayableTrainings();

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
    if (playersLoading) {
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
    
    // Refresh data after successful CSV upload (absence checking will happen automatically)
    if (results.success > 0) {
      console.log('CSV upload successful, refreshing data...');
      
      try {
        await Promise.all([refreshTrainings(), refreshPlayers()]);
        console.log('Data refreshed after CSV upload - absence checking will run automatically');
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

  const processTrainingData = async (data: TrainingUploadData[]) => {
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

        // Build participants list
        const trainingParticipants: TrainingParticipant[] = [];
        const playerNames = [training.player1, training.player2, training.player3, training.player4]
          .filter(name => name && name.trim() !== '');

        for (const playerName of playerNames) {
          if (trainingParticipants.length >= 4) break;

          // Try to find existing player
          const existingPlayer = players.find(p => 
            p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
          );

          console.log(`CSV Import: Looking for player '${playerName}' in roster of ${players.length} players`);
          console.log(`Found existing player:`, existingPlayer ? `${existingPlayer.name} (ID: ${existingPlayer.id})` : 'Not found');
          if (existingPlayer) {
            console.log(`Player ${existingPlayer.name} absences:`, existingPlayer.absences);
          }

          const participant: TrainingParticipant = {
            id: crypto.randomUUID(),
            playerName: playerName.trim(),
            isManualEntry: !existingPlayer,
            playerId: existingPlayer?.id,
            email: existingPlayer?.email,
            phone: existingPlayer?.phone
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

    return { success, failed, errors };
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
      
      // Refresh data after successful player mapping (absence checking will happen automatically)
      if (results && results.success > 0) {
        console.log('Player mapping successful, refreshing data...');
        try {
          await Promise.all([refreshTrainings(), refreshPlayers()]);
          console.log('Data refreshed after player mapping - absence checking will run automatically');
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  ➕ Schedule Training
                </Button>
                
                <Button
                  onClick={checkAbsences}
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={trainingsLoading || playersLoading}
                >
                  🔍 Check Absences
                </Button>
                
                <Button 
                  variant="outline" 
                  className="border-green-500 text-green-700 hover:bg-green-50"
                  onClick={() => {
                    console.log('Upload Schedule button clicked');
                    setShowUploadDialog(true);
                  }}
                >
                  📤 Upload Schedule
                </Button>
                
                <Dialog open={showUploadDialog} onOpenChange={(open) => {
                  setShowUploadDialog(open);
                  if (!open) resetUploadState();
                }}>
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
                                  value={mapping.mappedPlayerId || ''}
                                  onValueChange={(value) => updatePlayerMapping(mapping.csvName, value || null)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a player or leave unmapped" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Leave unmapped (manual entry)</SelectItem>
                                    
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
                
                <Button
                  onClick={() => setShowCustomHorizon(!showCustomHorizon)}
                  variant="outline"
                  className="border-blue-500 text-blue-700 hover:bg-blue-50"
                >
                  📅 {showCustomHorizon ? 'Show Next 3' : 'Custom View'}
                </Button>
              </div>
              
              {showCustomHorizon && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">
                    Show next:
                  </label>
                  <select
                    value={horizonCount}
                    onChange={(e) => setHorizonCount(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 10, 15, 20].map(num => (
                      <option key={num} value={num}>{num} trainings</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Training List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {showCustomHorizon ? `Next ${horizonCount} Training Sessions` : 'Next 3 Training Sessions'}
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
              <div className="space-y-4" key={`trainings-${refreshKey}-${players.length}-${lastAbsenceCheck}`}>
                {displayableTrainings.map((training) => (
                  <div
                    key={`${training.id}-${refreshKey}-${players.length}-${lastAbsenceCheck}`}
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
                                const hasAbsence = participant.playerId && playerHasAbsenceOnDate(participant.playerId, training.date);
                                const absenceReason = participant.playerId ? getAbsenceReason(participant.playerId, training.date) : null;
                                
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
                                      : participant.playerId 
                                        ? `Available (Player ID: ${participant.playerId})`
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
                        <button
                          onClick={() => handleDeleteTraining(training.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded border border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
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