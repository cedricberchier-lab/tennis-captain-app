'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { usePlayers } from "@/hooks/usePlayers";
import { useTrainings } from "@/hooks/useTrainings";
import {
  Activity,
  Clock,
  MapPin,
  ChevronRight,
  CalendarOff,
  Sparkles,
  ChevronLeft
} from "lucide-react";


export default function Home() {
  const { user } = useAuth();
  const { players } = usePlayers();
  const { trainings } = useTrainings();
  const router = useRouter();

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Helper function to get local date string (YYYY-MM-DD) without timezone issues
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calendar utility functions
  const getMonthData = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startCalendar);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      year,
      month,
      days,
      monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const hasUserTrainingAndAvailable = (date: Date) => {
    if (!currentPlayer) return false;

    const dateStr = getLocalDateString(date);

    // Check if user has a training on this date
    const hasTraining = trainings.some(training => {
      const trainingDateStr = getLocalDateString(training.date);
      if (trainingDateStr !== dateStr) return false;

      return training.participants.some(participant =>
        participant.playerId === currentPlayer.id ||
        participant.email === user?.email ||
        participant.playerName === user?.name
      );
    });

    if (!hasTraining) return false;

    // Check if user is available (not absent) on this date
    const isAbsent = currentPlayer.absences.some(absence => {
      const absenceDate = absence.split(' - ')[0];
      return absenceDate === dateStr;
    });

    return !isAbsent; // Only highlight if has training AND is available
  };

  const hasUserTrainingButUnavailable = (date: Date) => {
    if (!currentPlayer) return false;

    const dateStr = getLocalDateString(date);

    // Check if user has a training on this date
    const hasTraining = trainings.some(training => {
      const trainingDateStr = getLocalDateString(training.date);
      if (trainingDateStr !== dateStr) return false;

      return training.participants.some(participant =>
        participant.playerId === currentPlayer.id ||
        participant.email === user?.email ||
        participant.playerName === user?.name
      );
    });

    if (!hasTraining) return false;

    // Check if user is absent on this date
    const isAbsent = currentPlayer.absences.some(absence => {
      const absenceDate = absence.split(' - ')[0];
      return absenceDate === dateStr;
    });

    return isAbsent; // Only return true if has training AND is absent
  };

  // Touch handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      navigateMonth('next');
    } else if (isRightSwipe) {
      navigateMonth('prev');
    }
  };

  // Handle calendar day click
  const handleDayClick = (date: Date) => {
    const dateStr = getLocalDateString(date);
    const hasTraining = trainings.some(training => {
      const trainingDateStr = getLocalDateString(training.date);
      return trainingDateStr === dateStr;
    });

    if (hasTraining) {
      // Navigate to training page with the specific date
      router.push(`/training?date=${dateStr}`);
    }
  };

  // Get current player name
  const getCurrentPlayerName = () => {
    if (!user) return 'User';
    if (user.role === 'admin') return 'Administrator';
    
    const currentPlayer = players.find(p => 
      p.email === user.email || 
      p.id === user.id ||
      p.name === user.name
    );
    
    return currentPlayer?.name || user.name || user.username || 'User';
  };
  
  
  
  // Get current user's player record with better debugging
  const currentPlayer = user?.email ? players.find(p => p.email === user.email) : null;
  
  // Debug logging for player linking issues
  useEffect(() => {
    if (user && players.length > 0) {
      console.log('User email:', user.email);
      console.log('Available players:', players.map(p => ({ id: p.id, name: p.name, email: p.email })));
      console.log('Current player found:', currentPlayer ? `${currentPlayer.name} (${currentPlayer.email})` : 'None');
    }
  }, [user, players, currentPlayer]);
  
  
  
  
  
  // Get user-relevant upcoming events
  const getUserRelevantEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events: Array<{
      type: 'training';
      title: string;
      date: string;
      location: string;
      participants: string;
      sortDate: Date;
    }> = [];

    // Get upcoming trainings where user is a participant AND available
    trainings
      .filter(training => {
        // Check if training is upcoming
        const trainingDate = new Date(training.date);
        trainingDate.setHours(0, 0, 0, 0);

        if (trainingDate < today) return false;

        // Check if user is a participant
        const isParticipant = training.participants.some(participant =>
          participant.playerId === currentPlayer?.id ||
          participant.email === user?.email ||
          participant.playerName === user?.name
        );

        if (!isParticipant) return false;

        // Check if user is available (not absent) for this training
        if (!currentPlayer) return true; // If no player record, assume available

        const trainingDateStr = getLocalDateString(trainingDate);
        const isAbsent = currentPlayer.absences.some(absence => {
          const absenceDate = absence.split(' - ')[0];
          return absenceDate === trainingDateStr;
        });

        return !isAbsent; // Only include if user is available
      })
      .slice(0, 2) // Limit to next 2 trainings
      .forEach(training => {
        events.push({
          type: 'training',
          title: 'Team Training',
          date: `${training.dayName}, ${training.date.toLocaleDateString()}`,
          location: `Court ${training.courtNumber}`,
          participants: `${training.participants.length} players`,
          sortDate: training.date
        });
      });
    
    
    // Sort by date and return up to 4 events
    return events
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .slice(0, 4);
  };
  
  // Get upcoming absences that affect trainings (only show absences when players are unavailable for upcoming trainings)
  const getUpcomingAbsences = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const conflictingAbsences: Array<{player: string, date: string, reason: string, dateObj: Date, trainingInfo: string}> = [];
    
    // Look at upcoming trainings
    const upcomingTrainings = trainings.filter(training => {
      const trainingDate = new Date(training.date);
      trainingDate.setHours(0, 0, 0, 0);
      return trainingDate >= today;
    });
    
    // For each upcoming training, check if any participants have absences on that date
    upcomingTrainings.forEach(training => {
      const trainingDate = new Date(training.date);
      trainingDate.setHours(0, 0, 0, 0);
      const trainingDateStr = getLocalDateString(trainingDate);
      
      // Check each participant in the training
      training.participants.forEach(participant => {
        // Find the player record
        const player = players.find(p => 
          p.id === participant.playerId || 
          p.email === participant.email ||
          p.name === participant.playerName
        );
        
        if (player) {
          // Check if this player has an absence on the training date
          player.absences.forEach(absence => {
            const [dateStr, ...reasonParts] = absence.split(' - ');
            const absenceDate = new Date(dateStr);
            absenceDate.setHours(0, 0, 0, 0);
            const absenceDateStr = getLocalDateString(absenceDate);

            // If the absence date matches the training date
            if (absenceDateStr === trainingDateStr && absenceDate >= today) {
              conflictingAbsences.push({
                player: player.name,
                date: dateStr,
                reason: reasonParts.join(' - ') || '',
                dateObj: absenceDate,
                trainingInfo: `Training - Court ${training.courtNumber}`
              });
            }
          });
        }
      });
    });
    
    // Remove duplicates and sort by date, return next 5
    const uniqueAbsences = conflictingAbsences.filter((absence, index, self) =>
      index === self.findIndex(a => a.player === absence.player && a.date === absence.date)
    );
    
    return uniqueAbsences
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 5);
  };
  
  const upcomingEvents = getUserRelevantEvents();
  const upcomingAbsences = getUpcomingAbsences();

  // Send broadcast notification to all users
  const sendBroadcastNotification = async () => {
    try {
      const response = await fetch('/api/notifications/broadcast');
      const data = await response.json();

      if (response.ok) {
        alert('Broadcast notification sent to all users! 📢');
        console.log('✅ Broadcast notification result:', data);
      } else {
        alert(`Error: ${data.error}`);
        console.error('❌ Broadcast notification error:', data.error);
      }
    } catch (error) {
      alert('Failed to send broadcast notification');
      console.error('❌ Broadcast notification failed:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          
          {/* Welcome Header - Mobile Optimized */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                Welcome back, {getCurrentPlayerName()}!
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-purple-500 dark:text-purple-400" />
              </h1>
              {user?.name === 'Cédric Berchier' && (
                <button
                  onClick={sendBroadcastNotification}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-semibold shadow-lg flex items-center gap-2"
                >
                  📢 Broadcast to All
                </button>
              )}
            </div>
          </div>


          <div className="grid grid-cols-1 gap-6 sm:gap-8">
            {/* Upcoming Events - Full Width */}
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                Upcoming Events
              </h2>

              {/* Calendar Month View */}
              <Card className="p-4">
                <CardContent className="p-0">
                  <div
                    className="space-y-4"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {getMonthData(currentMonth).monthName}
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Day headers */}
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <div key={index} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                          {day}
                        </div>
                      ))}

                      {/* Calendar days */}
                      {getMonthData(currentMonth).days.map((day, index) => {
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                        const isToday = day.toDateString() === new Date().toDateString();
                        const hasTrainingAndAvailable = hasUserTrainingAndAvailable(day);
                        const hasTrainingButUnavailable = hasUserTrainingButUnavailable(day);

                        return (
                          <div
                            key={index}
                            onClick={() => handleDayClick(day)}
                            className={`
                              aspect-square flex items-center justify-center text-xs rounded-full transition-colors
                              ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white'}
                              ${isToday && !hasTrainingAndAvailable && !hasTrainingButUnavailable ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold' : ''}
                              ${hasTrainingAndAvailable && isCurrentMonth ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 font-semibold cursor-pointer hover:bg-green-200 dark:hover:bg-green-800' : ''}
                              ${hasTrainingButUnavailable && isCurrentMonth ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 font-semibold cursor-default' : ''}
                              ${hasTrainingAndAvailable && isToday ? 'bg-green-200 dark:bg-green-800' : ''}
                              ${hasTrainingButUnavailable && isToday ? 'bg-red-200 dark:bg-red-800' : ''}
                              ${!hasTrainingAndAvailable && !hasTrainingButUnavailable ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-default' : ''}
                            `}
                          >
                            {day.getDate()}
                          </div>
                        );
                      })}
                    </div>

                    {/* Calendar Legend */}
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">Today</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 dark:bg-red-900 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">Unavailable</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <Card className="p-4 text-center">
                    <CardContent className="p-0">
                      <div className="text-gray-500 dark:text-gray-400">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No upcoming events where you&apos;re participating</p>
                        <p className="text-xs mt-1">Check training and match pages to join events</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingEvents.map((event, index) => (
                    <Link key={index} href="/training" className="group block">
                      <Card className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-700">
                        <CardContent className="p-0">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full shrink-0 ${
                              event.type === 'training'
                                ? 'bg-purple-100 dark:bg-purple-900'
                                : 'bg-blue-100 dark:bg-blue-900'
                            }`}>
                              {event.type === 'training' ? (
                                <Activity className={`h-4 w-4 ${
                                  event.type === 'training'
                                    ? 'text-purple-600 dark:text-purple-400'
                                    : 'text-blue-600 dark:text-blue-400'
                                }`} />
                              ) : (
                                <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {event.title}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {event.date}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {event.participants}
                              </p>
                            </div>
                            <div className="flex items-center justify-center">
                              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
                
                {/* Upcoming Absences Tile */}
                {upcomingAbsences.length > 0 && (
                  <Card className="p-4 hover:shadow-md transition-all duration-200 border-red-200 dark:border-red-800">
                    <CardContent className="p-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full shrink-0">
                          <CalendarOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                            Training Unavailability
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {upcomingAbsences.length} player{upcomingAbsences.length !== 1 ? 's' : ''} unavailable for training
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {upcomingAbsences.map((absence, index) => {
                          const today = new Date();
                          const tomorrow = new Date(Date.now() + 86400000);
                          const isToday = absence.date === getLocalDateString(today);
                          const isTomorrow = absence.date === getLocalDateString(tomorrow);
                          
                          let dateDisplay = absence.dateObj.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                          
                          if (isToday) dateDisplay = 'Today';
                          else if (isTomorrow) dateDisplay = 'Tomorrow';
                          
                          return (
                            <div key={index} className="flex items-center justify-between text-xs bg-red-50 dark:bg-red-900/20 rounded p-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-red-900 dark:text-red-300 truncate">
                                  {absence.player}
                                </div>
                                <div className="text-red-600 dark:text-red-400">
                                  {dateDisplay}
                                </div>
                                <div className="text-xs text-red-500 dark:text-red-400 truncate">
                                  {absence.trainingInfo}
                                </div>
                              </div>
                              {absence.reason && (
                                <div className="text-xs text-red-500 dark:text-red-400 ml-2 truncate max-w-20" title={absence.reason}>
                                  {absence.reason}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
