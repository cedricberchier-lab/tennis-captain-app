'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Activity, Settings, LogOut, Eye, Database } from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  role: string;
}

interface PlayerStats {
  totalUsers: number;
  players: number;
  captains: number;
  admins: number;
  totalTrainings: number;
  totalMatches: number;
}

export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check admin authentication
    const adminToken = localStorage.getItem('adminToken');
    const adminUserStr = localStorage.getItem('adminUser');
    
    if (!adminToken || !adminUserStr) {
      router.push('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(adminUserStr);
      setAdminUser(user);
      loadStats(adminToken);
    } catch (error) {
      console.error('Error parsing admin user:', error);
      router.push('/admin/login');
    }
  }, [router]);

  const loadStats = async (token: string) => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome back, {adminUser.username}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View as Player
                </Button>
              </Link>
              <Button 
                onClick={handleLogout}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-600" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.totalUsers || 0}
              </div>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Players:</span>
                  <Badge variant="outline">{stats?.players || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Captains:</span>
                  <Badge variant="outline">{stats?.captains || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Admins:</span>
                  <Badge variant="outline">{stats?.admins || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-green-600" />
                Training Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats?.totalTrainings || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">Total training sessions</p>
            </CardContent>
          </Card>

          <Card className="p-6 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-purple-600" />
                Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {stats?.totalMatches || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">Total matches</p>
            </CardContent>
          </Card>

          <Card className="p-6 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-orange-600" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-600">
                Operational
              </div>
              <p className="text-sm text-gray-600 mt-2">All systems running</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/users">
                <Button className="w-full" variant="outline">
                  View All Users
                </Button>
              </Link>
              <Button className="w-full" variant="outline">
                Export User Data
              </Button>
              <Button className="w-full" variant="outline">
                User Activity Reports
              </Button>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                System Configuration
              </Button>
              <Button className="w-full" variant="outline">
                Database Management
              </Button>
              <Button className="w-full" variant="outline">
                Application Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}