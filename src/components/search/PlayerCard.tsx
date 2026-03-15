"use client";

import { TennisPlayer } from "@/lib/players/schemas";
import { Trophy, MapPin, User } from "lucide-react";

interface PlayerCardProps {
  player: TennisPlayer;
  selected?: boolean;
  onClick: (player: TennisPlayer) => void;
}

export default function PlayerCard({ player, selected, onClick }: PlayerCardProps) {
  const clubs = (player as TennisPlayer & { clubs?: string }).clubs;

  return (
    <button
      onClick={() => onClick(player)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-600"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
          <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {player.fullName}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {player.ranking != null && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-full px-2 py-0.5">
                <Trophy className="h-2.5 w-2.5" />
                R{player.ranking}
              </span>
            )}

            {clubs && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {clubs}
              </span>
            )}
          </div>
        </div>

        <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

export function PlayerCardSkeleton() {
  return (
    <div className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="shrink-0 p-2 bg-gray-200 dark:bg-gray-700 rounded-full w-8 h-8" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
          <div className="flex gap-2">
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-10" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
