"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, LogIn, LogOut, User, Trophy, MapPin, AlertCircle, Eye, EyeOff } from "lucide-react";

type Player = {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  ranking?: number | string;
  club?: string;
  [key: string]: any;
};

export default function SearchPage() {
  // Auth state
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/mytennis/session", { cache: "no-store" });
    const data = await res.json();
    setAuthenticated(data.authenticated);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/mytennis/auth-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      setAuthenticated(true);
      setPassword("");
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/mytennis/logout", { method: "POST" });
    setAuthenticated(false);
    setResults([]);
    setQuery("");
    setSearched(false);
    setRawResponse(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearched(true);
    setRawResponse(null);
    try {
      const res = await fetch("/api/mytennis/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (res.status === 401) { setAuthenticated(false); return; }
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed");
        setRawResponse(data.raw ?? null);
        return;
      }
      setResults(data.players ?? []);
      setRawResponse(data.raw ?? null);
    } catch (e: any) {
      setSearchError(e.message);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const playerName = (p: Player) =>
    p.name ?? [p.firstName, p.lastName].filter(Boolean).join(" ") ?? "—";

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
          {authenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>

        {/* Loading */}
        {authenticated === null && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        )}

        {/* Login form */}
        {authenticated === false && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <LogIn className="h-5 w-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Sign in to mytennis.ch</h2>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    License number
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your mytennis.ch license number"
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{authError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading || !username || !password}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {authLoading ? "Signing in..." : "Sign in"}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-white dark:bg-gray-900 text-xs text-gray-400">or</span>
                  </div>
                </div>

                <a
                  href="/api/mytennis/login"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Sign in via mytennis.ch website
                </a>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search UI */}
        {authenticated === true && (
          <>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="Search player by name..."
                className="flex-1 px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={searchLoading || !query.trim()}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searchLoading ? "..." : "Search"}
              </button>
            </form>

            {searchError && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                  {results.length} player{results.length !== 1 ? "s" : ""} found
                </p>
                {results.map((player, i) => (
                  <Card key={player.id ?? i} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full shrink-0">
                          <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{playerName(player)}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {player.ranking != null && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Trophy className="h-3 w-3" />{player.ranking}
                              </span>
                            )}
                            {player.club && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{player.club}
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

            {rawResponse != null && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
                  Raw API response
                </summary>
                <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
