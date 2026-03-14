"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  User,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  PanelRight,
  PanelLeft,
  X,
} from "lucide-react";
import PlayerCard, { PlayerCardSkeleton } from "@/components/search/PlayerCard";
import PlayerDetail from "@/components/search/PlayerDetail";
import { TennisPlayer } from "@/lib/players/schemas";

const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 350;
const MYTENNIS_BASE = "https://www.mytennis.ch";

export default function CompanionPage() {
  // ── Panel layout ────────────────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(42); // percent
  const [dragging, setDragging] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag to resize
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(75, Math.max(25, pct)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // ── mytennis iframe ─────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeUrl, setIframeUrl] = useState(MYTENNIS_BASE);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeFullscreen, setIframeFullscreen] = useState(false);

  const navigateIframe = (url: string) => {
    setIframeUrl(url);
    setIframeBlocked(false);
    setIframeLoading(true);
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
    // Try to detect if iframe was blocked (X-Frame-Options / CSP)
    try {
      // If contentDocument is null, likely blocked
      const doc = iframeRef.current?.contentDocument;
      if (!doc) setIframeBlocked(true);
    } catch {
      setIframeBlocked(true);
    }
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeBlocked(true);
  };

  // ── Search ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TennisPlayer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<TennisPlayer | null>(null);
  const [showDetail, setShowDetail] = useState(false);

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

  const handleSelectPlayer = async (player: TennisPlayer) => {
    setSelectedPlayer(player);
    setShowDetail(true);
    // Navigate iframe to player's mytennis page
    navigateIframe(`${MYTENNIS_BASE}/Player/${player.externalId}`);
    // Enrich from cache
    try {
      const res = await fetch(`/api/tennis-players/${player.externalId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.player) setSelectedPlayer(data.player);
      }
    } catch { /* non-critical */ }
  };

  const showHint = query.length > 0 && query.length < MIN_QUERY_LEN;
  const showEmpty = !searchLoading && !searchError && query.length >= MIN_QUERY_LEN && results.length === 0;

  return (
    <div
      className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-100 dark:bg-gray-900 select-none"
      ref={containerRef}
      style={{ cursor: dragging ? "col-resize" : "auto" }}
    >
      {/* ── Left pane: app search ──────────────────────────────────────────── */}
      <div
        className="flex flex-col h-full overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        style={{ width: showRight ? `${leftWidth}%` : "100%" }}
      >
        {/* Left header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-white">CourtCrew</span>
          </div>
          <button
            onClick={() => setShowRight((v) => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={showRight ? "Hide mytennis panel" : "Show mytennis panel"}
          >
            {showRight ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Search input */}
        <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search player…"
              autoComplete="off"
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchLoading && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400 animate-spin" />
            )}
          </div>
          {showHint && (
            <p className="text-xs text-gray-400 mt-1.5 px-1">Type {MIN_QUERY_LEN}+ characters…</p>
          )}
        </div>

        {/* Content: detail or list */}
        <div className="flex-1 overflow-y-auto">
          {showDetail && selectedPlayer ? (
            <div className="p-3">
              <button
                onClick={() => setShowDetail(false)}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-3 transition-colors"
              >
                <X className="h-3 w-3" /> Back to results
              </button>
              <PlayerDetail
                player={selectedPlayer}
                onClose={() => { setShowDetail(false); setSelectedPlayer(null); }}
              />
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {searchError && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">{searchError}</p>
                </div>
              )}

              {searchLoading && Array.from({ length: 3 }).map((_, i) => <PlayerCardSkeleton key={i} />)}

              {showEmpty && (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-500">
                  <User className="h-8 w-8 opacity-40" />
                  <p className="text-xs">No results for &ldquo;{query}&rdquo;</p>
                </div>
              )}

              {!searchLoading && !query && (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-500">
                  <Search className="h-8 w-8 opacity-40" />
                  <p className="text-xs text-center">Search a player to sync<br />both views simultaneously</p>
                </div>
              )}

              {!searchLoading && results.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 px-0.5">
                    {results.length} player{results.length !== 1 ? "s" : ""}
                  </p>
                  {results.map((p) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      selected={selectedPlayer?.id === p.id}
                      onClick={handleSelectPlayer}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Drag handle ─────────────────────────────────────────────────────── */}
      {showRight && (
        <div
          onMouseDown={onMouseDown}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-purple-400 dark:hover:bg-purple-600 transition-colors active:bg-purple-500"
          title="Drag to resize"
        />
      )}

      {/* ── Right pane: mytennis.ch iframe ──────────────────────────────────── */}
      {showRight && (
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {/* Right header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
            {/* URL bar */}
            <div className="flex-1 flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg min-w-0">
              <span className="text-xs text-gray-400 shrink-0">🌐</span>
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
                {iframeUrl}
              </span>
            </div>

            <button
              onClick={() => navigateIframe(iframeUrl)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reload"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIframeFullscreen((v) => !v)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={iframeFullscreen ? "Restore" : "Expand right panel"}
            >
              {iframeFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>

            <a
              href={iframeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* iframe or blocked message */}
          <div className="flex-1 relative overflow-hidden bg-white dark:bg-gray-900">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            )}

            {iframeBlocked ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <ExternalLink className="h-7 w-7 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white mb-1">
                    mytennis.ch blocks embedding
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    The site has X-Frame-Options restrictions. Open it in a separate tab instead.
                  </p>
                  <a
                    href={iframeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open mytennis.ch in new tab
                  </a>
                </div>
                {selectedPlayer && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Navigating to player #{selectedPlayer.externalId}
                  </p>
                )}
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                key={iframeUrl}
                src={iframeUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="mytennis.ch"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            )}
          </div>
        </div>
      )}

      {/* Expand right pane overlay (fullscreen mode) */}
      {iframeFullscreen && showRight && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{iframeUrl}</span>
            <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button onClick={() => setIframeFullscreen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <iframe
            src={iframeUrl}
            className="flex-1 border-0"
            title="mytennis.ch fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}
    </div>
  );
}
