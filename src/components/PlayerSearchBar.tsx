"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, User, Trophy, MapPin, AlertCircle, X } from "lucide-react";

export type MytennisPlayer = {
  id?: string;
  // Common field variations from the API — we handle whichever comes back
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  ranking?: number | string;
  nationalRanking?: number | string;
  club?: string;
  clubName?: string;
  licenseNumber?: string;
  birthYear?: number | string;
  [key: string]: any;
};

interface PlayerSearchBarProps {
  onSelect?: (player: MytennisPlayer) => void;
  placeholder?: string;
  className?: string;
}

function playerDisplayName(p: MytennisPlayer): string {
  if (p.fullName) return p.fullName;
  if (p.name) return p.name;
  const first = p.firstName ?? "";
  const last = p.lastName ?? "";
  return [first, last].filter(Boolean).join(" ") || "—";
}

function playerSubtitle(p: MytennisPlayer): string {
  const parts: string[] = [];
  const ranking = p.ranking ?? p.nationalRanking;
  if (ranking != null) parts.push(`R${ranking}`);
  const club = p.club ?? p.clubName;
  if (club) parts.push(club);
  return parts.join(" – ");
}

export default function PlayerSearchBar({
  onSelect,
  placeholder = "Search a player...",
  className = "",
}: PlayerSearchBarProps) {
  const [input, setInput] = useState("");
  const [players, setPlayers] = useState<MytennisPlayer[]>([]);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (!q.trim()) {
      setPlayers([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setActiveIndex(-1);

    try {
      const res = await fetch("/api/mytennis/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
        signal: abortRef.current.signal,
      });

      const data = await res.json();

      if (res.status === 401) {
        setError("Session expired — please sign in again.");
        setOpen(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Search failed");
        setRawResponse(data.raw ?? null);
        setOpen(true);
        return;
      }

      setPlayers(data.players ?? []);
      setRawResponse(data.raw ?? null);
      setOpen(true);
    } catch (e: any) {
      if (e.name === "AbortError") return; // Cancelled — ignore
      setError(e.message);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    // Debounce 300ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (player: MytennisPlayer) => {
    setInput(playerDisplayName(player));
    setOpen(false);
    onSelect?.(player);
  };

  const handleClear = () => {
    setInput("");
    setPlayers([]);
    setOpen(false);
    setError(null);
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, players.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(players[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => players.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-10 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {loading && <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />}
          {!loading && input && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">

          {/* Error state */}
          {error && (
            <div className="px-4 py-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                {rawResponse != null && (
                  <details className="mt-1">
                    <summary className="text-xs text-gray-400 cursor-pointer">Raw response</summary>
                    <pre className="text-xs mt-1 text-gray-500 dark:text-gray-400 overflow-auto whitespace-pre-wrap max-h-32">
                      {JSON.stringify(rawResponse, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!error && !loading && players.length === 0 && input.trim() && (
            <div className="px-4 py-4 flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <User className="h-4 w-4 shrink-0" />
              <p className="text-sm">No players found for &quot;{input}&quot;</p>
            </div>
          )}

          {/* Results */}
          {!error && players.length > 0 && (
            <ul role="listbox">
              {players.map((player, i) => {
                const subtitle = playerSubtitle(player);
                return (
                  <li
                    key={player.id ?? i}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(player); }}
                    className={`
                      flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                      ${i === activeIndex
                        ? "bg-purple-50 dark:bg-purple-900/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }
                      ${i < players.length - 1 ? "border-b border-gray-100 dark:border-gray-700" : ""}
                    `}
                  >
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-full shrink-0">
                      <User className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {playerDisplayName(player)}
                      </p>
                      {subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                          {(player.ranking ?? player.nationalRanking) != null && (
                            <span className="flex items-center gap-0.5">
                              <Trophy className="h-2.5 w-2.5" />
                              R{player.ranking ?? player.nationalRanking}
                            </span>
                          )}
                          {(player.club ?? player.clubName) && (
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {player.club ?? player.clubName}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Result count footer */}
          {!error && players.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {players.length} player{players.length !== 1 ? "s" : ""} found
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
