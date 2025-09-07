'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { usePlayers } from "@/hooks/usePlayers";
import { useTrainings } from "@/hooks/useTrainings";
import { 
  Trophy, 
  Activity, 
  Clock,
  MapPin,
  ChevronRight,
  CalendarOff
} from "lucide-react";


export default function Home() {
  const { user } = useAuth();
  const { players } = usePlayers();
  const { trainings } = useTrainings();
  
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
    
    // Get upcoming trainings where user is a participant
    trainings
      .filter(training => {
        // Check if training is upcoming
        const trainingDate = new Date(training.date);
        trainingDate.setHours(0, 0, 0, 0);
        
        if (trainingDate < today) return false;
        
        // Check if user is a participant
        return training.participants.some(participant => 
          participant.playerId === currentPlayer?.id || 
          participant.email === user?.email ||
          participant.playerName === user?.name
        );
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
  
  // Get next 5 upcoming player absences relevant to the user
  const getUpcomingAbsences = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allAbsences: Array<{player: string, date: string, reason: string, dateObj: Date}> = [];
    
    // Get relevant player IDs (teammates in upcoming trainings/matches + user's own absences)
    const relevantPlayerIds = new Set<string>();
    
    // Add user's own player ID
    if (currentPlayer?.id) {
      relevantPlayerIds.add(currentPlayer.id);
    }
    
    // Add teammates from upcoming trainings where user participates
    trainings.forEach(training => {
      const trainingDate = new Date(training.date);
      trainingDate.setHours(0, 0, 0, 0);
      
      if (trainingDate >= today) {
        const userInTraining = training.participants.some(p => 
          p.playerId === currentPlayer?.id || 
          p.email === user?.email ||
          p.playerName === user?.name
        );
        
        if (userInTraining) {
          training.participants.forEach(participant => {
            if (participant.playerId) {
              relevantPlayerIds.add(participant.playerId);
            }
          });
        }
      }
    });
    
    
    // Collect absences from relevant players
    players.forEach(player => {
      if (relevantPlayerIds.has(player.id)) {
        player.absences.forEach(absence => {
          const [dateStr, ...reasonParts] = absence.split(' - ');
          const absenceDate = new Date(dateStr);
          absenceDate.setHours(0, 0, 0, 0);
          
          if (absenceDate >= today) {
            allAbsences.push({
              player: player.name,
              date: dateStr,
              reason: reasonParts.join(' - ') || '',
              dateObj: absenceDate
            });
          }
        });
      }
    });
    
    // Sort by date and return next 5
    return allAbsences
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 5);
  };
  
  const upcomingEvents = getUserRelevantEvents();
  const upcomingAbsences = getUpcomingAbsences();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          
          {/* Welcome Header - Mobile Optimized */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {getCurrentPlayerName()}! 👋
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Choose an action to get started
            </p>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Main Actions - Mobile Optimized Cards */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Training Action */}
                <Link href="/training" className="group block">
                  <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-700">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                          <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl">Training</CardTitle>
                          <CardDescription className="text-sm">
                            Schedule & attendance tracking
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Manage training sessions
                        </p>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                
                {/* My Absences Action */}
                <Link href="/absence" className="group block">
                  <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-red-200 dark:hover:border-red-700">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                          <CalendarOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl">My Absences</CardTitle>
                          <CardDescription className="text-sm">
                            Manage your availability
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {currentPlayer ? `${currentPlayer.absences.length} recorded` : 'Manage absences'}
                        </p>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                </div>
              </div>
            </div>

            {/* Upcoming Events Sidebar */}
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                Upcoming Events
              </h2>
              
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
                    <Card key={index} className="p-4 hover:shadow-md transition-all duration-200">
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
                        </div>
                      </CardContent>
                    </Card>
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
                            Player Absences
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Next {upcomingAbsences.length} upcoming
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {upcomingAbsences.map((absence, index) => {
                          const isToday = absence.date === new Date().toISOString().split('T')[0];
                          const isTomorrow = absence.date === new Date(Date.now() + 86400000).toISOString().split('T')[0];
                          
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
