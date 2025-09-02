'use client';

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Trophy, 
  Activity, 
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  ChevronRight
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  // Quick stats data (placeholder - could be real data from hooks)
  const quickStats = [
    {
      label: "Active Players",
      value: "12",
      icon: Users,
      color: "bg-green-500"
    },
    {
      label: "Matches This Month",
      value: "4",
      icon: Trophy,
      color: "bg-blue-500"
    },
    {
      label: "Training Sessions",
      value: "8",
      icon: Activity,
      color: "bg-purple-500"
    },
    {
      label: "Win Rate",
      value: "75%",
      icon: TrendingUp,
      color: "bg-orange-500"
    }
  ];

  const upcomingEvents = [
    {
      type: "training",
      title: "Team Training",
      date: "Today, 6:00 PM",
      location: "Court 1",
      participants: "8 players"
    },
    {
      type: "match",
      title: "vs Tennis Club Alpha",
      date: "Tomorrow, 2:00 PM",
      location: "Away Court",
      participants: "6 players needed"
    }
  ];

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
              Manage your tennis team with ease
            </p>
          </div>

          {/* Quick Stats Grid - Mobile First */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="p-4 sm:p-6 hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 sm:p-3 rounded-full ${stat.color} text-white shrink-0`}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {stat.label}
                        </p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Main Actions - Mobile Optimized Cards */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Link href="/team" className="group block">
                  <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-green-200 dark:hover:border-green-700">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                          <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl">Team</CardTitle>
                          <CardDescription className="text-sm">
                            Players & rankings
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Manage your roster
                        </p>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

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
                            Results & chat
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Track match results
                        </p>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/training" className="group block sm:col-span-2">
                  <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-700">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                          <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg sm:text-xl">Training</CardTitle>
                          <CardDescription className="text-sm">
                            Schedule & attendance tracking
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                      </div>
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        <span>📅 CSV Import</span>
                        <span>🎯 Absence Tracking</span>
                        <span>✅ Attendance</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Upcoming Events Sidebar */}
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                Upcoming Events
              </h2>
              
              <div className="space-y-4">
                {upcomingEvents.map((event, index) => (
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
                ))}
                
                <Card className="p-4 border-dashed border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <CardContent className="p-0 text-center">
                    <Calendar className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No more events scheduled
                    </p>
                    <Link 
                      href="/training" 
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-block"
                    >
                      Schedule training session →
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
