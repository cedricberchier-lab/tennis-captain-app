"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, ChevronRight, Dumbbell, Swords } from "lucide-react";
import Link from "next/link";

// ── Placeholder data ──────────────────────────────────────────────────────────
const UPCOMING_EVENTS = [
  { type: "Training", subtitle: "Evening session", date: "17/03", time: "19:00", court: "Court 2" },
  { type: "Match",    subtitle: "Interclub R2",    date: "19/03", time: "14:00", court: "Away"    },
  { type: "Training", subtitle: "Morning session", date: "22/03", time: "10:00", court: "Court 1" },
];

const LAST_MATCHES = [
  { home: "TC Fribourg", away: "TC Lausanne", scoreHome: 3, scoreAway: 0, date: "08/03", result: "W", minute: "FT" },
  { home: "TC Berne",    away: "TC Fribourg", scoreHome: 1, scoreAway: 2, date: "01/03", result: "L", minute: "FT" },
  { home: "TC Fribourg", away: "TC Sion",     scoreHome: 2, scoreAway: 1, date: "22/02", result: "W", minute: "FT" },
];

// ── Cards ─────────────────────────────────────────────────────────────────────

function EventCard({ type, subtitle, date, time, court }: typeof UPCOMING_EVENTS[0]) {
  const isMatch = type === "Match";
  return (
    <div className="relative rounded-3xl overflow-hidden min-h-[160px] flex flex-col justify-between p-4"
      style={{ background: "linear-gradient(135deg, #6d28d9 0%, #4f46e5 50%, #7c3aed 100%)" }}>

      {/* Subtle background circle decoration */}
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute -right-2 -bottom-8 w-36 h-36 rounded-full bg-white/5" />

      {/* Top: type + subtitle */}
      <div className="relative z-10">
        <p className="text-white/70 text-xs font-medium">{subtitle}</p>
        <p className="text-white font-bold text-base mt-0.5">{type}</p>
      </div>

      {/* Middle: icon */}
      <div className="relative z-10 flex justify-center py-2">
        {isMatch
          ? <Swords className="h-9 w-9 text-white/40" />
          : <Dumbbell className="h-9 w-9 text-white/40" />}
      </div>

      {/* Bottom: date/time + court */}
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <p className="text-white font-bold text-sm">{date}</p>
          <p className="text-white/70 text-xs">{time} · {court}</p>
        </div>
        <button className="flex items-center gap-0.5 text-white/80 text-xs font-semibold">
          Details <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function MatchCard({ home, away, scoreHome, scoreAway, date, result, minute }: typeof LAST_MATCHES[0]) {
  const won = result === "W";
  return (
    <div className="relative rounded-3xl overflow-hidden min-h-[160px] flex flex-col justify-between p-4"
      style={{ background: "linear-gradient(135deg, #5b21b6 0%, #4338ca 60%, #6d28d9 100%)" }}>

      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute -right-2 -bottom-8 w-36 h-36 rounded-full bg-white/5" />

      {/* Top: date + result badge */}
      <div className="relative z-10 flex items-center justify-between">
        <p className="text-white/60 text-xs">{date}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${won ? "bg-green-400 text-white" : "bg-red-400 text-white"}`}>
          {minute}
        </span>
      </div>

      {/* Middle: teams + score */}
      <div className="relative z-10 flex items-center justify-between gap-2 py-1">
        <p className="text-white text-xs font-semibold flex-1 text-center leading-tight">{home}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-white font-black text-2xl">{scoreHome}</span>
          <span className="text-white/40 text-lg font-bold">-</span>
          <span className="text-white font-black text-2xl">{scoreAway}</span>
        </div>
        <p className="text-white text-xs font-semibold flex-1 text-center leading-tight">{away}</p>
      </div>

      {/* Bottom: see stats */}
      <div className="relative z-10 flex justify-end">
        <button className="flex items-center gap-0.5 text-white/80 text-xs font-semibold">
          See Stats <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? user?.username ?? "Captain";
  const [activeNav, setActiveNav] = useState("home");

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2">
        <button className="p-1">
          <Menu className="h-7 w-7 text-gray-900 stroke-[2.5px]" />
        </button>
        <Link href="/login" className="font-bold text-gray-900 text-base">Login</Link>
      </div>

      {/* Welcome */}
      <div className="px-5 pt-4 pb-6">
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          Welcome back,<br />{firstName}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 pb-32">

        {/* Upcoming events */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 px-5 mb-3">Up coming events</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 px-5 snap-x snap-mandatory scrollbar-hide">
            {UPCOMING_EVENTS.map((ev, i) => (
              <div key={i} className="snap-start shrink-0 w-[58vw] max-w-[210px]">
                <EventCard {...ev} />
              </div>
            ))}
          </div>
        </div>

        {/* Last matches */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 px-5 mb-3">Last Matchs</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 px-5 snap-x snap-mandatory scrollbar-hide">
            {LAST_MATCHES.map((m, i) => (
              <div key={i} className="snap-start shrink-0 w-[58vw] max-w-[210px]">
                <MatchCard {...m} />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-4 px-6 py-5 bg-white border-t border-gray-100">
          {[
            { label: "Train", value: "train", href: "/training" },
            { label: "Home",  value: "home",  href: "/home"     },
            { label: "Match", value: "match", href: "/team"     },
          ].map(({ label, value, href }) => (
            <Link key={value} href={href} onClick={() => setActiveNav(value)}
              className={`flex-1 text-center py-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                activeNav === value
                  ? "border-gray-900 text-gray-900"
                  : "border-gray-300 text-gray-400"
              }`}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
