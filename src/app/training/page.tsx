"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Training, TrainingParticipant, Player } from "@/types";
import { useTrainings } from "@/hooks/useTrainings";
import { usePlayers } from "@/hooks/usePlayers";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Clock,
  Users,
  Calendar,
  Upload,
  FileText,
  MessageSquare,
  MapPin,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  PersonStanding,
  Star
} from "lucide-react";
import * as XLSX from 'xlsx';

// Helper function to convert numeric ranking to proper tennis ranking display
const formatTennisRanking = (ranking: number): string => {
  const rankingMap: { [key: number]: string } = {
    0: "NA",
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

interface AddTrainingFormData {
  date: string;
  startTime: string; // "HH:MM" format
  duration: string; // "1" or "2" for hours
  courtNumber: string;
  comment: string;
  eventType: 'training' | 'event';
}


// Time selection options with 15-minute increments
const timeOptions = [
  { value: "07:30", label: "7:30 AM" },
  { value: "07:45", label: "7:45 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "08:15", label: "8:15 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "08:45", label: "8:45 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:15", label: "9:15 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "09:45", label: "9:45 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:15", label: "10:15 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "10:45", label: "10:45 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:15", label: "11:15 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "11:45", label: "11:45 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:15", label: "12:15 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "12:45", label: "12:45 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "13:15", label: "1:15 PM" },
  { value: "13:30", label: "1:30 PM" },
  { value: "13:45", label: "1:45 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:15", label: "2:15 PM" },
  { value: "14:30", label: "2:30 PM" },
  { value: "14:45", label: "2:45 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "15:15", label: "3:15 PM" },
  { value: "15:30", label: "3:30 PM" },
  { value: "15:45", label: "3:45 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "16:15", label: "4:15 PM" },
  { value: "16:30", label: "4:30 PM" },
  { value: "16:45", label: "4:45 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "17:15", label: "5:15 PM" },
  { value: "17:30", label: "5:30 PM" },
  { value: "17:45", label: "5:45 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "18:15", label: "6:15 PM" },
  { value: "18:30", label: "6:30 PM" },
  { value: "18:45", label: "6:45 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "19:15", label: "7:15 PM" },
  { value: "19:30", label: "7:30 PM" },
  { value: "19:45", label: "7:45 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "20:15", label: "8:15 PM" },
  { value: "20:30", label: "8:30 PM" },
  { value: "20:45", label: "8:45 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "21:15", label: "9:15 PM" },
  { value: "21:30", label: "9:30 PM" }
];

const durationOptions = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" }
];

function TrainingModeContent() {
  const searchParams = useSearchParams();
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

  // Helper function to get local date string (YYYY-MM-DD) without timezone issues
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const { players, loading: playersLoading, refreshPlayers, updatePlayer } = usePlayers();
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
    startTime: "19:00", // Default to 7:00 PM
    duration: "1", // Default to 1 hour
    courtNumber: "",
    comment: "",
    eventType: 'training'
  });
  const [participants, setParticipants] = useState<TrainingParticipant[]>([]);
  const [horizonCount, setHorizonCount] = useState(3);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResults, setCsvResults] = useState<{success: number, failed: number, errors: string[]} | null>(null);
  const [showMyTrainings, setShowMyTrainings] = useState(false);

  // Load custom horizon settings and filter preference from localStorage
  useEffect(() => {
    const savedHorizonCount = localStorage.getItem('trainingHorizonCount');
    const savedShowMyTrainings = localStorage.getItem('showMyTrainings');

    if (savedHorizonCount) {
      setHorizonCount(parseInt(savedHorizonCount));
    }

    if (savedShowMyTrainings) {
      setShowMyTrainings(savedShowMyTrainings === 'true');
    }
  }, []);

  // Save horizon count to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('trainingHorizonCount', horizonCount.toString());
  }, [horizonCount]);

  // Save filter preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('showMyTrainings', showMyTrainings.toString());
  }, [showMyTrainings]);

  // Handle URL parameter for specific date navigation
  useEffect(() => {
    const targetDate = searchParams.get('date');
    if (targetDate && trainings.length > 0) {
      console.log('Navigating to training date:', targetDate);

      // Find the training for the target date
      const targetTraining = trainings.find(training => {
        const trainingDateStr = getLocalDateString(training.date);
        return trainingDateStr === targetDate;
      });

      if (targetTraining) {
        // Calculate how many trainings we need to show to include the target
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingTrainings = trainings
          .filter(training => training.date >= today)
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        const targetIndex = upcomingTrainings.findIndex(training =>
          getLocalDateString(training.date) === targetDate
        );

        if (targetIndex !== -1) {
          // Adjust horizon count to ensure the target training is visible
          const requiredHorizon = Math.max(targetIndex + 1, horizonCount);
          if (requiredHorizon > horizonCount) {
            setHorizonCount(requiredHorizon);
          }

          // Reset filter to show all trainings if target might be filtered out
          const isUserParticipant = targetTraining.participants.some(participant =>
            participant.playerId === user?.id ||
            participant.email?.toLowerCase() === user?.email?.toLowerCase()
          );

          if (showMyTrainings && !isUserParticipant) {
            setShowMyTrainings(false);
          }

          // Scroll to the training card after a short delay
          setTimeout(() => {
            const trainingElement = document.getElementById(`training-${targetTraining.id}`);
            if (trainingElement) {
              trainingElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
              // Add temporary highlight
              trainingElement.classList.add('ring-4', 'ring-purple-300', 'ring-opacity-50');
              setTimeout(() => {
                trainingElement.classList.remove('ring-4', 'ring-purple-300', 'ring-opacity-50');
              }, 3000);
            }
          }, 500);
        }
      }
    }
  }, [searchParams, trainings, user, horizonCount, showMyTrainings]);

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
        const trainingDateStr = getLocalDateString(training.date);
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
      const trainingDateStr = getLocalDateString(training.date);
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

      // Handle timezone issues by using local date string
      const trainingDateStr = getLocalDateString(date);

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

      // Handle timezone issues by using local date string
      const trainingDateStr = getLocalDateString(date);

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

  // State for tracking delayed notification timeouts
  const [notificationTimeouts, setNotificationTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      notificationTimeouts.forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [notificationTimeouts]);

  // Quick absence management functions for participant interaction
  const handleToggleAbsence = async (playerId: string, trainingDate: Date, playerName: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const hasAbsence = playerHasAbsenceOnDate(playerId, trainingDate);
    const dateStr = getLocalDateString(trainingDate);
    const timeoutKey = `${playerId}-${dateStr}`;

    try {
      if (hasAbsence) {
        // User is switching back to available - cancel any pending notification
        const existingTimeout = notificationTimeouts.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          setNotificationTimeouts(prev => {
            const updated = new Map(prev);
            updated.delete(timeoutKey);
            return updated;
          });
          console.log(`Cancelled pending notification for ${playerName} on ${dateStr}`);
        }

        // Remove absence using local date string to avoid timezone issues
        const updatedAbsences = player.absences.filter(absence =>
          !absence.startsWith(dateStr)
        );
        await updatePlayer(player.id, { absences: updatedAbsences });
        console.log(`Removed absence for ${playerName} on ${dateStr}`);
      } else {
        // User is marking themselves unavailable - add absence and schedule notification
        const absenceEntry = `${dateStr} - Training unavailable`;
        const updatedAbsences = [...player.absences, absenceEntry];
        await updatePlayer(player.id, { absences: updatedAbsences });
        console.log(`Added absence for ${playerName} on ${dateStr}`);

        // Schedule notification after 15 seconds
        const timeout = setTimeout(async () => {
          try {
            // Double-check that user is still marked as unavailable
            const currentPlayer = players.find(p => p.id === playerId);
            const stillUnavailable = currentPlayer?.absences?.some(absence =>
              absence.startsWith(dateStr)
            );

            if (stillUnavailable) {
              console.log(`Sending unavailability notification for ${playerName} on ${dateStr}`);

              // Find the training session to get session details
              const training = trainings.find(t => getLocalDateString(t.date) === dateStr);
              if (training) {
                const sessionUrl = `${window.location.origin}/session/${training.id}`;
                const startsAtISO = training.date.toISOString();

                // Send notification via API
                const response = await fetch('/api/notifications/schedule', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    sessionId: training.id,
                    startsAtISO: startsAtISO,
                    sessionUrl: sessionUrl,
                    rosterUserIds: [playerId], // Only notify the unavailable user
                    testMode: false,
                    immediateNotification: true // Custom flag for immediate notification
                  })
                });

                if (response.ok) {
                  console.log(`Notification sent successfully for ${playerName}`);
                } else {
                  console.error('Failed to send notification:', await response.text());
                }
              }
            } else {
              console.log(`User ${playerName} is now available again, skipping notification`);
            }
          } catch (error) {
            console.error('Error sending delayed notification:', error);
          } finally {
            // Clean up timeout reference
            setNotificationTimeouts(prev => {
              const updated = new Map(prev);
              updated.delete(timeoutKey);
              return updated;
            });
          }
        }, 15000); // 15 seconds

        // Store timeout reference
        setNotificationTimeouts(prev => {
          const updated = new Map(prev);
          // Clear any existing timeout for this user/date combination
          const existing = updated.get(timeoutKey);
          if (existing) {
            clearTimeout(existing);
          }
          updated.set(timeoutKey, timeout);
          return updated;
        });

        console.log(`Scheduled notification for ${playerName} on ${dateStr} in 15 seconds`);
      }

      // Refresh data to show updated state across all pages
      await refreshPlayers();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error toggling absence:', error);
      alert(`Failed to update availability for ${playerName}. Please try again.`);
    }
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, duration: string) => {
    const [startHour, startMinute] = startTime.split(':');
    const startHourNum = parseInt(startHour);
    const startMinuteNum = parseInt(startMinute);
    const durationHours = parseInt(duration);
    
    let endHour = startHourNum + durationHours;
    let endMinute = startMinuteNum;
    
    // Handle overflow (though shouldn't happen with our constraints)
    if (endHour >= 24) {
      endHour = endHour - 24;
    }
    
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      date: "",
      startTime: "19:00",
      duration: "1",
      courtNumber: "",
      comment: "",
      eventType: 'training'
    });
    setParticipants([]);
  };

  // Handle training creation
  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.startTime) return;

    const endTime = calculateEndTime(formData.startTime, formData.duration);

    const trainingData = {
      date: new Date(formData.date),
      dayName: getDayName(formData.date),
      timeStart: formData.startTime,
      timeEnd: endTime,
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
    
    if (!editingTraining || !formData.date || !formData.startTime) return;

    const endTime = calculateEndTime(formData.startTime, formData.duration);

    const updates = {
      date: new Date(formData.date),
      dayName: getDayName(formData.date),
      timeStart: formData.startTime,
      timeEnd: endTime,
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

  // Handle CSV upload
  const handleCsvUpload = async () => {
    console.log('=== CSV UPLOAD STARTED ===');
    console.log('csvFile:', csvFile?.name);
    console.log('csvUploading:', csvUploading);

    if (!csvFile || csvUploading) {
      console.log('Upload prevented: no file or already uploading');
      return;
    }

    setCsvUploading(true);
    setCsvResults(null);

    try {
      console.log('Parsing CSV file...');
      const data = await parseCSVFile(csvFile);
      console.log('Parsed CSV data - entries count:', data.length);
      console.log('Parsed CSV data:', data);

      console.log('Processing training data...');
      const results = await processTrainingData(data);
      console.log('Processing results:', results);
      setCsvResults(results);

      // Refresh training list if any trainings were successfully created
      if (results.success > 0) {
        console.log('Refreshing training list...');
        await refreshTrainings();
      }

      // Clear the file input to prevent re-uploads
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      setCsvFile(null);

    } catch (error) {
      console.error('CSV upload error:', error);
      setCsvResults({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Failed to process file']
      });
    } finally {
      setCsvUploading(false);
      console.log('=== CSV UPLOAD COMPLETED ===');
    }
  };
  
  // Parse CSV file
  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          let jsonData: any[][];
          
          if (file.name.endsWith('.csv')) {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            jsonData = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
          } else {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][];
          }
          
          // Skip header row and convert to objects
          const headers = ['date', 'courtNumber', 'timeStart', 'timeEnd', 'player1', 'player2', 'player3', 'player4', 'comment'];
          const trainings = jsonData.slice(1)
            .filter(row => row.length >= 4 && row[0] && row[2] && row[3])
            .map(row => {
              const training: any = {};
              headers.forEach((header, index) => {
                training[header] = row[index] || '';
              });
              return training;
            });
          
          resolve(trainings);
        } catch (err) {
          reject(new Error('Failed to parse file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };
  
  // Process training data and create trainings
  const processTrainingData = async (data: any[]): Promise<{success: number, failed: number, errors: string[]}> => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(`Processing ${data.length} training entries from CSV`);

    // Track processed trainings to prevent duplicates within the same upload
    const processedTrainings = new Set<string>();

    for (const [index, item] of data.entries()) {
      try {
        console.log(`Processing row ${index + 1}:`, item);
        // Parse date
        let trainingDate;
        if (item.date.includes('/')) {
          const [month, day, year] = item.date.split('/');
          trainingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          trainingDate = new Date(item.date);
        }

        if (isNaN(trainingDate.getTime())) {
          throw new Error(`Invalid date: ${item.date}`);
        }

        // Create a unique key for this training to check for duplicates
        const trainingKey = `${getLocalDateString(trainingDate)}-${item.timeStart}-${item.timeEnd}-${item.courtNumber}`;
        console.log(`Training key: ${trainingKey}`);

        // Check if we've already processed this exact training in this batch
        if (processedTrainings.has(trainingKey)) {
          console.log(`Skipping duplicate training: ${trainingKey}`);
          failed++;
          errors.push(`Row ${index + 2}: Duplicate training detected (same date, time, and court)`);
          continue;
        }

        // Check if this training already exists in the database
        const existingTraining = trainings.find(t => {
          const existingKey = `${getLocalDateString(t.date)}-${t.timeStart}-${t.timeEnd}-${t.courtNumber}`;
          return existingKey === trainingKey;
        });

        if (existingTraining) {
          console.log(`Training already exists in database: ${trainingKey}`);
          failed++;
          errors.push(`Row ${index + 2}: Training already exists for this date, time, and court`);
          continue;
        }

        // Mark this training as processed
        processedTrainings.add(trainingKey);

        // Create participants
        const participants: TrainingParticipant[] = [];
        [item.player1, item.player2, item.player3, item.player4]
          .filter(name => name && name.trim())
          .forEach((name: string) => {
            // Find matching player in roster
            const matchedPlayer = players.find(p =>
              p.name.toLowerCase() === name.trim().toLowerCase() ||
              p.email.toLowerCase() === name.trim().toLowerCase()
            );

            participants.push({
              id: crypto.randomUUID(),
              playerId: matchedPlayer?.id,
              playerName: name.trim(),
              isManualEntry: !matchedPlayer,
              email: matchedPlayer?.email || '',
              phone: matchedPlayer?.phone || ''
            });
          });

        // Create training
        const trainingData = {
          date: trainingDate,
          dayName: trainingDate.toLocaleDateString('en-US', { weekday: 'long' }),
          timeStart: item.timeStart,
          timeEnd: item.timeEnd,
          courtNumber: item.courtNumber,
          participants,
          comment: item.comment || ''
        };

        console.log(`Creating training: ${trainingKey}`);
        await addTraining(trainingData);
        success++;
        console.log(`Successfully created training: ${trainingKey}`);
      } catch (error) {
        failed++;
        errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error processing row ${index + 1}:`, error);
      }
    }

    console.log(`Processing complete: ${success} success, ${failed} failed`);
    return { success, failed, errors };
  };

  // Open edit form
  const openEditForm = (training: Training) => {
    setEditingTraining(training);
    
    // Use local timezone-safe date formatting for date input
    const year = training.date.getFullYear();
    const month = String(training.date.getMonth() + 1).padStart(2, '0');
    const day = String(training.date.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    // Calculate duration from start and end times
    const [startHour, startMinute] = training.timeStart.split(':');
    const [endHour, endMinute] = training.timeEnd.split(':');
    const startTotalMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
    const endTotalMinutes = parseInt(endHour) * 60 + parseInt(endMinute);
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    const durationHours = Math.round(durationMinutes / 60).toString();
    
    setFormData({
      date: localDateString,
      startTime: training.timeStart,
      duration: durationHours,
      courtNumber: training.courtNumber,
      comment: training.comment,
      eventType: 'training' // Default to training when editing existing sessions
    });
    setParticipants([...training.participants]);
    setShowEditForm(true);
  };

  // Add participant
  const addParticipant = () => {
    // For events, allow unlimited players. For training, limit to 4
    const maxPlayers = formData.eventType === 'event' ? 20 : 4;
    if (participants.length >= maxPlayers) return;
    
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

  // Get displayable trainings based on custom horizon setting and filter
  const allUpcomingTrainings = getUpcomingTrainings(horizonCount);

  const displayableTrainings = useMemo(() => {
    if (!showMyTrainings || !user) {
      return allUpcomingTrainings;
    }

    // Filter trainings where current user is a participant
    return allUpcomingTrainings.filter(training =>
      training.participants.some(participant =>
        participant.playerId && user.email && (
          participant.playerId === user.id ||
          participant.email?.toLowerCase() === user.email.toLowerCase()
        )
      )
    );
  }, [allUpcomingTrainings, showMyTrainings, user]);


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-2 py-2">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Training Controls */}
          <div className="mb-3 flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              + Add Training
            </Button>

            {/* Me/All Toggle Button */}
            <Button
              onClick={() => setShowMyTrainings(!showMyTrainings)}
              variant="outline"
              className={`flex items-center gap-2 transition-colors ${
                showMyTrainings
                  ? "bg-purple-600 hover:bg-purple-700 !text-white border-purple-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Users className="h-4 w-4" />
              {showMyTrainings ? "Me" : "All"}
            </Button>

            {/* Number of Trainings Dropdown */}
            <Select value={horizonCount.toString()} onValueChange={(value) => setHorizonCount(parseInt(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="999">All trainings</SelectItem>
                <SelectItem value="1">1 training</SelectItem>
                <SelectItem value="3">3 trainings</SelectItem>
                <SelectItem value="5">5 trainings</SelectItem>
                <SelectItem value="10">10 trainings</SelectItem>
                <SelectItem value="20">20 trainings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Training List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            
            {trainingsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading trainings...</p>
              </div>
            ) : displayableTrainings.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <PersonStanding className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {showMyTrainings
                    ? "You are not participating in any upcoming training sessions"
                    : "No upcoming training sessions scheduled"
                  }
                </p>
                {!showMyTrainings && (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    + Add Training
                  </Button>
                )}
                {showMyTrainings && (
                  <Button
                    onClick={() => setShowMyTrainings(false)}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    View All Trainings
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4" key={`trainings-${refreshKey}-${players.length}-${JSON.stringify(players.map(p => p.absences)).substring(0, 50)}`}>
                {displayableTrainings.map((training) => (
                  <div
                    key={`${training.id}-${refreshKey}-${players.length}`}
                    id={`training-${training.id}`}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          {training.date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded flex items-center gap-1 w-fit">
                              <MapPin className="h-3 w-3" />
                              Court {training.courtNumber}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                              <Clock className="h-3 w-3" />
                              {training.timeStart} - {training.timeEnd}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTraining(training.id)}
                              className="text-red-500 hover:text-red-700 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors h-[24px] w-[24px] p-0"
                              title="Delete training"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditForm(training)}
                              className="text-blue-600 hover:text-blue-800 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors h-[24px] w-[24px] p-0"
                              title="Edit training"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {training.participants.length > 0 && (
                        <div>
                          <div className="space-y-2">
                            {training.participants.map((participant, index) => {
                                // Debug info for absence checking
                                const playerId = participant.playerId || participant.id;
                                const hasAbsence = playerId && playerHasAbsenceOnDate(playerId, training.date);
                                const absenceReason = playerId ? getAbsenceReason(playerId, training.date) : null;

                                // Check if this is the current logged-in user
                                const isCurrentUser = user && playerId && (
                                  playerId === user.id ||
                                  participant.email?.toLowerCase() === user.email?.toLowerCase()
                                );

                                return (
                                  <div key={participant.id} className="group relative">
                                    <button
                                      onClick={() => playerId && handleToggleAbsence(playerId, training.date, participant.playerName)}
                                      disabled={!playerId}
                                      className={`w-full px-3 py-2 rounded text-sm transition-all duration-200 flex items-center gap-2 justify-between ${
                                        hasAbsence
                                          ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600 hover:bg-red-200 dark:hover:bg-red-800"
                                          : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-800"
                                      } ${
                                        playerId ? 'cursor-pointer' : 'cursor-default'
                                      }`}
                                      title={playerId ? `Click to toggle availability` : 'Manual entry - cannot toggle'}
                                    >
                                      <div className="flex items-center gap-2">
                                        {hasAbsence ? (
                                          <AlertTriangle className="h-3 w-3" />
                                        ) : (
                                          <CheckCircle className="h-3 w-3" />
                                        )}
                                        <span className={isCurrentUser ? 'font-bold' : 'font-medium'}>
                                          {participant.playerName}
                                        </span>
                                      </div>
                                      {isCurrentUser && (
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                      )}
                                    </button>

                                    {/* Hover tooltip */}
                                    {playerId && (
                                      <div className="absolute z-10 invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap">
                                        {hasAbsence ? 'Mark as Available' : 'Mark as Unavailable'}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {training.comment && (
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Comment:</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                              <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {training.comment}
                            </div>
                          </div>
                        )}

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
                  Schedule Training
                </h3>
                
                {/* Tab Navigation */}
                <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'single'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Single Training
                  </button>
                  <button
                    onClick={() => setActiveTab('bulk')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'bulk'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    CSV Upload
                  </button>
                </div>
                
                {activeTab === 'single' ? (
                  <form onSubmit={handleAddTraining} className="space-y-6">
                  {/* Event Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type *
                    </label>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="eventType"
                          value="training"
                          checked={formData.eventType === 'training'}
                          onChange={(e) => setFormData({ ...formData, eventType: e.target.value as 'training' | 'event' })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Training</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="eventType"
                          value="event"
                          checked={formData.eventType === 'event'}
                          onChange={(e) => setFormData({ ...formData, eventType: e.target.value as 'training' | 'event' })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Event</span>
                      </label>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        min={getLocalDateString(new Date())}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Court Number
                      </label>
                      <select
                        value={formData.courtNumber}
                        onChange={(e) => setFormData({ ...formData, courtNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="">Select a court...</option>
                        <option value="1-int">1-int</option>
                        <option value="2-int">2-int</option>
                        <option value="3-int">3-int</option>
                        <option value="5-ext">5-ext</option>
                        <option value="6-ext">6-ext</option>
                        <option value="7-ext">7-ext</option>
                        <option value="8-ext">8-ext</option>
                        <option value="Team event">Team event</option>
                      </select>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Time *
                      </label>
                      <select
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        {timeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Duration *
                      </label>
                      <select
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        {durationOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Participants */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Players for {formData.eventType === 'event' ? 'Event' : 'Training'} ({participants.length}/{formData.eventType === 'event' ? '∞' : '4'})
                      </label>
                      <Button
                        type="button"
                        onClick={addParticipant}
                        disabled={formData.eventType === 'training' ? participants.length >= 4 : participants.length >= 20}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-1 px-3 rounded transition-colors"
                        size="sm"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Player
                      </Button>
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
                                {player.name} {player.ranking > 0 && `(${formatTennisRanking(player.ranking)})`}
                              </option>
                            ))}
                          </select>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParticipant(index)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove player"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                ) : (
                  /* CSV Upload Section */
                  <div className="space-y-6">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                      <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          id="csv-upload"
                        />
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                          <div className="text-blue-600 dark:text-blue-400 mb-2 flex items-center justify-center gap-2">
                            <Upload className="h-5 w-5" />
                            {csvFile ? 'Choose a file' : 'Click here to select a file'}
                          </div>
                          {csvFile && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                              Selected: {csvFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                        Supported formats: Excel (.xlsx, .xls) or CSV (.csv)
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV Format Requirements:
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                        Your file should have these columns in order:
                      </p>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-white dark:bg-gray-800 p-2 rounded border">
                        Date,Court Number,Start Time,End Time,Player 1,Player 2,Player 3,Player 4,Comment
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        • Date format: MM/DD/YYYY or YYYY-MM-DD<br/>
                        • Time format: HH:MM (24-hour)<br/>
                        • Player columns: Leave empty if fewer than 4 players
                      </p>
                    </div>
                    
                    {csvResults && (
                      <div className={`p-4 rounded-lg ${
                        csvResults.success > 0 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}>
                        <h4 className={`font-medium mb-2 flex items-center gap-2 ${
                          csvResults.success > 0 
                            ? 'text-green-800 dark:text-green-200' 
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          {csvResults.success > 0 ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Training uploaded!
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4" />
                              Upload Results:
                            </>
                          )}
                        </h4>
                        <p className={`text-sm ${
                          csvResults.success > 0 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Success: {csvResults.success} training session{csvResults.success !== 1 ? 's' : ''} created
                          </span>
                          {csvResults.failed > 0 && (
                            <span className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              Failed: {csvResults.failed} training session{csvResults.failed !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                        {csvResults.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Errors:</p>
                            <ul className="text-xs text-red-600 dark:text-red-400 mt-1 max-h-32 overflow-y-auto">
                              {csvResults.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!csvUploading && csvFile) {
                            handleCsvUpload();
                          }
                        }}
                        disabled={!csvFile || csvUploading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {csvUploading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Import Training Schedule
                            </>
                          )}
                        </div>
                      </Button>
                      {csvResults && csvResults.success > 0 ? (
                        <Button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setActiveTab('single');
                            setCsvFile(null);
                            setCsvResults(null);
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Close & View Trainings
                          </div>
                        </Button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setActiveTab('single');
                            setCsvFile(null);
                            setCsvResults(null);
                          }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
                        min={getLocalDateString(new Date())}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Court Number
                      </label>
                      <select
                        value={formData.courtNumber}
                        onChange={(e) => setFormData({ ...formData, courtNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="">Select a court...</option>
                        <option value="1-int">1-int</option>
                        <option value="2-int">2-int</option>
                        <option value="3-int">3-int</option>
                        <option value="5-ext">5-ext</option>
                        <option value="6-ext">6-ext</option>
                        <option value="7-ext">7-ext</option>
                        <option value="8-ext">8-ext</option>
                        <option value="Team event">Team event</option>
                      </select>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Time *
                      </label>
                      <select
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        {timeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Duration *
                      </label>
                      <select
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        {durationOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Participants */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Players for Training ({participants.length}/4)
                      </label>
                      <Button
                        type="button"
                        onClick={addParticipant}
                        disabled={participants.length >= 4}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-1 px-3 rounded transition-colors"
                        size="sm"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Player
                      </Button>
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
                                {player.name} {player.ranking > 0 && `(${formatTennisRanking(player.ranking)})`}
                              </option>
                            ))}
                          </select>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParticipant(index)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove player"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

export default function TrainingMode() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <TrainingModeContent />
    </Suspense>
  );
}