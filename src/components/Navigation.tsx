'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayers } from "@/hooks/usePlayers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  X, 
  Users, 
  Settings,
  LogOut,
  ChevronRight,
  CalendarOff,
  Home,
  Trophy,
  Activity
} from "lucide-react";

const navigationItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    description: "Dashboard"
  },
  {
    href: "/match",
    label: "Match",
    icon: Trophy,
    description: "Match management"
  },
  {
    href: "/training",
    label: "Training",
    icon: Activity,
    description: "Training sessions"
  },
  {
    href: "/team",
    label: "Team",
    icon: Users,
    description: "Players & rankings"
  },
  {
    href: "/absence",
    label: "Absence",
    icon: CalendarOff,
    description: "Manage absences"
  },
  {
    href: "/setup",
    label: "Setup",
    icon: Settings,
    description: "App configuration"
  }
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLocalStorageNotice, setShowLocalStorageNotice] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { players } = usePlayers();
  
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

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Check for localStorage notice
  useEffect(() => {
    const isUsingLocalStorage = localStorage.getItem('authUsingLocalStorage') === 'true';
    setShowLocalStorageNotice(isUsingLocalStorage);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  const dismissNotice = () => {
    localStorage.removeItem('authUsingLocalStorage');
    setShowLocalStorageNotice(false);
  };

  // Hide navigation on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Mobile Menu Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMenu}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-expanded={isOpen}
                aria-label="Toggle navigation menu"
              >
                {isOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              
              <Link 
                href="/" 
                className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                <span className="text-2xl">🎾</span>
                <span className="hidden sm:block">CourtCrew</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navigationItems.map((item) => {
                // Hide setup page from regular users, only show to admins
                if (item.href === '/setup' && user?.role !== 'admin') {
                  return null;
                }
                
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
                {getCurrentPlayerName()}
              </span>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Local Storage Notice */}
        {showLocalStorageNotice && (
          <div className="bg-blue-50 dark:bg-blue-900 border-b border-blue-200 dark:border-blue-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">💾</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Using Local Storage
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      Data stored locally in browser.{" "}
                      <Link 
                        href="/setup"
                        className="underline hover:no-underline font-semibold"
                      >
                        Set up cloud storage →
                      </Link>
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismissNotice}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1"
                  aria-label="Dismiss notice"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Navigation Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <Link 
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
          >
            <span className="text-2xl">🎾</span>
            CourtCrew
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-300 font-semibold text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{getCurrentPlayerName()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Team Captain</p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-6 space-y-2">
            {navigationItems.map((item) => {
              // Hide setup page from regular users, only show to admins
              if (item.href === '/setup' && user?.role !== 'admin') {
                return null;
              }
              
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={logout}
            variant="destructive"
            size="sm"
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}