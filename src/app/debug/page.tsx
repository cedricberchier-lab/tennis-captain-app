"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, LogIn, LogOut, User, Trophy, MapPin, AlertCircle } from "lucide-react";

type Player = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  ranking?: number | string;
  club?: string;
  [key: string]: any;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const authError = searchParams.get("auth_error");

  // Check session on mount
  const checkSession = useCallback(async () => {
    const res = await fetch("/api/mytennis/session", { cache: "no-store" });
    const data = await res.json();
    setAuthenticated(data.authenticated);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Clear auth_error from URL once displayed
  useEffect(() => {
    if (authError) {
      const t = setTimeout(() => router.replace("/debug"), 5000);
      return () => clearTimeout(t);
    }
  }, [authError, router]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await fetch("/api/mytennis/logout", { method: "POST" });
    setAuthenticated(false);
    setResults([]);
    setQuery("");
    setSearched(false);
    setRawResponse(null);
    setLogoutLoading(false);
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
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
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
              disabled={logoutLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              {logoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign out
            </button>
          )}
        </div>

        {/* Auth error banner */}
        {authError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{authError}</p>
          </div>
        )}

        {/* Loading state */}
        {authenticated === null && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        )}

        {/* Not authenticated */}
        {authenticated === false && (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <LogIn className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">Sign in to search players</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You&apos;ll be redirected to the official mytennis.ch login page.<br />
                  <span className="text-xs">Use your license number, not your email.</span>
                </p>
              </div>
              <a
                href="/api/mytennis/login"
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                Sign in with mytennis.ch
              </a>
            </CardContent>
          </Card>
        )}

        {/* Authenticated — search UI */}
        {authenticated === true && (
          <>
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

            {searchError && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
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
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {playerName(player)}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {player.ranking != null && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                {player.ranking}
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
