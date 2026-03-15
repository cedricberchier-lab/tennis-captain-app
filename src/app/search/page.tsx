"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Loader2, AlertCircle, User } from "lucide-react";
import PlayerCard, { PlayerCardSkeleton } from "@/components/search/PlayerCard";
import PlayerDetail from "@/components/search/PlayerDetail";
import { TennisPlayer } from "@/lib/players/schemas";

const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 350;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TennisPlayer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<TennisPlayer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (q.length < MIN_QUERY_LEN) { setResults([]); setSearchError(null); return; }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/tennis-players/search?q=${encodeURIComponent(q)}`, {
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.players ?? []);
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

  const handleSelectPlayer = useCallback(async (player: TennisPlayer) => {
    setSelectedPlayer(player);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/tennis-players/${player.externalId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.player) setSelectedPlayer(data.player);
      }
    } catch { /* keep showing card data */ }
    finally { setDetailLoading(false); }
  }, []);

  const showHint = query.length > 0 && query.length < MIN_QUERY_LEN;
  const showEmpty = !searchLoading && !searchError && query.length >= MIN_QUERY_LEN && results.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
            <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Player Search</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Search players in the database</p>
          </div>
        </div>

        {/* Search + results layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-4">

            {/* Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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

          {/* Detail panel */}
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
