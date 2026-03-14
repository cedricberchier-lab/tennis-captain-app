"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Loader2,
  LogIn,
  LogOut,
  AlertCircle,
  User,
  Eye,
  EyeOff,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PlayerCard, { PlayerCardSkeleton } from "@/components/search/PlayerCard";
import PlayerDetail from "@/components/search/PlayerDetail";
import { TennisPlayer } from "@/lib/players/schemas";

const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 350;

export default function SearchPage() {
  // ── MyTennis auth (optional — search works with mock data without it) ──────
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/mytennis/session", { cache: "no-store" });
      const data = await res.json();
      setAuthenticated(data.authenticated ?? false);
    } catch {
      setAuthenticated(false);
    }
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
      setShowLoginForm(false);
      setPassword("");
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/mytennis/logout", { method: "POST" });
    setAuthenticated(false);
  };

  // ── Search ─────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TennisPlayer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TennisPlayer | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `/api/tennis-players/search?q=${encodeURIComponent(q)}`,
        { signal: abortRef.current.signal }
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Search failed");

      setResults(data.players ?? []);
      setUsingMock(data.usingMock ?? false);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), DEBOUNCE_MS);
  };

  // ── Detail fetch ───────────────────────────────────────────────────────────
  const [detailLoading, setDetailLoading] = useState(false);

  const handleSelectPlayer = useCallback(async (player: TennisPlayer) => {
    setSelectedPlayer(player);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/tennis-players/${player.externalId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.player) setSelectedPlayer(data.player);
      }
    } catch {
      // Non-critical — keep showing search result data
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const showHint = query.length > 0 && query.length < MIN_QUERY_LEN;
  const showEmpty =
    !searchLoading && !searchError && query.length >= MIN_QUERY_LEN && results.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 space-y-5">

        {/* Page header */}
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

          {/* Auth status pill */}
          {authenticated === true ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : authenticated === false ? (
            <button
              onClick={() => { setShowLoginForm((v) => !v); setAuthError(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in
              {showLoginForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          ) : (
            <div className="w-5 h-5">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Mock data / sign-in banner */}
        {usingMock && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <Info className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Showing demo data.{" "}
              {authenticated === false && (
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="underline font-medium"
                >
                  Sign in to mytennis.ch
                </button>
              )}{" "}
              {authenticated === false && "to search real players."}
            </p>
          </div>
        )}

        {/* Collapsible login form */}
        {showLoginForm && authenticated === false && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <LogIn className="h-4 w-4 text-purple-500" />
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white">
                Sign in to mytennis.ch
              </h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoFocus
                autoComplete="username"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {authError && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">{authError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={authLoading || !username || !password}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {authLoading ? "Signing in…" : "Sign in"}
                </button>
                <a
                  href="/api/mytennis/login"
                  className="flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Via website
                </a>
              </div>
            </form>
          </div>
        )}

        {/* Search + results layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: search + results */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search player by name…"
                autoComplete="off"
                className="w-full pl-10 pr-10 py-3.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 animate-spin" />
              )}
            </div>

            {showHint && (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                Type at least {MIN_QUERY_LEN} characters…
              </p>
            )}

            {searchError && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
              </div>
            )}

            {searchLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <PlayerCardSkeleton key={i} />)}
              </div>
            )}

            {showEmpty && (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-400 dark:text-gray-500">
                <User className="h-10 w-10 opacity-40" />
                <p className="text-sm">No players found for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {!searchLoading && results.length > 0 && (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                  {results.length} player{results.length !== 1 ? "s" : ""} found
                </p>
                <div className="space-y-2">
                  {results.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      selected={selectedPlayer?.id === player.id}
                      onClick={handleSelectPlayer}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: detail panel */}
          {selectedPlayer && (
            <div className="lg:w-80 shrink-0">
              <div className="lg:sticky lg:top-24">
                {detailLoading && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  </div>
                )}
                <PlayerDetail
                  player={selectedPlayer}
                  onClose={() => setSelectedPlayer(null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
