'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayers } from "@/hooks/usePlayers";
import { useTrainings } from "@/hooks/useTrainings";
import { useMatches } from "@/hooks/useMatches";
import { 
  Trophy, 
  Activity, 
  Clock,
  MapPin,
  ChevronRight,
  MessageCircle,
  Send,
  CalendarOff
} from "lucide-react";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
}

export default function Home() {
  const { user } = useAuth();
  const { players } = usePlayers();
  const { trainings } = useTrainings();
  const { matches } = useMatches();
  
  // Team Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'Captain Mike',
      message: 'Welcome to the team chat! 🎾',
      timestamp: new Date(Date.now() - 3600000) // 1 hour ago
    },
    {
      id: '2', 
      username: 'Sarah',
      message: 'Looking forward to tomorrow\'s match! 💪',
      timestamp: new Date(Date.now() - 1800000) // 30 minutes ago
    },
    {
      id: '3',
      username: 'Alex',
      message: 'Don\'t forget to bring extra water bottles ⚡',
      timestamp: new Date(Date.now() - 900000) // 15 minutes ago
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
  
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
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.username) return;
    
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      username: user.username,
      message: newMessage.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  
  // Get user-relevant upcoming events
  const getUserRelevantEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events: Array<{
      type: 'training' | 'match';
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
    
    // Get upcoming matches where user might be involved (as captain or player)
    matches
      .filter(match => {
        // Check if match is upcoming
        const matchDate = new Date(match.date);
        matchDate.setHours(0, 0, 0, 0);
        
        if (matchDate < today) return false;
        
        // Check if user is in home lineup
        const isInLineup = match.roster?.homeLineup?.some(player => 
          player.playerId === currentPlayer?.id || 
          player.email === user?.email ||
          player.playerName === user?.name
        );
        
        const isInDoublesLineup = match.roster?.homeDoublesLineup?.some(player => 
          player.playerId === currentPlayer?.id || 
          player.email === user?.email ||
          player.playerName === user?.name
        );
        
        return isInLineup || isInDoublesLineup;
      })
      .slice(0, 2) // Limit to next 2 matches
      .forEach(match => {
        events.push({
          type: 'match',
          title: `vs ${match.opponentTeam.name}`,
          date: `${match.date.toLocaleDateString()}, ${match.time}`,
          location: match.isHome ? match.location : 'Away Court',
          participants: 'Match lineup',
          sortDate: match.date
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
    
    // Add teammates from upcoming matches where user participates
    matches.forEach(match => {
      const matchDate = new Date(match.date);
      matchDate.setHours(0, 0, 0, 0);
      
      if (matchDate >= today) {
        const userInMatch = match.roster?.homeLineup?.some(p => 
          p.playerId === currentPlayer?.id || 
          p.email === user?.email ||
          p.playerName === user?.name
        ) || match.roster?.homeDoublesLineup?.some(p => 
          p.playerId === currentPlayer?.id || 
          p.email === user?.email ||
          p.playerName === user?.name
        );
        
        if (userInMatch) {
          match.roster?.homeLineup?.forEach(player => {
            if (player.playerId) relevantPlayerIds.add(player.playerId);
          });
          match.roster?.homeDoublesLineup?.forEach(player => {
            if (player.playerId) relevantPlayerIds.add(player.playerId);
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
              Welcome back, {user?.username}! 👋
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* Match Action */}
                <Link href="/match" className="group block">
                  <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-700">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                          <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl">Match</CardTitle>
                          <CardDescription className="text-sm">
                            Results & management
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Schedule and track matches
                        </p>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

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
                
                {/* Team Chat */}
                <Card className="p-4 sm:p-6 border-2 border-transparent hover:border-green-200 dark:hover:border-green-700 transition-all duration-200">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                        <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">Team Chat</CardTitle>
                        <CardDescription className="text-sm">
                          Stay connected with your team
                        </CardDescription>
                      </div>
                    </div>
                    
                    {/* Chat Messages */}
                    <div ref={chatMessagesRef} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto space-y-3" id="chat-messages">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No messages yet. Start the conversation! 💬</p>
                        </div>
                      ) : (
                        chatMessages.map((message) => (
                          <div key={message.id} className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-semibold text-green-600 dark:text-green-400">{message.username}</span>
                              <span>•</span>
                              <span>{formatTime(message.timestamp)}</span>
                            </div>
                            <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm break-words">
                              {message.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Chat Input */}
                    <div className="space-y-2">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message... 😊 👍 🎾"
                            className="mobile-input pr-16"
                            maxLength={200}
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                            {newMessage.length}/200
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 mobile-button px-4"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        💡 Use emojis to express yourself: 😊 👍 🎾 💪 🔥 ⚡ 🏆
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
