"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, LogIn, LogOut, User, Trophy, MapPin } from "lucide-react";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  ranking?: number | string;
  club?: string;
};

export default function SearchPage() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/mytennis/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      setToken(data.access_token);
      setPassword("");
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setResults([]);
    setQuery("");
    setSearched(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !token) return;
    setSearchLoading(true);
    setSearchError("");
    setSearched(true);
    try {
      const res = await fetch("/api/mytennis/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.players ?? []);
    } catch (e: any) {
      setSearchError(e.message);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-8">
      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Player Search</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">via mytennis.ch</p>
            </div>
          </div>
          {token && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>

        {/* Sign-in form */}
        {!token ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LogIn className="h-4 w-4 text-purple-500" />
                Sign in with mytennis.ch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {authError && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {authError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {authLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search player by name..."
                className="flex-1 px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={searchLoading || !query.trim()}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {/* Results */}
            {searchError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
              </div>
            )}

            {searched && !searchLoading && !searchError && results.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No players found for &quot;{query}&quot;</p>
                </CardContent>
              </Card>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 px-1">{results.length} player{results.length !== 1 ? "s" : ""} found</p>
                {results.map((player) => (
                  <Card key={player.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full shrink-0">
                          <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {player.firstName} {player.lastName}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {player.ranking != null && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                Ranking: {player.ranking}
                              </span>
                            )}
                            {player.club && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {player.club}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
