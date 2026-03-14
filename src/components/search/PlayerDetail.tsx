"use client";

import { TennisPlayer, TennisPlayerClub } from "@/lib/players/schemas";
import { X, Trophy, Tag, User, Hash, BadgeCheck, Users } from "lucide-react";

interface PlayerDetailProps {
  player: TennisPlayer;
  clubs?: TennisPlayerClub[];
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900 dark:text-white text-right">{value}</span>
    </div>
  );
}

export default function PlayerDetail({ player, clubs = [], onClose }: PlayerDetailProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/20 border-b border-purple-100 dark:border-purple-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-800 rounded-full">
            <User className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
              {player.fullName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              #{player.externalId}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Badges */}
      <div className="px-5 pt-4 flex flex-wrap gap-2">
        {player.classification && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 rounded-full px-2.5 py-1">
            <Tag className="h-3 w-3" />
            {player.classification}
          </span>
        )}
        {player.ranking != null && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-full px-2.5 py-1">
            <Trophy className="h-3 w-3" />
            Rank {player.ranking}
          </span>
        )}
        {player.ageCategory && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full px-2.5 py-1">
            {player.ageCategory}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-0">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Identification
          </span>
        </div>
        <Row label="External ID" value={player.externalId} />
        <Row label="Licence" value={player.licenceNumber} />
        <Row label="License status" value={player.licenseStatus === "1" ? "Active" : player.licenseStatus} />
        <Row label="Interclub" value={player.interclubStatus} />

        <div className="flex items-center gap-2 mt-4 mb-2">
          <Trophy className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Ranking &amp; Classification
          </span>
        </div>
        <Row label="Classification" value={player.classification} />
        <Row label="Classification value" value={player.classificationValue} />
        <Row label="Competition value" value={player.competitionValue} />
        <Row label="Ranking" value={player.ranking} />
        <Row label="Best classification" value={player.bestClassification} />
        <Row label="Best ranking" value={player.bestRanking} />
        <Row label="Last classification" value={player.lastClassification} />
        <Row label="Last ranking" value={player.lastRanking} />

        {clubs.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-4 mb-2">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Clubs
              </span>
            </div>
            {clubs.map((c, i) => (
              <div
                key={i}
                className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {c.clubName}
                </span>
              </div>
            ))}
          </>
        )}

        {player.fetchedAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500 pt-4">
            Last fetched:{" "}
            {new Date(player.fetchedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>

      {/* Action footer */}
      <div className="px-5 pb-5">
        <a
          href={`https://www.mytennis.ch/player/${player.externalId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <BadgeCheck className="h-4 w-4" />
          View on mytennis.ch
        </a>
      </div>
    </div>
  );
}
